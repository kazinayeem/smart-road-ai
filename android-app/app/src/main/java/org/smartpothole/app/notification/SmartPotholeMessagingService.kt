package org.smartpothole.app.notification

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SmartPotholeMessagingService : FirebaseMessagingService() {

    private val TAG = "FCMService"

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Never log the token itself. Store it so the backend can target this device.
        com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid?.let { uid ->
            org.smartpothole.app.auth.AuthManager.saveFcmToken(uid, token)
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "From: ${remoteMessage.from}")

        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            val type = data["type"] ?: "DETECTION"
            val helper = LiveCompanionNotificationHelper(applicationContext)

            when (type) {
                "NEW_DETECTION" -> {
                    // Ignore malformed pushes instead of showing an alert at a made-up location.
                    val detId = data["detectionId"] ?: return
                    val lat = data["latitude"]?.toDoubleOrNull() ?: return
                    val lng = data["longitude"]?.toDoubleOrNull() ?: return
                    val conf = data["confidence"]?.toDoubleOrNull() ?: 0.0
                    val severity = data["severity"] ?: "MEDIUM"
                    val detectedAt = data["timestamp"]?.toLongOrNull() ?: System.currentTimeMillis()
                    helper.notifyNewDetection(detId, conf, severity, lat, lng, detectedAt)
                }
                "AREA_CHANGED" -> {
                    val area = data["areaName"] ?: "New Sector"
                    helper.notifyAreaChanged(area)
                }
                "GPS_LOST" -> helper.notifyGpsLost()
                "SCANNER_OFFLINE" -> helper.notifyScannerOffline()
                "SESSION_ENDED" -> helper.notifySessionEnded()
            }
        }

        remoteMessage.notification?.let {
            Log.d(TAG, "Message Notification Body: ${it.body}")
        }
    }
}
