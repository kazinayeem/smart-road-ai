from render import *  # noqa
import snippets as S

cover = {
    "kind": "Code Documentation",
    "title": "SmartPothole: Source Code of the Main Modules",
    "subtitle": "Only the code part, with a short description of each module",
    "fields": cover_fields(),
}


def mod(title, path, desc, code, caption=None):
    return [H2(title), P(f"**File:** `{path}`"), P(desc), CODE(code, caption or "")]


AND = "android-app/app/src/main/java/org/smartpothole/app/"

B = [
    H1("1. Repository Layout"),
    P(f"The full source is in the team repository on GitHub: {GITHUB_URL}. The project has four parts:"),
    CODE("""smart-road-ai/
├── ai-model/            YOLOv8s model files and Python export / benchmark scripts
│   ├── original/        best.pt (PyTorch)
│   ├── exported/        pothole_yolov8s.onnx (FP32, 42.67 MB)
│   ├── optimized/       pothole_yolov8s_quant_int8.onnx (INT8, 10.96 MB)
│   └── scripts/         export_and_benchmark.py, validate_inference.py, ...
├── android-app/         Kotlin Android app for riders
│   └── app/src/main/java/org/smartpothole/app/
│       ├── ai/          PotholeDetector, ImageUtils
│       ├── detect/      DetectionController (camera + pipeline)
│       ├── report/      ReportSubmitter (outbox)
│       ├── sync/        SyncWorker, SmartPotholeDeduplicator
│       ├── database/    Room entity, DAO, AppDatabase
│       ├── warning/     LocalPotholeWarningManager
│       ├── location/    LocationTracker, NearbyPotholeMonitor
│       ├── session/     Live companion (LiveSessionManager, CompanionActivity)
│       ├── map/ route/  MapLibre map, route planning
│       └── ui/          Activities and fragments
├── web-dashboard/       Next.js 15 dashboard (city, contractor, citizen)
│   ├── app/             routes: /, /login, /register, /city, /contractor, /citizen
│   ├── components/      dashboards, map, report detail, route guard
│   └── lib/firebase.ts  auth and database functions
├── firebase/            database.rules.json, Cloud Function, rule tests
└── scripts/             demo account seeding, emulator scripts""", "Listing 1. Folder structure"),
    TABLE(["Part", "Language", "Main files"], [
        ["AI model", "Python", "export_and_benchmark.py"],
        ["Android app", "Kotlin", "PotholeDetector, DetectionController, ReportSubmitter, SyncWorker, SmartPotholeDeduplicator"],
        ["Web dashboard", "TypeScript / React", "lib/firebase.ts, RequireRole.tsx, CityCorpDashboard.tsx"],
        ["Backend", "JSON rules, JavaScript", "database.rules.json, functions/index.js"],
    ], [1.1, 1.2, 3.5]),

    H1("2. AI Model Preparation (Python)"),
    *mod("2.1 Export to ONNX and INT8 quantisation", "ai-model/scripts/export_and_benchmark.py",
         "Loads the trained YOLOv8s checkpoint, exports it to ONNX at 640x640, then applies dynamic INT8 "
         "quantisation so the model fits comfortably inside the APK (42.67 MB → 10.96 MB).",
         S.EXPORT_PY + "\n\n" + S.QUANT),

    H1("3. Android App (Kotlin)"),
    *mod("3.1 Running the model", AND + "ai/PotholeDetector.kt",
         "Wraps ONNX Runtime. `detect()` converts a bitmap to a tensor, runs the model, keeps boxes above 0.25, "
         "assigns a severity and calls NMS. Native tensors are closed every frame to avoid memory leaks.", S.DETECT),
    *mod("3.2 Removing overlapping boxes", AND + "ai/PotholeDetector.kt",
         "Standard greedy non-maximum suppression: keep the most confident box and drop others that overlap it by "
         "more than IoU 0.45.", S.NMS),
    *mod("3.3 Camera frame analysis", AND + "detect/DetectionController.kt",
         "CameraX calls `analyze()` on a single background thread. A busy flag drops frames while the previous one is "
         "still running, so the preview never stutters. Frames are rotated upright before inference.", S.ANALYZE),
    *mod("3.4 Confirmation and duplicate gates", AND + "detect/DetectionController.kt",
         "Keeps the last three frame results and needs two positives above 0.55. Then it applies the 3.5 s cooldown "
         "and the 10 m / 60 s same-pothole check before reporting.", S.HANDLE),
    *mod("3.5 Filing a report", AND + "detect/DetectionController.kt",
         "Sends the confirmed detection to the outbox. If a live session is running, the detection is also broadcast "
         "to companions.", S.REPORT),
    *mod("3.6 Outbox", AND + "report/ReportSubmitter.kt",
         "One entry point for every report (camera auto, camera manual, one-tap mark). It refuses to save without a "
         "signed-in user or a GPS fix, writes to Room, and queues a unique upload job.", S.SUBMIT),
    *mod("3.7 Local database table", AND + "database/PotholeReportEntity.kt",
         "The Room entity. `clientUuid` is unique and later becomes the detection ID on the server, which makes "
         "uploads idempotent.", S.ENTITY),
    *mod("3.8 Data access object", AND + "database/PotholeReportDao.kt",
         "Queries used by the reports screen and the sync worker.", S.DAO),
    *mod("3.9 Background upload", AND + "sync/SyncWorker.kt",
         "A WorkManager `CoroutineWorker` that uploads PENDING and FAILED rows for the signed-in user and retries "
         "with exponential backoff up to eight times.", S.SYNC),
    *mod("3.10 Finding a nearby report", AND + "sync/SmartPotholeDeduplicator.kt",
         "Downloads only reports in a narrow latitude band, then checks longitude and true distance. Resolved, rejected "
         "and duplicate reports are ignored.", "\n".join(S.DEDUP_MATCH.splitlines()[:-1])),
    *mod("3.11 Merging or creating a report", AND + "sync/SmartPotholeDeduplicator.kt",
         "If a match exists, writes the detection and increments `totalDetections`. Otherwise creates a new report, "
         "the detection, and the first history entry.", S.DEDUP),
    *mod("3.12 Driver warnings", AND + "warning/LocalPotholeWarningManager.kt",
         "Text-to-speech, vibration and a banner callback, with a 2.8 s cooldown so warnings do not repeat on every "
         "frame. Works with no network.", S.WARN),
    *mod("3.13 Live companion session", AND + "session/LiveSessionManager.kt",
         "Creates a session and its 6-character code in one atomic multi-path write. The alphabet leaves out 0/O and "
         "1/I so codes are easy to read aloud.", S.SESSION),

    H1("4. Web Dashboard (TypeScript)"),
    *mod("4.1 Login", "web-dashboard/lib/firebase.ts",
         "Email logins go straight to Firebase Auth. Usernames go through the Cloud Function, which returns a custom "
         "token. Any failure shows the same message.", S.WEB_LOGIN),
    *mod("4.2 Route guard", "web-dashboard/components/RequireRole.tsx",
         "Sends signed-out users to the login page and users with the wrong role to their own dashboard. This is only "
         "for navigation; the database rules do the real checking.", S.GUARD),
    *mod("4.3 Status change with history", "web-dashboard/lib/firebase.ts",
         "Used by every button in the city and contractor dashboards. It updates the report and appends a history "
         "entry with old status, new status, the user and remarks.", S.WEB_WORKFLOW),

    H1("5. Backend (Firebase)"),
    *mod("5.1 Security rules (selected)", "firebase/database.rules.json",
         "Role changes need a city admin, reports must carry position and status, status must be a known value, and "
         "the confirmation counter can only increase by one.", S.RULES),
    *mod("5.2 Username login function", "firebase/functions/index.js",
         "Maps username → user → email on the server, checks the password, counts failures and locks the username "
         "for 15 minutes after five failures.", S.FUNC),

    H1("6. How to Build and Run"),
    P(f"**Quickest way to try it:** open the live dashboard or download the ready-built Android APK from {LIVE_URL}. "
      f"A full video walkthrough is at {VIDEO_URL}. To build from source, clone {GITHUB_URL} and run:"),
    CODE("""# Security rules: run the 17 tests on the local emulator, then deploy
cd firebase/tests && npm install && npm test
cd .. && firebase deploy --only database

# Web dashboard
cd web-dashboard
npm install --legacy-peer-deps
npm run build && npm start          # http://localhost:3300

# Android app (debug build + unit tests)
cd android-app
./gradlew assembleDebug testDebugUnitTest

# Model export and benchmark
python ai-model/scripts/export_and_benchmark.py""", "Listing. Build and run commands"),
]

if __name__ == "__main__":
    build("03_Code_Documentation", cover, B, "Code Documentation")
