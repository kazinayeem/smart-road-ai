package org.smartpothole.app.session

import android.graphics.Color
import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import org.smartpothole.app.R

class CompanionDetectionsAdapter(
    private val onItemClick: (SessionDetection) -> Unit
) : RecyclerView.Adapter<CompanionDetectionsAdapter.DetectionViewHolder>() {

    private val items = mutableListOf<SessionDetection>()

    fun addDetection(detection: SessionDetection) {
        // Prevent duplicate insertion
        if (items.none { it.detectionId == detection.detectionId }) {
            items.add(0, detection) // Add at top (newest first)
            notifyItemInserted(0)
        }
    }

    fun setDetections(newItems: List<SessionDetection>) {
        items.clear()
        items.addAll(newItems.sortedByDescending { it.timestamp })
        notifyDataSetChanged()
    }

    fun getItems(): List<SessionDetection> = items

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DetectionViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_session_detection, parent, false)
        return DetectionViewHolder(view)
    }

    override fun onBindViewHolder(holder: DetectionViewHolder, position: Int) {
        holder.bind(items[position], onItemClick)
    }

    override fun getItemCount(): Int = items.size

    class DetectionViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvSeverityBadge: TextView = itemView.findViewById(R.id.tvSeverityBadge)
        private val tvDetectionId: TextView = itemView.findViewById(R.id.tvDetectionId)
        private val tvConfidence: TextView = itemView.findViewById(R.id.tvConfidence)
        private val tvCoordinates: TextView = itemView.findViewById(R.id.tvCoordinates)
        private val tvTimestamp: TextView = itemView.findViewById(R.id.tvTimestamp)

        fun bind(item: SessionDetection, onItemClick: (SessionDetection) -> Unit) {
            tvDetectionId.text = item.detectionId
            val confPct = (item.confidence * 100).toInt()
            tvConfidence.text = "$confPct% Conf"

            val accuracy = if (item.gpsAccuracy > 0) " • ±${String.format("%.1f", item.gpsAccuracy)}m" else ""
            tvCoordinates.text = "${String.format("%.4f", item.latitude)}, ${String.format("%.4f", item.longitude)}$accuracy"

            val sev = item.severity.ifEmpty { "HIGH" }
            tvSeverityBadge.text = sev
            when (sev.uppercase()) {
                "HIGH", "CRITICAL" -> tvSeverityBadge.setBackgroundResource(R.drawable.badge_critical_bg)
                "MEDIUM" -> tvSeverityBadge.setBackgroundResource(R.drawable.badge_medium_bg)
                else -> tvSeverityBadge.setBackgroundResource(R.drawable.badge_resolved_bg)
            }

            val elapsed = System.currentTimeMillis() - item.timestamp
            val relative = if (elapsed < 15000) "Just now" else DateUtils.getRelativeTimeSpanString(item.timestamp).toString()
            tvTimestamp.text = "${org.smartpothole.app.util.TimeFormat.dateTime(item.timestamp)} ($relative)"

            itemView.setOnClickListener { onItemClick(item) }
        }
    }
}
