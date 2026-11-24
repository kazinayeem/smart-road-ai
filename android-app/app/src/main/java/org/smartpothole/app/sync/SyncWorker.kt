package org.smartpothole.app.sync

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.auth.FirebaseAuth
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.database.AppDatabase

/**
 * Uploads PENDING/FAILED outbox rows. Each row is uploaded with its client UUID as the detection id,
 * so a retry after a partial upload never double-counts. Rows from a different (signed-out) account
 * are left alone until that account signs in again.
 */
class SyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val user = FirebaseAuth.getInstance().currentUser ?: return Result.success() // nothing we may upload
        val dao = AppDatabase.getDatabase(applicationContext).potholeReportDao()
        val pending = dao.getPendingSyncReports().filter { it.reporterId == user.uid }
        if (pending.isEmpty()) return Result.success()

        val reporterName = AuthManager.cachedProfile(applicationContext)?.name ?: user.displayName ?: "Citizen"
        var failures = 0
        for (row in pending) {
            try {
                val notes = row.notes.orEmpty()
                val sessionId = if (notes.startsWith("session:")) notes.removePrefix("session:") else ""
                val (reportId, _) = SmartPotholeDeduplicator.submitDetection(
                    DetectionNode(
                        detectionId = row.clientUuid,
                        reporterId = row.reporterId,
                        confidence = row.confidence.toDouble(),
                        latitude = row.latitude,
                        longitude = row.longitude,
                        gpsAccuracy = row.gpsAccuracy,
                        timestamp = row.createdAt,
                        sessionId = sessionId,
                        severity = row.priority,
                        source = row.source
                    ),
                    reporterName
                )
                dao.markSynced(row.clientUuid, reportId)
            } catch (e: Exception) {
                failures++
                Log.w(TAG, "Upload of ${row.clientUuid} failed: ${e.message}")
                dao.updateSyncStatus(row.clientUuid, "FAILED")
            }
        }
        // FAILED rows are retried with exponential backoff instead of being stuck forever.
        return if (failures > 0 && runAttemptCount < 8) Result.retry() else Result.success()
    }

    companion object {
        const val TAG = "SyncWorker"
        const val UNIQUE_NAME = "pothole_outbox_sync"
        const val PERIODIC_NAME = "pothole_outbox_sync_periodic"
    }
}
