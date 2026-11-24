package org.smartpothole.app.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Thin wrapper over LocationManager.
 * - Never invents a position: [lastKnownLocation] is null until a real fix arrives.
 * - [start] is idempotent and safe to call again after permission is granted.
 * - Callers must call [stopUpdates] when their screen goes away.
 */
class LocationTracker(
    private val context: Context,
    private val minIntervalMs: Long = 2000L,
    private val minDistanceM: Float = 2f,
    private val onLocation: ((Location) -> Unit)? = null
) : LocationListener {

    private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private var started = false

    var lastKnownLocation: Location? = null
        private set

    init {
        start()
    }

    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun isLocationServiceEnabled(): Boolean = runCatching {
        locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }.getOrDefault(false)

    /** A fix that is recent and accurate enough to attach to a pothole report, or null. */
    fun reportableFix(maxAgeMs: Long = 30_000L, maxAccuracyM: Float = 50f): Location? {
        val loc = lastKnownLocation ?: return null
        val age = System.currentTimeMillis() - loc.time
        if (age > maxAgeMs) return null
        if (loc.hasAccuracy() && loc.accuracy > maxAccuracyM) return null
        return loc
    }

    @Suppress("MissingPermission")
    fun start() {
        if (started || !hasPermission()) return
        try {
            val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
                .filter { runCatching { locationManager.isProviderEnabled(it) }.getOrDefault(false) }
            for (p in providers) {
                locationManager.requestLocationUpdates(p, minIntervalMs, minDistanceM, this, Looper.getMainLooper())
                locationManager.getLastKnownLocation(p)?.let { if (isBetter(it)) lastKnownLocation = it }
            }
            started = providers.isNotEmpty()
        } catch (e: SecurityException) {
            Log.w(TAG, "Location permission missing: ${e.message}")
        } catch (e: Exception) {
            Log.w(TAG, "Location unavailable: ${e.message}")
        }
    }

    private fun isBetter(candidate: Location): Boolean {
        val current = lastKnownLocation ?: return true
        val newer = candidate.time - current.time
        if (newer > 10_000) return true
        if (newer < -10_000) return false
        return !candidate.hasAccuracy() || !current.hasAccuracy() || candidate.accuracy <= current.accuracy + 5f || newer > 0
    }

    override fun onLocationChanged(location: Location) {
        if (!isBetter(location)) return
        lastKnownLocation = location
        onLocation?.invoke(location)
    }

    @Deprecated("Deprecated in API 29")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    fun stopUpdates() {
        runCatching { locationManager.removeUpdates(this) }
        started = false
    }

    companion object { private const val TAG = "LocationTracker" }
}
