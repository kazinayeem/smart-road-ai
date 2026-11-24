package org.smartpothole.app.ui

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updateLayoutParams
import androidx.core.view.updatePadding

/**
 * Safe-area handling. Every screen draws edge-to-edge (mandatory on Android 15 with targetSdk 35)
 * and then pushes its own chrome clear of the status bar, navigation/gesture bar, display cutout
 * and keyboard. Initial padding/margins are remembered so insets are added, never accumulated.
 */
fun ComponentActivity.edgeToEdge() = enableEdgeToEdge()

private val safeTypes = WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()

/** Adds the safe-area insets to this view's padding on the chosen sides (+ IME at the bottom if asked). */
fun View.padForSafeArea(top: Boolean = false, bottom: Boolean = false, horizontal: Boolean = true, ime: Boolean = false) {
    val start = paddingLeft; val end = paddingRight; val t = paddingTop; val b = paddingBottom
    ViewCompat.setOnApplyWindowInsetsListener(this) { v, insets ->
        val bars = insets.getInsets(safeTypes)
        val imeBottom = if (ime) insets.getInsets(WindowInsetsCompat.Type.ime()).bottom else 0
        v.updatePadding(
            left = start + if (horizontal) bars.left else 0,
            right = end + if (horizontal) bars.right else 0,
            top = t + if (top) bars.top else 0,
            bottom = b + if (bottom) maxOf(bars.bottom, imeBottom) else 0
        )
        insets
    }
    requestApplyInsetsWhenAttached()
}

/** Same as [padForSafeArea] but for floating controls positioned with margins (map/camera overlays). */
fun View.marginForSafeArea(top: Boolean = false, bottom: Boolean = false) {
    val lp = layoutParams as? ViewGroup.MarginLayoutParams ?: return
    val t = lp.topMargin; val b = lp.bottomMargin; val l = lp.leftMargin; val r = lp.rightMargin
    ViewCompat.setOnApplyWindowInsetsListener(this) { v, insets ->
        val bars = insets.getInsets(safeTypes)
        v.updateLayoutParams<ViewGroup.MarginLayoutParams> {
            topMargin = t + if (top) bars.top else 0
            bottomMargin = b + if (bottom) bars.bottom else 0
            leftMargin = l + bars.left
            rightMargin = r + bars.right
        }
        insets
    }
    requestApplyInsetsWhenAttached()
}

private fun View.requestApplyInsetsWhenAttached() {
    if (isAttachedToWindow) requestApplyInsets()
    else addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
        override fun onViewAttachedToWindow(v: View) { v.removeOnAttachStateChangeListener(this); v.requestApplyInsets() }
        override fun onViewDetachedFromWindow(v: View) = Unit
    })
}

/** System animation scale; 0 means the user turned animations off ("Remove animations"). */
fun Activity.animationsEnabled(): Boolean = runCatching {
    android.provider.Settings.Global.getFloat(contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
}.getOrDefault(true)
