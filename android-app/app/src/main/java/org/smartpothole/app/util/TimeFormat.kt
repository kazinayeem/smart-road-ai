package org.smartpothole.app.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Single place for how detection dates and times are shown to the user (device time zone). */
object TimeFormat {
    private fun fmt(pattern: String) = SimpleDateFormat(pattern, Locale.getDefault())

    /** e.g. "24 Nov 2026, 16:12:05" */
    fun dateTime(epochMs: Long): String = fmt("dd MMM yyyy, HH:mm:ss").format(Date(epochMs))

    /** e.g. "16:12:05" */
    fun time(epochMs: Long): String = fmt("HH:mm:ss").format(Date(epochMs))
}
