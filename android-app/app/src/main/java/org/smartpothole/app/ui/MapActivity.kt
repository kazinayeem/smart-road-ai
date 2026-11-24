package org.smartpothole.app.ui

import android.graphics.Color
import android.location.Location
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.card.MaterialCardView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.firebase.database.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon
import org.smartpothole.app.R
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.sync.PotholeNode
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MapActivity : AppCompatActivity() {

    private lateinit var mapView: MapView
    private lateinit var btnBack: ImageView
    private lateinit var tvMarkerCount: TextView
    private lateinit var tvSafeAreaPill: TextView
    private lateinit var markerDetailCard: MaterialCardView
    private lateinit var btnCloseDetail: ImageView
    private lateinit var tvReportId: TextView
    private lateinit var tvReportStatus: TextView
    private lateinit var tvReportCoords: TextView
    private lateinit var tvReportConfidence: TextView
    private lateinit var tvReportDistance: TextView
    private lateinit var tvReportDate: TextView
    private lateinit var tvAssignedContractor: TextView

    private lateinit var fabMyLocation: FloatingActionButton
    private lateinit var fabToggleSafeArea: FloatingActionButton
    private lateinit var fabZoomIn: FloatingActionButton
    private lateinit var fabZoomOut: FloatingActionButton

    private val dateFormat = SimpleDateFormat("MMM dd, yyyy • HH:mm", Locale.getDefault())
    private var locationTracker: LocationTracker? = null

    private var userLocationMarker: Marker? = null
    private var safeAreaPolygon: Polygon? = null
    private var isSafeAreaVisible = true
    private val SAFE_AREA_RADIUS_METERS = 120.0

    private var currentUserPoint: GeoPoint? = null
    private var potholesListener: ValueEventListener? = null
    private val rtdb = FirebaseDatabase.getInstance()
    private var lastPotholes: List<PotholeNode> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Configuration.getInstance().load(this, getPreferences(MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = packageName
        setContentView(R.layout.activity_map)

        initViews()
        setupMap()
        startRealtimePotholeSync()
    }

    private fun initViews() {
        mapView = findViewById(R.id.mapView)
        btnBack = findViewById(R.id.btnBack)
        tvMarkerCount = findViewById(R.id.tvMarkerCount)
        tvSafeAreaPill = findViewById(R.id.tvSafeAreaPill)
        markerDetailCard = findViewById(R.id.markerDetailCard)
        btnCloseDetail = findViewById(R.id.btnCloseDetail)
        tvReportId = findViewById(R.id.tvReportId)
        tvReportStatus = findViewById(R.id.tvReportStatus)
        tvReportCoords = findViewById(R.id.tvReportCoords)
        tvReportConfidence = findViewById(R.id.tvReportConfidence)
        tvReportDistance = findViewById(R.id.tvReportDistance)
        tvReportDate = findViewById(R.id.tvReportDate)
        tvAssignedContractor = findViewById(R.id.tvAssignedContractor)

        fabMyLocation = findViewById(R.id.fabMyLocation)
        fabToggleSafeArea = findViewById(R.id.fabToggleSafeArea)
        fabZoomIn = findViewById(R.id.fabZoomIn)
        fabZoomOut = findViewById(R.id.fabZoomOut)

        btnBack.setOnClickListener { finish() }
        btnCloseDetail.setOnClickListener { markerDetailCard.visibility = View.GONE }

        fabMyLocation.setOnClickListener {
            currentUserPoint?.let { point ->
                mapView.controller.animateTo(point)
            }
        }

        fabToggleSafeArea.setOnClickListener {
            isSafeAreaVisible = !isSafeAreaVisible
            safeAreaPolygon?.isEnabled = isSafeAreaVisible
            tvSafeAreaPill.visibility = if (isSafeAreaVisible) View.VISIBLE else View.GONE
            mapView.invalidate()
        }

        fabZoomIn.setOnClickListener { mapView.controller.zoomIn() }
        fabZoomOut.setOnClickListener { mapView.controller.zoomOut() }
    }

    private fun setupMap() {
        mapView.setTileSource(TileSourceFactory.MAPNIK)
        mapView.setMultiTouchControls(true)

        val mapController = mapView.controller
        mapController.setZoom(15.0)

        locationTracker = LocationTracker(this, minIntervalMs = 3000L, minDistanceM = 5f) { loc ->
            val first = currentUserPoint == null
            val p = GeoPoint(loc.latitude, loc.longitude)
            currentUserPoint = p
            if (userLocationMarker == null) setupUserLocationAndSafeArea(p) else {
                userLocationMarker?.position = p
                safeAreaPolygon?.points = Polygon.pointsAsCircle(p, SAFE_AREA_RADIUS_METERS)
            }
            if (first) mapController.animateTo(p)
            renderPotholeMarkers(lastPotholes)
        }
        val initialLoc = locationTracker?.lastKnownLocation
        if (initialLoc != null) {
            val p = GeoPoint(initialLoc.latitude, initialLoc.longitude)
            currentUserPoint = p
            mapController.setCenter(p)
            setupUserLocationAndSafeArea(p)
        } else {
            // No fix yet: show the service area, but do NOT draw a fake "you are here" marker.
            mapController.setZoom(12.0)
            mapController.setCenter(GeoPoint(23.8103, 90.4125))
            tvSafeAreaPill.text = "Waiting for GPS…"
        }
    }

    /**
     * Render User Location Pin and Safe Area Horizon Circle (120 meters radius)
     */
    private fun setupUserLocationAndSafeArea(point: GeoPoint) {
        // User Location Pin
        userLocationMarker = Marker(mapView).apply {
            position = point
            title = "You are here"
            snippet = "Safe Area Active (120m monitoring horizon)"
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            mapView.overlays.add(this)
        }

        // Safe Area Circle (120m radius)
        safeAreaPolygon = Polygon(mapView).apply {
            points = Polygon.pointsAsCircle(point, SAFE_AREA_RADIUS_METERS)
            fillPaint.color = Color.argb(40, 59, 130, 246) // Soft semi-transparent blue
            outlinePaint.color = Color.argb(200, 59, 130, 246)
            outlinePaint.strokeWidth = 3f
            title = "Safe Area / Road Horizon (120m)"
            mapView.overlays.add(this)
        }
    }

    /**
     * Real-time listener for Pothole defects from Firebase RTDB (potholes/ node)
     */
    private fun startRealtimePotholeSync() {
        // reports/ is the single source of truth shared with the web dashboard.
        val potholesRef = rtdb.getReference("reports")

        potholesListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                lastPotholes = snapshot.children.mapNotNull { PotholeNode.fromReport(it) }
                renderPotholeMarkers(lastPotholes)
            }

            override fun onCancelled(error: DatabaseError) {
                tvMarkerCount.text = "Could not load hazards: ${error.message}"
            }
        }
        potholesRef.addValueEventListener(potholesListener!!)
    }

    private fun renderPotholeMarkers(potholes: List<PotholeNode>) {
        if (isFinishing || isDestroyed) return
        mapView.overlays.removeAll { it != userLocationMarker && it != safeAreaPolygon }

        var count = 0
        var hazardsInSafeArea = 0
        val userLoc = locationTracker?.lastKnownLocation

        for (p in potholes) {
            if (p.latitude == 0.0 && p.longitude == 0.0) continue
            // Fixed or rejected potholes are not hazards; keep the map readable.
            if (!p.isActive) continue

            // Evaluate Safe Area Proximity
            var distMeters = 0f
            if (userLoc != null) {
                val dist = FloatArray(1)
                Location.distanceBetween(userLoc.latitude, userLoc.longitude, p.latitude, p.longitude, dist)
                distMeters = dist[0]
                if (distMeters <= SAFE_AREA_RADIUS_METERS && p.status != "RESOLVED" && p.status != "REJECTED") {
                    hazardsInSafeArea++
                }
            }

            val marker = Marker(mapView).apply {
                position = GeoPoint(p.latitude, p.longitude)
                title = "${p.status.replace('_', ' ')} • ${p.priority}"
                snippet = "Detected ${org.smartpothole.app.util.TimeFormat.dateTime(p.firstDetectedAt)}"
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)

                // Marker color coding strictly matching spec:
                // RED = NEW, ORANGE = UNDER_REVIEW, BLUE = ASSIGNED, YELLOW = IN_PROGRESS, GREEN = RESOLVED, GRAY = REJECTED
                val colorHex = when (p.status.uppercase()) {
                    "NEW", "NEW_REPORT" -> "#EF4444"
                    "UNDER_REVIEW", "VERIFIED" -> "#F97316"
                    "ASSIGNED", "ACCEPTED" -> "#3B82F6"
                    "IN_PROGRESS", "REPAIR_SUBMITTED" -> "#EAB308"
                    "RESOLVED" -> "#10B981"
                    else -> "#6B7280"
                }

                setOnMarkerClickListener { _, _ ->
                    displayMarkerDetails(p, colorHex, distMeters)
                    true
                }
            }

            mapView.overlays.add(marker)
            count++
        }

        tvMarkerCount.text = "$count active hazard${if (count != 1) "s" else ""}"

        // Update Safe Area Status Badge
        if (userLoc == null) {
            tvSafeAreaPill.text = "Waiting for GPS…"
        } else if (hazardsInSafeArea > 0) {
            tvSafeAreaPill.text = "⚠️ $hazardsInSafeArea Hazard(s) in Safe Area!"
            tvSafeAreaPill.setBackgroundResource(R.drawable.badge_critical_bg)
        } else {
            tvSafeAreaPill.text = "🛡️ Safe Area Clear (${SAFE_AREA_RADIUS_METERS.toInt()}m)"
            tvSafeAreaPill.setBackgroundResource(R.drawable.badge_resolved_bg)
        }

        mapView.invalidate()
    }

    private fun displayMarkerDetails(p: PotholeNode, colorHex: String, distMeters: Float) {
        tvReportId.text = p.potholeId
        tvReportStatus.text = p.status.replace('_', ' ')
        tvReportStatus.setBackgroundColor(Color.parseColor(colorHex))
        tvReportCoords.text = "GPS: ${String.format("%.5f", p.latitude)}, ${String.format("%.5f", p.longitude)}"
        tvReportConfidence.text = "Seen ${p.totalDetections} time${if (p.totalDetections != 1) "s" else ""} • ${p.priority} severity"

        if (distMeters > 0) {
            tvReportDistance.text = "📍 Distance: ${distMeters.toInt()}m from current location"
            tvReportDistance.visibility = View.VISIBLE
        } else {
            tvReportDistance.visibility = View.GONE
        }

        val first = org.smartpothole.app.util.TimeFormat.dateTime(p.firstDetectedAt)
        val last = org.smartpothole.app.util.TimeFormat.dateTime(if (p.lastDetectedAt > 0) p.lastDetectedAt else p.firstDetectedAt)
        tvReportDate.text = if (p.totalDetections > 1) "First detected: $first\nLast confirmed: $last" else "Detected: $first"
        tvAssignedContractor.text = p.address.ifEmpty { "Address not available" }
        markerDetailCard.visibility = View.VISIBLE
    }

    override fun onResume() {
        super.onResume()
        mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        mapView.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        locationTracker?.stopUpdates()
        potholesListener?.let { rtdb.getReference("reports").removeEventListener(it) }
    }
}
