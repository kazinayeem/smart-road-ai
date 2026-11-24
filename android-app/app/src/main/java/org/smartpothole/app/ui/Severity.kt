package org.smartpothole.app.ui

import android.content.Context
import android.widget.TextView
import androidx.core.content.ContextCompat
import org.smartpothole.app.R

/** One mapping for how severity and upload state look everywhere (color is never the only cue). */
object Severity {
    fun markerRes(priority: String, status: String): Int = when {
        status in setOf("ASSIGNED", "ACCEPTED", "IN_PROGRESS", "REPAIR_SUBMITTED", "CITY_VERIFICATION") -> R.drawable.marker_hazard_progress
        priority == "CRITICAL" || priority == "HIGH" -> R.drawable.marker_hazard_high
        priority == "MEDIUM" -> R.drawable.marker_hazard_medium
        else -> R.drawable.marker_hazard_low
    }

    fun label(priority: String) = when (priority) {
        "CRITICAL" -> "Critical"; "HIGH" -> "High"; "MEDIUM" -> "Medium"; "LOW" -> "Low"; else -> priority
    }

    fun styleChip(tv: TextView, priority: String) {
        val (bg, fg) = when (priority) {
            "CRITICAL", "HIGH" -> R.drawable.bg_chip_danger to R.color.sp_danger
            "MEDIUM" -> R.drawable.bg_chip_warning to R.color.sp_warning
            else -> R.drawable.bg_chip_info to R.color.sp_info
        }
        tv.setBackgroundResource(bg)
        tv.setTextColor(ContextCompat.getColor(tv.context, fg))
        tv.text = label(priority)
    }

    fun styleSyncChip(tv: TextView, syncStatus: String) {
        val (bg, fg, text) = when (syncStatus) {
            "SYNCED" -> Triple(R.drawable.bg_chip_success, R.color.sp_success, "Uploaded")
            "FAILED" -> Triple(R.drawable.bg_chip_danger, R.color.sp_danger, "Retrying")
            else -> Triple(R.drawable.bg_chip_warning, R.color.sp_warning, "Waiting")
        }
        tv.setBackgroundResource(bg)
        tv.setTextColor(ContextCompat.getColor(tv.context, fg))
        tv.text = text
    }

    /** What the city corporation has done with a report, in plain words. */
    fun cityStatus(status: String) = when (status) {
        "NEW", "NEW_REPORT" -> "Reported · awaiting city review"
        "UNDER_REVIEW" -> "City is reviewing"
        "VERIFIED" -> "Verified by the city"
        "ASSIGNED", "ACCEPTED" -> "Repair crew assigned"
        "IN_PROGRESS" -> "Repair in progress"
        "REPAIR_SUBMITTED", "CITY_VERIFICATION" -> "Repaired · awaiting city check"
        "RESOLVED" -> "Fixed"
        else -> statusLabel(status)
    }

    fun statusLabel(status: String) = status.lowercase().replace('_', ' ').replaceFirstChar { it.uppercase() }

    fun color(ctx: Context, res: Int) = ContextCompat.getColor(ctx, res)
}
