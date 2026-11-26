from render import *  # noqa

A = lambda n: os.path.join(ASSETS, n + ".png")  # noqa: E731

cover = {
    "kind": "Project Proposal",
    "title": "SmartPothole: On-Device Pothole Detection and Road-Maintenance Platform",
    "subtitle": "Using riders' smartphones to find potholes and giving the city a tracked path from report to repair",
    "fields": cover_fields(),
}

B = [
    H1("1. Introduction"),
    P("Anyone who rides a motorcycle, a rickshaw or a bus in Dhaka knows how quickly a small break in the road turns "
      "into a deep pothole after a few days of rain. Potholes damage vehicles, cause sudden braking and swerving, and "
      "are a real danger for two-wheelers at night. The City Corporations are responsible for repairs, but they usually "
      "do not have an up-to-date picture of where the potholes are, how bad they are, or whether a repair that was "
      "paid for was actually done."),
    P("We propose **SmartPothole**, a system in which an ordinary Android phone mounted on a vehicle detects potholes "
      "by itself, warns the driver, and sends the position to a shared database. A web dashboard then lets the City "
      "Corporation verify each pothole, assign it to a contractor and close it only after checking the repair."),

    H1("2. Problem Statement"),
    UL("**Late and vague reports.** Complaints by phone or social media arrive late and rarely have an exact location.",
       "**Duplicates and gaps.** Busy roads get the same pothole reported many times; quiet roads get none.",
       "**No accountability.** There is often no record of who verified a repair and when.",
       "**Privacy and data cost.** Uploading dash-cam video from many phones costs bandwidth and storage, and captures "
       "faces and number plates.",
       "**No benefit for the driver.** Reporting tools do not warn drivers about hazards ahead."),
    NOTE("**In one sentence:** there is no low-cost, privacy-friendly way to find potholes automatically from everyday "
         "vehicles, merge the reports into reliable records, and track each one through a checked repair."),

    H1("3. Objectives"),
    OL("Run a lightweight YOLOv8 pothole detector in real time on a mid-range Android phone, without uploading images.",
       "Reduce false and repeated reports with multi-frame confirmation, confidence thresholds, a same-spot gate and a "
       "fresh-GPS requirement.",
       "Warn the driver immediately and offline with voice and vibration.",
       "Merge reports of the same pothole from different vehicles into one record.",
       "Build a role-based web dashboard for the City Corporation, contractors and citizens, with a nine-stage repair "
       "lifecycle and a full history of every change.",
       "Enforce all permissions on the server through database security rules and test them automatically."),

    H1("4. Proposed System"),
    P("The system has three parts. The Android app does the detection and keeps reports safe while offline. Firebase "
      "stores the data and checks every write against role-based rules. The web dashboard is where people manage "
      "repairs."),
    IMG(A("architecture"), 15.5, "Figure 1. Proposed architecture"),
    H2("4.1 Main features"),
    TABLE(["Feature", "What it does"], [
        ["On-device AI", "YOLOv8s, quantised to INT8 (10.96 MB), runs on the phone through ONNX Runtime."],
        ["Zero image upload", "Only class, confidence, GPS position, accuracy and time are sent (under 1 KB)."],
        ["Instant warning", "Voice message, vibration and banner as soon as a pothole is confirmed."],
        ["Offline-first", "Reports go to a local Room database first and upload later with WorkManager."],
        ["Smart de-duplication", "Nearby detections confirm one existing report instead of creating new ones."],
        ["Live companion", "Others can follow a scanning vehicle's position and detections by code."],
        ["Repair workflow", "NEW → review → verify → assign → accept → in progress → submitted → city check → resolved."],
        ["Free maps", "OpenStreetMap / OpenFreeMap tiles, no paid API keys."],
    ], [1.2, 3.6]),
    H2("4.2 Who benefits"),
    TABLE(["Stakeholder", "Role in the system", "Benefit"], [
        ["Riders / citizens", "Scan roads while driving, see the map", "Warnings ahead; see that their reports are acted on"],
        ["City Corporation", "Verify, assign, inspect and close", "Accurate pothole map and a full audit trail"],
        ["Contractors", "Accept jobs, update progress, submit repairs", "Clear work orders with deadlines"],
    ], [1.2, 2, 2]),

    H1("5. Methodology"),
    P("We follow an iterative approach: build a working version of each part, test it, and improve the weakest part in "
      "the next round."),
    UL("**Model:** start from a public pretrained single-class YOLOv8s checkpoint, export it to ONNX and quantise it "
       "to INT8. Measure size and latency for each format.",
       "**Android:** CameraX feeds frames to the model on a background thread. A pothole must appear in 2 of 3 frames "
       "above 0.55 confidence. Severity comes from the box area. Reports need a GPS fix no older than 30 s and no worse "
       "than 50 m.",
       "**Backend:** Firebase Realtime Database with rules written first and tested on the emulator before any UI work.",
       "**Web:** Next.js dashboard with one page per role and a route guard; all data access is checked by the rules.",
       "**Testing:** rule tests, unit tests, emulator end-to-end tests, and road tests on a real phone."),
    IMG(A("detection_flow"), 9.5, "Figure 2. Detection pipeline on the phone"),

    H1("6. Tools and Technologies"),
    TABLE(["Area", "Tools"], [
        ["Mobile", "Kotlin, Android Studio, CameraX, ONNX Runtime Android, Room, WorkManager, MapLibre / osmdroid"],
        ["AI", "Python, Ultralytics YOLOv8, ONNX, ONNX Runtime quantisation tools"],
        ["Web", "Next.js 15, React 19, TypeScript, Tailwind CSS, Leaflet"],
        ["Backend", "Firebase Authentication, Realtime Database, Cloud Functions, Cloud Messaging"],
        ["Testing", "Firebase Emulator Suite, @firebase/rules-unit-testing, JUnit"],
        ["Project", "Git and GitHub (team repository and forks), VS Code"],
    ], [1, 4]),

    H1("7. Work Plan"),
    IMG(A("gantt"), 16, "Figure 3. Timeline over the semester"),
    TABLE(["Phase", "Weeks", "Output"], [
        ["Requirements and design", "1–4", "SRS, diagrams, database structure"],
        ["Model preparation", "3–5", "ONNX and INT8 models, benchmark report"],
        ["Android app", "4–9", "Detection, warnings, outbox, sync, maps"],
        ["Backend rules and tests", "7–9", "database.rules.json, 17 rule tests"],
        ["Web dashboard", "6–11", "City, contractor and citizen dashboards"],
        ["Extra features", "9–12", "Live companion, route planning, split mode"],
        ["Testing and documents", "10–14", "Test report, documentation, presentation"],
    ], [2, 0.8, 3]),

    H1("8. Expected Outcomes"),
    UL("A working Android app that detects potholes in real time and warns the driver.",
       "A web dashboard that manages each pothole from report to verified repair.",
       "A de-duplicated map of potholes built from many riders' passes.",
       "A tested set of security rules that keeps each role to its own data.",
       "Documentation: SRS, code documentation, diagrams, and a presentation."),

    H1("9. Risks and How We Handle Them"),
    TABLE(["Risk", "Effect", "How we handle it"], [
        ["Model makes mistakes on local roads", "False or missed reports", "2-of-3 frame rule, 0.55 threshold, city verification step; plan to retrain on local data"],
        ["Poor GPS in dense areas", "Wrong positions", "Store accuracy, refuse fixes worse than 50 m, clamp merge radius to 25 m"],
        ["No network while driving", "Lost reports", "Room outbox and WorkManager retry"],
        ["Misuse of roles", "Fake closures", "Server-side rules; only the city can resolve; append-only history"],
        ["Phone overheating / battery", "App slows down", "Drop stale frames, 640x480 analysis, user can pause or turn the camera off"],
    ], [1.5, 1.1, 3]),

    H1("10. Ethics and Privacy"),
    P("The camera feed is processed on the phone and thrown away. No image, video or audio is stored on a server. A "
      "report holds only the pothole position, the model's confidence, GPS accuracy, time and the reporter's account "
      "ID. Live sessions share position only with people who have the code. Users can turn off voice alerts and stop "
      "the camera at any time."),

    H1("11. Conclusion"),
    P("SmartPothole uses hardware people already carry to collect road-condition data that cities currently do not "
      "have, and it gives drivers something back straight away in the form of warnings. Because the AI runs on the "
      "phone and only metadata is sent, the system is cheap to run and respects privacy. We believe it is a practical "
      "project for the semester, and a good base for a larger pilot with a City Corporation later."),
    H1("References"),
    OL("G. Jocher et al., *Ultralytics YOLOv8*, 2023.",
       "ONNX Runtime documentation, *Model quantization*.",
       "Firebase documentation, *Realtime Database security rules*.",
       "Android Developers, *CameraX* and *WorkManager* guides."),
    SIGN("Mohammad Ali Nayeem", "Mubashir Alam", "Nayem Miah", "Dipta Dipayan Kar"),
]

if __name__ == "__main__":
    build("02_Project_Proposal", cover, B, "Project Proposal")
