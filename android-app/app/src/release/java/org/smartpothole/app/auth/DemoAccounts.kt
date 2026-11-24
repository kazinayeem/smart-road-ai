package org.smartpothole.app.auth

/** Release builds ship no demo credentials. */
object DemoAccounts {
    data class Account(val label: String, val email: String, val password: String)

    val riders = emptyList<Account>()
}
