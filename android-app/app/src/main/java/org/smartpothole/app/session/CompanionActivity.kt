package org.smartpothole.app.session

import android.content.Context
import android.graphics.Color
import android.location.Location
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.firebase.database.*
import kotlinx.coroutines.*
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.smartpothole.app.R
import org.smartpothole.app.ui.edgeToEdge
import org.smartpothole.app.ui.padForSafeArea
import androidx.core.content.ContextCompat
import org.smartpothole.app.notification.LiveCompanionNotificationHelper
import java.util.UUID

class CompanionActivity : AppCompatActivity() {

    private lateinit var btnBack: ImageView
    private lateinit var tvSessionTitle: TextView
    private lateinit var tvScannerStatusBadge: TextView
    private lateinit var btnNotificationSettings: ImageButton
    private lateinit var btnLeaveSession: Button

    private lateinit var mapView: MapView
    private lateinit var tvScannerLocationText: TextView
    private lateinit var tvScannerAccuracyText: TextView
    private lateinit var fabRecenterScanner: FloatingActionButton

    private lateinit var tvEventsHeader: TextView
    private lateinit var tvNewPotholesBadge: TextView
    private lateinit var tvEmptyEvents: TextView
    private lateinit var rvDetections: RecyclerView
    private lateinit var tvScannerNameFooter: TextView
    private lateinit var tvCompanionsFooter: TextView

    private lateinit var adapter: CompanionDetectionsAdapter
    private lateinit var notificationHelper: LiveCompanionNotificationHelper

    private var sessionId: String = ""
    private var sessionCode: String = ""
    private var scannerId: String = ""
    private var scannerName: String = "Scanner"

    private val userId: String get() = org.smartpothole.app.auth.AuthManager.currentUser?.uid.orEmpty()

    private var scannerMarker: Marker? = null
    private val detectionMarkers = mutableMapOf<String, Marker>()

    // Listeners
    private var locationListener: ValueEventListener? = null
    private var detectionsListener: ChildEventListener? = null
    private var statusListener: ValueEventListener? = null
    private var participantsListener: ValueEventListener? = null
    private var heartbeatJob: Job? = null

    private var lastScannerLocationTime = 0L
    private var lastScannerLat = 0.0
    private var lastScannerLng = 0.0
    private var hasNotifiedGpsLoss = false
    private var hasNotifiedOffline = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Configuration.getInstance().load(this, getPreferences(Context.MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = packageName

        edgeToEdge()
        setContentView(R.layout.activity_companion)
        findViewById<View>(R.id.companionRoot).padForSafeArea(top = true, bottom = true)

        sessionId = intent.getStringExtra("EXTRA_SESSION_ID") ?: ""
        sessionCode = intent.getStringExtra("EXTRA_SESSION_CODE") ?: ""
        scannerId = intent.getStringExtra("EXTRA_SCANNER_ID") ?: ""
        scannerName = intent.getStringExtra("EXTRA_SCANNER_NAME") ?: "Active Scanner"

        notificationHelper = LiveCompanionNotificationHelper(this)

        initViews()
        setupMap()
        setupRecyclerView()
        setupListeners()
        startPresenceAndHealthLoop()
    }

    private fun initViews() {
        btnBack = findViewById(R.id.btnBack)
        tvSessionTitle = findViewById(R.id.tvSessionTitle)
        tvScannerStatusBadge = findViewById(R.id.tvScannerStatusBadge)
        btnNotificationSettings = findViewById(R.id.btnNotificationSettings)
        btnLeaveSession = findViewById(R.id.btnLeaveSession)

        mapView = findViewById(R.id.mapView)
        tvScannerLocationText = findViewById(R.id.tvScannerLocationText)
        tvScannerAccuracyText = findViewById(R.id.tvScannerAccuracyText)
        fabRecenterScanner = findViewById(R.id.fabRecenterScanner)

        tvEventsHeader = findViewById(R.id.tvEventsHeader)
        tvNewPotholesBadge = findViewById(R.id.tvNewPotholesBadge)
        tvEmptyEvents = findViewById(R.id.tvEmptyEvents)
        rvDetections = findViewById(R.id.rvDetections)
        tvScannerNameFooter = findViewById(R.id.tvScannerNameFooter)
        tvCompanionsFooter = findViewById(R.id.tvCompanionsFooter)

        tvSessionTitle.text = "Session $sessionCode"
        tvScannerNameFooter.text = "Scanner: $scannerName"

        btnBack.setOnClickListener { finish() }

        btnLeaveSession.setOnClickListener {
            handleLeaveSession()
        }

        btnNotificationSettings.setOnClickListener {
            showNotificationPreferencesDialog()
        }

        fabRecenterScanner.setOnClickListener {
            scannerMarker?.let { marker ->
                mapView.controller.animateTo(marker.position)
            }
        }
    }

    private fun setupMap() {
        mapView.setTileSource(TileSourceFactory.MAPNIK)
        mapView.setMultiTouchControls(true)
        mapView.controller.setZoom(16.5)

        // Map view starts zoomed-out on a neutral default; the scanner marker is only added once a
        // real position arrives (no fake "scanner is here" pin).
        mapView.controller.setZoom(12.0)
        mapView.controller.setCenter(GeoPoint(23.8103, 90.4125))
    }

    private fun setupRecyclerView() {
        adapter = CompanionDetectionsAdapter { detection ->
            val point = GeoPoint(detection.latitude, detection.longitude)
            mapView.controller.animateTo(point)
            detectionMarkers[detection.detectionId]?.showInfoWindow()
        }

        rvDetections.layoutManager = LinearLayoutManager(this)
        rvDetections.adapter = adapter
    }

    private fun setupListeners() {
        if (sessionId.isEmpty()) return
        val sessionRef = LiveSessionManager.getSessionRef(sessionId)

        // 1. Listen to Scanner Location
        locationListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val loc = snapshot.getValue(ScannerLocation::class.java) ?: return
                lastScannerLocationTime = System.currentTimeMillis()
                hasNotifiedGpsLoss = false
                hasNotifiedOffline = false

                val point = GeoPoint(loc.latitude, loc.longitude)
                if (scannerMarker == null) {
                    scannerMarker = Marker(mapView).apply {
                        title = "$scannerName (scanner)"
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        mapView.overlays.add(this)
                    }
                    mapView.controller.setZoom(16.5)
                    mapView.controller.animateTo(point)
                }
                scannerMarker?.position = point
                scannerMarker?.snippet = "Accuracy: ±${String.format("%.1f", loc.accuracy)}m • Speed: ${String.format("%.1f", loc.speed * 3.6f)} km/h"

                tvScannerLocationText.text = "Scanner: [${String.format("%.4f", loc.latitude)}, ${String.format("%.4f", loc.longitude)}]"
                tvScannerAccuracyText.text = "Accuracy: ±${String.format("%.1f", loc.accuracy)}m • Speed: ${String.format("%.1f", loc.speed * 3.6f)} km/h"
                tvScannerStatusBadge.text = "Scanner online"
                tvScannerStatusBadge.setTextColor(ContextCompat.getColor(this@CompanionActivity, R.color.sp_success))

                // Check significant area change (>600m from last recorded center)
                if (lastScannerLat != 0.0 && lastScannerLng != 0.0) {
                    val dist = FloatArray(1)
                    Location.distanceBetween(lastScannerLat, lastScannerLng, loc.latitude, loc.longitude, dist)
                    if (dist[0] > 600f) {
                        notificationHelper.notifyAreaChanged("${String.format("%.4f", loc.latitude)}, ${String.format("%.4f", loc.longitude)}")
                    }
                }
                lastScannerLat = loc.latitude
                lastScannerLng = loc.longitude

                mapView.invalidate()
            }

            override fun onCancelled(error: DatabaseError) {}
        }
        sessionRef.child("scanner_location").addValueEventListener(locationListener!!)

        // 2. Listen to Real-time Pothole Detections (ChildEventListener)
        detectionsListener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                val detection = snapshot.getValue(SessionDetection::class.java) ?: return
                handleNewDetection(detection)
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        }
        sessionRef.child("detections").addChildEventListener(detectionsListener!!)

        // 3. Listen to Session Status
        statusListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val status = snapshot.getValue(String::class.java) ?: "ACTIVE"
                if (status == "ENDED" && !isFinishing && !isDestroyed) {
                    notificationHelper.notifySessionEnded()
                    AlertDialog.Builder(this@CompanionActivity)
                        .setTitle("Scanning Session Ended")
                        .setMessage("The scanner has closed this live session.")
                        .setPositiveButton("Close") { _, _ -> finish() }
                        .setCancelable(false)
                        .show()
                }
            }
            override fun onCancelled(error: DatabaseError) {}
        }
        sessionRef.child("status").addValueEventListener(statusListener!!)

        // 4. Listen to Participants Count
        participantsListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                var companionCount = 0
                for (child in snapshot.children) {
                    val role = child.child("role").getValue(String::class.java)
                    if (role == "COMPANION") companionCount++
                }
                tvCompanionsFooter.text = "$companionCount companion${if (companionCount != 1) "s" else ""}"
            }
            override fun onCancelled(error: DatabaseError) {}
        }
        sessionRef.child("participants").addValueEventListener(participantsListener!!)
    }

    private fun handleNewDetection(detection: SessionDetection) {
        runOnUiThread {
            adapter.addDetection(detection)
            tvEmptyEvents.visibility = View.GONE
            rvDetections.visibility = View.VISIBLE

            val total = adapter.itemCount
            tvEventsHeader.text = "Live detections ($total)"
            tvNewPotholesBadge.text = "$total"

            // Add map pin for the detected pothole
            val point = GeoPoint(detection.latitude, detection.longitude)
            val marker = Marker(mapView).apply {
                title = "Pothole ${(detection.confidence * 100).toInt()}% • ${detection.severity}\n${org.smartpothole.app.util.TimeFormat.dateTime(detection.timestamp)}"
                snippet = "GPS: ${String.format("%.4f", detection.latitude)}, ${String.format("%.4f", detection.longitude)} (±${detection.gpsAccuracy}m)"
                position = point
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            }
            detectionMarkers[detection.detectionId] = marker
            mapView.overlays.add(marker)
            mapView.invalidate()

            // Trigger In-App Notification & Sound/Vibration
            notificationHelper.notifyNewDetection(
                detection.detectionId,
                detection.confidence,
                detection.severity,
                detection.latitude,
                detection.longitude,
                detection.timestamp
            )
        }
    }

    private fun startPresenceAndHealthLoop() {
        heartbeatJob = lifecycleScope.launch(Dispatchers.IO) {
            while (isActive) {
                // Heartbeat to participants node
                if (sessionId.isNotEmpty() && userId.isNotEmpty()) {
                    LiveSessionManager.updatePresence(sessionId, userId, isScanner = false)
                }

                // Check scanner health
                val now = System.currentTimeMillis()
                if (lastScannerLocationTime > 0) {
                    val timeSinceLoc = now - lastScannerLocationTime
                    withContext(Dispatchers.Main) {
                        if (timeSinceLoc > 30000L) {
                            tvScannerStatusBadge.text = "Scanner offline (no update for 30 s)"
                            tvScannerStatusBadge.setTextColor(ContextCompat.getColor(this@CompanionActivity, R.color.sp_danger))
                            if (!hasNotifiedOffline) {
                                hasNotifiedOffline = true
                                notificationHelper.notifyScannerOffline()
                            }
                        } else if (timeSinceLoc > 15000L) {
                            tvScannerStatusBadge.text = "Scanner position is stale"
                            tvScannerStatusBadge.setTextColor(ContextCompat.getColor(this@CompanionActivity, R.color.sp_warning))
                            if (!hasNotifiedGpsLoss) {
                                hasNotifiedGpsLoss = true
                                notificationHelper.notifyGpsLost()
                            }
                        }
                    }
                }

                delay(5000)
            }
        }
    }

    private fun showNotificationPreferencesDialog() {
        val options = arrayOf(
            "Sound alerts on new detections",
            "Vibration feedback",
            "Scanner GPS signal loss alerts",
            "Area relocation alerts"
        )
        val checked = booleanArrayOf(
            notificationHelper.isSoundEnabled(),
            notificationHelper.isVibrateEnabled(),
            notificationHelper.isGpsAlertsEnabled(),
            notificationHelper.isAreaAlertsEnabled()
        )

        AlertDialog.Builder(this)
            .setTitle("Notification preferences")
            .setMultiChoiceItems(options, checked) { _, which, isChecked ->
                when (which) {
                    0 -> notificationHelper.setPreference(LiveCompanionNotificationHelper.PREF_SOUND_ENABLED, isChecked)
                    1 -> notificationHelper.setPreference(LiveCompanionNotificationHelper.PREF_VIBRATE_ENABLED, isChecked)
                    2 -> notificationHelper.setPreference(LiveCompanionNotificationHelper.PREF_GPS_ALERTS_ENABLED, isChecked)
                    3 -> notificationHelper.setPreference(LiveCompanionNotificationHelper.PREF_AREA_ALERTS_ENABLED, isChecked)
                }
            }
            .setPositiveButton("Done", null)
            .show()
    }

    private fun handleLeaveSession() {
        AlertDialog.Builder(this)
            .setTitle("Leave Session")
            .setMessage("Do you want to disconnect from this live scanning session?")
            .setPositiveButton("Leave") { _, _ ->
                if (sessionId.isNotEmpty()) {
                    LiveSessionManager.leaveSession(sessionId, userId)
                }
                finish()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroy() {
        super.onDestroy()
        heartbeatJob?.cancel()

        if (sessionId.isNotEmpty()) {
            val sessionRef = LiveSessionManager.getSessionRef(sessionId)
            locationListener?.let { sessionRef.child("scanner_location").removeEventListener(it) }
            detectionsListener?.let { sessionRef.child("detections").removeEventListener(it) }
            statusListener?.let { sessionRef.child("status").removeEventListener(it) }
            participantsListener?.let { sessionRef.child("participants").removeEventListener(it) }
            if (userId.isNotEmpty()) LiveSessionManager.leaveSession(sessionId, userId)
        }
    }

    override fun onResume() { super.onResume(); mapView.onResume() }
    override fun onPause() { super.onPause(); mapView.onPause() }
}
