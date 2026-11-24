package org.smartpothole.app.map

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.location.Location
import android.view.MotionEvent
import android.view.animation.LinearInterpolator
import androidx.core.content.ContextCompat
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import org.osmdroid.config.Configuration as OsmConfig
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import org.smartpothole.app.R
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.ui.Severity
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.pow

/**
 * Live, driving-style map on OpenStreetMap (osmdroid):
 *  - FOLLOW mode: camera tracks the user; HEADING_UP rotates the map so travel direction points up
 *    (like Google Maps navigation), NORTH_UP keeps north up.
 *  - The user marker glides between GPS fixes (no jumps) and the camera keeps the user in the lower
 *    third so more road ahead is visible.
 *  - Speed-aware zoom: closer in town, further out at speed.
 *  - Any manual drag/pinch leaves follow mode; [recenter] resumes it.
 *  - Active hazards from `reports/` are drawn as severity pins; [onHazardAhead] reports the nearest
 *    hazard roughly in the direction of travel.
 * Call [onResume]/[onPause]/[destroy] from the host lifecycle.
 */
class LiveMapController(
    private val context: Context,
    private val mapView: MapView,
    private val onHazardClick: (PotholeNode, Float?) -> Unit = { _, _ -> },
    private val onFollowChanged: (Boolean) -> Unit = {},
    private val onHazardAhead: (PotholeNode?, Float) -> Unit = { _, _ -> },
    private val onHazardsLoaded: (Int) -> Unit = {}
) {
    enum class Orientation { HEADING_UP, NORTH_UP }

    var orientation = Orientation.HEADING_UP
        set(value) { field = value; lastLocation?.let { moveCamera(it, animate = true) } }

    var following = true
        private set(value) {
            if (field != value) { field = value; onFollowChanged(value) }
        }

    private val rtdb = FirebaseDatabase.getInstance()
    private var hazardsListener: ValueEventListener? = null
    private val hazardMarkers = mutableListOf<Marker>()
    private var hazards: List<PotholeNode> = emptyList()

    private var userMarker: Marker? = null
    private var lastLocation: Location? = null
    private var displayedBearing = 0f
    private var markerAnimator: ValueAnimator? = null

    init {
        OsmConfig.getInstance().userAgentValue = context.packageName
        mapView.setTileSource(TileSourceFactory.MAPNIK)
        mapView.setMultiTouchControls(true)
        mapView.zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
        mapView.isTilesScaledToDpi = true
        mapView.minZoomLevel = 4.0
        mapView.maxZoomLevel = 19.5
        mapView.controller.setZoom(15.5)
        mapView.controller.setCenter(GeoPoint(23.8103, 90.4125)) // service area until a real fix arrives
        val night = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        if (night) mapView.overlayManager.tilesOverlay.setColorFilter(nightFilter())
        installGestureDetection()
    }

    /** Night map: invert luminance, then pull brightness down so roads read light-on-dark without glare. */
    private fun nightFilter(): ColorMatrixColorFilter {
        val invert = ColorMatrix(floatArrayOf(
            -1f, 0f, 0f, 0f, 255f,
            0f, -1f, 0f, 0f, 255f,
            0f, 0f, -1f, 0f, 255f,
            0f, 0f, 0f, 1f, 0f))
        val dim = ColorMatrix().apply { setScale(0.72f, 0.78f, 0.88f, 1f) }
        invert.postConcat(dim)
        return ColorMatrixColorFilter(invert)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun installGestureDetection() {
        // Only a real pan (past the system touch slop) or a pinch leaves follow mode; taps don't.
        val slop = android.view.ViewConfiguration.get(context).scaledTouchSlop
        var downX = 0f; var downY = 0f
        mapView.setOnTouchListener { _, ev ->
            when (ev.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = ev.x; downY = ev.y }
                MotionEvent.ACTION_POINTER_DOWN -> following = false
                MotionEvent.ACTION_MOVE -> if (abs(ev.x - downX) > slop || abs(ev.y - downY) > slop) following = false
            }
            false
        }
    }

    fun startHazards() {
        if (hazardsListener != null) return
        hazardsListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                hazards = snapshot.children.mapNotNull { PotholeNode.fromReport(it) }.filter { it.isActive }
                renderHazards()
                onHazardsLoaded(hazards.size)
                lastLocation?.let { evaluateHazardAhead(it) }
            }
            override fun onCancelled(error: DatabaseError) = Unit
        }
        rtdb.getReference("reports").addValueEventListener(hazardsListener!!)
    }

    private fun renderHazards() {
        hazardMarkers.forEach { mapView.overlays.remove(it) }
        hazardMarkers.clear()
        for (h in hazards) {
            val m = Marker(mapView).apply {
                position = GeoPoint(h.latitude, h.longitude)
                icon = ContextCompat.getDrawable(context, Severity.markerRes(h.priority, h.status))
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                title = "${Severity.label(h.priority)} pothole"
                setOnMarkerClickListener { _, _ ->
                    val dist = lastLocation?.let { distance(it, h) }
                    onHazardClick(h, dist)
                    true
                }
            }
            hazardMarkers += m
            mapView.overlays.add(0, m) // below the user marker
        }
        mapView.invalidate()
    }

    /** Feed every GPS fix here. */
    fun onLocation(loc: Location) {
        val prev = lastLocation
        lastLocation = loc
        val target = GeoPoint(loc.latitude, loc.longitude)
        val marker = userMarker ?: Marker(mapView).apply {
            icon = ContextCompat.getDrawable(context, R.drawable.marker_user_nav)
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            isFlat = true
            infoWindow = null
            position = target
            mapView.overlays.add(this)
            userMarker = this
        }
        val moving = loc.hasSpeed() && loc.speed > 1.0f && loc.hasBearing()
        val newBearing = if (moving) loc.bearing else displayedBearing

        // Glide the marker from where it is now to the new fix over ~the GPS interval.
        markerAnimator?.cancel()
        val from = marker.position
        val fromBearing = displayedBearing
        val delta = shortestAngle(fromBearing, newBearing)
        markerAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = if (prev == null) 0 else 900
            interpolator = LinearInterpolator()
            addUpdateListener { a ->
                val f = a.animatedFraction
                marker.position = GeoPoint(
                    from.latitude + (target.latitude - from.latitude) * f,
                    from.longitude + (target.longitude - from.longitude) * f
                )
                displayedBearing = (fromBearing + delta * f + 360f) % 360f
                marker.rotation = -displayedBearing // flat marker: rotates with the map, so geographic bearing is correct in both modes
                mapView.invalidate()
            }
            start()
        }
        if (following) moveCamera(loc, animate = prev != null)
        evaluateHazardAhead(loc)
    }

    private fun moveCamera(loc: Location, animate: Boolean) {
        val zoom = zoomForSpeed(if (loc.hasSpeed()) loc.speed else 0f)
        val headingUp = orientation == Orientation.HEADING_UP
        val bearing = if (loc.hasBearing() && loc.hasSpeed() && loc.speed > 1f) loc.bearing else displayedBearing
        // Put the user ~25% below the centre (more road visible ahead) when heading-up.
        val centre = if (headingUp) aheadOf(loc, bearing, zoom) else GeoPoint(loc.latitude, loc.longitude)
        val mapOrientation = if (headingUp) (360f - bearing) % 360f else 0f
        if (animate) mapView.controller.animateTo(centre, zoom, 900L, mapOrientation)
        else {
            mapView.controller.setZoom(zoom)
            mapView.mapOrientation = mapOrientation
            mapView.controller.setCenter(centre)
        }
    }

    private fun aheadOf(loc: Location, bearing: Float, zoom: Double): GeoPoint {
        val metersPerPixel = 156543.03392 * cos(Math.toRadians(loc.latitude)) / 2.0.pow(zoom) /
            context.resources.displayMetrics.density
        val aheadMeters = (mapView.height.takeIf { it > 0 } ?: 1200) * 0.25 * metersPerPixel
        return GeoPoint(loc.latitude, loc.longitude).destinationPoint(aheadMeters, bearing.toDouble())
    }

    private fun zoomForSpeed(speedMs: Float): Double = when {
        speedMs < 4f -> 17.5     // walking / crawling traffic
        speedMs < 12f -> 17.0    // city (< ~43 km/h)
        speedMs < 22f -> 16.3    // arterial roads
        else -> 15.6             // highway
    }

    fun recenter() {
        following = true
        lastLocation?.let { moveCamera(it, animate = true) }
    }

    fun toggleOrientation(): Orientation {
        orientation = if (orientation == Orientation.HEADING_UP) Orientation.NORTH_UP else Orientation.HEADING_UP
        if (orientation == Orientation.NORTH_UP) mapView.mapOrientation = 0f
        return orientation
    }

    fun zoomIn() { following = false; mapView.controller.zoomIn() }
    fun zoomOut() { following = false; mapView.controller.zoomOut() }

    private fun evaluateHazardAhead(loc: Location) {
        var best: PotholeNode? = null
        var bestDist = Float.MAX_VALUE
        val moving = loc.hasSpeed() && loc.speed > 1.5f && loc.hasBearing()
        for (h in hazards) {
            val d = distance(loc, h)
            if (d > 600f || d >= bestDist) continue
            if (moving) {
                val to = FloatArray(2)
                Location.distanceBetween(loc.latitude, loc.longitude, h.latitude, h.longitude, to)
                val bearingTo = (to[1] + 360f) % 360f
                if (abs(shortestAngle(loc.bearing, bearingTo)) > 45f) continue
            }
            best = h; bestDist = d
        }
        onHazardAhead(best, bestDist)
    }

    private fun distance(loc: Location, h: PotholeNode): Float {
        val r = FloatArray(1)
        Location.distanceBetween(loc.latitude, loc.longitude, h.latitude, h.longitude, r)
        return r[0]
    }

    private fun shortestAngle(from: Float, to: Float): Float = ((to - from + 540f) % 360f) - 180f

    fun onResume() = mapView.onResume()
    fun onPause() = mapView.onPause()

    fun destroy() {
        markerAnimator?.cancel()
        hazardsListener?.let { rtdb.getReference("reports").removeEventListener(it) }
        hazardsListener = null
        mapView.onDetach()
    }
}
