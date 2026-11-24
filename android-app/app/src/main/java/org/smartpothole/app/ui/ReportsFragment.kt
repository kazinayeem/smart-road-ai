package org.smartpothole.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.database.AppDatabase
import org.smartpothole.app.database.PotholeReportEntity
import org.smartpothole.app.report.ReportSubmitter
import org.smartpothole.app.util.TimeFormat

/** Report history (local outbox + uploaded), live-updating from Room. */
class ReportsFragment : Fragment(R.layout.fragment_reports) {

    private val adapter = Adapter()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        view.findViewById<View>(R.id.reportsRoot).padForSafeArea(top = true)
        val rv = view.findViewById<RecyclerView>(R.id.rvReports)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter
        view.findViewById<View>(R.id.btnSync).setOnClickListener {
            ReportSubmitter.enqueueSync(requireContext())
            Toast.makeText(requireContext(), "Uploading saved reports…", Toast.LENGTH_SHORT).show()
        }
        val uid = AuthManager.currentUser?.uid ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                AppDatabase.getDatabase(requireContext()).potholeReportDao().observeReportsFor(uid).collect { list ->
                    adapter.submitList(list)
                    val pending = list.count { it.syncStatus != "SYNCED" }
                    view.findViewById<TextView>(R.id.tvReportsSummary).text =
                        "${list.size} report${if (list.size == 1) "" else "s"}" + if (pending > 0) " · $pending waiting to upload" else ""
                    view.findViewById<View>(R.id.reportsEmpty).visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                    rv.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
                }
            }
        }
    }

    private class Adapter : ListAdapter<PotholeReportEntity, Adapter.VH>(object : DiffUtil.ItemCallback<PotholeReportEntity>() {
        override fun areItemsTheSame(a: PotholeReportEntity, b: PotholeReportEntity) = a.clientUuid == b.clientUuid
        override fun areContentsTheSame(a: PotholeReportEntity, b: PotholeReportEntity) = a == b
    }) {
        class VH(v: View) : RecyclerView.ViewHolder(v)
        override fun onCreateViewHolder(p: ViewGroup, t: Int) = VH(LayoutInflater.from(p.context).inflate(R.layout.item_report_row, p, false))
        override fun onBindViewHolder(h: VH, i: Int) {
            val r = getItem(i); val v = h.itemView
            val manual = r.source == ReportSubmitter.SOURCE_MANUAL
            v.findViewById<TextView>(R.id.rowTitle).text =
                if (manual) "Marked pothole · ${Severity.label(r.priority)}" else "${Severity.label(r.priority)} · ${(r.confidence * 100).toInt()}% AI confidence"
            v.findViewById<TextView>(R.id.rowSubtitle).text =
                "${TimeFormat.dateTime(r.createdAt)}\n${String.format("%.5f, %.5f", r.latitude, r.longitude)} · ±${r.gpsAccuracy.toInt()} m"
            Severity.styleSyncChip(v.findViewById(R.id.rowChip), r.syncStatus)
            v.contentDescription = "${v.findViewById<TextView>(R.id.rowTitle).text}, ${TimeFormat.dateTime(r.createdAt)}, ${v.findViewById<TextView>(R.id.rowChip).text}"
        }
    }
}
