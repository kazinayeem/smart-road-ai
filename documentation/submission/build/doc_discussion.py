from render import *  # noqa

cover = {
    "kind": "Group Discussion Document",
    "title": "SmartPothole: Record of Group Discussions",
    "subtitle": "What we discussed, the options we compared, what we decided and why",
    "fields": cover_fields(),
}

DATE = "22/11/2026"


def session(n, title, agenda, points, options, decision, actions):
    out = ([PB()] if n > 1 else []) + [H1(f"Topic {n}: {title}"),
           TABLE(["Date", "Attendees", "Led by"], [[DATE, "Mohammad Ali Nayeem, Mubashir Alam, Nayem Miah", "Mohammad Ali Nayeem"]], [1, 3, 1.6]),
           H3("Agenda"), UL(*agenda), H3("Discussion")]
    out += [P(p) for p in points]
    if options:
        out += [H3("Options compared"), TABLE(["Option", "For", "Against"], options, [1.3, 2, 2])]
    out += [H3("Decision"), NOTE(decision), H3("Work carried out"), TABLE(["Task", "Done by", "When"], actions, [3.5, 1.6, 0.8])]
    return out


B = [
    H1("Purpose of this Document"),
    P("This document records the group discussion held on **22/11/2026**. In the meeting, the team lead, Mohammad Ali "
      "Nayeem, walked the group through the eight key decisions he made while building SmartPothole. For each topic it "
      "notes the points raised, the options compared, the decision, and the work that followed. It shows how the "
      "design took shape and why each choice was made."),
    H2("Group members"),
    TABLE(["Role", "Name", "ID", "Responsibility"], [[("Team Lead" if i == 0 else "Member"), n, i_d, r] for i, (n, i_d, r) in enumerate(TEAM)],
          [1, 1.8, 1.2, 3]),
    NOTE("**Who did the work.** Mohammad Ali Nayeem designed and built the whole system alone: the AI/ML model work, "
         "the Android app, the web frontend, the Firebase backend, testing, deployment, and all documents and slides. "
         "Mubashir Alam and Nayem Miah attended the group discussion only and did no development or documentation work."),
    PB(),

    *session(1, "Choosing the problem",
             ["Pick a project idea that solves a local problem", "Check that it fits one semester"],
             ["We listed three ideas: a bus-tracking app, a waste-collection reporter and a pothole detector. We picked "
              "potholes because the problem is visible every day on Dhaka roads, and because it combines a mobile app, "
              "AI and a web system, which covers what the course expects.",
              "We were worried that \"pothole detection\" alone is just a model demo. So we agreed the real goal is the "
              "whole path: detect, report, assign, repair and verify."],
             [["Bus tracking", "Simple, clear users", "Needs GPS hardware on buses; many existing apps"],
              ["Waste reporter", "Easy to build", "Mostly forms; little technical depth"],
              ["Pothole detector", "Real local problem; AI + mobile + web", "Model accuracy is a risk"]],
             "Build SmartPothole: AI detection on the phone plus a repair-management workflow for the City Corporation.",
             [["Write the first problem statement and objectives", "Mohammad Ali Nayeem", "Week 1"],
              ["Search for a public pothole dataset or pretrained model", "Mohammad Ali Nayeem", "Week 1"]]),

    *session(2, "Where should the AI run?",
             ["Phone vs. server inference", "Privacy and data cost"],
             ["Sending video to a server would make the model easy to update, but a 10-minute ride would upload hundreds "
              "of megabytes, and the video would show people and number plates. Running on the phone is harder but "
              "costs nothing per report and keeps the video private.",
              "We tested a YOLOv8s checkpoint. The ONNX FP32 file was 42.67 MB, too big for an APK. INT8 quantisation "
              "brought it to 10.96 MB."],
             [["Server inference", "Easy updates, any model size", "Upload cost, privacy problems, needs internet"],
              ["On-device (ONNX INT8)", "Offline, private, free per report", "Smaller model, slower on old phones"]],
             "Run YOLOv8s INT8 on the phone with ONNX Runtime. Never upload images; send metadata only.",
             [["Export to ONNX and quantise; benchmark the formats", "Mohammad Ali Nayeem", "Week 4"],
              ["Write the privacy rule into the SRS", "Mohammad Ali Nayeem", "Week 3"]]),

    *session(3, "Backend: custom server or Firebase?",
             ["Choose the backend", "How to enforce roles"],
             ["A Node/Express server with PostgreSQL would give us full control, but we would also have to host it and "
              "write the real-time updates ourselves. Firebase Realtime Database gives live listeners and "
              "authentication out of the box.",
              "The risk with Firebase is that the client talks to the database directly, so security depends entirely on "
              "the rules. We agreed to write the rules first and test them with the emulator before building screens."],
             [["Express + PostgreSQL", "Full control, SQL", "Hosting, more code, no live updates by default"],
              ["Firebase RTDB", "Live sync, auth, free tier", "All security must be in rules"]],
             "Use Firebase (Auth, Realtime Database, one Cloud Function). Treat database.rules.json as the real "
             "security layer and cover it with automated tests.",
             [["Draft the database structure", "Mohammad Ali Nayeem", "Week 5"],
              ["Write the rules and the first rule tests", "Mohammad Ali Nayeem", "Week 8"]]),

    *session(4, "Too many false and repeated reports",
             ["Review the first road test", "Reduce noise"],
             ["In the first test the app reported the same pothole many times while it stayed in view, and a few dark "
              "shadows were reported as potholes. We also found that some reports were filed at a fixed default "
              "location when the GPS had no fix, which is worse than no report.",
              "We discussed raising the threshold alone, but that also drops real potholes. Combining several small "
              "checks worked better."],
             None,
             "Add a 2-of-3 frame confirmation, a 0.55 report threshold, a 3.5 s cooldown, a 10 m / 60 s same-spot gate, "
             "and refuse to report without a fresh GPS fix (≤ 30 s, ≤ 50 m). Show \"not reported\" to the rider "
             "instead of guessing a location.",
             [["Implement the gates in DetectionController", "Mohammad Ali Nayeem", "Week 7"],
              ["Remove the hard-coded fallback location from web and app", "Mohammad Ali Nayeem", "Week 7"]]),

    *session(5, "Working without internet",
             ["What happens on roads with no signal", "Avoid losing or double-counting reports"],
             ["Mobile data drops often on highways and in some parts of the city. If a report is sent directly to "
              "Firebase, it is lost when the network is down.",
              "We agreed on an outbox: save locally first, upload later. To make retries safe, each report gets a UUID "
              "on the phone that becomes its detection ID on the server, so the same report is never counted twice."],
             None,
             "Room database as an outbox, WorkManager for background upload with exponential backoff, and the "
             "client UUID as an idempotency key.",
             [["ReportSubmitter, SyncWorker, Room migration", "Mohammad Ali Nayeem", "Week 9"],
              ["Airplane-mode test case", "Mohammad Ali Nayeem", "Week 9"]]),

    *session(6, "Merging reports from many riders",
             ["One pothole, many reports", "Choosing the match distance"],
             ["When several riders pass the same pothole, the city should see one report with a count, not a list of "
              "copies. The question was how far apart two detections can be and still be the same pothole.",
              "A fixed 20 m radius merged two different potholes close together. Using the GPS accuracy as the radius "
              "made sense, but bad GPS (100 m) would merge a whole street. We settled on the accuracy clamped between "
              "10 m and 25 m. Each detection is still kept separately for evidence."],
             [["Fixed 20 m", "Simple", "Merges close but different potholes"],
              ["GPS accuracy", "Adapts to signal", "Bad GPS merges too much"],
              ["Accuracy clamped 10–25 m", "Adapts but bounded", "Slightly more code"]],
             "Match radius = clamp(GPS accuracy, 10 m, 25 m). Keep reports/ as the single record and detections/ as "
             "append-only evidence. Ignore resolved, rejected and duplicate reports when matching.",
             [["SmartPotholeDeduplicator with latitude-band query", "Mohammad Ali Nayeem", "Week 10"],
              ["Show \"Seen N times\" in the city table", "Mohammad Ali Nayeem", "Week 10"]]),

    *session(7, "Roles and the repair lifecycle",
             ["Who can change what", "When is a repair finished"],
             ["We first had contractors mark their own jobs as resolved. We changed this after discussing it: the person "
              "who does the work should not be the one who approves it. Contractors now submit the repair, and only the "
              "City Corporation can close it or send it back.",
              "During testing we also found that a user could write their own role in the database and become an admin. "
              "The rules were rewritten so new accounts are always CITIZEN and only an admin can change a role."],
             None,
             "Nine-stage lifecycle with decline and rework branches. Only CITY_CORPORATION can resolve. Every status "
             "change is written to an append-only activity log. Roles are read from the database only.",
             [["Rewrite rules; add the 17 rule tests", "Mohammad Ali Nayeem", "Week 11"],
              ["City and contractor dashboards", "Mohammad Ali Nayeem", "Week 11"]]),

    *session(8, "Extra features and final testing",
             ["Which extra features are worth the time", "Plan testing and documentation"],
             ["We considered live video sharing for the companion mode but dropped it for the same privacy and data "
              "reasons as before; companions get position and detections only. Route planning with a hazard count and "
              "a split camera/map screen were cheap to add and useful in the road tests.",
              "We agreed the remaining time should go into testing on real roads and into honest documentation of what "
              "is not done yet, mainly evaluation of the model on local data."],
             None,
             "Keep live companion (no video), route planning and split mode. Freeze features two weeks before "
             "submission; spend the rest on testing, the SRS, diagrams and slides.",
             [["Road tests and screenshots", "Mohammad Ali Nayeem", "Week 13"],
              ["SRS, proposal, code and diagram documents", "Mohammad Ali Nayeem", "Week 14"],
              ["Presentation slides and rehearsal", "Mohammad Ali Nayeem", "Week 14"]]),

    H1("Summary of Decisions"),
    TABLE(["#", "Topic", "Decision"], [
        ["1", "Project", "SmartPothole: detection plus repair workflow"],
        ["2", "AI location", "On the phone, YOLOv8s INT8 via ONNX Runtime; no image upload"],
        ["3", "Backend", "Firebase; security enforced in tested rules"],
        ["4", "Noise", "2-of-3 frames, 0.55 threshold, cooldown, same-spot gate, fresh GPS only"],
        ["5", "Offline", "Room outbox + WorkManager; UUID as idempotency key"],
        ["6", "Duplicates", "Merge radius clamp(accuracy, 10 m, 25 m); detections kept as evidence"],
        ["7", "Governance", "Only the city resolves; append-only history; roles from database"],
        ["8", "Scope", "Companion without video, routes, split mode; then test and document"],
    ], [0.4, 1.3, 4.5]),
    H1("What We Learned"),
    UL("Running AI on the phone is very practical once the model is quantised, and it removes most privacy concerns.",
       "Many small checks (frames, cooldown, distance, GPS) beat a single high threshold.",
       "With Firebase, the security rules are the backend. Testing them early found two serious bugs.",
       "Designing for no network from the start was much easier than adding it later.",
       "Being clear about what is not finished (model evaluation on local roads) is better than overstating results."),
    NOTE(f"**Result of these discussions.** Source code: {GITHUB_URL}  ·  Live dashboard and Android APK: {LIVE_URL}  "
         f"·  Video overview: {VIDEO_URL}"),
    SIGN("Mohammad Ali Nayeem", "Mubashir Alam", "Nayem Miah", "Dipta Dipayan Kar"),
]

if __name__ == "__main__":
    build("05_Group_Discussion", cover, B, "Group Discussion")
