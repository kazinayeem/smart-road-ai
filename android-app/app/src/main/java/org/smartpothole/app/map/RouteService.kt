package org.smartpothole.app.map

import android.location.Location
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.smartpothole.app.sync.PotholeNode
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.math.cos
import kotlin.math.sqrt

data class Place(val name: String, val detail: String, val lat: Double, val lon: Double)

data class HazardOnRoute(val node: PotholeNode, val alongMeters: Double, val offsetMeters: Double)

data class RouteOption(
    val points: List<DoubleArray>,           // [lon, lat]
    val distanceMeters: Double,
    val durationSeconds: Double,
    val hazards: List<HazardOnRoute> = emptyList(),
    val labels: List<String> = emptyList()
)

/**
 * Place search (OpenStreetMap Nominatim) and road routing (OSRM). Both are free public services with
 * fair-use limits: Nominatim ≤ 1 request/second with an identifying User-Agent and no
 * search-as-you-type; the OSRM demo server is for light use. For production traffic, self-host OSRM
 * and Nominatim (or use a commercial provider) — only these two URLs need to change.
 */
object RouteService {
    private const val NOMINATIM = "https://nominatim.openstreetmap.org/search"
    private const val OSRM = "https://router.project-osrm.org/route/v1/driving"
    private const val USER_AGENT = "SmartPotholeAI/1.0 (Android; road-safety app)"
    private var lastSearchAt = 0L

    /** Search places, biased toward [near] when known. Runs only on explicit submit (not per keystroke). */
    suspend fun search(query: String, near: Location?): List<Place> = withContext(Dispatchers.IO) {
        val wait = 1100 - (System.currentTimeMillis() - lastSearchAt)
        if (wait > 0) Thread.sleep(wait) // Nominatim usage policy: max 1 request per second
        lastSearchAt = System.currentTimeMillis()
        var url = "$NOMINATIM?format=jsonv2&addressdetails=0&limit=6&q=${URLEncoder.encode(query, "UTF-8")}"
        if (near != null) {
            val d = 0.35 // ~35 km box: prefer nearby matches without excluding others
            url += "&viewbox=${near.longitude - d},${near.latitude + d},${near.longitude + d},${near.latitude - d}"
        }
        val arr = JSONArray(get(url))
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val full = o.optString("display_name")
            Place(full.substringBefore(","), full.substringAfter(", ", "").take(90), o.getString("lat").toDouble(), o.getString("lon").toDouble())
        }
    }

    /** Real road routes (up to 3 alternatives), each annotated with the reported potholes along it. */
    suspend fun routes(from: Place, to: Place, hazards: List<PotholeNode>): List<RouteOption> = withContext(Dispatchers.IO) {
        val url = "$OSRM/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&alternatives=3&steps=false"
        val json = JSONObject(get(url))
        if (json.optString("code") != "Ok") throw IllegalStateException(json.optString("message", "No route found"))
        val arr = json.getJSONArray("routes")
        val options = (0 until arr.length()).map { i ->
            val r = arr.getJSONObject(i)
            val coords = r.getJSONObject("geometry").getJSONArray("coordinates")
            val pts = (0 until coords.length()).map { j -> coords.getJSONArray(j).let { doubleArrayOf(it.getDouble(0), it.getDouble(1)) } }
            RouteOption(pts, r.getDouble("distance"), r.getDouble("duration"), hazardsAlong(pts, hazards))
        }
        label(options)
    }

    /** "Fastest" is OSRM's first route; "Fewest reported potholes" only when a different route has fewer. */
    private fun label(options: List<RouteOption>): List<RouteOption> {
        if (options.isEmpty()) return options
        val fastest = options.indices.minByOrNull { options[it].durationSeconds }!!
        val fewest = options.indices.minWithOrNull(compareBy({ options[it].hazards.size }, { options[it].durationSeconds }))!!
        return options.mapIndexed { i, o ->
            val l = mutableListOf<String>()
            if (i == fastest) l += "Fastest"
            if (i == fewest && options[fewest].hazards.size < options[fastest].hazards.size) l += "Fewest reported potholes"
            o.copy(labels = l)
        }
    }

    /** Active potholes within [corridor] metres of the route, ordered by distance along it. */
    fun hazardsAlong(points: List<DoubleArray>, hazards: List<PotholeNode>, corridor: Double = 30.0): List<HazardOnRoute> {
        if (points.size < 2) return emptyList()
        val lat0 = points[0][1]
        val kx = 111_320.0 * cos(Math.toRadians(lat0)); val ky = 110_540.0
        val cum = DoubleArray(points.size)
        for (i in 1 until points.size) {
            val dx = (points[i][0] - points[i - 1][0]) * kx; val dy = (points[i][1] - points[i - 1][1]) * ky
            cum[i] = cum[i - 1] + sqrt(dx * dx + dy * dy)
        }
        val result = mutableListOf<HazardOnRoute>()
        for (h in hazards) {
            if (!h.isActive) continue
            var best = Double.MAX_VALUE; var along = 0.0
            for (i in 1 until points.size) {
                val ax = points[i - 1][0] * kx; val ay = points[i - 1][1] * ky
                val bx = points[i][0] * kx; val by = points[i][1] * ky
                val px = h.longitude * kx; val py = h.latitude * ky
                val vx = bx - ax; val vy = by - ay
                val len2 = vx * vx + vy * vy
                val t = if (len2 == 0.0) 0.0 else (((px - ax) * vx + (py - ay) * vy) / len2).coerceIn(0.0, 1.0)
                val cx = ax + t * vx; val cy = ay + t * vy
                val d = sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy))
                if (d < best) { best = d; along = cum[i - 1] + t * sqrt(len2) }
            }
            if (best <= corridor) result += HazardOnRoute(h, along, best)
        }
        return result.sortedBy { it.alongMeters }
    }

    private fun get(url: String): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.setRequestProperty("User-Agent", USER_AGENT)
        c.setRequestProperty("Accept-Language", "en")
        c.connectTimeout = 10_000; c.readTimeout = 15_000
        try {
            if (c.responseCode !in 200..299) throw IllegalStateException("Service error ${c.responseCode}")
            return c.inputStream.bufferedReader().use { it.readText() }
        } finally { c.disconnect() }
    }
}
