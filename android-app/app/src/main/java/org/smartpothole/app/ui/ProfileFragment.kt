package org.smartpothole.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.GridLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.materialswitch.MaterialSwitch
import kotlinx.coroutines.launch
import org.smartpothole.app.R
import org.smartpothole.app.auth.AuthManager

class ProfileFragment : Fragment(R.layout.fragment_profile) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        view.findViewById<View>(R.id.profileScroll).padForSafeArea(top = true)
        bind(view)
        lifecycleScope.launch { runCatching { AuthManager.loadProfile(requireContext()) }; view.let(::bind) }

        view.findViewById<MaterialSwitch>(R.id.switchVoice).apply {
            isChecked = Prefs.voice(requireContext())
            setOnCheckedChangeListener { _, on -> Prefs.setVoice(requireContext(), on) }
        }
        view.findViewById<MaterialSwitch>(R.id.switchNearby).apply {
            isChecked = Prefs.nearby(requireContext())
            setOnCheckedChangeListener { _, on -> Prefs.setNearby(requireContext(), on) }
        }
        view.findViewById<View>(R.id.btnSignOut).setOnClickListener {
            MaterialAlertDialogBuilder(requireContext())
                .setTitle("Sign out?")
                .setMessage("Reports that haven't uploaded stay on this phone and upload next time you sign in with this account.")
                .setPositiveButton("Sign out") { _, _ ->
                    AuthManager.signOut(requireContext())
                    startActivity(Intent(requireContext(), LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
        val pkg = requireContext().packageManager.getPackageInfo(requireContext().packageName, 0)
        view.findViewById<TextView>(R.id.tvVersion).text = "SmartPothole AI · version ${pkg.versionName}"
    }

    private fun bind(v: View) {
        val p = AuthManager.cachedProfile(requireContext()) ?: return
        val name = p.name.substringBefore(" (")
        v.findViewById<TextView>(R.id.tvProfileName).text = name
        v.findViewById<TextView>(R.id.tvProfileAvatar).text = name.trim().take(1).uppercase()
        v.findViewById<TextView>(R.id.tvProfileHandle).text = listOf(p.username.ifEmpty { null }, "Rider").filterNotNull().joinToString(" · ")
        v.findViewById<TextView>(R.id.tvProfileEmail).text = p.email
        VehiclePicker.bind(v.findViewById<GridLayout>(R.id.gridVehicles), p.vehicleType) { type ->
            lifecycleScope.launch {
                val ok = runCatching { AuthManager.updateVehicle(requireContext(), type) }.isSuccess
                Toast.makeText(requireContext(), if (ok) "Vehicle updated" else "Couldn't update vehicle. Check your connection.", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
