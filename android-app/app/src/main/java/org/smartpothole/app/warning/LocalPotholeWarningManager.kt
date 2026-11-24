package org.smartpothole.app.warning

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.tts.TextToSpeech
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.Locale

class LocalPotholeWarningManager(private val context: Context) : TextToSpeech.OnInitListener {

    private val TAG = "LocalWarningManager"
    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private var lastWarningTimestamp = 0L
    private val WARNING_COOLDOWN_MS = 2800L // 2.8s cooldown to prevent repeated warning stutter

    init {
        initTts()
        createNotificationChannel()
    }

    private fun initTts() {
        try {
            tts = TextToSpeech(context.applicationContext, this)
        } catch (e: Exception) {
            Log.w(TAG, "TTS initialization error: ${e.message}")
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts?.setLanguage(Locale.getDefault())
            }
            tts?.setSpeechRate(1.05f)
            tts?.setPitch(1.0f)
            isTtsReady = true
            Log.d(TAG, "Offline TextToSpeech engine initialized successfully")
        } else {
            Log.w(TAG, "Offline TextToSpeech initialization failed with status $status")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID_LOCAL_WARNING,
                "Instant Pothole Warnings",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Offline instant pothole alerts for safety"
                enableVibration(true)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()
                )
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Trigger instant local alert:
     * - Voice announcement ("Warning: Pothole ahead!")
     * - Distinct haptic vibration pattern
     * - Visual notification / banner hook
     * 100% OFFLINE, ZERO NETWORK DELAY
     */
    fun triggerInstantWarning(
        confidence: Float,
        severity: String,
        onShowBanner: (message: String, subtext: String) -> Unit
    ) {
        val now = System.currentTimeMillis()
        if (now - lastWarningTimestamp < WARNING_COOLDOWN_MS) {
            return // Respect cooldown
        }
        lastWarningTimestamp = now

        val confPct = (confidence * 100).toInt()
        val title = "⚠️ WARNING: POTHOLE AHEAD"
        val subtitle = "$confPct% Confidence • $severity Hazard"

        // 1. Show UI banner on screen
        onShowBanner(title, subtitle)

        // 2. Voice warning (Hands-free driver safety)
        if (audioEnabled) speakWarning("Warning! Pothole detected ahead.")

        // 3. Vibration pulse
        triggerVibration()

        // (No system notification here: the user is looking at the camera screen and already sees the banner.)
    }

    /** Alert for a previously reported pothole near the user (not a live camera detection). */
    fun triggerNearbyWarning(distanceMeters: Int, severity: String) {
        val now = System.currentTimeMillis()
        if (now - lastWarningTimestamp < WARNING_COOLDOWN_MS) return
        lastWarningTimestamp = now
        if (audioEnabled) speakWarning("Caution. Reported pothole in about $distanceMeters meters.")
        triggerVibration()
    }

    /** User preference: spoken alerts on/off (vibration and banner still fire). */
    var audioEnabled: Boolean = true

    private fun speakWarning(text: String) {
        if (isTtsReady && tts != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pothole_warning_${System.currentTimeMillis()}")
                } else {
                    @Suppress("DEPRECATION")
                    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null)
                }
            } catch (e: Exception) {
                Log.w(TAG, "TTS speak exception: ${e.message}")
            }
        }
    }

    private fun triggerVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Urgent double buzz: vibrate 180ms, pause 80ms, vibrate 220ms
                val pattern = longArrayOf(0, 180, 80, 220)
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(400)
            }
        } catch (_: Exception) {}
    }

    private fun showNotification(confPct: Int, severity: String) {
        try {
            val builder = NotificationCompat.Builder(context, CHANNEL_ID_LOCAL_WARNING)
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setContentTitle("⚠️ POTHOLE DETECTED AHEAD")
                .setContentText("$confPct% Confidence • $severity Severity road surface cavity")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setAutoCancel(true)

            NotificationManagerCompat.from(context).notify(2001, builder.build())
        } catch (_: SecurityException) {}
    }

    fun shutdown() {
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (_: Exception) {}
    }

    companion object {
        const val CHANNEL_ID_LOCAL_WARNING = "channel_local_pothole_warnings"
    }
}
