package org.smartpothole.app.camera

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.firebase.database.ValueEventListener
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.ai.DetectionResult
import org.smartpothole.app.detect.DetectionController
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.location.NearbyPotholeMonitor
import org.smartpothole.app.session.LiveSessionManager
import org.smartpothole.app.split.SplitModeActivity
import org.smartpothole.app.ui.Prefs
import org.smartpothole.app.ui.Severity
import org.smartpothole.app.ui.edgeToEdge
import org.smartpothole.app.ui.padForSafeArea
import org.smartpothole.app.util.TimeFormat

/** Full-screen camera detection. Optional live-companion scanner mode via EXTRA_SESSION_ID/CODE. */
class CameraActivity : AppCompatActivity(), DetectionController.Listener {

    private lateinit var detection: DetectionController
    private var tracker: LocationTracker? = null
    private var nearby: NearbyPotholeMonitor? = null
    private lateinit var overlay: OverlayView
    private lateinit var tvStatus: TextView
    private lateinit var tvGps: TextView
    private lateinit var tvCounter: TextView
    private lateinit var tvLast: TextView
    private lateinit var tvFps: TextView
    private var bannerJob: Job? = null
    private var sessionId: String? = null
    private var companionListener: ValueEventListener? = null
    private var lastSessionPush = 0L

    private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        if (has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION)) {
            tracker?.start(); nearby?.startMonitoring()
        } else tvGps.text = "No GPS"
        if (has(Manifest.permission.CAMERA)) detection.startCamera() else cameraDenied()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        edgeToEdge()
        setContentView(R.layout.activity_camera)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        findViewById<View>(R.id.cameraTop).padForSafeArea(top = true)
        findViewById<View>(R.id.cameraBottom).padForSafeArea(bottom = true)

        overlay = findViewById(R.id.overlayView)
        tvStatus = findViewById(R.id.tvDetectionStatus)
        tvGps = findViewById(R.id.tvGpsAccuracy)
        tvCounter = findViewById(R.id.tvDetectionCounter)
        tvLast = findViewById(R.id.tvLastDetectionTime)
        tvFps = findViewById(R.id.tvFpsLatency)
        sessionId = intent.getStringExtra("EXTRA_SESSION_ID")

        tracker = LocationTracker(this, 1000L, 2f, ::onLocation)
        detection = DetectionController(this, this, findViewById<PreviewView>(R.id.previewView), { tracker?.reportableFix() }, this, sessionId)
        detection.audioEnabled = Prefs.voice(this)
        nearby = NearbyPotholeMonitor(this, detection.warnings)

        findViewById<View>(R.id.btnClose).setOnClickListener { finish() }
        val btnPause = findViewById<MaterialButton>(R.id.btnPauseResume)
        btnPause.setOnClickListener {
            detection.paused = !detection.paused
            btnPause.text = if (detection.paused) "Resume" else "Pause"
            btnPause.setIconResource(if (detection.paused) R.drawable.ic_play else R.drawable.ic_pause)
            tvStatus.text = if (detection.paused) "Detection paused" else "Scanning road"
            if (detection.paused) overlay.setResults(emptyList())
        }
        val btnMode = findViewById<MaterialButton>(R.id.btnModeToggle)
        btnMode.setOnClickListener {
            detection.autoReport = !detection.autoReport
            btnMode.text = if (detection.autoReport) "Auto" else "Manual"
            btnMode.contentDescription = if (detection.autoReport) "Auto reporting on" else "Manual confirmation on"
            findViewById<View>(R.id.manualConfirmLayout).visibility = View.GONE
        }
        val btnAudio = findViewById<MaterialButton>(R.id.btnAudio)
        fun syncAudio() {
            btnAudio.setIconResource(if (detection.audioEnabled) R.drawable.ic_volume_up else R.drawable.ic_volume_off)
            btnAudio.text = if (detection.audioEnabled) "Voice" else "Muted"
        }
        syncAudio()
        btnAudio.setOnClickListener { detection.audioEnabled = !detection.audioEnabled; Prefs.setVoice(this, detection.audioEnabled); syncAudio() }
        findViewById<View>(R.id.btnSplit).apply {
            visibility = if (sessionId == null) View.VISIBLE else View.GONE
            setOnClickListener { startActivity(Intent(this@CameraActivity, SplitModeActivity::class.java)); finish() }
        }
        setupSession()
        requestPermissions()
    }

    private fun has(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun requestPermissions() {
        val need = listOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION).filterNot(::has)
        if (need.isEmpty()) { nearby?.startMonitoring(); detection.startCamera() } else permissionLauncher.launch(need.toTypedArray())
    }

    private fun cameraDenied() {
        if (isFinishing) return
        MaterialAlertDialogBuilder(this)
            .setTitle("Camera access needed")
            .setMessage("SmartPothole looks at the road on this phone to find potholes. Video never leaves the device.")
            .setPositiveButton("Open settings") { _, _ ->
                startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null))); finish()
            }
            .setNegativeButton("Close") { _, _ -> finish() }
            .setCancelable(false).show()
    }

    private fun onLocation(loc: Location) {
        tvGps.text = if (loc.hasAccuracy()) "±${loc.accuracy.toInt()} m" else "GPS"
        nearby?.onLocationUpdated(loc)
        val sid = sessionId ?: return
        val now = System.currentTimeMillis()
        if (now - lastSessionPush >= 2500) { lastSessionPush = now; LiveSessionManager.updateScannerLocation(sid, loc) }
    }

    private fun setupSession() {
        val sid = sessionId ?: return
        val code = intent.getStringExtra("EXTRA_SESSION_CODE") ?: ""
        findViewById<View>(R.id.layoutSessionPill).visibility = View.VISIBLE
        findViewById<TextView>(R.id.tvSessionCodeBadge).text = "Session $code"
        val tv = findViewById<TextView>(R.id.tvCompanionsCount)
        companionListener = LiveSessionManager.listenToCompanionCount(sid) { n -> tv.text = "$n companion${if (n == 1) "" else "s"}" }
        lifecycleScope.launch {
            while (true) {
                delay(10_000)
                val loc = tracker?.lastKnownLocation
                if (loc != null && System.currentTimeMillis() - lastSessionPush >= 10_000) { lastSessionPush = System.currentTimeMillis(); LiveSessionManager.updateScannerLocation(sid, loc) }
            }
        }
        findViewById<View>(R.id.btnEndSession).setOnClickListener {
            LiveSessionManager.endSession(sid) { Toast.makeText(this, "Session ended", Toast.LENGTH_SHORT).show(); finish() }
        }
    }

    // --- DetectionController.Listener ---
    override fun onStatus(text: String) { tvStatus.text = text }

    override fun onFrame(results: List<DetectionResult>, fps: Int, latencyMs: Long, imageWidth: Int, imageHeight: Int) {
        overlay.setResults(results, imageWidth, imageHeight)
        tvFps.text = "$fps fps · $latencyMs ms"
        val top = results.maxByOrNull { it.confidence }
        tvStatus.text = if (top == null) "Road clear · scanning" else "Pothole ${(top.confidence * 100).toInt()}% · ${Severity.label(top.severity)}"
    }

    override fun onConfirmedDetection(result: DetectionResult, detectedAt: Long) {
        detection.warnings.triggerInstantWarning(result.confidence, result.severity) { _, _ ->
            findViewById<TextView>(R.id.tvInstantWarningTitle).text = "Pothole ahead"
            findViewById<TextView>(R.id.tvInstantWarningSubtext).text =
                "${(result.confidence * 100).toInt()}% · ${Severity.label(result.severity)} · ${TimeFormat.time(detectedAt)}"
            val banner = findViewById<View>(R.id.layoutInstantWarningBanner)
            banner.visibility = View.VISIBLE
            bannerJob?.cancel()
            bannerJob = lifecycleScope.launch { delay(2500); banner.visibility = View.GONE }
        }
    }

    override fun onReported(result: DetectionResult, detectedAt: Long, location: Location, totalThisSession: Int) {
        tvCounter.text = "$totalThisSession reported"
        tvLast.text = "Last: ${TimeFormat.dateTime(detectedAt)} · ${Severity.label(result.severity)}"
    }

    override fun onNotReported(detectedAt: Long, reason: String) {
        tvLast.text = "Seen ${TimeFormat.time(detectedAt)} · not reported: $reason"
    }

    override fun onManualConfirmNeeded(result: DetectionResult, detectedAt: Long) {
        val bar = findViewById<View>(R.id.manualConfirmLayout)
        if (bar.visibility == View.VISIBLE) return
        findViewById<TextView>(R.id.tvConfirmPotholeText).text =
            "Pothole in view · ${(result.confidence * 100).toInt()}% · ${TimeFormat.time(detectedAt)}"
        bar.visibility = View.VISIBLE
        findViewById<View>(R.id.btnConfirmReport).setOnClickListener {
            detection.report(result, detectedAt); bar.visibility = View.GONE
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        bannerJob?.cancel()
        tracker?.stopUpdates()
        nearby?.stopMonitoring()
        companionListener?.let { l -> sessionId?.let { LiveSessionManager.getSessionRef(it).child("participants").removeEventListener(l) } }
        if (::detection.isInitialized) detection.release()
    }
}
