package org.smartpothole.app.auth

import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

/** Profile fields the app shows; the authoritative copy lives at RTDB users/{uid}. */
data class UserProfile(
    val uid: String,
    val name: String,
    val username: String,
    val email: String,
    val role: String,
    val vehicleType: String
)

/**
 * Real Firebase Authentication for the mobile app.
 *
 * - Email + password sign-in goes straight to Firebase Auth.
 * - Username + password sign-in calls the `resolveUsernameLogin` Cloud Function, which checks the
 *   password server-side and returns a custom token. The username -> email mapping is never exposed
 *   to the client, and every failure returns the same generic error (no username enumeration).
 * - Registration creates the Auth account, then atomically claims `usernames/{lower}`; the database
 *   rules reject a claim on a taken name, in which case the new Auth account is deleted again.
 */
object AuthManager {

    private const val TAG = "AuthManager"
    private const val PREFS = "smart_pothole_user"
    const val GENERIC_LOGIN_ERROR = "Incorrect username/email or password."
    const val RIDER_ONLY_ERROR =
        "This app is for riders. City and contractor accounts use the SmartPothole web dashboard."
    private val USERNAME_RE = Regex("^[A-Za-z0-9_.]{3,20}$")

    val VEHICLES = linkedMapOf(
        "MOTORCYCLE" to "Motorcycle / Bike",
        "CAR" to "Car",
        "BICYCLE" to "Bicycle",
        "CNG" to "CNG / Auto-rickshaw",
        "BUS" to "Bus",
        "TRUCK" to "Truck",
        "WALKING" to "Walking"
    )

    private val auth: FirebaseAuth get() = FirebaseAuth.getInstance()
    private val db: FirebaseDatabase get() = FirebaseDatabase.getInstance()

    val currentUser: FirebaseUser? get() = auth.currentUser

    fun isValidUsername(u: String) = USERNAME_RE.matches(u)

    suspend fun signIn(context: Context, identifier: String, password: String): UserProfile {
        val id = identifier.trim()
        try {
            if (id.contains('@')) {
                auth.signInWithEmailAndPassword(id, password).await()
            } else {
                val result = FirebaseFunctions.getInstance()
                    .getHttpsCallable("resolveUsernameLogin")
                    .call(mapOf("username" to id, "password" to password))
                    .await()
                val token = (result.getData() as? Map<*, *>)?.get("token") as? String
                    ?: throw IllegalStateException(GENERIC_LOGIN_ERROR)
                auth.signInWithCustomToken(token).await()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sign-in failed: ${e.javaClass.simpleName}")
            throw IllegalStateException(GENERIC_LOGIN_ERROR)
        }
        val profile = loadProfile(context)
        // The mobile app is for riders (CITIZEN accounts) only.
        if (profile.role != "CITIZEN") {
            signOut(context)
            throw IllegalStateException(RIDER_ONLY_ERROR)
        }
        registerFcmToken()
        return profile
    }

    suspend fun register(
        context: Context,
        name: String,
        username: String,
        email: String,
        password: String,
        vehicleType: String
    ): UserProfile {
        require(name.isNotBlank()) { "Please enter your full name." }
        require(isValidUsername(username)) { "Username must be 3–20 letters, digits, '_' or '.'." }
        require(email.contains('@')) { "Please enter a valid email (used for password recovery)." }
        require(password.length >= 8) { "Password must be at least 8 characters." }

        val created = auth.createUserWithEmailAndPassword(email.trim(), password).await()
        val user = created.user ?: throw IllegalStateException("Account creation failed.")
        val lower = username.lowercase()
        try {
            val updates = mapOf(
                "usernames/$lower" to user.uid,
                "users/${user.uid}" to mapOf(
                    "uid" to user.uid,
                    "name" to name.trim(),
                    "username" to username,
                    "usernameLower" to lower,
                    "email" to email.trim(),
                    "role" to "CITIZEN",
                    "vehicleType" to vehicleType,
                    "createdAt" to System.currentTimeMillis()
                )
            )
            db.reference.updateChildren(updates).await()
        } catch (e: Exception) {
            // Username taken (rules reject the claim) or write failed: roll back the Auth account.
            runCatching { user.delete().await() }
            throw IllegalStateException("That username is already taken. Please choose another.")
        }
        runCatching {
            user.updateProfile(UserProfileChangeRequest.Builder().setDisplayName(name.trim()).build()).await()
        }
        val profile = loadProfile(context)
        registerFcmToken()
        return profile
    }

    suspend fun sendPasswordReset(email: String) {
        // Firebase does not reveal whether the email exists when enumeration protection is enabled.
        runCatching { auth.sendPasswordResetEmail(email.trim()).await() }
    }

    /** Reads users/{uid} and caches it so screens can render without waiting on the network. */
    suspend fun loadProfile(context: Context): UserProfile {
        val user = auth.currentUser ?: throw IllegalStateException("Not signed in")
        val snap = runCatching { db.getReference("users/${user.uid}").get().await() }.getOrNull()
        val profile = UserProfile(
            uid = user.uid,
            name = snap?.child("name")?.getValue(String::class.java) ?: user.displayName ?: user.email ?: "User",
            username = snap?.child("username")?.getValue(String::class.java) ?: "",
            email = user.email ?: "",
            role = snap?.child("role")?.getValue(String::class.java) ?: "CITIZEN",
            vehicleType = snap?.child("vehicleType")?.getValue(String::class.java) ?: "CAR"
        )
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("user_id", profile.uid)
            .putString("user_name", profile.name)
            .putString("username", profile.username)
            .putString("role", profile.role)
            .putString("vehicle", profile.vehicleType)
            .apply()
        return profile
    }

    fun cachedProfile(context: Context): UserProfile? {
        val user = auth.currentUser ?: return null
        val sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return UserProfile(
            uid = user.uid,
            name = sp.getString("user_name", null) ?: user.displayName ?: user.email ?: "User",
            username = sp.getString("username", "") ?: "",
            email = user.email ?: "",
            role = sp.getString("role", "CITIZEN") ?: "CITIZEN",
            vehicleType = sp.getString("vehicle", "CAR") ?: "CAR"
        )
    }

    suspend fun updateVehicle(context: Context, vehicleType: String) {
        val user = auth.currentUser ?: return
        require(VEHICLES.containsKey(vehicleType))
        db.getReference("users/${user.uid}/vehicleType").setValue(vehicleType).await()
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("vehicle", vehicleType).apply()
    }

    fun registerFcmToken() {
        val uid = auth.currentUser?.uid ?: return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            saveFcmToken(uid, token)
        }
    }

    fun saveFcmToken(uid: String, token: String) {
        db.getReference("users/$uid/fcmToken").setValue(token)
            .addOnFailureListener { Log.w(TAG, "Could not store FCM token: ${it.message}") }
    }

    fun signOut(context: Context) {
        auth.currentUser?.uid?.let { uid ->
            // Stop push delivery to this device for this account.
            db.getReference("users/$uid/fcmToken").removeValue()
        }
        auth.signOut()
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }
}
