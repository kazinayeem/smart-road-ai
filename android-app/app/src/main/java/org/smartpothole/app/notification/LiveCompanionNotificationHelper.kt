package org.smartpothole.app.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.smartpothole.app.R
import org.smartpothole.app.ui.MainActivity

class LiveCompanionNotificationHelper(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("companion_notification_prefs", Context.MODE_PRIVATE)

    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    companion object {
        const val CHANNEL_ID_DETECTIONS = "channel_live_detections"
        const val CHANNEL_ID_STATUS = "channel_scanner_status"
        const val PREF_SOUND_ENABLED = "pref_sound_enabled"
        const val PREF_VIBRATE_ENABLED = "pref_vibrate_enabled"
        const val PREF_GPS_ALERTS_ENABLED = "pref_gps_alerts_enabled"
        const val PREF_AREA_ALERTS_ENABLED = "pref_area_alerts_enabled"
    }

    // Set of notified detection IDs to strictly prevent duplicates
    private val notifiedDetectionIds = object : LinkedHashSet<String>() {
        override fun add(element: String): Boolean {
            val added = super.add(element)
            if (size > 500) remove(first())
            return added
        }
    }
    private var lastNotifiedAreaTimestamp = 0L

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val detectionChannel = NotificationChannel(
                CHANNEL_ID_DETECTIONS,
                "Live Pothole Detections",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority notifications for real-time pothole detections"
                enableVibration(true)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()
                )
            }

            val statusChannel = NotificationChannel(
                CHANNEL_ID_STATUS,
                "Scanner Status Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Updates on scanner connectivity, GPS lock, and session status"
            }

            notificationManager.createNotificationChannel(detectionChannel)
            notificationManager.createNotificationChannel(statusChannel)
        }
    }

    fun isSoundEnabled(): Boolean = prefs.getBoolean(PREF_SOUND_ENABLED, true)
    fun isVibrateEnabled(): Boolean = prefs.getBoolean(PREF_VIBRATE_ENABLED, true)
    fun isGpsAlertsEnabled(): Boolean = prefs.getBoolean(PREF_GPS_ALERTS_ENABLED, true)
    fun isAreaAlertsEnabled(): Boolean = prefs.getBoolean(PREF_AREA_ALERTS_ENABLED, true)

    fun setPreference(key: String, value: Boolean) {
        prefs.edit().putBoolean(key, value).apply()
    }

    /**
     * Alert companion of a new pothole detection with duplicate suppression.
     */
    fun notifyNewDetection(detectionId: String, confidence: Double, severity: String, lat: Double, lng: Double, detectedAt: Long = System.currentTimeMillis()) {
        if (notifiedDetectionIds.contains(detectionId)) {
            return // Duplicate suppression
        }
        notifiedDetectionIds.add(detectionId)

        // Haptic feedback
        if (isVibrateEnabled()) {
            triggerVibration()
        }

        // Sound alert
        if (isSoundEnabled()) {
            triggerSound()
        }

        // System notification
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            detectionId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val confPct = (confidence * 100).toInt()
        val builder = NotificationCompat.Builder(context, CHANNEL_ID_DETECTIONS)
            .setSmallIcon(android.R.drawable.stat_notify_error)
            .setContentTitle("⚠️ Pothole Detected ($confPct% • $severity)")
            .setContentText("${org.smartpothole.app.util.TimeFormat.dateTime(detectedAt)} • ${String.format("%.4f", lat)}, ${String.format("%.4f", lng)}")
            .setWhen(detectedAt)
            .setShowWhen(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        try {
            NotificationManagerCompat.from(context).notify(detectionId.hashCode(), builder.build())
        } catch (_: SecurityException) {}
    }

    /**
     * Alert companion when scanner enters a new area.
     */
    fun notifyAreaChanged(areaName: String) {
        if (!isAreaAlertsEnabled()) return
        val now = System.currentTimeMillis()
        if (now - lastNotifiedAreaTimestamp < 60000L) return // Max 1 per minute
        lastNotifiedAreaTimestamp = now

        if (isVibrateEnabled()) triggerShortVibration()

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_STATUS)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle("🚗 Scanner Relocated")
            .setContentText("Scanner has moved to: $areaName")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        try {
            NotificationManagerCompat.from(context).notify(1001, builder.build())
        } catch (_: SecurityException) {}
    }

    /**
     * Alert companion when scanner loses GPS lock.
     */
    fun notifyGpsLost() {
        if (!isGpsAlertsEnabled()) return

        if (isVibrateEnabled()) triggerShortVibration()

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_STATUS)
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setContentTitle("📡 Scanner GPS Signal Lost")
            .setContentText("Scanner device has lost reliable GPS lock or movement tracking.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        try {
            NotificationManagerCompat.from(context).notify(1002, builder.build())
        } catch (_: SecurityException) {}
    }

    /**
     * Alert companion when scanner device goes offline.
     */
    fun notifyScannerOffline() {
        if (isVibrateEnabled()) triggerShortVibration()

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_STATUS)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("🔴 Scanner Disconnected")
            .setContentText("The active scanner has stopped sending heartbeats and may be offline.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        try {
            NotificationManagerCompat.from(context).notify(1003, builder.build())
        } catch (_: SecurityException) {}
    }

    /**
     * Alert companion when the session is ended by the scanner.
     */
    fun notifySessionEnded() {
        val builder = NotificationCompat.Builder(context, CHANNEL_ID_STATUS)
            .setSmallIcon(android.R.drawable.ic_lock_power_off)
            .setContentTitle("🏁 Live Session Completed")
            .setContentText("The scanning session has been formally closed by the scanner.")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        try {
            NotificationManagerCompat.from(context).notify(1004, builder.build())
        } catch (_: SecurityException) {}
    }

    private fun triggerVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 150, 100, 200), -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(300)
            }
        } catch (_: Exception) {}
    }

    private fun triggerShortVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(100)
            }
        } catch (_: Exception) {}
    }

    private fun triggerSound() {
        try {
            val alert = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val ringtone = RingtoneManager.getRingtone(context, alert)
            ringtone?.play()
        } catch (_: Exception) {}
    }
}
