package org.smartpothole.app.camera

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import org.smartpothole.app.ai.DetectionResult
import org.smartpothole.app.ui.Severity
import kotlin.math.max

/**
 * Draws detection boxes over a PreviewView that uses the default FILL_CENTER scale type.
 * Box coordinates are normalised to the (already rotated) analysis frame; they are mapped with the
 * same uniform scale + centre crop the preview applies, so boxes sit on the pothole on screen.
 */
class OverlayView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var results: List<DetectionResult> = emptyList()
    private var srcW = 0
    private var srcH = 0
    private val density = resources.displayMetrics.density

    private val boxPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 3f * density }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 13f * density; isFakeBoldText = true }
    private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    fun setResults(detections: List<DetectionResult>, imageWidth: Int = 0, imageHeight: Int = 0) {
        results = detections
        if (imageWidth > 0 && imageHeight > 0) { srcW = imageWidth; srcH = imageHeight }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (results.isEmpty()) return
        val vw = width.toFloat(); val vh = height.toFloat()
        val (scale, offX, offY) = if (srcW > 0 && srcH > 0) {
            val s = max(vw / srcW, vh / srcH)
            Triple(s, (vw - srcW * s) / 2f, (vh - srcH * s) / 2f)
        } else Triple(1f, 0f, 0f)
        val iw = if (srcW > 0) srcW.toFloat() else vw
        val ih = if (srcH > 0) srcH.toFloat() else vh

        for (r in results) {
            val left = r.x1 * iw * scale + offX
            val top = r.y1 * ih * scale + offY
            val right = r.x2 * iw * scale + offX
            val bottom = r.y2 * ih * scale + offY
            val color = when (r.severity) {
                "CRITICAL", "HIGH" -> Color.parseColor("#EF4444")
                "MEDIUM" -> Color.parseColor("#F59E0B")
                else -> Color.parseColor("#38BDF8")
            }
            boxPaint.color = color; bgPaint.color = color
            canvas.drawRoundRect(left, top, right, bottom, 10f * density, 10f * density, boxPaint)
            val label = "${(r.confidence * 100).toInt()}% · ${Severity.label(r.severity)}"
            val pad = 6f * density
            val tw = textPaint.measureText(label)
            val th = textPaint.textSize + pad
            val ty = if (top - th < 0) bottom else top - th // keep the label on screen
            canvas.drawRoundRect(left, ty, left + tw + 2 * pad, ty + th, 6f * density, 6f * density, bgPaint)
            canvas.drawText(label, left + pad, ty + th - pad * 0.9f, textPaint)
        }
    }
}
