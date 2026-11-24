package org.smartpothole.app.camera

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import org.smartpothole.app.ai.DetectionResult

class OverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var results: List<DetectionResult> = emptyList()

    private val boxPaint = Paint().apply {
        style = Paint.Style.STROKE
        strokeWidth = 6f
        isAntiAlias = true
    }

    private val textPaint = Paint().apply {
        color = Color.WHITE
        textSize = 36f
        isAntiAlias = true
        style = Paint.Style.FILL
    }

    private val textBgPaint = Paint().apply {
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    fun setResults(detectionResults: List<DetectionResult>) {
        this.results = detectionResults
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()

        for (res in results) {
            val left = res.x1 * w
            val top = res.y1 * h
            val right = res.x2 * w
            val bottom = res.y2 * h

            val color = when (res.severity) {
                "CRITICAL", "HIGH" -> Color.parseColor("#EF4444") // Red
                "MEDIUM" -> Color.parseColor("#F59E0B")           // Amber
                else -> Color.parseColor("#3B82F6")               // Blue
            }

            boxPaint.color = color
            textBgPaint.color = color

            // Draw bounding box
            canvas.drawRoundRect(left, top, right, bottom, 12f, 12f, boxPaint)

            // Draw text badge
            val label = "Pothole ${(res.confidence * 100).toInt()}% [${res.severity}]"
            val textWidth = textPaint.measureText(label)
            val badgeHeight = 48f

            canvas.drawRect(left, top - badgeHeight, left + textWidth + 24f, top, textBgPaint)
            canvas.drawText(label, left + 12f, top - 12f, textPaint)
        }
    }
}
