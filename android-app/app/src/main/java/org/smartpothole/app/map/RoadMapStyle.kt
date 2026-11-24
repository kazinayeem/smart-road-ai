package org.smartpothole.app.map

import org.json.JSONArray
import org.json.JSONObject

/**
 * Roads-only vector style for OpenFreeMap (OpenMapTiles schema). Draws: background, water, roads
 * (ranked by importance, with casings), road names and place names. Deliberately omits buildings,
 * land use, parks, POIs and house numbers so the road network is all you see — like a navigation app.
 */
object RoadMapStyle {

    private data class Palette(
        val bg: String, val water: String, val label: String, val halo: String, val placeLabel: String,
        val motorway: String, val motorwayCase: String, val primary: String, val primaryCase: String,
        val secondary: String, val secondaryCase: String, val minor: String, val minorCase: String
    )

    private val LIGHT = Palette(
        bg = "#EEF1F5", water = "#BFD6EA", label = "#334155", halo = "#FFFFFF", placeLabel = "#0F172A",
        motorway = "#F59E0B", motorwayCase = "#B45309", primary = "#FCD34D", primaryCase = "#C08A12",
        secondary = "#FFFFFF", secondaryCase = "#B8C2CF", minor = "#FFFFFF", minorCase = "#D3DAE3"
    )
    private val DARK = Palette(
        bg = "#0B1220", water = "#0F2A40", label = "#CBD5E1", halo = "#0B1220", placeLabel = "#F1F5F9",
        motorway = "#D97706", motorwayCase = "#78350F", primary = "#A16207", primaryCase = "#422006",
        secondary = "#5B6B85", secondaryCase = "#1E293B", minor = "#3E4C66", minorCase = "#1A2335"
    )

    private const val ATTRIBUTION =
        "<a href=\"https://openfreemap.org\">OpenFreeMap</a> © <a href=\"https://www.openmaptiles.org/\">OpenMapTiles</a> " +
            "Data from <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"

    fun json(night: Boolean): String {
        val p = if (night) DARK else LIGHT
        val layers = JSONArray()
        layers.put(obj("id" to "background", "type" to "background", "paint" to obj("background-color" to p.bg)))
        layers.put(obj("id" to "water", "type" to "fill", "source" to "omt", "source-layer" to "water",
            "paint" to obj("fill-color" to p.water)))

        // Road classes from least to most important (drawn in that order so big roads sit on top).
        data class Road(val id: String, val classes: List<String>, val color: String, val case: String, val w10: Double, val w18: Double)
        val roads = listOf(
            Road("minor", listOf("minor", "service"), p.minor, p.minorCase, 0.4, 9.0),
            Road("secondary", listOf("secondary", "tertiary"), p.secondary, p.secondaryCase, 1.0, 14.0),
            Road("primary", listOf("primary", "trunk"), p.primary, p.primaryCase, 1.6, 18.0),
            Road("motorway", listOf("motorway"), p.motorway, p.motorwayCase, 2.2, 20.0)
        )
        for (r in roads) {
            val filter = JSONArray().put("all")
                .put(JSONArray().put("==").put(JSONArray().put("geometry-type")).put("LineString"))
                .put(JSONArray().put("in").put(JSONArray().put("get").put("class")).put(JSONArray().apply { put("literal"); put(JSONArray(r.classes)) }))
            layers.put(obj("id" to "road-${r.id}-case", "type" to "line", "source" to "omt", "source-layer" to "transportation",
                "filter" to filter, "layout" to obj("line-cap" to "round", "line-join" to "round"),
                "paint" to obj("line-color" to r.case, "line-width" to width(r.w10 + 1.2, r.w18 + 3.0))))
        }
        for (r in roads) {
            val filter = JSONArray().put("all")
                .put(JSONArray().put("==").put(JSONArray().put("geometry-type")).put("LineString"))
                .put(JSONArray().put("in").put(JSONArray().put("get").put("class")).put(JSONArray().apply { put("literal"); put(JSONArray(r.classes)) }))
            layers.put(obj("id" to "road-${r.id}", "type" to "line", "source" to "omt", "source-layer" to "transportation",
                "filter" to filter, "layout" to obj("line-cap" to "round", "line-join" to "round"),
                "paint" to obj("line-color" to r.color, "line-width" to width(r.w10, r.w18))))
        }

        layers.put(obj("id" to "road-names", "type" to "symbol", "source" to "omt", "source-layer" to "transportation_name", "minzoom" to 13,
            "layout" to obj(
                "symbol-placement" to "line",
                "text-field" to JSONArray("[\"coalesce\", [\"get\", \"name:en\"], [\"get\", \"name:latin\"], [\"get\", \"name\"]]"),
                "text-font" to JSONArray().put("Noto Sans Regular"),
                "text-size" to JSONArray("[\"interpolate\", [\"linear\"], [\"zoom\"], 13, 10, 18, 14]")),
            "paint" to obj("text-color" to p.label, "text-halo-color" to p.halo, "text-halo-width" to 1.4)))

        layers.put(obj("id" to "place-names", "type" to "symbol", "source" to "omt", "source-layer" to "place",
            "filter" to JSONArray("[\"in\", [\"get\", \"class\"], [\"literal\", [\"city\", \"town\", \"suburb\", \"quarter\", \"neighbourhood\"]]]"),
            "layout" to obj(
                "text-field" to JSONArray("[\"coalesce\", [\"get\", \"name:en\"], [\"get\", \"name:latin\"], [\"get\", \"name\"]]"),
                "text-font" to JSONArray().put("Noto Sans Bold"),
                "text-size" to JSONArray("[\"interpolate\", [\"linear\"], [\"zoom\"], 10, 11, 16, 15]"),
                "text-max-width" to 8),
            "paint" to obj("text-color" to p.placeLabel, "text-halo-color" to p.halo, "text-halo-width" to 1.6)))

        return obj(
            "version" to 8,
            "name" to "SmartPothole Roads ${if (night) "Night" else "Day"}",
            "glyphs" to "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
            "sources" to obj("omt" to obj("type" to "vector", "url" to "https://tiles.openfreemap.org/planet", "attribution" to ATTRIBUTION)),
            "layers" to layers
        ).toString()
    }

    private fun width(at10: Double, at18: Double) =
        JSONArray("[\"interpolate\", [\"exponential\", 1.5], [\"zoom\"], 10, $at10, 18, $at18]")

    private fun obj(vararg pairs: Pair<String, Any>) = JSONObject().apply { pairs.forEach { (k, v) -> put(k, v) } }
}
