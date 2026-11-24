package org.smartpothole.app.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log

object NetworkUtils {

    private const val TAG = "NetworkUtils"

    /**
     * Check if device has an active Internet connection (Wi-Fi or Cellular Data).
     */
    fun isNetworkConnected(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val capabilities = cm.getNetworkCapabilities(activeNetwork) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) ||
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /**
     * Get descriptive connection type: "Wi-Fi", "Cellular (Mobile Data)", or "Offline".
     */
    fun getConnectionType(context: Context): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return "Offline"
        val activeNetwork = cm.activeNetwork ?: return "Offline"
        val capabilities = cm.getNetworkCapabilities(activeNetwork) ?: return "Offline"

        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Mobile Data"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
            else -> "Online"
        }
    }

    /**
     * Register a callback that fires when an Internet connection becomes available.
     */
    fun registerConnectionRestoredListener(
        context: Context,
        onConnected: () -> Unit
    ): ConnectivityManager.NetworkCallback? {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return null
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                Log.i(TAG, "Network connection restored. Triggering auto-sync.")
                onConnected()
            }
        }

        try {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            cm.registerNetworkCallback(request, callback)
            return callback
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register network callback: ${e.message}")
            return null
        }
    }

    fun unregisterCallback(context: Context, callback: ConnectivityManager.NetworkCallback?) {
        if (callback != null) {
            try {
                val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                cm?.unregisterNetworkCallback(callback)
            } catch (_: Exception) {}
        }
    }
}
