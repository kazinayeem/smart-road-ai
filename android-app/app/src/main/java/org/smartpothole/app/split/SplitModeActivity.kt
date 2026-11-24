package org.smartpothole.app.split

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.location.Location
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import org.maplibre.android.maps.MapView
import org.smartpothole.app.R
import org.smartpothole.app.ai.DetectionResult
import org.smartpothole.app.camera.CameraActivity
import org.smartpothole.app.camera.OverlayView
import org.smartpothole.app.detect.DetectionController
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.map.LiveMapController
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.ui.HomeFragment
import org.smartpothole.app.ui.Prefs
import org.smartpothole.app.ui.Severity
import org.smartpothole.app.ui.edgeToEdge
import org.smartpothole.app.ui.padForSafeArea
import org.smartpothole.app.util.TimeFormat

/**
 * Split Mode: live camera with on-device detection (top) + drive map (bottom), sharing one GPS stream.
 * Layouts: balanced 50/50, bigger map (35/65), bigger camera (65/35); side-by-side in landscape.
 * Leaving the screen releases the camera, GPS and Firebase listeners.
 */
class SplitModeActivity : AppCompatActivity(), DetectionController.Listener {

    private lateinit var detection: DetectionController
    private var map: LiveMapController? = null
    private var tracker: LocationTracker? = null
    private lateinit var overlay: OverlayView
    private lateinit var tvStatus: TextView
    private lateinit var tvLast: TextView
    private var cameraOn = true
    private var layoutMode = 0 // 0 balanced, 1 bigger map, 2 bigger camera

    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        tracker?.start()
        if (has(Manifest.permission.CAMERA)) detection.startCamera() else tvStatus.text = "Camera permission needed"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        edgeToEdge()
        setContentView(R.layout.activity_split_mode)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        findViewById<View>(R.id.cameraHud).padForSafeArea(top = true)
        findViewById<View>(R.id.splitControls).padForSafeArea(bottom = true)

        val landscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        findViewById<LinearLayout>(R.id.splitPanes).orientation = if (landscape) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
        if (landscape) fixLandscapePanes()
        // Short phones: give the map a little more room so both panes stay usable.
        if (!landscape && resources.configuration.screenHeightDp < 640) setWeights(0.45f, 0.55f)

        overlay = findViewById(R.id.overlayView)
        tvStatus = findViewById(R.id.tvStatus)
        tvLast = findViewById(R.id.tvLastDetection)
        val tvGps = findViewById<TextView>(R.id.tvGps)
        val tvSpeed = findViewById<TextView>(R.id.tvSpeed)
        val banner = findViewById<View>(R.id.hazardBanner)
        val recenter = findViewById<ExtendedFloatingActionButton>(R.id.fabRecenter)

        map = LiveMapController(this, findViewById<MapView>(R.id.mapView), savedInstanceState, bottomInsetDp = 76,
            onFollowChanged = { f -> recenter.visibility = if (f) View.GONE else View.VISIBLE },
            onHazardAhead = { h, d -> showBanner(banner, h, d) })
        recenter.setOnClickListener { map?.recenter() }

        tracker = LocationTracker(this, 1000L, 1f) { loc ->
            map?.onLocation(loc)
            tvGps.text = if (loc.hasAccuracy()) "±${loc.accuracy.toInt()} m" else "GPS"
            tvSpeed.text = if (loc.hasSpeed()) (loc.speed * 3.6f).toInt().toString() else "–"
            tvSpeed.contentDescription = "${tvSpeed.text} kilometres per hour"
        }
        detection = DetectionController(this, this, findViewById<PreviewView>(R.id.previewView), { tracker?.reportableFix() }, this)
        detection.audioEnabled = Prefs.voice(this)

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        val btnPause = findViewById<MaterialButton>(R.id.btnPause)
        btnPause.setOnClickListener {
            detection.paused = !detection.paused
            btnPause.text = if (detection.paused) "Resume" else "Pause"
            btnPause.setIconResource(if (detection.paused) R.drawable.ic_play else R.drawable.ic_pause)
            tvStatus.text = if (detection.paused) "Detection paused" else "Scanning road"
            if (detection.paused) overlay.setResults(emptyList())
        }
        val btnCamera = findViewById<MaterialButton>(R.id.btnCamera)
        btnCamera.setOnClickListener {
            cameraOn = !cameraOn
            if (cameraOn) detection.startCamera() else { detection.stopCamera(); overlay.setResults(emptyList()) }
            btnCamera.text = if (cameraOn) "Camera off" else "Camera on"
            btnCamera.setIconResource(if (cameraOn) R.drawable.ic_stop else R.drawable.ic_camera)
        }
        val btnAudio = findViewById<MaterialButton>(R.id.btnAudio)
        fun syncAudio() {
            btnAudio.text = if (detection.audioEnabled) "Voice" else "Muted"
            btnAudio.setIconResource(if (detection.audioEnabled) R.drawable.ic_volume_up else R.drawable.ic_volume_off)
        }
        syncAudio()
        btnAudio.setOnClickListener { detection.audioEnabled = !detection.audioEnabled; Prefs.setVoice(this, detection.audioEnabled); syncAudio() }
        val btnLayout = findViewById<MaterialButton>(R.id.btnLayout)
        btnLayout.setOnClickListener {
            layoutMode = (layoutMode + 1) % 3
            when (layoutMode) {
                0 -> { setWeights(1f, 1f); btnLayout.text = "Bigger map"; btnLayout.setIconResource(R.drawable.ic_map) }
                1 -> { setWeights(0.35f, 0.65f); btnLayout.text = "Bigger camera"; btnLayout.setIconResource(R.drawable.ic_camera) }
                else -> { setWeights(0.65f, 0.35f); btnLayout.text = "50 / 50"; btnLayout.setIconResource(R.drawable.ic_split) }
            }
        }
        findViewById<View>(R.id.btnFull).setOnClickListener { startActivity(Intent(this, CameraActivity::class.java)); finish() }

        val need = listOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION).filterNot(::has)
        if (need.isEmpty()) detection.startCamera() else permissions.launch(need.toTypedArray())
    }

    private fun has(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun setWeights(camera: Float, mapW: Float) {
        (findViewById<View>(R.id.paneCamera).layoutParams as LinearLayout.LayoutParams).weight = camera
        (findViewById<View>(R.id.paneMap).layoutParams as LinearLayout.LayoutParams).weight = mapW
        findViewById<View>(R.id.splitPanes).requestLayout()
    }

    private fun fixLandscapePanes() {
        listOf(R.id.paneCamera, R.id.paneMap).forEach { id ->
            val lp = findViewById<View>(id).layoutParams as LinearLayout.LayoutParams
            lp.width = 0; lp.height = LinearLayout.LayoutParams.MATCH_PARENT
        }
    }

    private fun showBanner(banner: View, h: PotholeNode?, d: Float) {
        if (h == null || !Prefs.nearby(this)) { banner.visibility = View.GONE; return }
        banner.visibility = View.VISIBLE
        banner.findViewById<TextView>(R.id.bannerTitle).text = "Pothole in ${HomeFragment.formatDistance(d)}"
        banner.findViewById<TextView>(R.id.bannerSubtitle).text = "${Severity.label(h.priority)} severity"
    }

    override fun onStatus(text: String) { tvStatus.text = text }
    override fun onFrame(results: List<DetectionResult>, fps: Int, latencyMs: Long, imageWidth: Int, imageHeight: Int) {
        overlay.setResults(results, imageWidth, imageHeight)
        val top = results.maxByOrNull { it.confidence }
        tvStatus.text = if (top == null) "Road clear · $fps fps" else "Pothole ${(top.confidence * 100).toInt()}% · ${Severity.label(top.severity)}"
    }
    override fun onConfirmedDetection(result: DetectionResult, detectedAt: Long) {
        detection.warnings.triggerInstantWarning(result.confidence, result.severity) { _, _ -> }
    }
    override fun onReported(result: DetectionResult, detectedAt: Long, location: Location, totalThisSession: Int) {
        tvLast.text = "Reported ${TimeFormat.dateTime(detectedAt)} · $totalThisSession this trip"
        // The new report appears on the map through the live reports listener.
    }
    override fun onNotReported(detectedAt: Long, reason: String) { tvLast.text = "Seen ${TimeFormat.time(detectedAt)} · $reason" }

    override fun onStart() { super.onStart(); map?.onStart() }
    override fun onStop() { super.onStop(); map?.onStop() }
    override fun onLowMemory() { super.onLowMemory(); map?.onLowMemory() }
    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); map?.onSaveInstanceState(outState) }
    override fun onResume() { super.onResume(); map?.onResume(); map?.startHazards(); tracker?.start() }
    override fun onPause() { super.onPause(); map?.onPause(); tracker?.stopUpdates() }

    override fun onDestroy() {
        super.onDestroy()
        tracker?.stopUpdates()
        map?.destroy()
        if (::detection.isInitialized) detection.release()
    }
}
