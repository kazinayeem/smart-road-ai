package org.smartpothole.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.smartpothole.app.R

/** First-run explanation of what the app does and what it does with location and camera data. */
class OnboardingActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        edgeToEdge()
        setContentView(R.layout.activity_onboarding)
        findViewById<View>(R.id.onboardingRoot).padForSafeArea(top = true, bottom = true)
        point(R.id.ob1, R.drawable.ic_camera, "Detects potholes on the phone", "Mount your phone facing the road. The AI model runs on the device; video never leaves it.")
        point(R.id.ob2, R.drawable.ic_navigation, "Warns you before you reach one", "The drive map follows you like a navigation app and alerts you to reported potholes ahead.")
        point(R.id.ob3, R.drawable.ic_place, "Uses your location only for reports", "A report sends position, time and confidence. Live location is shared only in sessions you choose to join.")
        point(R.id.ob4, R.drawable.ic_shield, "Helps the city fix roads", "City engineers verify reports and assign repairs. You can follow each report's status.")
        findViewById<View>(R.id.btnGetStarted).setOnClickListener {
            Prefs.setOnboarded(this)
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    private fun point(id: Int, icon: Int, title: String, body: String) {
        val v = findViewById<View>(id)
        v.findViewById<ImageView>(R.id.obIcon).setImageResource(icon)
        v.findViewById<TextView>(R.id.obTitle).text = title
        v.findViewById<TextView>(R.id.obBody).text = body
    }
}
