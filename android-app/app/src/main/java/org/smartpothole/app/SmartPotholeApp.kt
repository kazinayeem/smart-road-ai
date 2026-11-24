package org.smartpothole.app

import android.app.Application
import android.util.Log
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import org.smartpothole.app.database.AppDatabase
import org.smartpothole.app.network.NetworkUtils
import org.smartpothole.app.sync.SyncWorker
import java.util.concurrent.TimeUnit

class SmartPotholeApp : Application() {

    private val TAG = "SmartPotholeApp"
    val database by lazy { AppDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()
        initFirebaseExplicitly()
        schedulePeriodicSyncWorker()
        registerImmediateSyncOnReconnect()
    }

    /**
     * Guarantees default FirebaseApp initialization across all devices,
     * preventing any java.lang.IllegalStateException: Default FirebaseApp is not initialized.
     */
    private fun initFirebaseExplicitly() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                val options = FirebaseOptions.Builder()
                    .setApiKey("REMOVED_FIREBASE_API_KEY")
                    .setApplicationId("1:211774658995:android:18f8c0dbf8663bb2d213c6")
                    .setProjectId("cryptro")
                    .setDatabaseUrl("https://cryptro-default-rtdb.firebaseio.com")
                    .setStorageBucket("cryptro.firebasestorage.app")
                    .setGcmSenderId("211774658995")
                    .build()

                FirebaseApp.initializeApp(this, options)
                // Local cache so map data and queued writes survive brief network drops.
                runCatching { com.google.firebase.database.FirebaseDatabase.getInstance().setPersistenceEnabled(true) }
                Log.i(TAG, "FirebaseApp programmatically initialized successfully for project cryptro.")
            } else {
                Log.i(TAG, "FirebaseApp already initialized.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing FirebaseApp: ${e.message}", e)
        }
    }

    private fun schedulePeriodicSyncWorker() {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()

            // Unique: the old code enqueued a NEW periodic job on every app start, piling up workers.
            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                SyncWorker.PERIODIC_NAME,
                androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
        } catch (e: Exception) {
            Log.w(TAG, "WorkManager periodic scheduling notice: ${e.message}")
        }
    }

    /**
     * Instantly flush pending offline outbox the moment Wi-Fi or Mobile Data reconnects.
     */
    private fun registerImmediateSyncOnReconnect() {
        try {
            NetworkUtils.registerConnectionRestoredListener(this) {
                org.smartpothole.app.report.ReportSubmitter.enqueueSync(this)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Immediate sync registration notice: ${e.message}")
        }
    }
}
