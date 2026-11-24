# SmartPothole AI — Audit & Repair Report (2026-11-24)

Scope of this pass: security, correctness and the end-to-end data flow across the Android app, the
web dashboard and Firebase. The redesign, group tracking, split mode, route planning and model
benchmarking are **not** done yet — see "Not implemented".

## 1. What the project actually is

| Part | Stack | Notes |
|---|---|---|
| Android app (riders only) | Kotlin, CameraX, ONNX Runtime (YOLOv8s INT8, 1 class), Room, WorkManager, osmdroid | Native, not Flutter/RN |
| Web dashboard | Next.js 15 (App Router), React 19, Tailwind, Leaflet + OSM | City + contractor + citizen roles |
| Backend | **No custom server.** Firebase Auth + Realtime Database + security rules, plus one Cloud Function | Firestore is not used |
| AI | `ai-model/` — YOLOv8s `best.pt`, ONNX FP32 + INT8 exports, scripts | No training dataset or validation metrics in the repo |

Roles that exist (kept as-is): `CITIZEN` (rider), `CITY_CORPORATION` (admin), `CONTRACTOR`.
There is no Super Admin / Inspector role yet.

## 2. Critical bugs found

| # | Severity | Bug | Where |
|---|---|---|---|
| 1 | Critical | **Web login granted admin with any password**: Firebase sign-in errors were swallowed and the role was guessed from the email text (`includes('city')` ⇒ admin) | `web-dashboard/lib/firebase.ts` |
| 2 | Critical | **Any user could make themselves admin**: rules let a user write their own `users/{uid}/role`; admin checks compared against lowercase `city_corporation` (never matched) | `firebase/database.rules.json` |
| 3 | Critical | Any signed-in user could overwrite/delete any live session, pothole, detection, audit log; read everyone's profile and every scanner's live location | rules |
| 4 | Critical | Mobile login was fake (any text accepted, no Firebase Auth) ⇒ every write failed the `auth != null` rules, so mobile reports never reached the server | `ui/LoginActivity.kt`, `MainActivity.kt` |
| 5 | Critical | Android app did not compile (Room 2.6.1 + KSP2 "unexpected jvm signature V") | `app/build.gradle.kts` |
| 6 | High | Reports were filed at a hard-coded Dhaka coordinate when GPS was unavailable (mobile and web) | `CameraActivity`, `MainActivity`, `PotholeMap.tsx`, `CitizenView.tsx` |
| 7 | High | Report IDs `PTH-(ms % 100000)` collided and silently overwrote other potholes | mobile + web |
| 8 | High | Camera never started after the user granted permission (no permission-result handler) | `CameraActivity.kt` |
| 9 | High | Native memory leak: ONNX tensors/results never closed (every frame) | `ai/PotholeDetector.kt` |
| 10 | High | Two divergent sources of truth (`potholes/` vs `reports/`): a pothole resolved by the city kept triggering mobile alerts and absorbing new detections | dedup, map, nearby monitor |
| 11 | High | Offline outbox: FAILED rows were never retried; a new periodic sync job was enqueued on every app start; destructive Room migration could wipe unsent reports | `SyncWorker`, `SmartPotholeApp`, `AppDatabase` |
| 12 | High | Contractor dashboard showed every assigned job to every contractor; identities (`citizen_demo_uid`, "Apex", "Kamal Hossain") hard-coded | web components |
| 13 | High | City admin could not act on new reports (UI checked `NEW_REPORT`, clients write `NEW`); counters showed 0 | `ReportDetailModal`, `CityCorpDashboard`, `PotholeMap` |
| 14 | Medium | Web "Driver Mode" wrote real reports from a simulated position with invented confidence | `DriverMode.tsx` |
| 15 | Medium | Fabricated UI data: fake "LLM summary" (named specific roads/contractors), fake "47 ms inference", fake ±5/±6 m accuracy, fake "PDF exported" alert, localStorage seed reports shown when DB was unreachable | web components |
| 16 | Medium | Nearby-pothole monitor was never fed location updates (alerts could not fire); each detection downloaded the entire pothole table | `NearbyPotholeMonitor`, dedup |
| 17 | Medium | Live-session join codes were enumerable 6-digit numbers over a world-readable session list | `LiveSessionManager` |
| 18 | Low | `CameraActivity`/`MapActivity` exported; `allowBackup=true`; FCM token logged and never stored | manifest, messaging service |
| 19 | Low | Repo had no `.gitignore` (node_modules, build outputs, `local.properties`, caches committed) | root |

## 3. Fixes — status

### Fixed and tested
- **RTDB security rules rewritten** (`firebase/database.rules.json`) — 17 automated emulator tests
  (`firebase/tests/rules.test.mjs`), all passing: no self-promotion, citizens create only their own
  `NEW` reports, contractors only allowed transitions on their own jobs, only the city resolves,
  detections append-only and private, audit log append-only and attributed, sessions readable only by
  participants, join via `session_codes/{code}`, username uniqueness, coordinate/status validation.
- **Web auth** (`lib/firebase.ts`, `AuthScreen.tsx`): wrong password ⇒ generic error; role read only
  from `users/{uid}`; no localStorage roles or fake data. *Tested in browser against emulators.*
- **Web routing** (`app/`): `/`, `/login`, `/register`, `/citizen`, `/citizen/driver`, `/city`,
  `/contractor`, 404 + error pages, `RequireRole` guard, `?next=` deep links (open-redirect safe),
  session persistence. *Tested:* signed-out `/city` ⇒ login; citizen sent to `/city` ⇒ `/citizen`.
- **Full web journey tested** (emulators, real rules): citizen files report → city verifies →
  assigns to contractor → contractor sees only their job and accepts. Audit trail recorded.
- **Username login** (`firebase/functions/index.js`, callable `resolveUsernameLogin`): tested in the
  Functions emulator — case-insensitive, identical error for wrong password vs unknown user,
  lockout after 5 failures/15 min, custom token signs in; also tested from the web UI.
- **Demo accounts** (`scripts/demo_accounts.json`, `scripts/seed_demo_accounts.js` via Admin SDK) and
  **quick login**: web shows all roles only when `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=1`; Android shows rider
  accounts only in **debug** builds (`src/debug`). *Verified:* production web bundle with flag off and
  release APK contain no demo passwords.
- **Android compiles** (Room 2.7.2); JVM unit tests 4/4 pass (`app/src/test/.../LogicTest.kt`).
- Web: status-group fix, honest manual-report labels, computed (not invented) summary, real print.
  No horizontal overflow at 375 px.

### Implemented, builds, NOT yet tested on a device
- Android real Firebase Auth (email or username), registration with vehicle selection, password reset,
  auth gate, sign-out (clears FCM token), **rider-only enforcement** (admin/contractor accounts are
  signed out with a message).
- Outbox-first reporting (`report/ReportSubmitter.kt`): Room first, unique WorkManager sync with
  backoff, idempotent upload (client UUID = detection id), FAILED rows retried.
- Detection pipeline: 2-of-3-frame temporal confirmation, 0.55 report threshold, 3.5 s cooldown +
  10 m/60 s same-pothole gate; server-side merge radius clamp(GPS accuracy, 10 m, 25 m) using a
  bounded latitude-band query; requires a fresh fix (≤30 s, ≤50 m) — otherwise "not reported".
- **Detection date & time** shown on the camera HUD/banner, in My Reports, in map details
  (first detected / last confirmed), companion list, and notifications (`util/TimeFormat.kt`).
- Location tracker with real callbacks; nearby alerts wired; map/monitor read `reports/`.
- Live sessions: auth uid identity, 6-char codes (32-symbol alphabet), atomic create, location
  cleared on end, heartbeat while stationary, dialogs guarded against finishing activities.
- ONNX leak fixed; model cache versioned per install; camera/TTS/listeners released on destroy.

### Blocked by external dependencies
- **Deploying rules / function / seeding production** needs your Firebase credentials and, for the
  Cloud Function, the **Blaze plan**. Until the new rules are deployed, production still runs the old,
  insecure rules. Until the function is deployed, username login falls back to an error (email works).
- **Push notifications to other users** (nearby alerts, group alerts) need a server sender (Cloud
  Function on new report). Tokens are now stored at `users/{uid}/fcmToken`; no sender exists yet.
- **Device testing**: a phone is connected over wireless ADB; nothing was installed without asking.

### Not implemented in this pass
Group creation & live group tracking · Split Camera+Map screen · route planning (OSRM) ·
Firestore/Storage migration · full UI/UX Pro Max redesign (web + mobile) · Super Admin / Inspector
roles · model research, benchmarking and retraining (no labelled validation set in the repo) ·
admin model-monitoring page · public road-safety map (all data currently requires sign-in).

## 4. Remaining known issues
- Existing data in production may contain old `PTH-xxxx` ids, `NEW_REPORT` statuses and records
  under fake uids (`citizen_demo_uid`); the UI tolerates them, but they are not migrated.
- `potholes/` is now legacy (read-only for non-admins); not deleted.
- Storage rules still let any signed-in user write any report image (Storage rules can't read RTDB).
- Reports list is downloaded in full by each client; fine at current scale, needs paging/geo-query later.
- A browser-pane "Invalid or unexpected token" console error appears, but every page script parses
  cleanly — it is not from the app's code.

## 5. How to run & verify
```
cd firebase/tests && npm install && npm test          # 17 security-rule tests
cd android-app && ./gradlew assembleDebug testDebugUnitTest
cd web-dashboard && npm run build                     # demo login off unless NEXT_PUBLIC_ENABLE_DEMO_LOGIN=1
```
Local end-to-end: start emulators (`firebase emulators:start --only auth,database,functions` from
`firebase/`), `cd scripts && npm run seed:emulator`, then run the web app with
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1 NEXT_PUBLIC_ENABLE_DEMO_LOGIN=1 npx next dev`.

Deploy (from `firebase/`, after `firebase login`): `firebase deploy --only database` (rules),
`firebase deploy --only functions` (Blaze), then seed with a service account:
`GOOGLE_APPLICATION_CREDENTIALS=key.json npm run seed:prod` in `scripts/`.
