package org.smartpothole.app.camera

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.util.Log
import android.util.Size
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.firebase.database.ValueEventListener
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.ai.DetectionResult
import org.smartpothole.app.ai.PotholeDetector
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.location.NearbyPotholeMonitor
import org.smartpothole.app.report.ReportSubmitter
import org.smartpothole.app.session.LiveSessionManager
import org.smartpothole.app.session.SessionDetection
import org.smartpothole.app.util.TimeFormat
import org.smartpothole.app.warning.LocalPotholeWarningManager
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class CameraActivity : AppCompatActivity() {

    private val TAG = "CameraActivity"
    private lateinit var cameraExecutor: ExecutorService
    private var detector: PotholeDetector? = null
    private var locationTracker: LocationTracker? = null
    private var cameraProvider: ProcessCameraProvider? = null

    private lateinit var previewView: PreviewView
    private lateinit var overlayView: OverlayView
    private lateinit var tvFpsLatency: TextView
    private lateinit var tvDetectionStatus: TextView
    private lateinit var tvGpsAccuracy: TextView
    private lateinit var tvDetectionCounter: TextView
    private lateinit var tvLastDetectionTime: TextView
    private lateinit var manualConfirmLayout: LinearLayout
    private lateinit var tvConfirmPotholeText: TextView
    private lateinit var btnConfirmReport: Button
    private lateinit var btnPauseResume: Button
    private lateinit var btnModeToggle: Button

    private lateinit var warningManager: LocalPotholeWarningManager
    private var layoutInstantWarningBanner: View? = null
    private var tvInstantWarningTitle: TextView? = null
    private var tvInstantWarningSubtext: TextView? = null
    private var bannerHideJob: Job? = null
    private var nearbyMonitor: NearbyPotholeMonitor? = null

    // Live Companion session (scanner side)
    private var activeSessionId: String? = null
    private var companionCountListener: ValueEventListener? = null
    private var lastSessionLocationPush = 0L

    // Detection state
    private val isAnalyzing = AtomicBoolean(false)
    @Volatile private var isDetectionPaused = false
    private var isAutoSubmitMode = true
    private var detectionCount = 0
    private var lastReportTime = 0L
    private var lastReportedLocation: Location? = null
    private var pendingManualDetection: Pair<DetectionResult, Long>? = null
    private var lastFrameTimestamp = 0L

    /** Recent frame outcomes (true = pothole above threshold) for temporal consistency. */
    private val recentFrames = ArrayDeque<Boolean>()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val cameraOk = grants[Manifest.permission.CAMERA] == true || hasPermission(Manifest.permission.CAMERA)
        val locationOk = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) || hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (locationOk) {
            locationTracker?.start()
            nearbyMonitor?.startMonitoring()
        }
        if (cameraOk) startCamera() else showPermissionRationale()
        if (!locationOk) {
            tvGpsAccuracy.text = "GPS: permission denied — detections won't be reported"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)
        // The camera screen is used while driving: keep the screen on only while it is visible.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        previewView = findViewById(R.id.previewView)
        overlayView = findViewById(R.id.overlayView)
        tvFpsLatency = findViewById(R.id.tvFpsLatency)
        tvDetectionStatus = findViewById(R.id.tvDetectionStatus)
        tvGpsAccuracy = findViewById(R.id.tvGpsAccuracy)
        tvDetectionCounter = findViewById(R.id.tvDetectionCounter)
        tvLastDetectionTime = findViewById(R.id.tvLastDetectionTime)
        manualConfirmLayout = findViewById(R.id.manualConfirmLayout)
        tvConfirmPotholeText = findViewById(R.id.tvConfirmPotholeText)
        btnConfirmReport = findViewById(R.id.btnConfirmReport)
        btnPauseResume = findViewById(R.id.btnPauseResume)
        btnModeToggle = findViewById(R.id.btnModeToggle)
        layoutInstantWarningBanner = findViewById(R.id.layoutInstantWarningBanner)
        tvInstantWarningTitle = findViewById(R.id.tvInstantWarningTitle)
        tvInstantWarningSubtext = findViewById(R.id.tvInstantWarningSubtext)

        warningManager = LocalPotholeWarningManager(this)
        nearbyMonitor = NearbyPotholeMonitor(this, warningManager)
        locationTracker = LocationTracker(this, onLocation = ::onLocationUpdate)
        cameraExecutor = Executors.newSingleThreadExecutor()
        tvDetectionStatus.text = "Loading AI model…"
        cameraExecutor.execute { detector = PotholeDetector(applicationContext) }

        btnPauseResume.setOnClickListener {
            isDetectionPaused = !isDetectionPaused
            btnPauseResume.text = if (isDetectionPaused) "Resume AI" else "Pause AI"
            tvDetectionStatus.text = if (isDetectionPaused) "Detection paused" else "Scanning road surface…"
            if (isDetectionPaused) overlayView.setResults(emptyList())
            recentFrames.clear()
        }

        btnModeToggle.setOnClickListener {
            isAutoSubmitMode = !isAutoSubmitMode
            btnModeToggle.text = if (isAutoSubmitMode) "Mode: AUTO" else "Mode: MANUAL"
            manualConfirmLayout.visibility = View.GONE
            pendingManualDetection = null
        }

        btnConfirmReport.setOnClickListener {
            pendingManualDetection?.let { (res, detectedAt) -> recordPotholeReport(res, detectedAt) }
            manualConfirmLayout.visibility = View.GONE
            pendingManualDetection = null
        }

        setupLiveSessionIfPresent()
        requestNeededPermissions()
    }

    private fun hasPermission(p: String) =
        ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun requestNeededPermissions() {
        val needed = mutableListOf<String>()
        if (!hasPermission(Manifest.permission.CAMERA)) needed += Manifest.permission.CAMERA
        if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            needed += Manifest.permission.ACCESS_FINE_LOCATION
            needed += Manifest.permission.ACCESS_COARSE_LOCATION
        }
        if (needed.isEmpty()) {
            nearbyMonitor?.startMonitoring()
            startCamera()
        } else {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun showPermissionRationale() {
        if (isFinishing || isDestroyed) return
        AlertDialog.Builder(this)
            .setTitle("Camera access needed")
            .setMessage("SmartPothole analyses the road on this device to find potholes. Video never leaves your phone. Allow camera access in Settings to continue.")
            .setPositiveButton("Open settings") { _, _ ->
                startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
                finish()
            }
            .setNegativeButton("Close") { _, _ -> finish() }
            .setCancelable(false)
            .show()
    }

    private fun onLocationUpdate(loc: Location) {
        tvGpsAccuracy.text = if (loc.hasAccuracy()) "GPS: ±${loc.accuracy.toInt()} m" else "GPS: fix"
        nearbyMonitor?.onLocationUpdated(loc)
        val sid = activeSessionId ?: return
        val now = System.currentTimeMillis()
        if (now - lastSessionLocationPush >= SESSION_LOCATION_INTERVAL_MS) {
            lastSessionLocationPush = now
            LiveSessionManager.updateScannerLocation(sid, loc)
        }
    }

    private fun setupLiveSessionIfPresent() {
        val sid = intent.getStringExtra("EXTRA_SESSION_ID") ?: return
        val code = intent.getStringExtra("EXTRA_SESSION_CODE") ?: return
        activeSessionId = sid
        findViewById<LinearLayout>(R.id.layoutSessionPill).visibility = View.VISIBLE
        findViewById<TextView>(R.id.tvSessionCodeBadge).text = "Session $code"
        val tvCompanions = findViewById<TextView>(R.id.tvCompanionsCount)
        tvCompanions.text = "0 companions"
        companionCountListener = LiveSessionManager.listenToCompanionCount(sid) { count ->
            tvCompanions.text = "$count companion${if (count != 1) "s" else ""}"
        }
        // Heartbeat while stationary (location callbacks only fire on movement), so companions
        // don't mistake a parked scanner for an offline one. Stops with the activity lifecycle.
        lifecycleScope.launch {
            while (true) {
                delay(10_000)
                val loc = locationTracker?.lastKnownLocation
                if (loc != null && System.currentTimeMillis() - lastSessionLocationPush >= 10_000) {
                    lastSessionLocationPush = System.currentTimeMillis()
                    LiveSessionManager.updateScannerLocation(sid, loc)
                }
            }
        }
        findViewById<Button>(R.id.btnEndSession).setOnClickListener {
            LiveSessionManager.endSession(sid) {
                Toast.makeText(this, "Session ended.", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun startCamera() {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            if (isFinishing || isDestroyed) return@addListener
            val provider = runCatching { future.get() }.getOrNull() ?: run {
                tvDetectionStatus.text = "Camera unavailable on this device"
                return@addListener
            }
            cameraProvider = provider
            val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
            @Suppress("DEPRECATION")
            val analysis = ImageAnalysis.Builder()
                .setTargetResolution(Size(640, 480))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()
            analysis.setAnalyzer(cameraExecutor, ::analyzeFrame)
            try {
                provider.unbindAll()
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                tvDetectionStatus.text = "Scanning road surface…"
            } catch (e: Exception) {
                Log.e(TAG, "Camera binding failed", e)
                tvDetectionStatus.text = "Could not start camera: ${e.message}"
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun analyzeFrame(imageProxy: ImageProxy) {
        val det = detector
        if (det == null || isDetectionPaused || !isAnalyzing.compareAndSet(false, true)) {
            imageProxy.close()
            return
        }
        try {
            val start = System.currentTimeMillis()
            val bitmap = imageProxy.toBitmap()
            val results = det.detect(bitmap)
            bitmap.recycle()
            val now = System.currentTimeMillis()
            val latency = now - start
            val frameTime = if (lastFrameTimestamp > 0) now - lastFrameTimestamp else 0L
            lastFrameTimestamp = now
            val fps = if (frameTime > 0) (1000L / frameTime).toInt().coerceIn(1, 60) else 0
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                tvFpsLatency.text = "FPS: $fps • ${latency} ms"
                overlayView.setResults(results)
                onFrameResults(results, now)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Frame inference error: ${e.message}")
        } finally {
            imageProxy.close()
            isAnalyzing.set(false)
        }
    }

    /**
     * Temporal consistency: a pothole must be seen in at least 2 of the last 3 analysed frames
     * before we alert or report, which filters single-frame false positives.
     */
    private fun onFrameResults(results: List<DetectionResult>, frameTime: Long) {
        val top = results.maxByOrNull { it.confidence }
        val positive = top != null && top.confidence >= REPORT_CONFIDENCE
        recentFrames.addLast(positive)
        while (recentFrames.size > 3) recentFrames.removeFirst()

        if (top == null) {
            tvDetectionStatus.text = "Road clear • scanning"
            return
        }
        tvDetectionStatus.text = "Pothole ${(top.confidence * 100).toInt()}% [${top.severity}]"
        if (!positive || recentFrames.count { it } < 2) return
        handleConfirmedDetection(top, frameTime)
    }

    private fun handleConfirmedDetection(top: DetectionResult, detectedAt: Long) {
        val whenText = TimeFormat.dateTime(detectedAt)
        warningManager.triggerInstantWarning(top.confidence, top.severity) { title, sub ->
            tvInstantWarningTitle?.text = title
            tvInstantWarningSubtext?.text = "$sub\n$whenText"
            layoutInstantWarningBanner?.visibility = View.VISIBLE
            bannerHideJob?.cancel()
            bannerHideJob = lifecycleScope.launch {
                delay(2500)
                layoutInstantWarningBanner?.visibility = View.GONE
            }
        }

        // Duplicate suppression for consecutive frames of the SAME pothole: a short cooldown plus a
        // small distance gate. Potholes further than 10 m apart are reported separately.
        if (detectedAt - lastReportTime < COOLDOWN_MS) return
        val loc = locationTracker?.reportableFix()
        val last = lastReportedLocation
        if (loc != null && last != null && loc.distanceTo(last) < SAME_POTHOLE_DISTANCE_M &&
            detectedAt - lastReportTime < SAME_POTHOLE_WINDOW_MS) return

        if (isAutoSubmitMode) {
            recordPotholeReport(top, detectedAt)
        } else if (pendingManualDetection == null) {
            pendingManualDetection = top to detectedAt
            tvConfirmPotholeText.text = "Pothole in view (${(top.confidence * 100).toInt()}% • ${top.severity}) at ${TimeFormat.time(detectedAt)}"
            manualConfirmLayout.visibility = View.VISIBLE
        }
    }

    private fun recordPotholeReport(result: DetectionResult, detectedAt: Long) {
        val loc = locationTracker?.reportableFix()
        lastReportTime = detectedAt
        lifecycleScope.launch {
            val outcome = ReportSubmitter.submit(
                context = applicationContext,
                location = loc,
                confidence = result.confidence,
                severity = result.severity,
                areaRatio = result.areaRatio,
                source = ReportSubmitter.SOURCE_CAMERA,
                detectedAt = detectedAt,
                sessionId = activeSessionId
            )
            when (outcome) {
                is ReportSubmitter.Result.Queued -> {
                    lastReportedLocation = loc
                    detectionCount++
                    tvDetectionCounter.text = "Potholes logged: $detectionCount"
                    tvLastDetectionTime.text = "Last detection: ${TimeFormat.dateTime(detectedAt)}"
                    vibrate()
                    activeSessionId?.let { sid ->
                        LiveSessionManager.broadcastDetection(sid, SessionDetection(
                            detectionId = outcome.clientUuid,
                            latitude = loc!!.latitude,
                            longitude = loc.longitude,
                            confidence = result.confidence.toDouble(),
                            timestamp = detectedAt,
                            gpsAccuracy = if (loc.hasAccuracy()) loc.accuracy else 0f,
                            severity = result.severity
                        ))
                    }
                }
                ReportSubmitter.Result.NoLocationFix -> {
                    tvLastDetectionTime.text = "Seen at ${TimeFormat.time(detectedAt)} — not reported: waiting for an accurate GPS fix"
                }
                ReportSubmitter.Result.NotSignedIn -> {
                    Toast.makeText(this@CameraActivity, "Sign in to submit reports.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun vibrate() {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION") vibrator.vibrate(150)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Release everything this screen started; nothing keeps running after the user leaves.
        cameraProvider?.unbindAll()
        warningManager.shutdown()
        nearbyMonitor?.stopMonitoring()
        bannerHideJob?.cancel()
        locationTracker?.stopUpdates()
        companionCountListener?.let { l ->
            activeSessionId?.let { LiveSessionManager.getSessionRef(it).child("participants").removeEventListener(l) }
        }
        cameraExecutor.execute { detector?.close(); detector = null }
        cameraExecutor.shutdown()
    }

    companion object {
        const val REPORT_CONFIDENCE = 0.55f
        const val COOLDOWN_MS = 3500L
        const val SAME_POTHOLE_DISTANCE_M = 10f
        const val SAME_POTHOLE_WINDOW_MS = 60_000L
        const val SESSION_LOCATION_INTERVAL_MS = 2500L
    }
}
