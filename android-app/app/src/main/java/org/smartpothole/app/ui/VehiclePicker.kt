package org.smartpothole.app.ui

import android.content.res.ColorStateList
import android.view.Gravity
import android.view.ViewGroup
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.view.setPadding
import com.google.android.material.card.MaterialCardView
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager

/** Selectable vehicle cards (icon + label + checked state), used in registration and profile. */
object VehiclePicker {

    fun iconFor(type: String): Int = when (type) {
        "MOTORCYCLE" -> R.drawable.ic_vehicle_motorcycle
        "CAR" -> R.drawable.ic_vehicle_car
        "BICYCLE" -> R.drawable.ic_vehicle_bicycle
        "CNG" -> R.drawable.ic_vehicle_cng
        "BUS" -> R.drawable.ic_vehicle_bus
        "TRUCK" -> R.drawable.ic_vehicle_truck
        else -> R.drawable.ic_vehicle_walking
    }

    private fun shortLabel(key: String, label: String) = when (key) { "CNG" -> "CNG / Auto"; "MOTORCYCLE" -> "Motorbike"; else -> label }

    /** Fills [grid] with one card per vehicle; [onSelected] fires when the user picks a different one. */
    fun bind(grid: GridLayout, selected: String, onSelected: (String) -> Unit) {
        val ctx = grid.context
        val dp = ctx.resources.displayMetrics.density
        grid.removeAllViews()
        grid.columnCount = if (ctx.resources.configuration.screenWidthDp >= 600) 4 else 3
        val cards = mutableListOf<Pair<String, MaterialCardView>>()
        AuthManager.VEHICLES.forEach { (key, label) ->
            val card = MaterialCardView(ctx).apply {
                isCheckable = true
                isChecked = key == selected
                radius = 12 * dp
                strokeWidth = (1.5f * dp).toInt()
                setStrokeColor(ContextCompat.getColorStateList(ctx, R.color.vehicle_card_stroke))
                checkedIconTint = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.sp_primary))
                contentDescription = "$label vehicle"
                layoutParams = GridLayout.LayoutParams().apply {
                    width = 0
                    height = ViewGroup.LayoutParams.WRAP_CONTENT
                    columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
                    setMargins((4 * dp).toInt(), (4 * dp).toInt(), (4 * dp).toInt(), (4 * dp).toInt())
                }
                minimumHeight = (88 * dp).toInt()
            }
            val col = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding((10 * dp).toInt())
            }
            col.addView(ImageView(ctx).apply {
                setImageResource(iconFor(key))
                imageTintList = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.sp_on_surface))
                importantForAccessibility = ImageView.IMPORTANT_FOR_ACCESSIBILITY_NO
                layoutParams = LinearLayout.LayoutParams((28 * dp).toInt(), (28 * dp).toInt())
            })
            col.addView(TextView(ctx).apply {
                text = shortLabel(key, label)
                gravity = Gravity.CENTER
                setTextAppearance(R.style.SP_Text_Caption)
                setTextColor(ContextCompat.getColor(ctx, R.color.sp_on_surface))
                maxLines = 2
                setPadding(0, (6 * dp).toInt(), 0, 0)
            })
            card.addView(col)
            card.setOnClickListener {
                if (card.isChecked) return@setOnClickListener
                cards.forEach { (_, c) -> c.isChecked = false }
                card.isChecked = true
                onSelected(key)
            }
            cards += key to card
            grid.addView(card)
        }
    }
}
