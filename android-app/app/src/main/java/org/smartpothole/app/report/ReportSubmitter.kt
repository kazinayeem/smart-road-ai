package org.smartpothole.app.report

import android.content.Context
import android.location.Location
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.database.AppDatabase
import org.smartpothole.app.database.PotholeReportEntity
import org.smartpothole.app.sync.SyncWorker
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * One path for every pothole report (camera auto, camera manual, 1-tap GPS mark):
 *   1. persist to the Room outbox immediately (works offline, survives process death),
 *   2. enqueue the unique sync job; WorkManager uploads as soon as a network is available.
 * Online, the upload normally completes within a second or two.
 */
object ReportSubmitter {

    const val SOURCE_CAMERA = "LIVE_CAMERA"
    const val SOURCE_MANUAL = "MANUAL_GPS"

    sealed class Result {
        data class Queued(val clientUuid: String, val detectedAt: Long) : Result()
        object NotSignedIn : Result()
        object NoLocationFix : Result()
    }

    suspend fun submit(
        context: Context,
        location: Location?,
        confidence: Float,
        severity: String,
        areaRatio: Float,
        source: String,
        detectedAt: Long = System.currentTimeMillis(),
        sessionId: String? = null
    ): Result {
        val user = AuthManager.currentUser ?: return Result.NotSignedIn
        // Never attach a made-up position to a report.
        val loc = location ?: return Result.NoLocationFix
        val uuid = UUID.randomUUID().toString()
        val entity = PotholeReportEntity(
            clientUuid = uuid,
            reporterId = user.uid,
            latitude = loc.latitude,
            longitude = loc.longitude,
            gpsAccuracy = if (loc.hasAccuracy()) loc.accuracy else 0f,
            confidence = confidence.coerceIn(0f, 1f),
            areaRatio = areaRatio,
            priority = severity,
            status = "NEW",
            source = source,
            notes = sessionId?.let { "session:$it" },
            syncStatus = "PENDING",
            createdAt = detectedAt
        )
        AppDatabase.getDatabase(context).potholeReportDao().insertReport(entity)
        enqueueSync(context)
        return Result.Queued(uuid, detectedAt)
    }

    fun enqueueSync(context: Context) {
        val request = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()
        // APPEND_OR_REPLACE: a new report while a sync is running gets its own follow-up pass.
        WorkManager.getInstance(context.applicationContext)
            .enqueueUniqueWork(SyncWorker.UNIQUE_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }
}
