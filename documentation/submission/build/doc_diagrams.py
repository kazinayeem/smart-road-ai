from render import *  # noqa

A = lambda n: os.path.join(ASSETS, n + ".png")  # noqa: E731

cover = {
    "kind": "Diagrams and Workflows",
    "title": "SmartPothole: System Diagrams and Workflows",
    "subtitle": "Architecture, UML, data-flow, state, sequence and deployment diagrams with short explanations",
    "fields": cover_fields(),
}


def fig(title, name, width, caption, *text):
    return [H2(title), *[P(t) for t in text], IMG(A(name), width, caption)]


B = [
    H1("List of Diagrams"),
    TABLE(["No.", "Diagram", "Type"], [
        ["1", "System architecture", "Block diagram"],
        ["2", "Use case diagram", "UML"],
        ["3", "Context diagram", "DFD level 0"],
        ["4", "Level-1 data flow", "DFD level 1"],
        ["5", "Detection pipeline", "UML activity / flowchart"],
        ["6", "Offline sync and de-duplication", "Flowchart"],
        ["7", "Report lifecycle", "UML state diagram"],
        ["8", "Detection to dashboard", "UML sequence"],
        ["9", "Username login", "UML sequence"],
        ["10", "Live companion session", "UML sequence"],
        ["11", "Main Android classes", "UML class diagram"],
        ["12", "Data model", "ER diagram"],
        ["13", "Deployment", "UML deployment"],
        ["14", "Project timeline", "Gantt chart"],
        ["15", "Git workflow", "Workflow"],
    ], [0.5, 3, 2]),
    NOTE(f"The workflows below can be seen running in the project video: {VIDEO_URL}. The web dashboard is at "
         f"{DASHBOARD_URL}, the Android APK at {APK_URL}, and the code for every diagram at {GITHUB_URL}."),
    PB(),
    H1("1. Architecture"),
    *fig("1.1 System architecture", "architecture", 16, "Figure 1. Three-tier architecture",
         "The phone does detection, warnings and offline storage. Firebase stores data and enforces rules. The web "
         "dashboard is used by the city, contractors and citizens. Only JSON metadata crosses between tiers; camera "
         "frames stay on the phone."),
    *fig("1.2 Deployment", "deployment", 15, "Figure 2. Where each component runs",
         "There is no custom server to maintain. The model ships inside the APK, the dashboard is a static export that "
         "can be hosted on Firebase Hosting, and both clients connect to Firebase over HTTPS and WebSockets."),
    H1("2. Requirements View"),
    *fig("2.1 Use case diagram", "usecase", 15.5, "Figure 3. Actors and use cases",
         "Four actors use the system. Riders scan, get warnings and see the map. The City Corporation verifies, "
         "assigns and closes repairs. Contractors handle their own jobs. Companions follow a live session."),
    *fig("2.2 Context diagram (DFD level 0)", "dfd0", 13.5, "Figure 4. The system and its external entities",
         "The whole system is one process. Riders send detections and receive warnings and status; the city sends "
         "decisions and receives a de-duplicated queue; contractors send progress and receive jobs."),
    *fig("2.3 DFD level 1", "dfd1", 15.5, "Figure 5. Main processes and data stores",
         "Process 1.0 runs on the phone and needs no network. Process 2.0 writes to the local outbox (D1). Process 3.0 "
         "runs when a network is available and writes to reports (D2) and detections (D3). Process 5.0 is the repair "
         "workflow, and every status change it makes is written to the activity log (D4)."),
    H1("3. Workflows"),
    *fig("3.1 Detection pipeline", "detection_flow", 11.5, "Figure 6. What happens to each camera frame",
         "Each frame is resized and run through the INT8 model. Boxes are filtered and given a severity. A pothole is "
         "confirmed only if it appears in two of the last three frames above 0.55 confidence. The driver is warned at "
         "this point. A report is filed only if it is not a repeat of the last one and the GPS fix is fresh."),
    *fig("3.2 Offline sync and de-duplication", "sync_flow", 15, "Figure 7. Upload and merge logic",
         "WorkManager starts the job when a network is available. Rows that were already uploaded are skipped, which "
         "makes retries safe. Each new detection either confirms the nearest active report or creates a new one. "
         "Failures are retried with exponential backoff."),
    *fig("3.3 Report lifecycle", "lifecycle", 16, "Figure 8. States of a pothole report",
         "The main path has nine states from NEW to RESOLVED. A report can be rejected or marked duplicate early on. A "
         "contractor can decline, which sends the report back to triage. If the city is not happy with the repair, it "
         "goes to REPAIR_REJECTED and the contractor must redo it. Only the city can resolve a report."),
    H1("4. Interaction (Sequence) Diagrams"),
    *fig("4.1 From detection to the dashboard", "seq_report", 16, "Figure 9. Detection, storage, upload and display",
         "The detector and the controller run on the phone. The report is stored locally before any network call. "
         "The sync worker merges it on the server, marks the local row as synced, and the dashboard updates through "
         "its live listener without a refresh."),
    *fig("4.2 Username login", "seq_auth", 15, "Figure 10. Signing in with a username",
         "Firebase has no username login, so a Cloud Function maps the username to the account, checks the password "
         "and returns a custom token. The client then reads the user's role from the database and opens the right "
         "dashboard."),
    *fig("4.3 Live companion session", "seq_companion", 15, "Figure 11. Sharing a scanning session",
         "The scanner creates a session and gets a 6-character code. A companion joins with the code and receives the "
         "scanner's position and each new detection in real time. No video is shared."),
    H1("5. Structure"),
    *fig("5.1 Main Android classes", "classes", 16, "Figure 12. Class diagram of the detection and reporting path",
         "`DetectionController` is the centre: it uses `PotholeDetector` for inference, `LocalPotholeWarningManager` "
         "for warnings, and `ReportSubmitter` to save reports. `SyncWorker` uploads through "
         "`SmartPotholeDeduplicator`."),
    *fig("5.2 Data model", "er", 16, "Figure 13. Firebase nodes and the local Room table",
         "A user files many reports; a report is confirmed by many detections and has many history entries; a "
         "contractor is assigned many reports. The Room table holds reports on the phone until they are uploaded."),
    H1("6. Project Management"),
    *fig("6.1 Timeline", "gantt", 16, "Figure 14. Gantt chart over the semester",
         "Design work came first, then the Android app and backend were built in parallel, followed by the web "
         "dashboard, extra features, testing and documentation."),
    *fig("6.2 Git workflow", "git_flow", 14, "Figure 15. How code reached the main branch",
         "Each member works on a fork or a feature branch and opens a pull request into the team repository. The main "
         "branch always holds a working version."),
]

if __name__ == "__main__":
    build("04_Diagrams_and_Workflows", cover, B, "Diagrams and Workflows")
