package org.smartpothole.app.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pothole_reports")
data class PotholeReportEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val reportId: String = "",
    val clientUuid: String,
    val reporterId: String = "citizen_mobile_device",
    val detectionClass: String = "pothole",
    val latitude: Double,
    val longitude: Double,
    val gpsAccuracy: Float = 5.0f,
    val confidence: Float,
    val areaRatio: Float = 0.05f,
    val priority: String = "HIGH", // "LOW", "MEDIUM", "HIGH", "CRITICAL"
    val status: String = "NEW",    // "NEW", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED"
    val source: String = "LIVE_CAMERA",
    val notes: String?,
    val imagePath: String = "",    // Empty: Metadata-only reporting
    val syncStatus: String = "PENDING", // "PENDING", "SYNCED", "FAILED"
    val createdAt: Long = System.currentTimeMillis()
)
