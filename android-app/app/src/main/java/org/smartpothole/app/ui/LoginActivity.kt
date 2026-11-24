package org.smartpothole.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager

class LoginActivity : AppCompatActivity() {

    private var isRegisterMode = false
    private var inFlight = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (AuthManager.currentUser != null) {
            openHome()
            return
        }
        setContentView(R.layout.activity_login)

        val subtitle = findViewById<TextView>(R.id.tvAuthSubtitle)
        val registerFields = findViewById<View>(R.id.layoutRegisterFields)
        val tilIdentifier = findViewById<View>(R.id.tilIdentifier)
        val etIdentifier = findViewById<EditText>(R.id.etIdentifier)
        val etName = findViewById<EditText>(R.id.etName)
        val etUsername = findViewById<EditText>(R.id.etUsername)
        val etEmail = findViewById<EditText>(R.id.etEmail)
        val etPassword = findViewById<EditText>(R.id.etPassword)
        val tvError = findViewById<TextView>(R.id.tvAuthError)
        val btnLogin = findViewById<MaterialButton>(R.id.btnLogin)
        val btnToggle = findViewById<MaterialButton>(R.id.btnToggleMode)
        val btnForgot = findViewById<MaterialButton>(R.id.btnForgotPassword)
        val progress = findViewById<ProgressBar>(R.id.progressAuth)
        val chips = findViewById<ChipGroup>(R.id.chipGroupVehicle)

        AuthManager.VEHICLES.forEach { (key, label) ->
            chips.addView(Chip(this).apply {
                text = label
                tag = key
                isCheckable = true
                isChecked = key == "MOTORCYCLE"
                id = View.generateViewId()
                minHeight = (48 * resources.displayMetrics.density).toInt()
            })
        }

        fun setBusy(busy: Boolean) {
            inFlight = busy
            btnLogin.isEnabled = !busy
            btnToggle.isEnabled = !busy
            progress.visibility = if (busy) View.VISIBLE else View.GONE
        }

        fun showError(msg: String?) {
            tvError.text = msg
            tvError.visibility = if (msg.isNullOrBlank()) View.GONE else View.VISIBLE
        }

        btnToggle.setOnClickListener {
            isRegisterMode = !isRegisterMode
            registerFields.visibility = if (isRegisterMode) View.VISIBLE else View.GONE
            tilIdentifier.visibility = if (isRegisterMode) View.GONE else View.VISIBLE
            btnForgot.visibility = if (isRegisterMode) View.GONE else View.VISIBLE
            btnLogin.text = if (isRegisterMode) "Create account" else "Sign in"
            btnToggle.text = if (isRegisterMode) "Already have an account? Sign in" else "New here? Create an account"
            subtitle.text = if (isRegisterMode) "Create your citizen account" else "Sign in with your username or email"
            showError(null)
        }

        btnLogin.setOnClickListener {
            if (inFlight) return@setOnClickListener
            showError(null)
            val password = etPassword.text?.toString().orEmpty()
            setBusy(true)
            lifecycleScope.launch {
                try {
                    if (isRegisterMode) {
                        val vehicle = chips.findViewById<Chip>(chips.checkedChipId)?.tag as? String ?: "CAR"
                        AuthManager.register(
                            this@LoginActivity,
                            name = etName.text?.toString().orEmpty(),
                            username = etUsername.text?.toString().orEmpty().trim(),
                            email = etEmail.text?.toString().orEmpty(),
                            password = password,
                            vehicleType = vehicle
                        )
                    } else {
                        val id = etIdentifier.text?.toString().orEmpty()
                        if (id.isBlank() || password.isBlank()) {
                            throw IllegalArgumentException("Enter your username or email and password.")
                        }
                        AuthManager.signIn(this@LoginActivity, id, password)
                    }
                    openHome()
                } catch (e: Exception) {
                    showError(e.message ?: AuthManager.GENERIC_LOGIN_ERROR)
                } finally {
                    setBusy(false)
                }
            }
        }

        // Debug builds only: one-tap rider demo accounts (the release source set provides none).
        val demoContainer = findViewById<android.widget.LinearLayout>(R.id.layoutDemoLogin)
        if (org.smartpothole.app.auth.DemoAccounts.riders.isNotEmpty()) {
            demoContainer.visibility = View.VISIBLE
            org.smartpothole.app.auth.DemoAccounts.riders.forEach { acc ->
                demoContainer.addView(MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                    text = acc.label
                    isAllCaps = false
                    minHeight = (48 * resources.displayMetrics.density).toInt()
                    setOnClickListener {
                        if (inFlight) return@setOnClickListener
                        showError(null)
                        setBusy(true)
                        lifecycleScope.launch {
                            try {
                                AuthManager.signIn(this@LoginActivity, acc.email, acc.password)
                                openHome()
                            } catch (e: Exception) {
                                showError("${e.message} (Seed demo accounts first: scripts → npm run seed:prod or seed:emulator.)")
                            } finally {
                                setBusy(false)
                            }
                        }
                    }
                })
            }
        }

        btnForgot.setOnClickListener {
            val input = EditText(this).apply { hint = "Account email" }
            AlertDialog.Builder(this)
                .setTitle("Reset password")
                .setMessage("Enter the email on your account. If it exists, a reset link will be sent.")
                .setView(input)
                .setPositiveButton("Send") { _, _ ->
                    val email = input.text.toString()
                    lifecycleScope.launch {
                        AuthManager.sendPasswordReset(email)
                        Toast.makeText(this@LoginActivity, "If that account exists, a reset email is on its way.", Toast.LENGTH_LONG).show()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun openHome() {
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }
}
