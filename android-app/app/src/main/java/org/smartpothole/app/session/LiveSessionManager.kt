package org.smartpothole.app.session

import android.location.Location
import android.util.Log
import com.google.firebase.database.*
import java.util.UUID

object LiveSessionManager {

    private const val TAG = "LiveSessionManager"
    private const val CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I confusion

    private val database: FirebaseDatabase get() = FirebaseDatabase.getInstance()

    private val sessionsRef: DatabaseReference get() = database.getReference("live_sessions")

    private fun newCode(): String = (1..6).map { CODE_ALPHABET.random() }.joinToString("")

    /**
     * Create a session and its join code in ONE atomic multi-path write. Codes are 6 characters
     * from a 32-symbol alphabet (~1 billion combinations) and map to the session via
     * `session_codes/{code}`; sessions themselves are readable only by their participants.
     */
    fun createSession(
        scannerId: String,
        scannerName: String,
        onSuccess: (sessionId: String, sessionCode: String) -> Unit,
        onError: (String) -> Unit,
        attempt: Int = 0
    ) {
        val sessionId = sessionsRef.push().key ?: return onError("Could not allocate a session id")
        val sessionCode = newCode()
        val now = System.currentTimeMillis()
        val sessionData = hashMapOf(
            "sessionId" to sessionId,
            "sessionCode" to sessionCode,
            "scannerId" to scannerId,
            "scannerName" to scannerName,
            "status" to "ACTIVE",
            "startedAt" to now,
            "lastActiveAt" to now,
            "participants" to mapOf(
                scannerId to mapOf("uid" to scannerId, "name" to scannerName, "role" to "SCANNER", "joinedAt" to now, "lastSeenAt" to now)
            )
        )
        database.reference.updateChildren(
            mapOf("live_sessions/$sessionId" to sessionData, "session_codes/$sessionCode" to sessionId)
        ).addOnSuccessListener {
            onSuccess(sessionId, sessionCode)
        }.addOnFailureListener { e ->
            // A code collision is rejected by the rules; retry with a fresh code a few times.
            if (attempt < 3) createSession(scannerId, scannerName, onSuccess, onError, attempt + 1)
            else onError(e.message ?: "Failed to create session")
        }
    }

    /** Join an active session by its 6-character code. */
    fun joinSession(
        sessionCode: String,
        participantId: String,
        participantName: String,
        onSuccess: (LiveSession) -> Unit,
        onError: (String) -> Unit
    ) {
        val code = sessionCode.trim().uppercase()
        database.getReference("session_codes/$code").get()
            .addOnSuccessListener { codeSnap ->
                val sessionId = codeSnap.getValue(String::class.java)
                    ?: return@addOnSuccessListener onError("Session code not found. Check the code and try again.")
                val now = System.currentTimeMillis()
                val participant = SessionParticipant(participantId, participantName, "COMPANION", now, now)
                // Rules only allow joining ACTIVE sessions; the participant entry also grants read access.
                sessionsRef.child(sessionId).child("participants").child(participantId).setValue(participant)
                    .addOnSuccessListener {
                        sessionsRef.child(sessionId).get().addOnSuccessListener { snap ->
                            val session = snap.getValue(LiveSession::class.java)
                            if (session == null || session.status != "ACTIVE") onError("This session has ended.")
                            else onSuccess(session.copy(sessionId = sessionId))
                        }.addOnFailureListener { onError("Could not load the session.") }
                    }
                    .addOnFailureListener { onError("This session is no longer active.") }
            }
            .addOnFailureListener { onError("Could not look up the session. Check your connection.") }
    }

    /**
     * Scanner periodically broadcasts its real-time GPS location.
     */
    fun updateScannerLocation(sessionId: String, location: Location) {
        val now = System.currentTimeMillis()
        val locData = hashMapOf(
            "latitude" to location.latitude,
            "longitude" to location.longitude,
            "accuracy" to location.accuracy,
            "speed" to location.speed,
            "bearing" to location.bearing,
            "timestamp" to now
        )

        val sessionRef = sessionsRef.child(sessionId)
        sessionRef.child("scanner_location").setValue(locData)
        sessionRef.child("lastActiveAt").setValue(now)
    }

    /**
     * Scanner broadcasts a detected pothole event.
     * STRICT REQUIREMENT: Only structured metadata is sent (NO IMAGES / NO FRAMES).
     */
    fun broadcastDetection(
        sessionId: String,
        detection: SessionDetection,
        onSuccess: (() -> Unit)? = null
    ) {
        val detId = if (detection.detectionId.isNotEmpty()) detection.detectionId else "det_${UUID.randomUUID().toString().take(8)}"
        detection.detectionId = detId
        if (detection.timestamp == 0L) {
            detection.timestamp = System.currentTimeMillis()
        }

        sessionsRef.child(sessionId).child("detections").child(detId).setValue(detection)
            .addOnSuccessListener {
                Log.d(TAG, "Broadcast detection $detId to session $sessionId")
                onSuccess?.invoke()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Failed to broadcast detection: ${e.message}")
            }
    }

    /**
     * Send heartbeat to keep presence updated.
     */
    fun updatePresence(sessionId: String, participantId: String, isScanner: Boolean = false) {
        val now = System.currentTimeMillis()
        val sessionRef = sessionsRef.child(sessionId)
        sessionRef.child("participants").child(participantId).child("lastSeenAt").setValue(now)
        if (isScanner) {
            sessionRef.child("lastActiveAt").setValue(now)
        }
    }

    /**
     * End session (called by scanner).
     */
    fun endSession(sessionId: String, onComplete: (() -> Unit)? = null) {
        val now = System.currentTimeMillis()
        val ref = sessionsRef.child(sessionId)
        ref.child("sessionCode").get().addOnCompleteListener { codeTask ->
            val code = codeTask.result?.getValue(String::class.java)
            val updates = mutableMapOf<String, Any?>(
                "live_sessions/$sessionId/status" to "ENDED",
                "live_sessions/$sessionId/lastActiveAt" to now,
                // Stop sharing the scanner's position the moment the session ends.
                "live_sessions/$sessionId/scanner_location" to null
            )
            if (code != null) updates["session_codes/$code"] = null
            database.reference.updateChildren(updates).addOnCompleteListener { onComplete?.invoke() }
        }
    }

    /**
     * Leave session (called by companion).
     */
    fun leaveSession(sessionId: String, participantId: String) {
        sessionsRef.child(sessionId).child("participants").child(participantId).removeValue()
    }

    /**
     * Listen to active companion count for the scanner.
     */
    fun listenToCompanionCount(sessionId: String, onCountUpdated: (Int) -> Unit): ValueEventListener {
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                var companionCount = 0
                for (child in snapshot.children) {
                    val role = child.child("role").getValue(String::class.java)
                    if (role == "COMPANION") {
                        companionCount++
                    }
                }
                onCountUpdated(companionCount)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.w(TAG, "Companion count listener cancelled: ${error.message}")
            }
        }
        sessionsRef.child(sessionId).child("participants").addValueEventListener(listener)
        return listener
    }

    /**
     * Get DatabaseReference for a session.
     */
    fun getSessionRef(sessionId: String): DatabaseReference {
        return sessionsRef.child(sessionId)
    }
}
