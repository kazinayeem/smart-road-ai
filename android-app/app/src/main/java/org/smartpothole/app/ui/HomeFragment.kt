package org.smartpothole.app.ui

import android.content.Intent
import android.location.Location
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.camera.CameraActivity
import org.smartpothole.app.database.AppDatabase
import org.smartpothole.app.database.PotholeReportEntity
import org.smartpothole.app.location.LocationTracker
import org.smartpothole.app.network.NetworkUtils
import org.smartpothole.app.report.ReportSubmitter
import org.smartpothole.app.session.SessionHubActivity
import org.smartpothole.app.split.SplitModeActivity
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.util.TimeFormat
import java.util.Calendar

class HomeFragment : Fragment(R.layout.fragment_home), PermissionAware {

    private var tracker: LocationTracker? = null
    private var hazards: List<PotholeNode> = emptyList()
    private var reportsListener: ValueEventListener? = null
    private val reportsRef get() = FirebaseDatabase.getInstance().getReference("reports")
    private var marking = false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        view.findViewById<View>(R.id.homeScroll).padForSafeArea(top = true)
        bindProfile(view)

        view.findViewById<View>(R.id.cardStartDetection).setOnClickListener { startActivity(Intent(requireContext(), CameraActivity::class.java)) }
        quickAction(view, R.id.actionSplit, R.drawable.ic_split, "Split mode") { startActivity(Intent(requireContext(), SplitModeActivity::class.java)) }
        quickAction(view, R.id.actionDrive, R.drawable.ic_navigation, "Drive map") { (activity as? MainActivity)?.selectTab(R.id.nav_map) }
        quickAction(view, R.id.actionCompanion, R.drawable.ic_group, "Live companion") { startActivity(Intent(requireContext(), SessionHubActivity::class.java)) }
        view.findViewById<MaterialButton>(R.id.btnQuickGpsMark).setOnClickListener { quickMark(it as MaterialButton) }
        view.findViewById<View>(R.id.btnSeeAll).setOnClickListener { (activity as? MainActivity)?.selectTab(R.id.nav_reports) }

        stat(view, R.id.statTotal, "Detected")
        stat(view, R.id.statPending, "Waiting")
        stat(view, R.id.statUploaded, "Uploaded")

        tracker = LocationTracker(requireContext(), 5000L, 10f) { updateGps(); renderNearby() }
    }

    private fun bindProfile(v: View) {
        val p = AuthManager.cachedProfile(requireContext())
        val name = p?.name ?: "Rider"
        v.findViewById<TextView>(R.id.tvName).text = name.substringBefore(" (")
        v.findViewById<TextView>(R.id.tvAvatar).text = name.trim().take(1).uppercase()
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        v.findViewById<TextView>(R.id.tvGreeting).text = when (h) { in 5..11 -> "Good morning"; in 12..16 -> "Good afternoon"; else -> "Good evening" }
    }

    private fun quickAction(root: View, id: Int, icon: Int, label: String, onClick: () -> Unit) {
        val card = root.findViewById<View>(id)
        card.findViewById<ImageView>(R.id.qaIcon).setImageResource(icon)
        card.findViewById<TextView>(R.id.qaLabel).text = label
        card.contentDescription = label
        card.setOnClickListener { onClick() }
    }

    private fun stat(root: View, id: Int, label: String) {
        root.findViewById<View>(id).findViewById<TextView>(R.id.statLabel).text = label
    }

    override fun onResume() {
        super.onResume()
        if (isHidden) return
        tracker?.start()
        updateGps()
        refreshLocal()
        startHazards()
    }

    override fun onPause() {
        super.onPause()
        tracker?.stopUpdates()
        reportsListener?.let { reportsRef.removeEventListener(it) }
        reportsListener = null
    }

    override fun onHiddenChanged(hidden: Boolean) { if (hidden) onPause() else onResume() }

    override fun onPermissionsChanged() { tracker?.start(); updateGps() }

    private fun updateGps() {
        val v = view ?: return
        val chip = v.findViewById<TextView>(R.id.chipGps)
        val t = tracker
        val loc = t?.lastKnownLocation
        when {
            t == null || !t.hasPermission() -> setChip(chip, "Location off", R.drawable.bg_chip_danger, R.color.sp_danger, R.drawable.ic_gps_off)
            !t.isLocationServiceEnabled() -> setChip(chip, "Turn on location", R.drawable.bg_chip_warning, R.color.sp_warning, R.drawable.ic_gps_off)
            loc != null -> setChip(chip, "GPS ±${loc.accuracy.toInt()} m", R.drawable.bg_chip_success, R.color.sp_success, R.drawable.ic_my_location)
            else -> setChip(chip, "Finding GPS…", R.drawable.bg_chip_neutral, R.color.sp_on_surface, R.drawable.ic_my_location)
        }
        val net = v.findViewById<TextView>(R.id.chipNetwork)
        if (NetworkUtils.isNetworkConnected(requireContext())) setChip(net, "Online", R.drawable.bg_chip_success, R.color.sp_success, R.drawable.ic_cloud_done)
        else setChip(net, "Offline · saved for later", R.drawable.bg_chip_warning, R.color.sp_warning, R.drawable.ic_cloud_off)
    }

    private fun setChip(tv: TextView, text: String, bg: Int, fg: Int, icon: Int) {
        tv.text = text
        tv.setBackgroundResource(bg)
        val c = ContextCompat.getColor(requireContext(), fg)
        tv.setTextColor(c)
        tv.setCompoundDrawablesRelativeWithIntrinsicBounds(icon, 0, 0, 0)
        tv.compoundDrawableTintList = android.content.res.ColorStateList.valueOf(c)
    }

    private fun quickMark(btn: MaterialButton) {
        if (marking) return
        marking = true; btn.isEnabled = false
        val at = System.currentTimeMillis()
        viewLifecycleOwner.lifecycleScope.launch {
            val r = ReportSubmitter.submit(requireContext().applicationContext, tracker?.reportableFix(), 1f, "MEDIUM", 0f, ReportSubmitter.SOURCE_MANUAL, at)
            val msg = when (r) {
                is ReportSubmitter.Result.Queued -> "Pothole marked · ${TimeFormat.dateTime(at)}"
                ReportSubmitter.Result.NoLocationFix -> "No accurate GPS fix yet. Try again in open sky."
                ReportSubmitter.Result.NotSignedIn -> "Please sign in again."
            }
            Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
            marking = false; btn.isEnabled = true
            refreshLocal()
        }
    }

    private fun refreshLocal() {
        val uid = AuthManager.currentUser?.uid ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            val dao = AppDatabase.getDatabase(requireContext()).potholeReportDao()
            val v = view ?: return@launch
            v.findViewById<View>(R.id.statTotal).findViewById<TextView>(R.id.statValue).text = dao.getTotalCount(uid).toString()
            v.findViewById<View>(R.id.statPending).findViewById<TextView>(R.id.statValue).text = dao.getPendingCount(uid).toString()
            v.findViewById<View>(R.id.statUploaded).findViewById<TextView>(R.id.statValue).text = dao.getSyncedCount(uid).toString()
            renderRecent(dao.getReportsFor(uid).take(3))
        }
    }

    private fun renderRecent(items: List<PotholeReportEntity>) {
        val v = view ?: return
        val list = v.findViewById<LinearLayout>(R.id.listRecent)
        list.removeAllViews()
        v.findViewById<View>(R.id.tvRecentEmpty).visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
        items.forEach { r ->
            val row = LayoutInflater.from(requireContext()).inflate(R.layout.item_report_row, list, false)
            row.findViewById<TextView>(R.id.rowTitle).text =
                if (r.source == ReportSubmitter.SOURCE_MANUAL) "Marked pothole" else "AI detection · ${(r.confidence * 100).toInt()}%"
            row.findViewById<TextView>(R.id.rowSubtitle).text = TimeFormat.dateTime(r.createdAt)
            Severity.styleSyncChip(row.findViewById(R.id.rowChip), r.syncStatus)
            row.setOnClickListener { (activity as? MainActivity)?.selectTab(R.id.nav_reports) }
            list.addView(row)
        }
    }

    private fun startHazards() {
        if (reportsListener != null) return
        reportsListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                hazards = snapshot.children.mapNotNull { PotholeNode.fromReport(it) }.filter { it.isActive }
                renderNearby()
            }
            override fun onCancelled(error: DatabaseError) {
                view?.findViewById<TextView>(R.id.tvNearbyEmpty)?.apply { visibility = View.VISIBLE; text = "Couldn't load hazards. Check your connection." }
            }
        }
        reportsRef.addValueEventListener(reportsListener!!)
    }

    private fun renderNearby() {
        val v = view ?: return
        val list = v.findViewById<LinearLayout>(R.id.listNearby)
        val empty = v.findViewById<TextView>(R.id.tvNearbyEmpty)
        list.removeAllViews()
        val here = tracker?.lastKnownLocation
        if (here == null) {
            empty.visibility = View.VISIBLE
            empty.text = "Nearby hazards appear once your location is known."
            return
        }
        val near = hazards.map { it to dist(here, it) }.filter { it.second <= 3000f }.sortedBy { it.second }.take(3)
        empty.visibility = if (near.isEmpty()) View.VISIBLE else View.GONE
        // Absence of reports is not a safety guarantee — say so.
        empty.text = "No reported potholes within 3 km. Unreported damage may still exist."
        near.forEach { (h, d) ->
            val row = LayoutInflater.from(requireContext()).inflate(R.layout.item_report_row, list, false)
            row.findViewById<TextView>(R.id.rowTitle).text = "Pothole · ${formatDistance(d)}"
            val seen = if (h.totalDetections > 1) " · seen ${h.totalDetections}×" else ""
            row.findViewById<TextView>(R.id.rowSubtitle).text = "${Severity.statusLabel(h.status)} · ${TimeFormat.dateTime(h.firstDetectedAt)}$seen"
            Severity.styleChip(row.findViewById(R.id.rowChip), h.priority)
            row.setOnClickListener { (activity as? MainActivity)?.selectTab(R.id.nav_map) }
            list.addView(row)
        }
    }

    private fun dist(a: Location, h: PotholeNode): Float {
        val r = FloatArray(1); Location.distanceBetween(a.latitude, a.longitude, h.latitude, h.longitude, r); return r[0]
    }

    companion object {
        fun formatDistance(m: Float) = when { m < 10 -> "under 10 m"; m < 1000 -> "${(m / 10).toInt() * 10} m"; else -> String.format("%.1f km", m / 1000) }
    }
}
