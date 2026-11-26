from render import *  # noqa
import snippets as S

A = lambda n: os.path.join(ASSETS, n + ".png")  # noqa: E731

cover = {
    "kind": "Software Requirements Specification (Lab Report)",
    "title": "SmartPothole: On-Device Pothole Detection and Road-Maintenance Platform",
    "subtitle": "Requirements, design, implementation of the main features, and testing",
    "fields": cover_fields(),
}

B = [
    H1("Table of Contents"),
    TOC(("1", "Introduction"), ("1.1", "Purpose"), ("1.2", "Scope"), ("1.3", "Definitions and abbreviations"),
        ("1.4", "References"), ("2", "Overall Description"), ("2.1", "Product perspective"), ("2.2", "Product functions"),
        ("2.3", "User classes"), ("2.4", "Operating environment"), ("2.5", "Constraints, assumptions and dependencies"),
        ("3", "Functional Requirements"), ("4", "External Interface Requirements"), ("5", "Non-Functional Requirements"),
        ("6", "System Design"), ("7", "Implementation: Code of the Main Features"), ("8", "Testing"),
        ("9", "Results and Screenshots"), ("10", "Limitations and Future Work"), ("11", "Conclusion"), ("", "References")),
    PB(),

    # ------------------------------------------------------------------ 1
    H1("1. Introduction"),
    H2("1.1 Purpose"),
    P("This document describes the software requirements of **SmartPothole**, a system that detects potholes with a "
      "smartphone camera and passes each defect through a tracked repair process run by the city authority. It also "
      "records how the requirements were designed and built, shows the code of the main features, and lists the tests "
      "we ran. It is written for our course teacher, for the team members, and for anyone who later continues the work."),
    H2("1.2 Scope"),
    P("Potholes in Dhaka and other cities are usually found through complaints or occasional inspection. Complaints "
      "arrive late, the location is often vague, and the same hole gets reported many times while others are never "
      "reported at all. Once a repair is handed to a contractor, there is rarely a clear record of who checked and "
      "approved the work."),
    P("SmartPothole tries to fix this in three parts:"),
    UL("an **Android app** for riders. A YOLOv8 model runs on the phone, spots potholes in the camera feed, warns the "
       "driver by voice and vibration, and sends only a small record (position, confidence, time). The video never "
       "leaves the phone;",
       "a **Firebase backend** that stores the reports, merges repeated reports of the same pothole, and enforces who "
       "may do what through database security rules;",
       "a **web dashboard** where the City Corporation reviews, assigns and closes repairs, contractors manage their "
       "own jobs, and citizens follow the map."),
    P("Out of scope for this version: payment to contractors, road types other than potholes (cracks, manholes), "
      "and uploading photos as evidence."),
    H2("1.3 Definitions and abbreviations"),
    TABLE(["Term", "Meaning"], [
        ["YOLOv8", "\"You Only Look Once\" version 8, a single-stage object detection model"],
        ["ONNX", "Open Neural Network Exchange, a portable model format; run on Android with ONNX Runtime"],
        ["INT8 quantisation", "Storing model weights as 8-bit integers to make the file about 4x smaller"],
        ["NMS", "Non-maximum suppression; removes overlapping boxes around the same object"],
        ["RTDB", "Firebase Realtime Database, a cloud JSON database with live listeners"],
        ["Room", "Android's SQLite library, used here as an offline outbox"],
        ["WorkManager", "Android library that runs background jobs when conditions (e.g. network) are met"],
        ["Report", "One physical pothole record in `reports/`"],
        ["Detection", "One observation of a pothole by one phone, kept in `detections/`"],
        ["City Corporation", "The municipal authority (admin role) that verifies, assigns and closes repairs"],
        ["SRS", "Software Requirements Specification"],
    ], [1, 3]),
    H2("1.4 References"),
    UL("IEEE Std 830-1998, *Recommended Practice for Software Requirements Specifications*.",
       "Ultralytics YOLOv8 documentation; ONNX Runtime Mobile documentation.",
       "Firebase Realtime Database security rules documentation.",
       "Project repository: `github.com/kazinayeem/smart-road-ai` (code, rules, tests and scripts)."),

    # ------------------------------------------------------------------ 2
    H1("2. Overall Description"),
    H2("2.1 Product perspective"),
    P("SmartPothole is a new, self-contained system. It does not replace an existing municipal tool, but its data "
      "(pothole positions, status and history) could later be exported to one. It has no custom server. The phone does "
      "the heavy work (AI inference), Firebase stores and protects the data, and the web dashboard is a static Next.js "
      "site that talks to Firebase directly. Figure 1 in Section 6 shows how the parts connect."),
    H2("2.2 Product functions"),
    UL("Detect potholes in real time from the rear camera, on the device, without internet.",
       "Warn the driver immediately with a spoken message, vibration and an on-screen banner.",
       "Save every report locally first and upload it when a network is available.",
       "Merge reports of the same pothole from different riders into one record and count the confirmations.",
       "Show potholes on a free OpenStreetMap-based map, plan a route and count hazards on it.",
       "Let one rider share a live scanning session with companions (position and detections, no video).",
       "Let the City Corporation verify, reject, assign with a deadline, inspect and close each report.",
       "Let contractors accept or decline jobs, update progress and submit a repair for checking.",
       "Keep a complete history of every status change for each report."),
    H2("2.3 User classes and characteristics"),
    TABLE(["User class", "Where", "What they do", "Technical skill"], [
        ["Rider / Citizen", "Android app, web", "Scan roads while driving, mark potholes, see the map and their reports", "Ordinary smartphone user"],
        ["Companion", "Android app", "Join a scanning session by code and follow it live", "Ordinary smartphone user"],
        ["City Corporation", "Web dashboard", "Triage, verify, assign, inspect and close repairs", "Office computer user; road engineer"],
        ["Contractor", "Web dashboard", "Handle only their own assigned jobs", "Office computer user"],
    ], [1.1, 1, 2.4, 1.3]),
    H2("2.4 Operating environment"),
    UL("Android 8.0 (API 26) or newer, rear camera, GPS; tested on mid-range phones.",
       "Any modern desktop browser (Chrome, Edge, Firefox, Safari) for the dashboard.",
       "Google Firebase: Authentication, Realtime Database, Cloud Functions (Node.js 20), Cloud Messaging."),
    H2("2.5 Design constraints, assumptions and dependencies"),
    UL("**Privacy:** camera images and video must never be uploaded. Only structured metadata is sent.",
       "**Cost:** no paid map APIs. Maps use OpenStreetMap / OpenFreeMap tiles.",
       "**No custom server:** all access control must be expressed in Firebase security rules.",
       "**Model size:** the model is bundled in the APK, so it should stay near 10 MB.",
       "We assume the phone is mounted facing the road and the GPS has a usable fix (≤ 50 m accuracy).",
       "The username-login Cloud Function needs the Firebase Blaze (pay-as-you-go) plan."),

    # ------------------------------------------------------------------ 3
    H1("3. Functional Requirements"),
    P("Each requirement has an ID, a priority (H = must have, M = should have, L = nice to have) and its status in "
      "the current build."),
    H2("3.1 Authentication and roles"),
    TABLE(["ID", "Requirement", "Pri.", "Status"], [
        ["FR-01", "Users register with name, email, username, password and vehicle type. New accounts are always CITIZEN.", "H", "Done"],
        ["FR-02", "Users sign in with email or username and password. A wrong password and an unknown user show the same error.", "H", "Done"],
        ["FR-03", "After 5 failed username logins in 15 minutes, that username is locked for 15 minutes.", "M", "Done"],
        ["FR-04", "Only a City Corporation user can change another user's role.", "H", "Done"],
        ["FR-05", "Each role lands on its own dashboard; opening another role's page redirects to the user's own.", "H", "Done"],
        ["FR-06", "The Android app accepts rider (CITIZEN) accounts only; admin and contractor accounts are signed out.", "M", "Done"],
    ], [0.7, 5, 0.5, 0.8]),
    H2("3.2 Detection and reporting (Android)"),
    TABLE(["ID", "Requirement", "Pri.", "Status"], [
        ["FR-07", "Run the YOLOv8 model on live camera frames on the phone, with no network needed.", "H", "Done"],
        ["FR-08", "Show boxes, confidence, FPS and inference time over the camera preview.", "M", "Done"],
        ["FR-09", "Count a pothole only when confidence ≥ 0.55 in at least 2 of the last 3 analysed frames.", "H", "Done"],
        ["FR-10", "Classify severity (LOW / MEDIUM / HIGH) from box area and confidence.", "M", "Done"],
        ["FR-11", "Warn the driver at once with voice, vibration and a banner; voice can be turned off.", "H", "Done"],
        ["FR-12", "Do not report the same spot twice: 3.5 s cooldown and a 10 m / 60 s same-pothole gate.", "H", "Done"],
        ["FR-13", "Attach a report only to a fresh GPS fix (≤ 30 s old, ≤ 50 m accuracy); never use a guessed position.", "H", "Done"],
        ["FR-14", "Support automatic reporting and a manual mode where the rider confirms each report.", "M", "Done"],
        ["FR-15", "Let a rider mark a pothole by hand at the current GPS position (one tap).", "M", "Done"],
    ], [0.7, 5, 0.5, 0.8]),
    H2("3.3 Offline storage, sync and de-duplication"),
    TABLE(["ID", "Requirement", "Pri.", "Status"], [
        ["FR-16", "Save every report in the local Room database first, with status PENDING.", "H", "Done"],
        ["FR-17", "Upload pending reports in the background when a network is available; retry failures with backoff.", "H", "Done"],
        ["FR-18", "Uploads are idempotent: a retried upload must not count the same detection twice.", "H", "Done"],
        ["FR-19", "A detection within clamp(GPS accuracy, 10 m, 25 m) of an active report confirms that report instead of creating a new one.", "H", "Done"],
        ["FR-20", "Every individual detection is kept as an append-only record for evidence.", "M", "Done"],
    ], [0.7, 5, 0.5, 0.8]),
    H2("3.4 Maps, routes and live companion"),
    TABLE(["ID", "Requirement", "Pri.", "Status"], [
        ["FR-21", "Show active potholes on a map coloured by status, with the rider's position.", "H", "Done"],
        ["FR-22", "Warn the rider when approaching a pothole someone else already reported.", "M", "Done"],
        ["FR-23", "Plan a route to a destination and show how many reported potholes lie on it.", "L", "Done"],
        ["FR-24", "Split mode: camera and map on one screen while driving.", "L", "Done"],
        ["FR-25", "Create a live session with a 6-character code; companions see the scanner's position and detections.", "M", "Done"],
        ["FR-26", "Companions get alerts for new detections, large moves, lost GPS, going offline and session end.", "M", "Done"],
    ], [0.7, 5, 0.5, 0.8]),
    H2("3.5 Repair management (web)"),
    TABLE(["ID", "Requirement", "Pri.", "Status"], [
        ["FR-27", "The City Corporation sees all reports in a table and on a map with filters by status.", "H", "Done"],
        ["FR-28", "The City Corporation can move a report to UNDER_REVIEW, VERIFIED, REJECTED or DUPLICATE.", "H", "Done"],
        ["FR-29", "The City Corporation assigns a verified report to a contractor with a deadline.", "H", "Done"],
        ["FR-30", "A contractor sees only jobs assigned to them; can accept, decline, start and submit a repair.", "H", "Done"],
        ["FR-31", "Only the City Corporation can mark a report RESOLVED or send the repair back (REPAIR_REJECTED).", "H", "Done"],
        ["FR-32", "Every status change is logged with old status, new status, who changed it, remarks and time.", "H", "Done"],
        ["FR-33", "Citizens on the web can see the map, file a manual report and follow their own reports.", "M", "Done"],
    ], [0.7, 5, 0.5, 0.8]),

    # ------------------------------------------------------------------ 4
    H1("4. External Interface Requirements"),
    H2("4.1 User interfaces"),
    UL("**Android:** bottom navigation with Home, Map, Reports and Profile. The camera screen is full-screen with large "
       "controls that can be used at arm's length (Pause, Camera off, Voice, Bigger map). Dark theme to reduce glare.",
       "**Web:** landing page, login and register pages, and one dashboard per role. Tables with status chips, a "
       "Leaflet map, and a detail panel that shows the full history of a report.",
       "Status colours are the same everywhere: red = NEW, orange = under review, blue = assigned, yellow = in "
       "progress, purple = repair submitted, green = resolved, grey = rejected."),
    H2("4.2 Hardware interfaces"),
    UL("Rear camera through CameraX (`ImageAnalysis`, 640x480, keep-latest back-pressure).",
       "GPS through the fused location provider; accuracy is stored with every report.",
       "Vibrator and speaker (text-to-speech) for warnings."),
    H2("4.3 Software interfaces"),
    TABLE(["Interface", "Used for"], [
        ["ONNX Runtime Mobile 1.x", "Running the INT8 YOLOv8s model (`[1,3,640,640]` in, `[1,5,8400]` out)"],
        ["Firebase Auth SDK", "Email/password and custom-token sign-in on Android and web"],
        ["Firebase RTDB SDK", "Reading/writing `reports`, `detections`, `users`, `activity_logs`, `live_sessions`"],
        ["Firebase Cloud Functions", "`resolveUsernameLogin` callable for username login"],
        ["Firebase Cloud Messaging", "Push alerts to companion phones"],
        ["MapLibre / osmdroid, Leaflet", "Maps on Android and on the web, with OpenStreetMap tiles"],
        ["OSRM-compatible routing", "Route geometry for the route-planning screen"],
    ], [1.4, 3]),
    H2("4.4 Communication interfaces"),
    P("All traffic uses HTTPS and secure WebSockets to Firebase. The upload format is JSON. A typical report is under "
      "1 KB, compared with several megabytes for a single photo."),

    # ------------------------------------------------------------------ 5
    H1("5. Non-Functional Requirements"),
    TABLE(["ID", "Category", "Requirement"], [
        ["NFR-01", "Performance", "Inference must not block the camera preview; analysis runs on its own thread and drops stale frames."],
        ["NFR-02", "Performance", "A warning is shown in the same frame cycle as the confirming detection (no network wait)."],
        ["NFR-03", "Size", "The bundled model must stay near 10 MB (INT8 model is 10.96 MB)."],
        ["NFR-04", "Privacy", "No image or video is uploaded. Live sessions share position and detections only."],
        ["NFR-05", "Security", "All access rules are enforced on the server (RTDB rules), never only in the client."],
        ["NFR-06", "Security", "Roles are read from the database, never from local storage or the email address."],
        ["NFR-07", "Reliability", "Reports survive app restarts and network loss (Room outbox + WorkManager)."],
        ["NFR-08", "Accuracy", "A report is never filed at a hard-coded or stale position."],
        ["NFR-09", "Usability", "Warnings must work hands-free; the camera screen uses large touch targets."],
        ["NFR-10", "Cost", "No paid APIs for maps; the system runs on Firebase's free tier except the login function."],
        ["NFR-11", "Maintainability", "Rules are covered by automated emulator tests (17 tests)."],
        ["NFR-12", "Auditability", "The status history of a report cannot be edited or deleted by clients."],
    ], [0.8, 1.1, 4.5]),

    # ------------------------------------------------------------------ 6
    H1("6. System Design"),
    H2("6.1 Architecture"),
    P("The system follows a three-tier design. Intelligence stays on the phone, authority stays in the database rules, "
      "and each human role has its own interface. Arrows between tiers carry only JSON metadata."),
    IMG(A("architecture"), 16, "Figure 1. System architecture"),
    H2("6.2 Use case diagram"),
    IMG(A("usecase"), 15.5, "Figure 2. Use cases for the four actors"),
    H2("6.3 Data flow"),
    IMG(A("dfd0"), 13.5, "Figure 3. Context diagram (DFD level 0)"),
    IMG(A("dfd1"), 15.5, "Figure 4. DFD level 1"),
    H2("6.4 Detection pipeline"),
    P("Figure 5 shows what happens to each camera frame. Three checks run before anything is reported: the 2-of-3 frame "
      "confirmation, the cooldown and same-spot gate, and the GPS freshness check. The warning to the driver comes "
      "before these reporting checks, so the driver is warned even when no report is filed."),
    IMG(A("detection_flow"), 11.5, "Figure 5. Activity diagram of the on-device detection pipeline"),
    H2("6.5 Report lifecycle"),
    IMG(A("lifecycle"), 16, "Figure 6. State diagram of a pothole report"),
    H2("6.6 Data model"),
    P("Firebase RTDB stores JSON, not tables, but the structure is relational in practice. Figure 7 shows the main "
      "nodes and their links. The Room table on the phone mirrors a report until it is uploaded."),
    IMG(A("er"), 16, "Figure 7. Data model (Firebase nodes and the local Room table)"),

    # ------------------------------------------------------------------ 7
    H1("7. Implementation: Code of the Main Features"),
    P("This section shows the code of the most important features, copied from the repository. Long functions are "
      "shown in full so the logic can be followed; imports are left out. The separate *Code Documentation* covers "
      "more files."),
    TABLE(["Layer", "Technology"], [
        ["Android app", "Kotlin, CameraX, ONNX Runtime Android, Room 2.7, WorkManager, Firebase SDK, MapLibre/osmdroid"],
        ["Web dashboard", "Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Leaflet"],
        ["Backend", "Firebase Auth, Realtime Database + rules, Cloud Functions (Node 20), FCM"],
        ["AI model", "YOLOv8s (Ultralytics), exported to ONNX, dynamic INT8 quantisation (Python)"],
    ], [1, 3.5]),
    H2("7.1 On-device inference (PotholeDetector.kt)"),
    P("The frame is turned into a `[1, 3, 640, 640]` float tensor and run through the model. The output has 8,400 "
      "candidate boxes. We keep boxes above 0.25 confidence, convert them to normalised corners, give each a severity "
      "and remove overlaps with NMS. The tensors are closed with `use { }` every frame; an earlier version leaked native "
      "memory here."),
    CODE(S.DETECT, "Listing 1. Inference, box decoding and severity"),
    H2("7.2 Temporal confirmation and report gates (DetectionController.kt)"),
    P("A single frame can be wrong (a shadow, a dark patch). `handle()` keeps the last three frames and continues only "
      "when at least two were positive above 0.55. It then applies the cooldown and the same-spot gate before reporting."),
    CODE(S.HANDLE, "Listing 2. 2-of-3 frame confirmation and duplicate gates"),
    CODE(S.CONSTS, "Listing 3. Thresholds used by the pipeline"),
    H2("7.3 Offline-first reporting (ReportSubmitter.kt)"),
    P("Every report goes to the Room outbox first, then a unique WorkManager job is queued that only runs with a "
      "network. If there is no GPS fix, the function returns `NoLocationFix` and nothing is saved."),
    CODE(S.SUBMIT, "Listing 4. Saving to the outbox and queuing the upload"),
    H2("7.4 Background upload (SyncWorker.kt)"),
    CODE(S.SYNC, "Listing 5. Uploading pending rows with retry"),
    H2("7.5 Smart de-duplication (SmartPotholeDeduplicator.kt)"),
    P("Before creating a report, the uploader looks for an active report nearby. The match radius follows the GPS "
      "accuracy but is clamped between 10 m and 25 m, so poor GPS cannot merge two different potholes. Only reports in "
      "a narrow latitude band are downloaded, not the whole table."),
    CODE("\n".join(S.DEDUP_MATCH.splitlines()[:-1]), "Listing 6. Finding the nearest active report"),
    CODE(S.DEDUP, "Listing 7. Confirming an existing report or creating a new one"),
    H2("7.6 Driver warning (LocalPotholeWarningManager.kt)"),
    CODE(S.WARN, "Listing 8. Offline voice, vibration and banner warning"),
    H2("7.7 Repair workflow and audit log (web-dashboard/lib/firebase.ts)"),
    P("Every status change from the web goes through one function, which also writes the history entry. The rules "
      "decide whether the change is allowed for the signed-in role."),
    CODE(S.WEB_WORKFLOW, "Listing 9. Status update with audit entry"),
    H2("7.8 Server-side access rules (firebase/database.rules.json)"),
    P("These are a few of the rules that matter most. A user cannot promote themselves, a report must have position and "
      "status, the status must be one of the 14 known values, and the confirmation counter can only go up by one."),
    CODE(S.RULES, "Listing 10. Selected security rules"),
    H2("7.9 Username login (firebase/functions/index.js)"),
    CODE(S.FUNC, "Listing 11. Username login with lockout and a single generic error"),
    H2("7.10 Model export and quantisation (Python)"),
    CODE(S.EXPORT_PY + "\n\n" + S.QUANT, "Listing 12. Exporting YOLOv8s to ONNX and quantising to INT8"),

    # ------------------------------------------------------------------ 8
    H1("8. Testing"),
    H2("8.1 Test approach"),
    UL("**Security rule tests:** 17 automated tests on the Firebase emulator (`firebase/tests/rules.test.mjs`).",
       "**Unit tests:** JVM tests for the Android logic (severity, match radius, gates) in `LogicTest.kt`, 4 of 4 passing.",
       "**Function tests:** username login checked in the Functions emulator (correct login, wrong password, lockout).",
       "**End-to-end web test:** a full journey on emulators with the real rules, from citizen report to contractor acceptance.",
       "**Device test:** the Android app run on a real phone on Dhaka roads; screenshots in Section 9.",
       "**Model check:** export and benchmark script comparing PyTorch, ONNX FP32 and ONNX INT8."),
    H2("8.2 Test cases"),
    TABLE(["TC", "Test", "Expected result", "Result"], [
        ["TC-01", "Sign in with a correct email and password", "Redirected to own role dashboard", "Pass"],
        ["TC-02", "Sign in with a wrong password", "\"Incorrect username/email or password.\"", "Pass"],
        ["TC-03", "6th wrong username login within 15 min", "\"Too many attempts\" error", "Pass"],
        ["TC-04", "Citizen writes role = CITY_CORPORATION on own profile", "Write denied by rules", "Pass"],
        ["TC-05", "Citizen creates a report for another user's ID", "Write denied", "Pass"],
        ["TC-06", "Contractor changes a job assigned to someone else", "Write denied", "Pass"],
        ["TC-07", "Contractor sets own job to RESOLVED", "Write denied (city only)", "Pass"],
        ["TC-08", "Client edits or deletes an activity log entry", "Denied (append-only)", "Pass"],
        ["TC-09", "Signed-out user opens /city", "Redirected to /login?next=/city", "Pass"],
        ["TC-10", "Citizen opens /city", "Redirected to /citizen", "Pass"],
        ["TC-11", "Point camera at a pothole on the road", "Box, banner, voice and vibration within a second", "Pass"],
        ["TC-12", "Same pothole stays in view for 10 s", "Only one report filed", "Pass"],
        ["TC-13", "Detection with GPS turned off", "\"Not reported: waiting for GPS\", nothing saved", "Pass"],
        ["TC-14", "Detect in airplane mode, then reconnect", "Row stays PENDING, then uploads and shows Uploaded", "Pass"],
        ["TC-15", "Two riders pass the same pothole", "One report, totalDetections = 2", "Pass"],
        ["TC-16", "City verifies, assigns; contractor accepts", "Status ASSIGNED -> ACCEPTED, two log entries", "Pass"],
        ["TC-17", "Companion joins with a valid code", "Sees scanner position and detections live", "Pass"],
        ["TC-18", "Companion joins with a wrong code", "\"Session code not found\"", "Pass"],
    ], [0.6, 2.4, 2.4, 0.6]),
    H2("8.3 Model size and speed"),
    P("We measured the three model formats on a desktop CPU with `export_and_benchmark.py`. INT8 is 74.3% smaller than "
      "ONNX FP32, which is what matters for an APK. On the desktop it is slower, because dynamic quantisation adds "
      "conversion steps that desktop CPUs do not speed up. On ARM phones INT8 kernels usually help, but we have not "
      "yet measured this formally on a phone."),
    IMG(A("model_chart"), 15, "Figure 8. Model size and desktop latency for the three formats"),
    TABLE(["Format", "Size", "Avg. latency (desktop)", "Notes"], [
        ["PyTorch FP32 (best.pt)", "21.48 MB", "62.33 ms", "Training format; not used on the phone"],
        ["ONNX FP32", "42.67 MB", "47.55 ms", "Fastest on desktop, too large for the APK"],
        ["ONNX INT8 (dynamic)", "10.96 MB", "76.91 ms", "Bundled in the Android app"],
    ], [1.5, 0.8, 1.2, 2.2]),

    # ------------------------------------------------------------------ 9
    H1("9. Results and Screenshots"),
    P("The screenshots below were taken from the running system: the Android app on a phone in Dhaka and the web "
      "dashboard in a desktop browser."),
    IMG(A("app_panel1"), 15.5, "Figure 9. Android: home screen, live detection with warning, and split mode"),
    IMG(A("app_panel2"), 15.5, "Figure 10. Android: hazard map, route planning with pothole count, and the rider's reports"),
    IMG(A("app_panel3"), 15.5, "Figure 11. Android: profile and alert settings, nearby warning on the map, upload status"),
    IMG(A("web_landing"), 16, "Figure 12. Web: public landing page"),
    IMG(A("web_city_map"), 16, "Figure 13. Web: City Corporation map with status filters"),
    IMG(A("web_triage"), 16, "Figure 14. Web: report triage table with confidence, severity and confirmations"),
    P("In our road tests the app filed 27 reports across two sessions, all of which uploaded. The triage table shows the "
      "de-duplication working: one pothole was confirmed 12 times by repeated passes instead of creating 12 reports."),

    # ------------------------------------------------------------------ 10
    H1("10. Limitations and Future Work"),
    UL("**No local validation set yet.** The model is a public pretrained checkpoint. We have not measured precision, "
       "recall or mAP on Bangladeshi roads. Collecting and labelling a local dataset is the next step.",
       "**Phone latency not formally measured.** We see a live FPS counter, but have no benchmark across devices.",
       "**Night and rain.** Detection quality drops in low light and on wet, reflective roads.",
       "**No photo evidence for repairs.** Contractors submit notes only; before/after photos would help inspection.",
       "**Single class.** Cracks, open manholes and speed breakers are not detected.",
       "**Planned:** retrain on local data, add push notifications for contractors and the city, add a public status "
       "page, and run a small pilot with a ward of the City Corporation."),

    # ------------------------------------------------------------------ 11
    H1("11. Conclusion"),
    P("We built a working system that turns an ordinary Android phone into a road inspector. The model runs fully on "
      "the phone, warns the driver straight away, and sends only a few hundred bytes per pothole. Reports survive poor "
      "connectivity, repeated sightings are merged, and the city can follow each pothole from first detection to a "
      "verified repair with a full history. The main gap is evaluation on local data. The software side is ready "
      "for that work: the pipeline, the database rules and the dashboard are implemented and tested."),
    H1("References"),
    OL("G. Jocher, A. Chaurasia and J. Qiu, *Ultralytics YOLOv8*, 2023. https://github.com/ultralytics/ultralytics",
       "ONNX Runtime, *Quantize ONNX models*, Microsoft. https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html",
       "Google, *Firebase Realtime Database Security Rules*. https://firebase.google.com/docs/database/security",
       "Android Developers, *CameraX ImageAnalysis* and *WorkManager* guides. https://developer.android.com",
       "IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*.",
       "OpenStreetMap contributors, *OpenStreetMap*. https://www.openstreetmap.org"),
]

if __name__ == "__main__":
    build("01_SRS_Lab_Report", cover, B, "SRS Lab Report")
