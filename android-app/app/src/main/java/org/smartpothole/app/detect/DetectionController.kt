package org.smartpothole.app.detect

import android.content.Context
import android.location.Location
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.smartpothole.app.ai.DetectionResult
import org.smartpothole.app.ai.PotholeDetector
import org.smartpothole.app.report.ReportSubmitter
import org.smartpothole.app.session.LiveSessionManager
import org.smartpothole.app.session.SessionDetection
import org.smartpothole.app.warning.LocalPotholeWarningManager
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Camera + on-device YOLO detection + reporting, shared by the full camera screen and Split Mode.
 *
 * Pipeline per analysed frame: model -> 2-of-3 frame confirmation -> local warning ->
 * same-pothole suppression (3.5 s cooldown, 10 m / 60 s gate) -> outbox report (needs a fresh GPS fix).
 * Everything stops in [release]; nothing keeps running after the host screen closes.
 */
class DetectionController(
    private val context: Context,
    private val owner: LifecycleOwner,
    private val previewView: PreviewView,
    private val locationProvider: () -> Location?,
    private val listener: Listener,
    private val sessionId: String? = null
) {
    interface Listener {
        fun onStatus(text: String)
        fun onFrame(results: List<DetectionResult>, fps: Int, latencyMs: Long, imageWidth: Int, imageHeight: Int)
        fun onConfirmedDetection(result: DetectionResult, detectedAt: Long)
        fun onReported(result: DetectionResult, detectedAt: Long, location: Location, totalThisSession: Int)
        fun onNotReported(detectedAt: Long, reason: String)
        fun onManualConfirmNeeded(result: DetectionResult, detectedAt: Long) {}
    }

    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
    @Volatile private var detector: PotholeDetector? = null
    private var provider: ProcessCameraProvider? = null
    private val busy = AtomicBoolean(false)
    private val recentFrames = ArrayDeque<Boolean>()
    private var lastFrameAt = 0L
    private var lastReportAt = 0L
    private var lastReportedLocation: Location? = null
    private var reportedCount = 0
    val warnings = LocalPotholeWarningManager(context)

    @Volatile var paused = false
        set(value) { field = value; recentFrames.clear() }
    var autoReport = true
    var audioEnabled: Boolean
        get() = warnings.audioEnabled
        set(value) { warnings.audioEnabled = value }

    init {
        listener.onStatus("Loading AI model…")
        executor.execute { detector = PotholeDetector(context.applicationContext) }
    }

    fun startCamera() {
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            val p = runCatching { future.get() }.getOrNull() ?: run {
                listener.onStatus("Camera unavailable on this device"); return@addListener
            }
            provider = p
            val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
            @Suppress("DEPRECATION")
            val analysis = ImageAnalysis.Builder()
                .setTargetResolution(Size(640, 480))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()
            analysis.setAnalyzer(executor, ::analyze)
            try {
                p.unbindAll()
                p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                listener.onStatus("Scanning road")
            } catch (e: Exception) {
                Log.e(TAG, "Camera binding failed", e)
                listener.onStatus("Could not start camera")
            }
        }, ContextCompat.getMainExecutor(context))
    }

    /** Stops the camera (preview + analysis) but keeps the controller reusable via [startCamera]. */
    fun stopCamera() {
        provider?.unbindAll()
        listener.onStatus("Camera off")
    }

    private fun analyze(image: ImageProxy) {
        val det = detector
        if (det == null || paused || !busy.compareAndSet(false, true)) { image.close(); return }
        try {
            val start = System.currentTimeMillis()
            // Rotate to the display orientation first: the sensor delivers frames sideways, the model
            // was trained on upright road images, and the overlay must use the same frame of reference.
            val raw = image.toBitmap()
            val rotation = image.imageInfo.rotationDegrees
            val bmp = if (rotation == 0) raw else android.graphics.Bitmap.createBitmap(
                raw, 0, 0, raw.width, raw.height, android.graphics.Matrix().apply { postRotate(rotation.toFloat()) }, true
            ).also { raw.recycle() }
            val w = bmp.width; val h = bmp.height
            val results = det.detect(bmp)
            bmp.recycle()
            val now = System.currentTimeMillis()
            val fps = if (lastFrameAt > 0) (1000 / (now - lastFrameAt).coerceAtLeast(1)).toInt().coerceIn(1, 60) else 0
            lastFrameAt = now
            ContextCompat.getMainExecutor(context).execute { handle(results, now, fps, now - start, w, h) }
        } catch (e: Exception) {
            Log.w(TAG, "Inference error: ${e.message}")
        } finally {
            image.close()
            busy.set(false)
        }
    }

    private fun handle(results: List<DetectionResult>, frameAt: Long, fps: Int, latency: Long, w: Int, h: Int) {
        if (paused) return
        listener.onFrame(results, fps, latency, w, h)
        val top = results.maxByOrNull { it.confidence }
        val positive = top != null && top.confidence >= REPORT_CONFIDENCE
        recentFrames.addLast(positive)
        while (recentFrames.size > 3) recentFrames.removeFirst()
        if (!positive || recentFrames.count { it } < 2) return

        listener.onConfirmedDetection(top!!, frameAt)
        if (frameAt - lastReportAt < COOLDOWN_MS) return
        val loc = locationProvider()
        val last = lastReportedLocation
        if (loc != null && last != null && loc.distanceTo(last) < SAME_POTHOLE_M && frameAt - lastReportAt < SAME_POTHOLE_WINDOW_MS) return
        if (autoReport) report(top, frameAt) else listener.onManualConfirmNeeded(top, frameAt)
    }

    fun report(result: DetectionResult, detectedAt: Long) {
        lastReportAt = detectedAt
        val loc = locationProvider()
        owner.lifecycleScope.launch {
            when (val r = ReportSubmitter.submit(context.applicationContext, loc, result.confidence, result.severity,
                result.areaRatio, ReportSubmitter.SOURCE_CAMERA, detectedAt, sessionId)) {
                is ReportSubmitter.Result.Queued -> {
                    lastReportedLocation = loc
                    reportedCount++
                    vibrate()
                    listener.onReported(result, detectedAt, loc!!, reportedCount)
                    sessionId?.let {
                        LiveSessionManager.broadcastDetection(it, SessionDetection(
                            detectionId = r.clientUuid, latitude = loc.latitude, longitude = loc.longitude,
                            confidence = result.confidence.toDouble(), timestamp = detectedAt,
                            gpsAccuracy = if (loc.hasAccuracy()) loc.accuracy else 0f, severity = result.severity))
                    }
                }
                ReportSubmitter.Result.NoLocationFix -> listener.onNotReported(detectedAt, "Waiting for an accurate GPS fix")
                ReportSubmitter.Result.NotSignedIn -> listener.onNotReported(detectedAt, "Sign in to submit reports")
            }
        }
    }

    private fun vibrate() {
        val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) v.vibrate(VibrationEffect.createOneShot(120, VibrationEffect.DEFAULT_AMPLITUDE))
            else @Suppress("DEPRECATION") v.vibrate(120)
        }
    }

    fun release() {
        provider?.unbindAll()
        warnings.shutdown()
        executor.execute { detector?.close(); detector = null }
        executor.shutdown()
    }

    companion object {
        private const val TAG = "DetectionController"
        const val REPORT_CONFIDENCE = 0.55f
        const val COOLDOWN_MS = 3500L
        const val SAME_POTHOLE_M = 10f
        const val SAME_POTHOLE_WINDOW_MS = 60_000L
    }
}
