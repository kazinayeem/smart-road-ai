package org.smartpothole.app.ui

import android.content.Context

/** User settings shared by every screen. */
object Prefs {
    private fun sp(c: Context) = c.getSharedPreferences("app_settings", Context.MODE_PRIVATE)
    fun voice(c: Context) = sp(c).getBoolean("voice", true)
    fun setVoice(c: Context, v: Boolean) = sp(c).edit().putBoolean("voice", v).apply()
    // Stored where NearbyPotholeMonitor already reads it.
    fun nearby(c: Context) = c.getSharedPreferences("nearby_pothole_prefs", Context.MODE_PRIVATE).getBoolean("nearby_alerts_enabled", true)
    fun setNearby(c: Context, v: Boolean) = c.getSharedPreferences("nearby_pothole_prefs", Context.MODE_PRIVATE).edit().putBoolean("nearby_alerts_enabled", v).apply()
    fun onboarded(c: Context) = sp(c).getBoolean("onboarded", false)
    fun setOnboarded(c: Context) = sp(c).edit().putBoolean("onboarded", true).apply()
}
