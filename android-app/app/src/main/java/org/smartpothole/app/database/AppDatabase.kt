package org.smartpothole.app.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [PotholeReportEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun potholeReportDao(): PotholeReportDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smart_pothole_database"
                )
                    // Schema is still v2. Do NOT add a destructive fallback: it would silently wipe
                    // un-synced offline reports. Add a real Migration when the schema changes.
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
