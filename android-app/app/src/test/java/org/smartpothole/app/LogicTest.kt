package org.smartpothole.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.sync.PotholeNode
import org.smartpothole.app.sync.SmartPotholeDeduplicator
import org.smartpothole.app.util.TimeFormat
import java.util.TimeZone

class LogicTest {

    @Test
    fun matchRadiusIsClampedBetween10And25Meters() {
        assertEquals(10f, SmartPotholeDeduplicator.matchRadiusFor(0f))
        assertEquals(10f, SmartPotholeDeduplicator.matchRadiusFor(4f))
        assertEquals(18f, SmartPotholeDeduplicator.matchRadiusFor(18f))
        // Poor GPS must never widen the merge radius past 25 m.
        assertEquals(25f, SmartPotholeDeduplicator.matchRadiusFor(120f))
    }

    @Test
    fun resolvedRejectedAndDuplicateAreNotActiveHazards() {
        assertTrue(PotholeNode(status = "NEW").isActive)
        assertTrue(PotholeNode(status = "IN_PROGRESS").isActive)
        assertFalse(PotholeNode(status = "RESOLVED").isActive)
        assertFalse(PotholeNode(status = "REJECTED").isActive)
        assertFalse(PotholeNode(status = "DUPLICATE").isActive)
    }

    @Test
    fun usernameValidation() {
        assertTrue(AuthManager.isValidUsername("nayeem_01"))
        assertTrue(AuthManager.isValidUsername("a.b"))
        assertFalse(AuthManager.isValidUsername("ab"))
        assertFalse(AuthManager.isValidUsername("has space"))
        assertFalse(AuthManager.isValidUsername("x".repeat(21)))
    }

    @Test
    fun detectionDateTimeFormat() {
        val old = TimeZone.getDefault()
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Dhaka"))
            // 2026-11-24T10:12:05Z = 16:12:05 in Dhaka (UTC+6)
            val t = 1795515125000L
            assertEquals("16:12:05", TimeFormat.time(t))
            assertTrue(TimeFormat.dateTime(t).startsWith("24 Nov 2026"))
        } finally {
            TimeZone.setDefault(old)
        }
    }
}
