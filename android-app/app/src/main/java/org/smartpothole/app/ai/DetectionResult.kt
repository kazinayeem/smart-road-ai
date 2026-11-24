package org.smartpothole.app.ai

data class DetectionResult(
    val x1: Float, // Normalized [0, 1]
    val y1: Float,
    val x2: Float,
    val y2: Float,
    val confidence: Float,
    val areaRatio: Float,
    val severity: String, // "LOW", "MEDIUM", "HIGH", "CRITICAL"
    val className: String = "pothole"
)
