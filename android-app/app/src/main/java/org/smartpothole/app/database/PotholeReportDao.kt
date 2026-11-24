package org.smartpothole.app.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PotholeReportDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReport(report: PotholeReportEntity): Long

    @Query("SELECT * FROM pothole_reports WHERE reporterId = :uid ORDER BY createdAt DESC")
    fun observeReportsFor(uid: String): Flow<List<PotholeReportEntity>>

    @Query("SELECT * FROM pothole_reports WHERE reporterId = :uid ORDER BY createdAt DESC")
    suspend fun getReportsFor(uid: String): List<PotholeReportEntity>

    /** PENDING and FAILED rows are both retried. */
    @Query("SELECT * FROM pothole_reports WHERE syncStatus IN ('PENDING','FAILED') ORDER BY createdAt ASC")
    suspend fun getPendingSyncReports(): List<PotholeReportEntity>

    @Query("UPDATE pothole_reports SET syncStatus = :syncStatus WHERE clientUuid = :clientUuid")
    suspend fun updateSyncStatus(clientUuid: String, syncStatus: String)

    @Query("UPDATE pothole_reports SET syncStatus = 'SYNCED', reportId = :reportId WHERE clientUuid = :clientUuid")
    suspend fun markSynced(clientUuid: String, reportId: String)

    @Query("SELECT COUNT(*) FROM pothole_reports WHERE reporterId = :uid")
    suspend fun getTotalCount(uid: String): Int

    @Query("SELECT COUNT(*) FROM pothole_reports WHERE reporterId = :uid AND syncStatus IN ('PENDING','FAILED')")
    suspend fun getPendingCount(uid: String): Int

    @Query("SELECT COUNT(*) FROM pothole_reports WHERE reporterId = :uid AND syncStatus = 'SYNCED'")
    suspend fun getSyncedCount(uid: String): Int
}
