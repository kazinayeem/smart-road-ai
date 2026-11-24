package org.smartpothole.app.location

import android.content.Context
import android.content.SharedPreferences
import android.location.Location
import android.util.Log
import com.google.firebase.database.*
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.warning.LocalPotholeWarningManager
import kotlin.math.*

class NearbyPotholeMonitor(
    private val context: Context,
    private val warningManager: LocalPotholeWarningManager? = null
) {

    private val TAG = "NearbyPotholeMonitor"

    private val prefs: SharedPreferences =
        context.getSharedPreferences("nearby_pothole_prefs", Context.MODE_PRIVATE)

    private val rtdb = FirebaseDatabase.getInstance()
    private var potholesListener: ValueEventListener? = null

    // Cache of active, unresolved potholes (does not reveal user's location)
    private val cachedPotholes = mutableMapOf<String, PotholeNode>()

    // Cooldown tracker per pothole ID (3 minutes between repeat alerts for same pothole)
    private val alertedPotholesTime = mutableMapOf<String, Long>()
    private val ALERT_COOLDOWN_PER_POTHOLE_MS = 180000L

    // Configurable warning radius (default 150m)
    var warningRadiusMeters = 150.0f

    var onNearbyAlert: ((pothole: PotholeNode, distanceMeters: Float, isAhead: Boolean) -> Unit)? = null

    fun isNearbyAlertsEnabled(): Boolean = prefs.getBoolean("nearby_alerts_enabled", true)

    fun setNearbyAlertsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("nearby_alerts_enabled", enabled).apply()
    }

    /**
     * Start monitoring active potholes from Firebase Realtime Database.
     */
    fun startMonitoring() {
        if (potholesListener != null) return
        // reports/ is the authoritative pothole record: when the city resolves a pothole, alerts stop.
        val potholesRef = rtdb.getReference("reports")
        potholesListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                cachedPotholes.clear()
                for (child in snapshot.children) {
                    val p = PotholeNode.fromReport(child) ?: continue
                    if (p.isActive) cachedPotholes[child.key ?: p.potholeId] = p
                }
                Log.d(TAG, "Loaded ${cachedPotholes.size} active unresolved potholes for proximity monitoring")
            }

            override fun onCancelled(error: DatabaseError) {
                Log.w(TAG, "Potholes listener cancelled: ${error.message}")
            }
        }
        potholesRef.addValueEventListener(potholesListener!!)
    }

    /**
     * Evaluate proximity and heading on each GPS location update.
     * Evaluated 100% locally on device to protect user privacy.
     */
    fun onLocationUpdated(userLoc: Location) {
        if (!isNearbyAlertsEnabled() || cachedPotholes.isEmpty()) return

        val now = System.currentTimeMillis()

        for ((potholeId, pothole) in cachedPotholes) {
            val dist = FloatArray(1)
            Location.distanceBetween(userLoc.latitude, userLoc.longitude, pothole.latitude, pothole.longitude, dist)
            val distanceMeters = dist[0]

            if (distanceMeters <= warningRadiusMeters) {
                // Check per-pothole cooldown
                val lastAlert = alertedPotholesTime[potholeId] ?: 0L
                if (now - lastAlert < ALERT_COOLDOWN_PER_POTHOLE_MS) {
                    continue // Already alerted recently for this defect
                }

                // Evaluate Direction / Heading Awareness
                var isAhead = true
                if (userLoc.hasSpeed() && userLoc.speed > 1.2f && userLoc.hasBearing()) {
                    val bearingToTarget = computeBearing(userLoc.latitude, userLoc.longitude, pothole.latitude, pothole.longitude)
                    val deltaAngle = abs((userLoc.bearing - bearingToTarget + 180f) % 360f - 180f)

                    if (deltaAngle > 70f) {
                        // Defect is to the side or behind the path of travel
                        isAhead = false
                    }
                }

                // If ahead (or stationary within 60m), trigger safety notification
                if (isAhead || distanceMeters < 60f) {
                    alertedPotholesTime[potholeId] = now
                    Log.i(TAG, "Proximity Alert: Pothole $potholeId is ${distanceMeters.toInt()}m ahead!")

                    onNearbyAlert?.invoke(pothole, distanceMeters, isAhead)

                    warningManager?.triggerNearbyWarning(distanceMeters.toInt(), pothole.priority)
                }
            }
        }
    }

    /**
     * Calculate initial bearing from point A to point B in degrees [0, 360).
     */
    private fun computeBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Float {
        val phi1 = Math.toRadians(lat1)
        val phi2 = Math.toRadians(lat2)
        val deltaLambda = Math.toRadians(lon2 - lon1)

        val y = sin(deltaLambda) * cos(phi2)
        val x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(deltaLambda)
        val theta = atan2(y, x)

        return ((Math.toDegrees(theta) + 360) % 360).toFloat()
    }

    fun stopMonitoring() {
        potholesListener?.let { rtdb.getReference("reports").removeEventListener(it) }
        potholesListener = null
    }
}
