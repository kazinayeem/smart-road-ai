package org.smartpothole.app.session

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import org.smartpothole.app.R
import org.smartpothole.app.ui.edgeToEdge
import org.smartpothole.app.ui.padForSafeArea
import org.smartpothole.app.camera.CameraActivity
import java.util.UUID

class SessionHubActivity : AppCompatActivity() {

    private lateinit var btnBack: ImageView
    private lateinit var btnCreateSession: Button
    private lateinit var btnLaunchScannerCamera: Button
    private lateinit var layoutGeneratedCode: LinearLayout
    private lateinit var tvGeneratedSessionCode: TextView
    private lateinit var btnCopyCode: Button

    private lateinit var etSessionCode: EditText
    private lateinit var btnJoinSession: Button

    private var createdSessionId: String? = null
    private var createdSessionCode: String? = null

    // Identity comes from Firebase Auth (the rules check auth.uid), never a random local id.
    private val userId: String get() = org.smartpothole.app.auth.AuthManager.currentUser?.uid.orEmpty()
    private val userName: String
        get() = org.smartpothole.app.auth.AuthManager.cachedProfile(this)?.name ?: "SmartPothole user"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (org.smartpothole.app.auth.AuthManager.currentUser == null) {
            startActivity(Intent(this, org.smartpothole.app.ui.LoginActivity::class.java))
            finish()
            return
        }
        edgeToEdge()
        setContentView(R.layout.activity_session_hub)
        findViewById<View>(R.id.hubRoot).padForSafeArea(top = true, bottom = true, ime = true)

        btnBack = findViewById(R.id.btnBack)
        btnCreateSession = findViewById(R.id.btnCreateSession)
        btnLaunchScannerCamera = findViewById(R.id.btnLaunchScannerCamera)
        layoutGeneratedCode = findViewById(R.id.layoutGeneratedCode)
        tvGeneratedSessionCode = findViewById(R.id.tvGeneratedSessionCode)
        btnCopyCode = findViewById(R.id.btnCopyCode)

        etSessionCode = findViewById(R.id.etSessionCode)
        btnJoinSession = findViewById(R.id.btnJoinSession)

        btnBack.setOnClickListener {
            finish()
        }

        btnCreateSession.setOnClickListener {
            handleCreateSession()
        }

        btnCopyCode.setOnClickListener {
            createdSessionCode?.let { code ->
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("Session Code", code)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "Session code $code copied to clipboard!", Toast.LENGTH_SHORT).show()
            }
        }

        btnLaunchScannerCamera.setOnClickListener {
            if (createdSessionId != null && createdSessionCode != null) {
                val intent = Intent(this, CameraActivity::class.java).apply {
                    putExtra("EXTRA_SESSION_ID", createdSessionId)
                    putExtra("EXTRA_SESSION_CODE", createdSessionCode)
                    putExtra("EXTRA_IS_SCANNER", true)
                }
                startActivity(intent)
                finish()
            }
        }

        btnJoinSession.setOnClickListener {
            handleJoinSession()
        }
    }

    private fun handleCreateSession() {
        btnCreateSession.isEnabled = false
        btnCreateSession.text = "Creating…"

        LiveSessionManager.createSession(
            scannerId = userId,
            scannerName = userName,
            onSuccess = { sessionId, sessionCode ->
                createdSessionId = sessionId
                createdSessionCode = sessionCode

                btnCreateSession.visibility = View.GONE
                layoutGeneratedCode.visibility = View.VISIBLE
                tvGeneratedSessionCode.text = sessionCode
                btnLaunchScannerCamera.visibility = View.VISIBLE

                Toast.makeText(this, "Session $sessionCode created! Share code with companions.", Toast.LENGTH_LONG).show()
            },
            onError = { errMsg ->
                btnCreateSession.isEnabled = true
                btnCreateSession.text = "Create session"
                Toast.makeText(this, "Error: $errMsg", Toast.LENGTH_LONG).show()
            }
        )
    }

    private fun handleJoinSession() {
        val code = etSessionCode.text.toString().trim()
        if (!Regex("^[A-Za-z0-9]{6}$").matches(code)) {
            etSessionCode.error = "Enter the 6-character session code"
            return
        }

        btnJoinSession.isEnabled = false
        btnJoinSession.text = "Joining…"

        LiveSessionManager.joinSession(
            sessionCode = code,
            participantId = userId,
            participantName = userName,
            onSuccess = { session ->
                btnJoinSession.isEnabled = true
                btnJoinSession.text = "Join session"

                val intent = Intent(this, CompanionActivity::class.java).apply {
                    putExtra("EXTRA_SESSION_ID", session.sessionId)
                    putExtra("EXTRA_SESSION_CODE", session.sessionCode)
                    putExtra("EXTRA_SCANNER_ID", session.scannerId)
                    putExtra("EXTRA_SCANNER_NAME", session.scannerName)
                }
                startActivity(intent)
                finish()
            },
            onError = { errMsg ->
                btnJoinSession.isEnabled = true
                btnJoinSession.text = "Join session"
                Toast.makeText(this, errMsg, Toast.LENGTH_LONG).show()
            }
        )
    }
}
