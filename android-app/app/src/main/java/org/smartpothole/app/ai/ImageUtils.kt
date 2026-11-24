package org.smartpothole.app.ai

import android.graphics.Bitmap
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

object ImageUtils {

    const val INPUT_WIDTH = 640
    const val INPUT_HEIGHT = 640
    const val CHANNELS = 3

    /**
     * Converts a Bitmap to a DIRECT FloatBuffer formatted for ONNX Runtime [1, 3, 640, 640] CHW.
     * CRITICAL: Must be a direct native byte buffer (isDirect == true) to prevent JNI null pointer SIGSEGV!
     */
    fun bitmapToFloatBuffer(bitmap: Bitmap): FloatBuffer {
        val scaledBitmap = if (bitmap.width == INPUT_WIDTH && bitmap.height == INPUT_HEIGHT) {
            bitmap
        } else {
            Bitmap.createScaledBitmap(bitmap, INPUT_WIDTH, INPUT_HEIGHT, true)
        }

        // Allocate DIRECT native buffer for ONNX Runtime JNI (4 bytes per float)
        val byteBuffer = ByteBuffer.allocateDirect(CHANNELS * INPUT_WIDTH * INPUT_HEIGHT * 4).apply {
            order(ByteOrder.nativeOrder())
        }
        val floatBuffer = byteBuffer.asFloatBuffer()

        val intValues = IntArray(INPUT_WIDTH * INPUT_HEIGHT)
        scaledBitmap.getPixels(intValues, 0, INPUT_WIDTH, 0, 0, INPUT_WIDTH, INPUT_HEIGHT)

        val totalPixels = INPUT_WIDTH * INPUT_HEIGHT

        // Red Channel (Normalized 0.0 - 1.0)
        for (i in 0 until totalPixels) {
            val pixel = intValues[i]
            val r = ((pixel shr 16) and 0xFF) / 255.0f
            floatBuffer.put(i, r)
        }

        // Green Channel
        for (i in 0 until totalPixels) {
            val pixel = intValues[i]
            val g = ((pixel shr 8) and 0xFF) / 255.0f
            floatBuffer.put(totalPixels + i, g)
        }

        // Blue Channel
        for (i in 0 until totalPixels) {
            val pixel = intValues[i]
            val b = (pixel and 0xFF) / 255.0f
            floatBuffer.put(2 * totalPixels + i, b)
        }

        floatBuffer.rewind()
        return floatBuffer
    }
}
