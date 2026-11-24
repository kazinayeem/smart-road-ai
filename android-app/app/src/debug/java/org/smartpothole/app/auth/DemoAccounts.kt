package org.smartpothole.app.auth

/**
 * DEBUG BUILDS ONLY (src/debug). Rider demo accounts for one-tap login while developing.
 * Must match scripts/demo_accounts.json; seed them with `cd scripts && npm run seed:emulator`
 * (or seed:prod). The release source set provides an empty list, so release APKs contain no credentials.
 */
object DemoAccounts {
    data class Account(val label: String, val email: String, val password: String)

    val riders = listOf(
        Account("Rider: Rahim (citizen_rahim)", "citizen@pothole.org", "Citizen@2026!"),
        Account("Rider: Karim (citizen_karim)", "citizen2@pothole.org", "Citizen2@2026!")
    )
}
