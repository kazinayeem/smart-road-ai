package org.smartpothole.app.session

import com.google.firebase.database.IgnoreExtraProperties

@IgnoreExtraProperties
data class LiveSession(
    var sessionId: String = "",
    var sessionCode: String = "",
    var scannerId: String = "",
    var scannerName: String = "Scanner",
    var status: String = "ACTIVE", // ACTIVE, PAUSED, ENDED
    var startedAt: Long = 0L,
    var lastActiveAt: Long = 0L,
    var scanner_location: ScannerLocation? = null,
    var participants: Map<String, SessionParticipant> = emptyMap(),
    var detections: Map<String, SessionDetection> = emptyMap()
)

@IgnoreExtraProperties
data class SessionParticipant(
    var uid: String = "",
    var name: String = "",
    var role: String = "COMPANION", // SCANNER or COMPANION
    var joinedAt: Long = 0L,
    var lastSeenAt: Long = 0L
)

@IgnoreExtraProperties
data class ScannerLocation(
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var accuracy: Float = 0.0f,
    var timestamp: Long = 0L,
    var speed: Float = 0.0f,
    var bearing: Float = 0.0f
)

@IgnoreExtraProperties
data class SessionDetection(
    var detectionId: String = "",
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var confidence: Double = 0.0,
    var timestamp: Long = 0L,
    var status: String = "NEW",
    var gpsAccuracy: Float = 0.0f,
    var detectionClass: String = "pothole",
    var severity: String = "HIGH"
)

enum class ScannerStatus {
    ONLINE,
    GPS_STALE,
    OFFLINE
}
