package org.smartpothole.app.map

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.location.Location
import android.os.Bundle
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.location.LocationComponent
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.location.LocationComponentOptions
import org.maplibre.android.location.OnCameraTrackingChangedListener
import org.maplibre.android.location.modes.CameraMode
import org.maplibre.android.location.modes.RenderMode
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonOptions
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.LineString
import org.maplibre.geojson.Point
import org.smartpothole.app.sync.PotholeNode
import kotlin.math.abs

/**
 * Roads-only, driving-style live map (MapLibre + OpenFreeMap vector tiles):
 *  - Navigation camera: follows GPS with heading-up rotation and a 45° tilt, user puck in the lower
 *    part of the screen; speed-aware zoom. Panning leaves follow mode; [recenter] resumes it.
 *  - Reported potholes as severity-coloured circles that cluster when zoomed out; tap for details.
 *  - Optional planned routes ([setRoutes]); potholes on the selected route get a highlight ring.
 * Hosts must forward lifecycle: onStart/onResume/onPause/onStop/onSaveInstanceState/onLowMemory/destroy.
 */
class LiveMapController(
    private val context: Context,
    private val mapView: MapView,
    savedInstanceState: Bundle? = null,
    private val onHazardClick: (PotholeNode, Float?) -> Unit = { _, _ -> },
    private val onFollowChanged: (Boolean) -> Unit = {},
    private val onHazardAhead: (PotholeNode?, Float) -> Unit = { _, _ -> },
    private val onHazardsLoaded: (List<PotholeNode>) -> Unit = {},
    private val bottomInsetDp: Int = 92
) {
    enum class Orientation { HEADING_UP, NORTH_UP }

    var orientation = Orientation.HEADING_UP
        private set
    var following = true
        private set(value) { if (field != value) { field = value; onFollowChanged(value) } }

    private var map: MapLibreMap? = null
    private var style: Style? = null
    private var location: LocationComponent? = null
    private var lastLocation: Location? = null
    private var lastZoomBucket = -1
    private val rtdb = FirebaseDatabase.getInstance()
    private var hazardsListener: ValueEventListener? = null
    var hazards: List<PotholeNode> = emptyList()
        private set
    private val hazardById = mutableMapOf<String, PotholeNode>()
    private var routes: List<RouteOption> = emptyList()
    private var selectedRoute = 0
    private val night = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    init {
        mapView.onCreate(savedInstanceState)
        mapView.getMapAsync { m ->
            map = m
            m.uiSettings.isCompassEnabled = true
            m.uiSettings.isRotateGesturesEnabled = true
            m.uiSettings.isTiltGesturesEnabled = true
            // Keep the MapLibre logo and the OpenStreetMap/OpenFreeMap credit visible above floating controls.
            val d = context.resources.displayMetrics.density
            m.uiSettings.setLogoMargins((16 * d).toInt(), 0, 0, (bottomInsetDp * d).toInt())
            m.uiSettings.setAttributionMargins((110 * d).toInt(), 0, 0, (bottomInsetDp * d).toInt())
            m.cameraPosition = CameraPosition.Builder().target(LatLng(23.8103, 90.4125)).zoom(12.0).build()
            m.setStyle(Style.Builder().fromJson(RoadMapStyle.json(night))) { s ->
                style = s
                addOverlayLayers(s)
                enableLocation(m, s)
                renderHazards(); renderRoutes()
                lastLocation?.let { location?.forceLocationUpdate(it) }
            }
            m.addOnMapClickListener { point -> handleClick(m, point) }
        }
    }

    // ---------- layers ----------

    private fun addOverlayLayers(s: Style) {
        s.addSource(GeoJsonSource("routes-alt"))
        s.addSource(GeoJsonSource("route"))
        s.addLayer(LineLayer("routes-alt-line", "routes-alt").withProperties(
            PropertyFactory.lineColor(if (night) "#64748B" else "#94A3B8"), PropertyFactory.lineWidth(6f),
            PropertyFactory.lineCap(Property.LINE_CAP_ROUND), PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND), PropertyFactory.lineOpacity(0.8f)))
        s.addLayer(LineLayer("route-casing", "route").withProperties(
            PropertyFactory.lineColor("#0B4F63"), PropertyFactory.lineWidth(10f),
            PropertyFactory.lineCap(Property.LINE_CAP_ROUND), PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND)))
        s.addLayer(LineLayer("route-line", "route").withProperties(
            PropertyFactory.lineColor(if (night) "#22D3EE" else "#0E7490"), PropertyFactory.lineWidth(6f),
            PropertyFactory.lineCap(Property.LINE_CAP_ROUND), PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND)))

        s.addSource(GeoJsonSource("hazards", GeoJsonOptions().withCluster(true).withClusterMaxZoom(14).withClusterRadius(42)))
        val clustered = Expression.has("point_count")
        s.addLayer(CircleLayer("hazard-clusters", "hazards").withFilter(clustered).withProperties(
            PropertyFactory.circleColor(Color.parseColor("#C2410C")),
            PropertyFactory.circleRadius(Expression.step(Expression.get("point_count"), Expression.literal(15), Expression.stop(10, 19), Expression.stop(50, 24))),
            PropertyFactory.circleStrokeColor(Color.WHITE), PropertyFactory.circleStrokeWidth(2.5f)))
        s.addLayer(SymbolLayer("hazard-cluster-count", "hazards").withFilter(clustered).withProperties(
            PropertyFactory.textField(Expression.toString(Expression.get("point_count"))),
            PropertyFactory.textFont(arrayOf("Noto Sans Bold")), PropertyFactory.textSize(13f),
            PropertyFactory.textColor(Color.WHITE), PropertyFactory.textAllowOverlap(true)))
        val single = Expression.not(clustered)
        s.addLayer(CircleLayer("hazard-route-ring", "hazards").withFilter(Expression.all(single, Expression.eq(Expression.get("onRoute"), true))).withProperties(
            PropertyFactory.circleRadius(16f), PropertyFactory.circleColor(Color.TRANSPARENT),
            PropertyFactory.circleStrokeColor(if (night) "#22D3EE" else "#0E7490"), PropertyFactory.circleStrokeWidth(3f)))
        s.addLayer(CircleLayer("hazard", "hazards").withFilter(single).withProperties(
            PropertyFactory.circleColor(Expression.get("color")), PropertyFactory.circleRadius(9f),
            PropertyFactory.circleStrokeColor(Color.WHITE), PropertyFactory.circleStrokeWidth(2.5f)))
        s.addLayer(SymbolLayer("hazard-glyph", "hazards").withFilter(single).withProperties(
            PropertyFactory.textField("!"), PropertyFactory.textFont(arrayOf("Noto Sans Bold")),
            PropertyFactory.textSize(13f), PropertyFactory.textColor(Color.WHITE), PropertyFactory.textAllowOverlap(true),
            PropertyFactory.textIgnorePlacement(true)))
    }

    @SuppressLint("MissingPermission")
    private fun enableLocation(m: MapLibreMap, s: Style) {
        try {
            val opts = LocationComponentOptions.builder(context)
                .gpsDrawable(org.smartpothole.app.R.drawable.marker_user_nav)
                .accuracyAlpha(0.12f)
                .build()
            val lc = m.locationComponent
            // We feed fixes ourselves (forceLocationUpdate) from the app's single LocationTracker.
            lc.activateLocationComponent(LocationComponentActivationOptions.builder(context, s)
                .locationComponentOptions(opts).useDefaultLocationEngine(false).build())
            lc.isLocationComponentEnabled = true
            lc.renderMode = RenderMode.GPS
            lc.cameraMode = CameraMode.TRACKING_GPS
            lc.tiltWhileTracking(45.0)
            lc.zoomWhileTracking(16.8)
            lc.addOnCameraTrackingChangedListener(object : OnCameraTrackingChangedListener {
                override fun onCameraTrackingDismissed() { following = false }
                override fun onCameraTrackingChanged(currentMode: Int) {}
            })
            mapView.post { lc.paddingWhileTracking(doubleArrayOf(0.0, mapView.height * 0.42, 0.0, 0.0)) }
            location = lc
        } catch (e: Exception) {
            android.util.Log.w("LiveMap", "Location layer unavailable: ${e.message}")
        }
    }

    // ---------- data ----------

    fun startHazards() {
        if (hazardsListener != null) return
        hazardsListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                hazards = snapshot.children.mapNotNull { c -> PotholeNode.fromReport(c)?.also { it.potholeId = c.key ?: it.potholeId } }.filter { it.isActive }
                hazardById.clear(); hazards.forEach { hazardById[it.potholeId] = it }
                renderHazards()
                onHazardsLoaded(hazards)
                lastLocation?.let(::evaluateHazardAhead)
            }
            override fun onCancelled(error: DatabaseError) = Unit
        }
        rtdb.getReference("reports").addValueEventListener(hazardsListener!!)
    }

    private fun renderHazards() {
        val s = style ?: return
        val onRoute = routes.getOrNull(selectedRoute)?.hazards?.map { it.node.potholeId }?.toSet() ?: emptySet()
        val features = hazards.map { h ->
            Feature.fromGeometry(Point.fromLngLat(h.longitude, h.latitude)).apply {
                addStringProperty("id", h.potholeId)
                addStringProperty("color", colorFor(h))
                addBooleanProperty("onRoute", h.potholeId in onRoute)
            }
        }
        s.getSourceAs<GeoJsonSource>("hazards")?.setGeoJson(FeatureCollection.fromFeatures(features))
    }

    private fun colorFor(h: PotholeNode) = when {
        h.status in setOf("ASSIGNED", "ACCEPTED", "IN_PROGRESS", "REPAIR_SUBMITTED", "CITY_VERIFICATION") -> "#6D28D9"
        h.priority == "CRITICAL" || h.priority == "HIGH" -> "#DC2626"
        h.priority == "MEDIUM" -> "#D97706"
        else -> "#2563EB"
    }

    // ---------- routes ----------

    fun setRoutes(options: List<RouteOption>, selected: Int, frame: Boolean) {
        routes = options; selectedRoute = selected
        renderRoutes(); renderHazards()
        if (frame) frameRoute()
    }

    private fun renderRoutes() {
        val s = style ?: return
        val sel = routes.getOrNull(selectedRoute)
        val alts = routes.filterIndexed { i, _ -> i != selectedRoute }.map { Feature.fromGeometry(lineOf(it)) }
        s.getSourceAs<GeoJsonSource>("routes-alt")?.setGeoJson(FeatureCollection.fromFeatures(alts))
        s.getSourceAs<GeoJsonSource>("route")?.setGeoJson(FeatureCollection.fromFeatures(listOfNotNull(sel?.let { Feature.fromGeometry(lineOf(it)) })))
    }

    private fun lineOf(r: RouteOption) = LineString.fromLngLats(r.points.map { Point.fromLngLat(it[0], it[1]) })

    /** Pixels covered by floating UI at the top / bottom of the map, so framed routes stay visible. */
    var frameTopPx = 0
    var frameBottomPx = 0

    fun frameRoute() {
        val m = map ?: return
        val r = routes.getOrNull(selectedRoute) ?: return
        if (r.points.size < 2) return
        following = false
        location?.cameraMode = CameraMode.NONE
        val b = LatLngBounds.Builder().apply { r.points.forEach { include(LatLng(it[1], it[0])) } }.build()
        val pad = (48 * context.resources.displayMetrics.density).toInt()
        val top = maxOf(pad, frameTopPx + pad / 2)
        val bottom = maxOf(pad, frameBottomPx + pad / 2)
        m.animateCamera(CameraUpdateFactory.newLatLngBounds(b, pad, top, pad, bottom), 700)
    }

    fun focus(lat: Double, lon: Double) {
        following = false
        location?.cameraMode = CameraMode.NONE
        map?.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(lat, lon), 17.0), 600)
    }

    // ---------- location / camera ----------

    fun onLocation(loc: Location) {
        lastLocation = loc
        val lc = location
        lc?.forceLocationUpdate(loc)
        val speed = if (loc.hasSpeed()) loc.speed else 0f
        val bucket = when { speed < 4f -> 0; speed < 12f -> 1; speed < 22f -> 2; else -> 3 }
        if (following && bucket != lastZoomBucket) {
            lastZoomBucket = bucket
            lc?.zoomWhileTracking(doubleArrayOf(17.4, 16.8, 16.0, 15.2)[bucket], 1200)
        }
        if (lc == null && following) map?.animateCamera(CameraUpdateFactory.newLatLng(LatLng(loc.latitude, loc.longitude)), 800)
        evaluateHazardAhead(loc)
    }

    fun recenter() {
        following = true
        location?.cameraMode = if (orientation == Orientation.HEADING_UP) CameraMode.TRACKING_GPS else CameraMode.TRACKING_GPS_NORTH
        location?.tiltWhileTracking(if (orientation == Orientation.HEADING_UP) 45.0 else 0.0)
        lastZoomBucket = -1
        lastLocation?.let { onLocation(it) }
    }

    fun toggleOrientation(): Orientation {
        orientation = if (orientation == Orientation.HEADING_UP) Orientation.NORTH_UP else Orientation.HEADING_UP
        recenter()
        return orientation
    }

    fun zoomIn() { map?.animateCamera(CameraUpdateFactory.zoomIn()) }
    fun zoomOut() { map?.animateCamera(CameraUpdateFactory.zoomOut()) }

    private fun handleClick(m: MapLibreMap, point: LatLng): Boolean {
        val screen = m.projection.toScreenLocation(point)
        val cluster = m.queryRenderedFeatures(screen, "hazard-clusters").firstOrNull()
        if (cluster != null) {
            following = false
            location?.cameraMode = CameraMode.NONE
            m.animateCamera(CameraUpdateFactory.newLatLngZoom(point, m.cameraPosition.zoom + 2), 500)
            return true
        }
        val f = m.queryRenderedFeatures(screen, "hazard", "hazard-glyph").firstOrNull() ?: return false
        val h = hazardById[f.getStringProperty("id")] ?: return false
        onHazardClick(h, lastLocation?.let { distance(it, h) })
        return true
    }

    private fun evaluateHazardAhead(loc: Location) {
        val pool = routes.getOrNull(selectedRoute)?.hazards?.map { it.node } ?: hazards
        var best: PotholeNode? = null
        var bestDist = Float.MAX_VALUE
        val moving = loc.hasSpeed() && loc.speed > 1.5f && loc.hasBearing()
        for (h in pool) {
            val d = distance(loc, h)
            if (d > 600f || d >= bestDist) continue
            if (moving) {
                val r = FloatArray(2)
                Location.distanceBetween(loc.latitude, loc.longitude, h.latitude, h.longitude, r)
                val delta = ((r[1] - loc.bearing + 540f) % 360f) - 180f
                if (abs(delta) > 45f) continue
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

    // ---------- lifecycle ----------
    fun onStart() = mapView.onStart()
    fun onResume() = mapView.onResume()
    fun onPause() = mapView.onPause()
    fun onStop() = mapView.onStop()
    fun onLowMemory() = mapView.onLowMemory()
    fun onSaveInstanceState(out: Bundle) = mapView.onSaveInstanceState(out)

    fun destroy() {
        hazardsListener?.let { rtdb.getReference("reports").removeEventListener(it) }
        hazardsListener = null
        mapView.onDestroy()
    }
}
