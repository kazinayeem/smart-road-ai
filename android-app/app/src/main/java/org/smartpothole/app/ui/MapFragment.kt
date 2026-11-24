package org.smartpothole.app.ui

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.google.android.material.floatingactionbutton.FloatingActionButton
import android.content.Intent
import org.maplibre.android.maps.MapView
import org.smartpothole.app.route.RouteActivity
import org.smartpothole.app.R
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.location.NearbyPotholeMonitor
import org.smartpothole.app.map.LiveMapController
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.util.TimeFormat
import org.smartpothole.app.warning.LocalPotholeWarningManager

/** Drive map tab: Google-Maps-style follow + heading-up, live hazards, hazard-ahead banner. */
class MapFragment : Fragment(R.layout.fragment_map), PermissionAware {

    private var controller: LiveMapController? = null
    private var tracker: LocationTracker? = null
    private var warnings: LocalPotholeWarningManager? = null
    private var nearby: NearbyPotholeMonitor? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val banner = view.findViewById<View>(R.id.hazardBanner)
        val sheet = view.findViewById<View>(R.id.hazardSheet)
        val recenter = view.findViewById<ExtendedFloatingActionButton>(R.id.fabRecenter)
        val status = view.findViewById<TextView>(R.id.tvMapStatus)
        val speed = view.findViewById<TextView>(R.id.tvSpeed)
        val orientationFab = view.findViewById<FloatingActionButton>(R.id.fabOrientation)

        view.findViewById<View>(R.id.mapTop).padForSafeArea(top = true)
        view.findViewById<View>(R.id.btnWhereTo).setOnClickListener { startActivity(Intent(requireContext(), RouteActivity::class.java)) }
        view.findViewById<View>(R.id.mapControls).marginForSafeArea()
        view.findViewById<View>(R.id.mapBottom).padForSafeArea()
        sheet.padForSafeArea()

        controller = LiveMapController(
            requireContext(), view.findViewById<MapView>(R.id.mapView), savedInstanceState,
            onHazardClick = { h, d -> showSheet(sheet, h, d) },
            onFollowChanged = { following -> recenter.visibility = if (following) View.GONE else View.VISIBLE },
            onHazardAhead = { h, d -> showBanner(banner, h, d) },
            onHazardsLoaded = { list -> if (tracker?.lastKnownLocation != null) status.text = "${list.size} active hazard${if (list.size == 1) "" else "s"}" }
        )
        warnings = LocalPotholeWarningManager(requireContext()).also { it.audioEnabled = Prefs.voice(requireContext()) }
        nearby = NearbyPotholeMonitor(requireContext(), warnings)

        tracker = LocationTracker(requireContext(), 1000L, 1f) { loc ->
            controller?.onLocation(loc)
            nearby?.onLocationUpdated(loc)
            speed.text = if (loc.hasSpeed()) (loc.speed * 3.6f).toInt().toString() else "–"
            if (status.text.startsWith("Waiting")) status.text = "Following you"
        }
        if (tracker?.hasPermission() != true) status.text = "Allow location to follow you on the map"

        recenter.setOnClickListener { controller?.recenter() }
        orientationFab.setOnClickListener {
            val o = controller?.toggleOrientation()
            val headingUp = o == LiveMapController.Orientation.HEADING_UP
            orientationFab.setImageResource(if (headingUp) R.drawable.ic_navigation else R.drawable.ic_explore)
            orientationFab.contentDescription = if (headingUp) "Heading up. Tap for north up." else "North up. Tap for heading up."
        }
        view.findViewById<View>(R.id.fabZoomIn).setOnClickListener { controller?.zoomIn() }
        view.findViewById<View>(R.id.fabZoomOut).setOnClickListener { controller?.zoomOut() }
        sheet.findViewById<View>(R.id.sheetClose).setOnClickListener { sheet.visibility = View.GONE }
    }

    private fun showBanner(banner: View, h: PotholeNode?, d: Float) {
        if (h == null || !Prefs.nearby(requireContext())) { banner.visibility = View.GONE; return }
        banner.visibility = View.VISIBLE
        banner.findViewById<TextView>(R.id.bannerTitle).text = "Pothole in ${HomeFragment.formatDistance(d)}"
        val seen = if (h.totalDetections > 1) " · reported ${h.totalDetections} times" else ""
        banner.findViewById<TextView>(R.id.bannerSubtitle).text = "${Severity.label(h.priority)} severity$seen"
    }

    private fun showSheet(sheet: View, h: PotholeNode, d: Float?) {
        sheet.visibility = View.VISIBLE
        sheet.findViewById<TextView>(R.id.sheetTitle).text = "Reported pothole"
        Severity.styleChip(sheet.findViewById(R.id.sheetSeverity), h.priority)
        val first = TimeFormat.dateTime(h.firstDetectedAt)
        sheet.findViewById<TextView>(R.id.sheetDetected).text =
            if (h.totalDetections > 1) "First detected $first\nLast confirmed ${TimeFormat.dateTime(h.lastDetectedAt)}" else "Detected $first"
        val away = d?.let { " · ${HomeFragment.formatDistance(it)} away" } ?: ""
        sheet.findViewById<TextView>(R.id.sheetMeta).text = "${Severity.statusLabel(h.status)} · seen ${h.totalDetections}×$away"
        sheet.findViewById<TextView>(R.id.sheetCoords).text = String.format("%.5f, %.5f", h.latitude, h.longitude)
    }

    override fun onStart() { super.onStart(); controller?.onStart() }
    override fun onStop() { super.onStop(); controller?.onStop() }
    override fun onLowMemory() { super.onLowMemory(); controller?.onLowMemory() }
    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); controller?.onSaveInstanceState(outState) }

    override fun onResume() {
        super.onResume()
        if (isHidden) return
        controller?.onResume()
        controller?.startHazards()
        tracker?.start()
        nearby?.startMonitoring()
        warnings?.audioEnabled = Prefs.voice(requireContext())
        activity?.window?.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onPause() {
        super.onPause()
        controller?.onPause()
        tracker?.stopUpdates()
        nearby?.stopMonitoring()
        activity?.window?.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onHiddenChanged(hidden: Boolean) { if (hidden) onPause() else onResume() }
    override fun onPermissionsChanged() { tracker?.start() }

    override fun onDestroyView() {
        super.onDestroyView()
        tracker?.stopUpdates()
        warnings?.shutdown()
        controller?.destroy()
        controller = null
    }
}
