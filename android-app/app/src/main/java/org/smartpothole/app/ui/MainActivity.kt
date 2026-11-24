package org.smartpothole.app.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.auth.UserProfile
import org.smartpothole.app.camera.CameraActivity
import org.smartpothole.app.database.AppDatabase
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.network.NetworkUtils
import org.smartpothole.app.report.ReportSubmitter
import org.smartpothole.app.session.SessionHubActivity
import org.smartpothole.app.util.TimeFormat

class MainActivity : AppCompatActivity() {

    private lateinit var tvTotalDetected: TextView
    private lateinit var tvPendingSync: TextView
    private lateinit var tvResolved: TextView
    private lateinit var tvGpsPill: TextView
    private lateinit var tvNetworkPill: TextView
    private lateinit var btnQuickGpsMark: Button
    private lateinit var btnSyncNow: Button

    private var locationTracker: LocationTracker? = null
    private var profile: UserProfile? = null
    private var quickMarkInFlight = false

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { locationTracker?.start(); updateStatusPills() }

    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Auth gate: nothing in the app is usable without a real Firebase account.
        if (AuthManager.currentUser == null) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }
        setContentView(R.layout.activity_main)
        profile = AuthManager.cachedProfile(this)

        tvTotalDetected = findViewById(R.id.tvTotalDetected)
        tvPendingSync = findViewById(R.id.tvPendingSync)
        tvResolved = findViewById(R.id.tvResolved)
        tvGpsPill = findViewById(R.id.tvGpsPill)
        tvNetworkPill = findViewById(R.id.tvNetworkPill)
        btnQuickGpsMark = findViewById(R.id.btnQuickGpsMark)
        btnSyncNow = findViewById(R.id.btnSyncNow)

        locationTracker = LocationTracker(this, minIntervalMs = 5000L, minDistanceM = 10f) { updateStatusPills() }
        requestPermissionsIfNeeded()

        findViewById<View>(R.id.cardStartDetection).setOnClickListener { openCamera() }
        findViewById<View>(R.id.cardLiveCompanion).setOnClickListener {
            startActivity(Intent(this, SessionHubActivity::class.java))
        }
        btnQuickGpsMark.setOnClickListener { handleQuickGpsMark() }
        btnSyncNow.setOnClickListener {
            ReportSubmitter.enqueueSync(this)
            Toast.makeText(this, "Uploading saved reports…", Toast.LENGTH_SHORT).show()
        }

        findViewById<LinearLayout>(R.id.navTabHome).setOnClickListener { refresh() }
        findViewById<LinearLayout>(R.id.navTabLiveDetect).setOnClickListener { openCamera() }
        findViewById<LinearLayout>(R.id.navTabMap).setOnClickListener { startActivity(Intent(this, MapActivity::class.java)) }
        findViewById<LinearLayout>(R.id.navTabMyReports).setOnClickListener { showMyReportsDialog() }
        findViewById<LinearLayout>(R.id.navTabProfile).setOnClickListener { showProfileDialog() }

        // Refresh the cached profile (role / vehicle may have changed on the server).
        lifecycleScope.launch {
            runCatching { profile = AuthManager.loadProfile(this@MainActivity) }
            // Rider-only app: an account that was changed to an admin/contractor role is signed out.
            if (profile?.role != null && profile?.role != "CITIZEN") {
                Toast.makeText(this@MainActivity, AuthManager.RIDER_ONLY_ERROR, Toast.LENGTH_LONG).show()
                AuthManager.signOut(this@MainActivity)
                startActivity(Intent(this@MainActivity, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
                finish()
            }
        }
        AuthManager.registerFcmToken()
        ReportSubmitter.enqueueSync(this)
    }

    private fun openCamera() = startActivity(Intent(this, CameraActivity::class.java))

    private fun requestPermissionsIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun updateStatusPills() {
        val tracker = locationTracker
        val loc = tracker?.lastKnownLocation
        when {
            tracker == null || !tracker.hasPermission() -> {
                tvGpsPill.text = "Location permission needed"
                tvGpsPill.setBackgroundColor(Color.parseColor("#B91C1C"))
            }
            !tracker.isLocationServiceEnabled() -> {
                tvGpsPill.text = "Location is turned off"
                tvGpsPill.setBackgroundColor(Color.parseColor("#B45309"))
            }
            loc != null -> {
                tvGpsPill.text = "GPS ±${loc.accuracy.toInt()} m (${String.format("%.4f", loc.latitude)}, ${String.format("%.4f", loc.longitude)})"
                tvGpsPill.setBackgroundColor(Color.parseColor("#1E40AF"))
            }
            else -> {
                tvGpsPill.text = "Acquiring GPS…"
                tvGpsPill.setBackgroundColor(Color.parseColor("#475569"))
            }
        }
        if (NetworkUtils.isNetworkConnected(this)) {
            tvNetworkPill.text = "Online (${NetworkUtils.getConnectionType(this)})"
            tvNetworkPill.setBackgroundColor(Color.parseColor("#15803D"))
        } else {
            tvNetworkPill.text = "Offline — reports are saved and sent later"
            tvNetworkPill.setBackgroundColor(Color.parseColor("#B45309"))
        }
    }

    /** 1-tap report of a pothole at the current position. Requires a real, recent GPS fix. */
    private fun handleQuickGpsMark() {
        if (quickMarkInFlight) return
        quickMarkInFlight = true
        btnQuickGpsMark.isEnabled = false
        val detectedAt = System.currentTimeMillis()
        lifecycleScope.launch {
            val result = ReportSubmitter.submit(
                context = applicationContext,
                location = locationTracker?.reportableFix(),
                confidence = 1.0f, // human-confirmed, not a model score
                severity = "MEDIUM",
                areaRatio = 0f,
                source = ReportSubmitter.SOURCE_MANUAL,
                detectedAt = detectedAt
            )
            val msg = when (result) {
                is ReportSubmitter.Result.Queued -> "Pothole marked at ${TimeFormat.dateTime(detectedAt)}." +
                    if (NetworkUtils.isNetworkConnected(this@MainActivity)) " Uploading…" else " It will upload when you're online."
                ReportSubmitter.Result.NoLocationFix -> "No accurate GPS fix yet. Move to open sky and try again."
                ReportSubmitter.Result.NotSignedIn -> "Please sign in again."
            }
            Toast.makeText(this@MainActivity, msg, Toast.LENGTH_LONG).show()
            refresh()
            quickMarkInFlight = false
            btnQuickGpsMark.isEnabled = true
        }
    }

    private fun showMyReportsDialog() {
        val uid = AuthManager.currentUser?.uid ?: return
        lifecycleScope.launch {
            val reports = AppDatabase.getDatabase(this@MainActivity).potholeReportDao().getReportsFor(uid)
            val items = if (reports.isEmpty()) arrayOf("No reports yet. Start detection or use the 1-tap mark.")
            else reports.map { r ->
                val state = when (r.syncStatus) {
                    "SYNCED" -> "Uploaded"
                    "FAILED" -> "Upload failed — will retry"
                    else -> "Waiting to upload"
                }
                val conf = if (r.source == ReportSubmitter.SOURCE_MANUAL) "manual mark" else "${(r.confidence * 100).toInt()}% AI"
                "${TimeFormat.dateTime(r.createdAt)}\n${r.priority} • $conf • $state\n" +
                    "${String.format("%.5f", r.latitude)}, ${String.format("%.5f", r.longitude)} (±${r.gpsAccuracy.toInt()} m)"
            }.toTypedArray()
            if (isFinishing) return@launch
            AlertDialog.Builder(this@MainActivity)
                .setTitle("My reports (${reports.size})")
                .setItems(items, null)
                .setPositiveButton("Close", null)
                .show()
        }
    }

    private fun showProfileDialog() {
        val p = profile ?: AuthManager.cachedProfile(this) ?: return
        val vehicleLabel = AuthManager.VEHICLES[p.vehicleType] ?: p.vehicleType
        AlertDialog.Builder(this)
            .setTitle(p.name)
            .setMessage(
                (if (p.username.isNotEmpty()) "Username: ${p.username}\n" else "") +
                    "Email: ${p.email}\nRole: ${p.role}\nVehicle: $vehicleLabel\n\n" +
                    "Privacy: camera frames are analysed on this phone and never uploaded. " +
                    "Only the detection (position, time, confidence) is sent."
            )
            .setPositiveButton("Close", null)
            .setNeutralButton("Change vehicle") { _, _ -> showVehiclePicker(p) }
            .setNegativeButton("Sign out") { _, _ -> confirmSignOut() }
            .show()
    }

    private fun showVehiclePicker(p: UserProfile) {
        val keys = AuthManager.VEHICLES.keys.toList()
        val labels = AuthManager.VEHICLES.values.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("Your vehicle")
            .setSingleChoiceItems(labels, keys.indexOf(p.vehicleType).coerceAtLeast(0)) { dialog, which ->
                dialog.dismiss()
                lifecycleScope.launch {
                    val ok = runCatching { AuthManager.updateVehicle(this@MainActivity, keys[which]) }.isSuccess
                    if (ok) profile = AuthManager.cachedProfile(this@MainActivity)
                    Toast.makeText(this@MainActivity, if (ok) "Vehicle updated" else "Could not update vehicle", Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    private fun confirmSignOut() {
        AlertDialog.Builder(this)
            .setTitle("Sign out?")
            .setMessage("Reports that haven't uploaded yet stay on this phone and upload next time you sign in with this account.")
            .setPositiveButton("Sign out") { _, _ ->
                AuthManager.signOut(this)
                startActivity(Intent(this, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
                finish()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun refresh() {
        val uid = AuthManager.currentUser?.uid ?: return
        lifecycleScope.launch {
            val dao = AppDatabase.getDatabase(this@MainActivity).potholeReportDao()
            tvTotalDetected.text = dao.getTotalCount(uid).toString()
            tvPendingSync.text = dao.getPendingCount(uid).toString()
            tvResolved.text = dao.getSyncedCount(uid).toString()
        }
        updateStatusPills()
    }

    override fun onResume() {
        super.onResume()
        if (AuthManager.currentUser == null) return
        locationTracker?.start()
        refresh()
    }

    override fun onPause() {
        super.onPause()
        // Home does not need GPS in the background.
        locationTracker?.stopUpdates()
    }
}
