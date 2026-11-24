package org.smartpothole.app.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager
import org.smartpothole.app.report.ReportSubmitter

/** App shell: splash → onboarding (first run) → sign-in gate → 4-tab bottom navigation. */
class MainActivity : AppCompatActivity() {

    private lateinit var nav: BottomNavigationView

    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        supportFragmentManager.fragments.forEach { (it as? PermissionAware)?.onPermissionsChanged() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        edgeToEdge()
        if (!Prefs.onboarded(this)) { startActivity(Intent(this, OnboardingActivity::class.java)); finish(); return }
        if (AuthManager.currentUser == null) { startActivity(Intent(this, LoginActivity::class.java)); finish(); return }

        setContentView(R.layout.activity_main)
        nav = findViewById(R.id.bottomNav)
        nav.padForSafeArea(bottom = true)
        nav.setOnItemSelectedListener { show(it.itemId); true }
        nav.setOnItemReselectedListener { }
        if (savedInstanceState == null) show(intent.getIntExtra(EXTRA_TAB, R.id.nav_home).also { nav.selectedItemId = it })

        requestPermissionsIfNeeded()
        AuthManager.registerFcmToken()
        ReportSubmitter.enqueueSync(this)
        lifecycleScope.launch {
            val p = runCatching { AuthManager.loadProfile(this@MainActivity) }.getOrNull()
            if (p != null && p.role != "CITIZEN") {
                Toast.makeText(this@MainActivity, AuthManager.RIDER_ONLY_ERROR, Toast.LENGTH_LONG).show()
                AuthManager.signOut(this@MainActivity)
                startActivity(Intent(this@MainActivity, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
                finish()
            }
        }
    }

    fun selectTab(id: Int) { nav.selectedItemId = id }

    private fun show(id: Int) {
        val tag = "tab_$id"
        val fm = supportFragmentManager
        val tx = fm.beginTransaction().setReorderingAllowed(true)
        fm.fragments.forEach { tx.hide(it) }
        val existing = fm.findFragmentByTag(tag)
        if (existing != null) tx.show(existing)
        else tx.add(R.id.mainContainer, create(id), tag)
        tx.commit()
    }

    private fun create(id: Int): Fragment = when (id) {
        R.id.nav_map -> MapFragment()
        R.id.nav_reports -> ReportsFragment()
        R.id.nav_profile -> ProfileFragment()
        else -> HomeFragment()
    }

    private fun requestPermissionsIfNeeded() {
        val needed = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            needed += Manifest.permission.ACCESS_FINE_LOCATION; needed += Manifest.permission.ACCESS_COARSE_LOCATION
        }
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            needed += Manifest.permission.POST_NOTIFICATIONS
        }
        if (needed.isNotEmpty()) permissions.launch(needed.toTypedArray())
    }

    companion object { const val EXTRA_TAB = "tab" }
}

/** Fragments that need to react when the user grants location permission. */
interface PermissionAware { fun onPermissionsChanged() }
