package org.smartpothole.app.ai

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.nio.FloatBuffer
import java.util.Collections
import kotlin.math.max
import kotlin.math.min

class PotholeDetector(private val context: Context) {

    private val TAG = "PotholeDetector"
    private var ortEnvironment: OrtEnvironment? = null
    private var ortSession: OrtSession? = null

    // Candidate threshold for NMS; the app only *reports* detections above REPORT_CONFIDENCE.
    private val confThreshold = 0.25f
    private val iouThreshold = 0.45f

    init {
        loadModel()
    }

    private fun loadModel() {
        try {
            ortEnvironment = OrtEnvironment.getEnvironment()
            val modelFile = getAssetFile("pothole_yolov8s.onnx")
            val sessionOptions = OrtSession.SessionOptions().apply {
                setIntraOpNumThreads(4)
                setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
            }
            ortSession = ortEnvironment?.createSession(modelFile.absolutePath, sessionOptions)
            Log.i(TAG, "ONNX Runtime model loaded successfully from assets.")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing ONNX Runtime session: ${e.message}", e)
        }
    }

    private fun getAssetFile(assetName: String): File {
        // Key the cached copy on the install time so an app update with a new model replaces it.
        val installStamp = runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime
        }.getOrDefault(0L)
        val file = File(context.cacheDir, "$installStamp-$assetName")
        if (!file.exists() || file.length() == 0L) {
            context.cacheDir.listFiles { f -> f.name.endsWith("-$assetName") && f != file }?.forEach { it.delete() }
            context.assets.open(assetName).use { input ->
                FileOutputStream(file).use { output ->
                    input.copyTo(output)
                }
            }
        }
        return file
    }

    /**
     * Executes local offline YOLOv8 inference on road image bitmap
     */
    fun detect(bitmap: Bitmap): List<DetectionResult> {
        val session = ortSession ?: return emptyList()
        val env = ortEnvironment ?: return emptyList()

        try {
            val floatBuffer = ImageUtils.bitmapToFloatBuffer(bitmap)
            val shape = longArrayOf(1, 3, 640, 640)
            val inputName = session.inputNames.iterator().next()

            // Native tensors and results MUST be closed every frame, otherwise native memory
            // grows until the app is killed (previous versions leaked here).
            val preds: Array<FloatArray> = OnnxTensor.createTensor(env, floatBuffer, shape).use { inputTensor ->
                session.run(Collections.singletonMap(inputName, inputTensor)).use { results ->
                    @Suppress("UNCHECKED_CAST")
                    val outputArray = (results[0] as OnnxTensor).value as Array<Array<FloatArray>> // [1][5][8400]
                    outputArray[0] // [5][8400], copied into JVM arrays so it outlives the result
                }
            }

            val detections = mutableListOf<DetectionResult>()
            val numAnchors = preds[0].size // 8400

            for (i in 0 until numAnchors) {
                val conf = preds[4][i]
                if (conf >= confThreshold) {
                    val cx = preds[0][i]
                    val cy = preds[1][i]
                    val w = preds[2][i]
                    val h = preds[3][i]

                    val x1 = max(0f, (cx - w / 2f) / 640f)
                    val y1 = max(0f, (cy - h / 2f) / 640f)
                    val x2 = min(1f, (cx + w / 2f) / 640f)
                    val y2 = min(1f, (cy + h / 2f) / 640f)

                    val areaRatio = ((x2 - x1) * (y2 - y1))
                    val severity = classifySeverity(areaRatio, conf)

                    detections.add(
                        DetectionResult(
                            x1 = x1,
                            y1 = y1,
                            x2 = x2,
                            y2 = y2,
                            confidence = conf,
                            areaRatio = areaRatio,
                            severity = severity
                        )
                    )
                }
            }

            return applyNms(detections)
        } catch (e: Exception) {
            Log.e(TAG, "Inference execution error: ${e.message}", e)
            return emptyList()
        }
    }

    private fun classifySeverity(areaRatio: Float, confidence: Float): String {
        return when {
            areaRatio >= 0.08f || (confidence >= 0.85f && areaRatio >= 0.04f) -> "HIGH"
            areaRatio >= 0.03f -> "MEDIUM"
            else -> "LOW"
        }
    }

    private fun applyNms(detections: List<DetectionResult>): List<DetectionResult> {
        val sorted = detections.sortedByDescending { it.confidence }.toMutableList()
        val keep = mutableListOf<DetectionResult>()

        while (sorted.isNotEmpty()) {
            val best = sorted.removeAt(0)
            keep.add(best)

            val iterator = sorted.iterator()
            while (iterator.hasNext()) {
                val next = iterator.next()
                if (calculateIoU(best, next) > iouThreshold) {
                    iterator.remove()
                }
            }
        }
        return keep
    }

    private fun calculateIoU(a: DetectionResult, b: DetectionResult): Float {
        val xA = max(a.x1, b.x1)
        val yA = max(a.y1, b.y1)
        val xB = min(a.x2, b.x2)
        val yB = min(a.y2, b.y2)

        val interArea = max(0f, xB - xA) * max(0f, yB - yA)
        val areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
        val areaB = (b.x2 - b.x1) * (b.y2 - b.y1)

        val unionArea = areaA + areaB - interArea
        return if (unionArea > 0f) interArea / unionArea else 0f
    }

    fun close() {
        try {
            ortSession?.close()
            ortSession = null
            // OrtEnvironment is a process-wide singleton; closing it would break the next detector.
        } catch (e: Exception) {
            Log.e(TAG, "Error closing ONNX runtime resources", e)
        }
    }
}
