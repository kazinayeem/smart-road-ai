package org.smartpothole.app.sync

import android.location.Location
import android.util.Log
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ServerValue
import kotlinx.coroutines.tasks.await
import kotlin.math.cos

/** A physical pothole as shown on maps (read from `reports/{id}`). */
data class PotholeNode(
    var potholeId: String = "",
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var status: String = "NEW",
    var priority: String = "HIGH",
    var totalDetections: Int = 1,
    var firstDetectedAt: Long = 0L,
    var lastDetectedAt: Long = 0L,
    var verified: Boolean = false,
    var address: String = ""
) {
    val isActive: Boolean get() = status !in INACTIVE_STATUSES

    companion object {
        val INACTIVE_STATUSES = setOf("RESOLVED", "REJECTED", "DUPLICATE")

        fun fromReport(snap: DataSnapshot): PotholeNode? {
            val lat = snap.child("latitude").getValue(Double::class.java) ?: return null
            val lng = snap.child("longitude").getValue(Double::class.java) ?: return null
            val created = snap.child("createdAt").getValue(Long::class.java) ?: 0L
            return PotholeNode(
                potholeId = snap.child("reportId").getValue(String::class.java) ?: snap.key ?: "",
                latitude = lat,
                longitude = lng,
                status = snap.child("status").getValue(String::class.java) ?: "NEW",
                priority = snap.child("priority").getValue(String::class.java) ?: "MEDIUM",
                totalDetections = snap.child("totalDetections").getValue(Int::class.java) ?: 1,
                firstDetectedAt = snap.child("firstDetectedAt").getValue(Long::class.java) ?: created,
                lastDetectedAt = snap.child("lastDetectedAt").getValue(Long::class.java) ?: created,
                verified = snap.child("status").getValue(String::class.java) == "VERIFIED",
                address = snap.child("address").getValue(String::class.java) ?: ""
            )
        }
    }
}

/** One observation of a pothole by one device (stored append-only under `detections/{id}`). */
data class DetectionNode(
    var detectionId: String = "",
    var potholeId: String = "",
    var reporterId: String = "",
    var confidence: Double = 0.0,
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var gpsAccuracy: Float = 0f,
    var timestamp: Long = 0L,
    var sessionId: String = "",
    var heading: Float = 0.0f,
    var speed: Float = 0.0f,
    var severity: String = "MEDIUM",
    var source: String = "LIVE_CAMERA"
)

/**
 * Server-side record keeping for a detection:
 *  - `reports/{id}` is the single authoritative record for a physical pothole (the web dashboard,
 *    the mobile map and the nearby-alert monitor all read it).
 *  - `detections/{id}` keeps every individual observation for audit / verification.
 *
 * Matching rule: an active report within max(10 m, min(25 m, GPS accuracy)) is treated as the same
 * pothole and gets one more confirmation. Poor GPS (> 25 m) widens nothing — it never merges
 * reports further apart than 25 m, so close-but-distinct potholes are not silently swallowed.
 *
 * Idempotent: the detection id is the client's UUID, so a retried upload does not double count.
 */
object SmartPotholeDeduplicator {

    private const val TAG = "SmartDeduplicator"
    private const val MIN_MATCH_M = 10f
    private const val MAX_MATCH_M = 25f

    private val rtdb: FirebaseDatabase get() = FirebaseDatabase.getInstance()

    fun matchRadiusFor(gpsAccuracy: Float): Float = gpsAccuracy.coerceIn(MIN_MATCH_M, MAX_MATCH_M)

    /** Returns (reportId, createdNew). */
    suspend fun submitDetection(detection: DetectionNode, reporterName: String): Pair<String, Boolean> {
        require(detection.detectionId.isNotEmpty()) { "detectionId (client UUID) is required" }
        require(detection.reporterId.isNotEmpty()) { "reporterId is required" }
        val root = rtdb.reference
        val detRef = root.child("detections").child(detection.detectionId)

        // Idempotency: this detection was already uploaded by a previous (interrupted) attempt.
        // (Rules only let the reporter read their own detection; "not found" surfaces as denied.)
        val existing = runCatching { detRef.get().await() }.getOrNull()
        if (existing != null && existing.exists()) {
            val pid = existing.child("potholeId").getValue(String::class.java) ?: ""
            return Pair(pid, false)
        }

        val radius = matchRadiusFor(detection.gpsAccuracy)
        val match = findNearestActiveReport(detection.latitude, detection.longitude, radius)

        return if (match != null) {
            detection.potholeId = match
            // Detection first (create-only), then the confirmation counter.
            detRef.setValue(detection).await()
            root.child("reports").child(match).updateChildren(
                mapOf(
                    "totalDetections" to ServerValue.increment(1),
                    "lastDetectedAt" to detection.timestamp
                )
            ).await()
            Log.i(TAG, "Detection ${detection.detectionId} confirmed existing report $match")
            Pair(match, false)
        } else {
            val reportId = root.child("reports").push().key
                ?: throw IllegalStateException("Could not allocate report id")
            detection.potholeId = reportId
            val now = System.currentTimeMillis()
            val report = hashMapOf<String, Any?>(
                "id" to reportId,
                "reportId" to reportId,
                "reporterId" to detection.reporterId,
                "reporterName" to reporterName,
                "detectionClass" to "pothole",
                "confidence" to detection.confidence,
                "latitude" to detection.latitude,
                "longitude" to detection.longitude,
                "gpsAccuracy" to detection.gpsAccuracy,
                "priority" to detection.severity,
                "status" to "NEW",
                "source" to detection.source,
                "totalDetections" to 1,
                "timestamp" to detection.timestamp,
                "firstDetectedAt" to detection.timestamp,
                "lastDetectedAt" to detection.timestamp,
                "createdAt" to detection.timestamp,
                "updatedAt" to now,
                "notes" to "Detected on-device (${(detection.confidence * 100).toInt()}% confidence, ±${detection.gpsAccuracy.toInt()} m GPS)"
            )
            root.child("reports").child(reportId).setValue(report).await()
            detRef.setValue(detection).await()
            root.child("activity_logs").child(reportId).push().setValue(
                mapOf(
                    "timestamp" to now,
                    "previousStatus" to null,
                    "newStatus" to "NEW",
                    "changedBy" to reporterName,
                    "changedByUid" to detection.reporterId,
                    "remarks" to "Reported from Android app (${detection.source})"
                )
            ).await()
            Log.i(TAG, "Detection ${detection.detectionId} created report $reportId")
            Pair(reportId, true)
        }
    }

    /**
     * Bounded query: only reports inside a small latitude band are downloaded (indexed on
     * `latitude`), instead of the previous full download of every pothole on every detection.
     */
    suspend fun findNearestActiveReport(lat: Double, lng: Double, radiusM: Float): String? {
        val dLat = radiusM / 111_320.0
        val dLng = radiusM / (111_320.0 * cos(Math.toRadians(lat)).coerceAtLeast(0.01))
        val snap = rtdb.reference.child("reports").orderByChild("latitude")
            .startAt(lat - dLat).endAt(lat + dLat).get().await()
        var best: String? = null
        var bestDist = Float.MAX_VALUE
        for (child in snap.children) {
            val node = PotholeNode.fromReport(child) ?: continue
            if (!node.isActive) continue
            if (kotlin.math.abs(node.longitude - lng) > dLng) continue
            val d = FloatArray(1)
            Location.distanceBetween(lat, lng, node.latitude, node.longitude, d)
            if (d[0] <= radiusM && d[0] < bestDist) {
                bestDist = d[0]
                best = child.key
            }
        }
        return best
    }
}
