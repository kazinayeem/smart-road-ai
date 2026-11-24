package org.smartpothole.app.route

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.firebase.database.FirebaseDatabase
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.maplibre.android.maps.MapView
import org.smartpothole.app.R
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.map.LiveMapController
import org.smartpothole.app.map.Place
import org.smartpothole.app.map.RouteOption
import org.smartpothole.app.map.RouteService
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.ui.HomeFragment
import org.smartpothole.app.ui.Prefs
import org.smartpothole.app.ui.Severity
import org.smartpothole.app.ui.edgeToEdge
import org.smartpothole.app.ui.padForSafeArea
import org.smartpothole.app.util.TimeFormat
import org.smartpothole.app.warning.LocalPotholeWarningManager

/**
 * Route planner: pick a start (your location or a search) and a destination, get real road routes
 * (OSRM), compare them by time and by reported potholes on the way, see each pothole's city status,
 * then start a guided drive that warns about the potholes on the chosen route.
 */
class RouteActivity : AppCompatActivity() {

    private lateinit var map: LiveMapController
    private var tracker: LocationTracker? = null
    private var warnings: LocalPotholeWarningManager? = null
    private lateinit var sheet: BottomSheetBehavior<View>
    private var from: Place? = null
    private var to: Place? = null
    private var options: List<RouteOption> = emptyList()
    private var selected = 0
    private var driving = false
    private var lastSpoken: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        edgeToEdge()
        setContentView(R.layout.activity_route)
        findViewById<View>(R.id.routeTop).padForSafeArea(top = true)
        findViewById<View>(R.id.sheetScroll).padForSafeArea(bottom = true)
        sheet = BottomSheetBehavior.from(findViewById(R.id.routeSheet))
        // Never cover the search card: the sheet tops out at ~60% of the screen; the map stays visible.
        sheet.maxHeight = (resources.displayMetrics.heightPixels * 0.6).toInt()

        val banner = findViewById<View>(R.id.hazardBanner)
        warnings = LocalPotholeWarningManager(this).also { it.audioEnabled = Prefs.voice(this) }
        map = LiveMapController(this, findViewById<MapView>(R.id.mapView), savedInstanceState, bottomInsetDp = 132,
            onHazardClick = { h, _ -> map.focus(h.latitude, h.longitude) },
            onHazardAhead = { h, d -> if (driving) showBanner(banner, h, d) })
        tracker = LocationTracker(this, 1000L, 1f) { loc -> map.onLocation(loc) }

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        val etFrom = findViewById<EditText>(R.id.etFrom)
        val etTo = findViewById<EditText>(R.id.etTo)
        etFrom.setOnEditorActionListener { v, id, _ -> if (id == EditorInfo.IME_ACTION_SEARCH) { search(v.text.toString(), isFrom = true); true } else false }
        etTo.setOnEditorActionListener { v, id, _ -> if (id == EditorInfo.IME_ACTION_SEARCH) { search(v.text.toString(), isFrom = false); true } else false }
        etFrom.setOnFocusChangeListener { _, has -> if (has && etFrom.text.toString() == "My location") etFrom.setText("") }

        findViewById<MaterialButton>(R.id.btnStart).setOnClickListener { toggleDrive() }
        if (savedInstanceState == null) etTo.requestFocus()
    }

    private fun search(query: String, isFrom: Boolean) {
        if (query.isBlank() || query == "My location") {
            if (isFrom) { from = null; findViewById<EditText>(R.id.etFrom).setText("My location"); compute() }
            return
        }
        hideKeyboard()
        setBusy(true, "Searching “$query”…")
        lifecycleScope.launch {
            val results = runCatching { RouteService.search(query, tracker?.lastKnownLocation) }
            setBusy(false)
            val card = findViewById<View>(R.id.resultsCard)
            val list = findViewById<LinearLayout>(R.id.listResults)
            list.removeAllViews()
            val places = results.getOrElse { emptyList() }
            if (places.isEmpty()) {
                setSubtitle(if (results.isFailure) "Search failed. Check your connection and try again." else "No places found for “$query”. Try a different name.")
                card.visibility = View.GONE
                return@launch
            }
            places.forEach { p ->
                val row = LayoutInflater.from(this@RouteActivity).inflate(R.layout.item_place_result, list, false)
                row.findViewById<TextView>(R.id.placeName).text = p.name
                row.findViewById<TextView>(R.id.placeDetail).text = p.detail
                row.setOnClickListener {
                    card.visibility = View.GONE
                    if (isFrom) { from = p; findViewById<EditText>(R.id.etFrom).setText(p.name) }
                    else { to = p; findViewById<EditText>(R.id.etTo).setText(p.name) }
                    compute()
                }
                list.addView(row)
            }
            card.visibility = View.VISIBLE
        }
    }

    private fun compute() {
        val dest = to ?: return
        val start = from ?: tracker?.lastKnownLocation?.let { Place("My location", "", it.latitude, it.longitude) }
        if (start == null) { setSubtitle("Waiting for your location… or type a start point in “From”."); return }
        setBusy(true, "Finding routes…")
        lifecycleScope.launch {
            // Fresh snapshot so the counts reflect what the city sees right now.
            val hazards = runCatching {
                FirebaseDatabase.getInstance().getReference("reports").get().await().children
                    .mapNotNull { c -> PotholeNode.fromReport(c)?.also { it.potholeId = c.key ?: it.potholeId } }.filter { it.isActive }
            }.getOrDefault(map.hazards)
            val result = runCatching { RouteService.routes(start, dest, hazards) }
            setBusy(false)
            result.onFailure { setSheetTitle("No route found"); setSubtitle(it.message ?: "Routing service unavailable. Try again.") }
            result.onSuccess { list ->
                options = list
                selected = 0
                renderOptions()
                sheet.state = BottomSheetBehavior.STATE_COLLAPSED
                updateFramePadding()
                map.setRoutes(options, selected, frame = true)
            }
        }
    }

    private fun renderOptions() {
        val list = findViewById<LinearLayout>(R.id.listRoutes)
        list.removeAllViews()
        setSheetTitle("${options.size} route${if (options.size == 1) "" else "s"} to ${to?.name}")
        setSubtitle("From ${from?.name ?: "your location"}. Pothole counts include every unrepaired report near the road.")
        options.forEachIndexed { i, o ->
            val card = LayoutInflater.from(this).inflate(R.layout.item_route_option, list, false) as MaterialCardView
            card.isChecked = i == selected
            card.findViewById<TextView>(R.id.optLabels).apply {
                text = o.labels.joinToString(" · ").ifEmpty { "Alternative" }
            }
            card.findViewById<TextView>(R.id.optTitle).text = "${formatDuration(o.durationSeconds)} · ${HomeFragment.formatDistance(o.distanceMeters.toFloat())}"
            val n = o.hazards.size
            card.findViewById<TextView>(R.id.optHazards).apply {
                text = if (n == 0) "No reported potholes on this route" else "$n reported pothole${if (n == 1) "" else "s"} on this route"
                setTextColor(ContextCompat.getColor(this@RouteActivity, if (n == 0) R.color.sp_success else R.color.sp_warning))
            }
            card.contentDescription = "${card.findViewById<TextView>(R.id.optLabels).text}. ${card.findViewById<TextView>(R.id.optTitle).text}. ${card.findViewById<TextView>(R.id.optHazards).text}"
            card.setOnClickListener {
                selected = i
                renderOptions()
                updateFramePadding()
                map.setRoutes(options, selected, frame = !driving)
            }
            list.addView(card)
        }
        findViewById<View>(R.id.btnStart).visibility = if (options.isEmpty()) View.GONE else View.VISIBLE
        findViewById<View>(R.id.tvCaveat).visibility = if (options.isEmpty()) View.GONE else View.VISIBLE
        renderHazards()
    }

    private fun renderHazards() {
        val list = findViewById<LinearLayout>(R.id.listHazards)
        list.removeAllViews()
        val hz = options.getOrNull(selected)?.hazards ?: emptyList()
        findViewById<View>(R.id.tvHazardsHeader).visibility = if (hz.isEmpty()) View.GONE else View.VISIBLE
        hz.forEach { h ->
            val row = LayoutInflater.from(this).inflate(R.layout.item_report_row, list, false)
            val n = h.node
            row.findViewById<TextView>(R.id.rowTitle).text =
                if (h.alongMeters < 50) "Near the start" else "After ${HomeFragment.formatDistance(h.alongMeters.toFloat())}"
            val seen = if (n.totalDetections > 1) " · seen ${n.totalDetections}×" else ""
            row.findViewById<TextView>(R.id.rowSubtitle).text =
                "City: ${Severity.cityStatus(n.status)}\nDetected ${TimeFormat.dateTime(n.firstDetectedAt)}$seen"
            Severity.styleChip(row.findViewById(R.id.rowChip), n.priority)
            row.setOnClickListener {
                map.focus(n.latitude, n.longitude)
                sheet.state = BottomSheetBehavior.STATE_COLLAPSED
            }
            list.addView(row)
        }
    }

    private fun updateFramePadding() {
        val top = findViewById<View>(R.id.routeTop)
        map.frameTopPx = top.bottom
        map.frameBottomPx = (260 * resources.displayMetrics.density).toInt() // collapsed sheet (peek height)
    }

    private fun toggleDrive() {
        driving = !driving
        val btn = findViewById<MaterialButton>(R.id.btnStart)
        btn.text = if (driving) "Stop" else "Start"
        btn.setIconResource(if (driving) R.drawable.ic_stop else R.drawable.ic_navigation)
        if (driving) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            sheet.state = BottomSheetBehavior.STATE_COLLAPSED
            map.recenter()
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            findViewById<View>(R.id.hazardBanner).visibility = View.GONE
            findViewById<View>(R.id.routeTop).post { updateFramePadding(); map.frameRoute() }
        }
    }

    private fun showBanner(banner: View, h: PotholeNode?, d: Float) {
        if (h == null || !Prefs.nearby(this)) { banner.visibility = View.GONE; return }
        banner.visibility = View.VISIBLE
        banner.findViewById<TextView>(R.id.bannerTitle).text = "Pothole in ${HomeFragment.formatDistance(d)}"
        banner.findViewById<TextView>(R.id.bannerSubtitle).text = "${Severity.label(h.priority)} · ${Severity.cityStatus(h.status)}"
        if (lastSpoken != h.potholeId && d < 250f) {
            lastSpoken = h.potholeId
            warnings?.triggerNearbyWarning(d.toInt(), h.priority)
        }
    }

    private fun setBusy(busy: Boolean, message: String? = null) {
        findViewById<View>(R.id.progress).visibility = if (busy) View.VISIBLE else View.GONE
        message?.let { setSubtitle(it) }
    }
    private fun setSheetTitle(t: String) { findViewById<TextView>(R.id.tvSheetTitle).text = t }
    private fun setSubtitle(t: String) { findViewById<TextView>(R.id.tvSheetSubtitle).text = t }
    private fun hideKeyboard() {
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(currentFocus?.windowToken, 0)
        currentFocus?.clearFocus()
    }

    private fun formatDuration(s: Double): String {
        val m = (s / 60).toInt()
        return if (m < 60) "$m min" else "${m / 60} h ${m % 60} min"
    }

    override fun onStart() { super.onStart(); map.onStart() }
    override fun onResume() { super.onResume(); map.onResume(); map.startHazards(); tracker?.start() }
    override fun onPause() { super.onPause(); map.onPause(); tracker?.stopUpdates() }
    override fun onStop() { super.onStop(); map.onStop() }
    override fun onLowMemory() { super.onLowMemory(); map.onLowMemory() }
    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); map.onSaveInstanceState(outState) }
    override fun onDestroy() {
        super.onDestroy()
        tracker?.stopUpdates()
        warnings?.shutdown()
        map.destroy()
    }
}
