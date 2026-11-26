"""Draws every diagram used in the submission documents (PNG, 220 dpi) with matplotlib."""
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Ellipse, Rectangle, Polygon

from render import ASSETS

os.makedirs(ASSETS, exist_ok=True)
plt.rcParams["font.family"] = ["Helvetica", "Arial", "DejaVu Sans"]

NAVY, BLUE, TEAL, ORANGE, GREEN, RED, GREY, PURPLE = (
    "#0B1B33", "#1F5F8B", "#0E7490", "#C2410C", "#15803D", "#B91C1C", "#64748B", "#6D28D9")
FILL = {"navy": "#E6ECF5", "blue": "#E3EEF8", "teal": "#E1F4F7", "orange": "#FDEEE3", "green": "#E4F4E9",
        "red": "#FBE6E6", "grey": "#EEF1F4", "purple": "#EFE8FB", "white": "#FFFFFF"}
EDGE = {"navy": NAVY, "blue": BLUE, "teal": TEAL, "orange": ORANGE, "green": GREEN, "red": RED, "grey": GREY,
        "purple": PURPLE, "white": GREY}


class D:
    def __init__(self, w, h, name):
        self.fig, self.ax = plt.subplots(figsize=(w, h))
        self.ax.set_xlim(0, w * 10)
        self.ax.set_ylim(0, h * 10)
        self.ax.axis("off")
        self.name = name
        self.h = h * 10

    def y(self, v):  # top-down coordinates are easier to reason about
        return self.h - v

    def box(self, x, y, w, h, text, c="blue", fs=8.5, bold=False, solid=False, r=1.2, ls="-"):
        fc = EDGE[c] if solid else FILL[c]
        self.ax.add_patch(FancyBboxPatch((x, self.y(y + h)), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                                         fc=fc, ec=EDGE[c], lw=1.2, ls=ls))
        self.ax.text(x + w / 2, self.y(y + h / 2), text, ha="center", va="center", fontsize=fs,
                     color="white" if solid else "#1d2430", fontweight="bold" if bold else "normal", linespacing=1.3)
        return (x, y, w, h)

    def group(self, x, y, w, h, title, c="grey"):
        self.ax.add_patch(FancyBboxPatch((x, self.y(y + h)), w, h, boxstyle="round,pad=0,rounding_size=2",
                                         fc=FILL[c], ec=EDGE[c], lw=1, alpha=.55))
        self.ax.text(x + 1.5, self.y(y + 2.3), title, fontsize=9.5, fontweight="bold", color=EDGE[c], va="center")

    def diamond(self, cx, cy, w, h, text, fs=8):
        pts = [(cx, self.y(cy - h / 2)), (cx + w / 2, self.y(cy)), (cx, self.y(cy + h / 2)), (cx - w / 2, self.y(cy))]
        self.ax.add_patch(Polygon(pts, closed=True, fc=FILL["orange"], ec=ORANGE, lw=1.2))
        self.ax.text(cx, self.y(cy), text, ha="center", va="center", fontsize=fs, linespacing=1.2)

    def oval(self, cx, cy, w, h, text, c="blue", fs=8):
        self.ax.add_patch(Ellipse((cx, self.y(cy)), w, h, fc=FILL[c], ec=EDGE[c], lw=1.2))
        self.ax.text(cx, self.y(cy), text, ha="center", va="center", fontsize=fs, linespacing=1.2)

    def term(self, cx, cy, text, c="navy", w=16, h=4.4):
        self.box(cx - w / 2, cy - h / 2, w, h, text, c=c, solid=True, bold=True, r=2.2, fs=8.5)

    def arrow(self, p1, p2, label="", c="#475569", fs=7.5, style="-|>", ls="-", rad=0.0, lpos=0.5, loff=(0, 1.2)):
        a = FancyArrowPatch((p1[0], self.y(p1[1])), (p2[0], self.y(p2[1])), arrowstyle=style, mutation_scale=11,
                            color=c, lw=1.1, ls=ls, connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0)
        self.ax.add_patch(a)
        if label:
            mx = p1[0] + (p2[0] - p1[0]) * lpos + loff[0]
            my = p1[1] + (p2[1] - p1[1]) * lpos - loff[1]
            self.ax.text(mx, self.y(my), label, ha="center", va="center", fontsize=fs, color="#334155",
                         bbox=dict(fc="white", ec="none", pad=0.6))

    def poly(self, pts, label="", c="#475569", lpos=None, fs=7.5):
        for a, b in zip(pts[:-2], pts[1:-1]):
            self.ax.plot([a[0], b[0]], [self.y(a[1]), self.y(b[1])], color=c, lw=1.1)
        self.arrow(pts[-2], pts[-1], c=c)
        if label:
            x, y = lpos
            self.ax.text(x, self.y(y), label, ha="center", va="center", fontsize=fs, color="#334155",
                         bbox=dict(fc="white", ec="none", pad=0.6))

    def text(self, x, y, t, fs=8, c="#1d2430", bold=False, ha="center"):
        self.ax.text(x, self.y(y), t, fontsize=fs, color=c, ha=ha, va="center", fontweight="bold" if bold else "normal",
                     linespacing=1.3)

    def actor(self, cx, cy, name):
        y = self.y(cy)
        self.ax.add_patch(Ellipse((cx, y + 3.2), 2.2, 2.2, fc="white", ec=NAVY, lw=1.3))
        self.ax.plot([cx, cx], [y + 2.1, y - 1.2], color=NAVY, lw=1.3)
        self.ax.plot([cx - 2, cx + 2], [y + 1, y + 1], color=NAVY, lw=1.3)
        self.ax.plot([cx, cx - 1.6], [y - 1.2, y - 3.6], color=NAVY, lw=1.3)
        self.ax.plot([cx, cx + 1.6], [y - 1.2, y - 3.6], color=NAVY, lw=1.3)
        self.ax.text(cx, y - 5.2, name, ha="center", va="center", fontsize=8.5, fontweight="bold", color=NAVY)

    def save(self):
        p = os.path.join(ASSETS, self.name + ".png")
        self.fig.savefig(p, dpi=220, bbox_inches="tight", pad_inches=0.08, facecolor="white")
        plt.close(self.fig)
        return p


def mid(b, side):
    x, y, w, h = b
    return {"t": (x + w / 2, y), "b": (x + w / 2, y + h), "l": (x, y + h / 2), "r": (x + w, y + h / 2)}[side]


# ---------------------------------------------------------------- 1. architecture
def architecture():
    d = D(11, 6.6, "architecture")
    d.group(1, 1, 33, 64, "Android app (rider)", "teal")
    d.group(39, 1, 32, 64, "Firebase backend (no custom server)", "orange")
    d.group(76, 1, 33, 64, "Web dashboard (Next.js)", "blue")
    a = [d.box(3, 7, 29, 6, "CameraX preview + ImageAnalysis", "teal"),
         d.box(3, 15, 29, 6, "YOLOv8s INT8 model (ONNX Runtime)", "teal", solid=True, bold=True),
         d.box(3, 23, 29, 6, "2-of-3 frame confirm, gates, severity", "teal"),
         d.box(3, 31, 29, 6, "Voice + vibration warning (offline)", "teal"),
         d.box(3, 39, 29, 6, "Room outbox (SQLite)", "teal"),
         d.box(3, 47, 29, 6, "WorkManager SyncWorker", "teal"),
         d.box(3, 55, 29, 7, "Map (MapLibre / OSM), routes,\nlive companion", "teal")]
    f = [d.box(41, 7, 28, 6, "Firebase Authentication", "orange"),
         d.box(41, 16, 28, 25, "Realtime Database\n\nreports/   detections/\nusers/   activity_logs/\nlive_sessions/   session_codes/",
               "orange", solid=True, fs=8.3),
         d.box(41, 44, 28, 7, "Security rules\n(role checks, validation)", "orange"),
         d.box(41, 54, 28, 8, "Cloud Function: username login\n+ FCM push messages", "orange")]
    w = [d.box(78, 7, 29, 6, "Login, register, role guard", "blue"),
         d.box(78, 15, 29, 6, "City Corporation desk", "blue", solid=True, bold=True),
         d.box(78, 23, 29, 6, "Contractor job portal", "blue"),
         d.box(78, 31, 29, 6, "Citizen map and reports", "blue"),
         d.box(78, 39, 29, 9, "Leaflet + OpenStreetMap\nstatus-coloured markers", "blue"),
         d.box(78, 51, 29, 11, "Report detail: assign,\ndeadline, verify, close,\naudit trail", "blue")]
    for i in range(5):
        d.arrow(mid(a[i], "b"), mid(a[i + 1], "t"))
    d.arrow(mid(a[5], "r"), (41, 30), "JSON metadata only\n(no images)", c=ORANGE, lpos=.45, loff=(0, 0))
    d.arrow((69, 22), (78, 18), "real-time\nlisteners", lpos=.5, loff=(0, 2.8))
    d.arrow((78, 27), (69, 33), "status updates", lpos=.5, loff=(0, -2.2))
    d.arrow((41, 58), mid(a[6], "r"), "push alerts", c=GREY, ls="--", lpos=.5, loff=(0, 1.5))
    return d.save()


# ---------------------------------------------------------------- 2. use case
def usecase():
    d = D(11, 7.4, "usecase")
    d.ax.add_patch(Rectangle((22, d.y(72)), 66, 70, fc="#FBFCFE", ec=NAVY, lw=1.2))
    d.text(55, 4.5, "SmartPothole system", fs=10, bold=True, c=NAVY)
    d.actor(9, 22, "Rider / Citizen")
    d.actor(101, 18, "City Corporation")
    d.actor(101, 52, "Contractor")
    d.actor(9, 58, "Companion user")
    uc_left = [("Register / sign in", 10), ("Start live detection", 17), ("Receive pothole warning", 24),
               ("Mark pothole manually", 31), ("View map and own reports", 38), ("Plan route with hazards", 45),
               ("Start companion session", 52), ("Join session and follow", 61)]
    uc_right = [("Review and verify report", 10), ("Assign contractor + deadline", 17), ("Reject / mark duplicate", 24),
                ("Inspect repair and close", 31), ("Accept / decline job", 45), ("Update repair progress", 52),
                ("Submit repair for checking", 59)]
    for t, yy in uc_left:
        d.oval(39.5, yy, 28, 5.2, t)
    for t, yy in uc_right:
        d.oval(70.5, yy, 28, 5.2, t, c="orange" if yy < 40 else "green")
    for _, yy in uc_left[:7]:
        d.arrow((12, 22), (25, yy), style="-", c="#94A3B8")
    d.arrow((12, 58), (25, 61), style="-", c="#94A3B8")
    for _, yy in uc_right[:4]:
        d.arrow((98, 18), (85, yy), style="-", c="#94A3B8")
    for _, yy in uc_right[4:]:
        d.arrow((98, 52), (85, yy), style="-", c="#94A3B8")
    d.oval(55, 68, 26, 4.6, "View audit trail", c="grey")
    d.arrow((98, 20), (68, 68), style="-", c="#CBD5E1", ls="--")
    d.arrow((40, 19.6), (40, 21.4), style="-|>", c=GREY)
    d.text(46, 20.5, "«include»", fs=6.5, c=GREY)
    return d.save()


# ---------------------------------------------------------------- 3. DFD level 0
def dfd0():
    d = D(10, 5, "dfd0")
    d.ax.add_patch(Ellipse((50, d.y(25)), 26, 18, fc=FILL["navy"], ec=NAVY, lw=1.5))
    d.text(50, 25, "0\nSmartPothole\nSystem", fs=10, bold=True, c=NAVY)
    r = d.box(2, 4, 20, 8, "Rider / Citizen", "teal", bold=True, r=0.2)
    c = d.box(78, 4, 20, 8, "City Corporation", "orange", bold=True, r=0.2)
    k = d.box(78, 38, 20, 8, "Contractor", "green", bold=True, r=0.2)
    m = d.box(2, 38, 20, 8, "Companion user", "purple", bold=True, r=0.2)
    d.arrow((22, 8), (39, 19), "detections (GPS, confidence,\ntime), manual marks", lpos=.5, loff=(-1, 2))
    d.arrow((38, 23), (22, 11), "warnings, map,\nreport status", lpos=.45, loff=(-3, -2.5))
    d.arrow((78, 8), (61, 19), "verification, assignment,\nclosure decisions", lpos=.5, loff=(1, 2))
    d.arrow((62, 23), (78, 11), "de-duplicated\nreport queue", lpos=.45, loff=(3, -2.5))
    d.arrow((78, 42), (61, 30), "progress, repair\nsubmission", lpos=.5, loff=(2, -1))
    d.arrow((62, 33), (78, 45), "assigned jobs", lpos=.5, loff=(1, -2))
    d.arrow((39, 30), (22, 42), "live position,\ndetection stream", lpos=.35, loff=(-6, 0))
    d.arrow((22, 45), (39, 33), "join code", lpos=.6, loff=(3, -1.5))
    return d.save()


# ---------------------------------------------------------------- 4. DFD level 1
def dfd1():
    d = D(11, 6.6, "dfd1")

    def proc(x, y, n, t):
        d.box(x, y, 21, 10, f"{n}\n{t}", "navy", r=3, fs=8)
        return (x, y, 21, 10)

    def store(x, y, t):
        d.ax.plot([x, x + 22], [d.y(y), d.y(y)], color=NAVY, lw=1.2)
        d.ax.plot([x, x + 22], [d.y(y + 5), d.y(y + 5)], color=NAVY, lw=1.2)
        d.ax.plot([x, x], [d.y(y), d.y(y + 5)], color=NAVY, lw=1.2)
        d.text(x + 11.5, y + 2.5, t, fs=7.8)
        return (x, y, 22, 5)

    rider = d.box(1, 5, 15, 7, "Rider", "teal", bold=True, r=.2)
    city = d.box(93, 20, 16, 7, "City Corp.", "orange", bold=True, r=.2)
    con = d.box(93, 54, 16, 7, "Contractor", "green", bold=True, r=.2)
    p1 = proc(22, 3, "1.0", "Detect &\nconfirm pothole")
    p2 = proc(50, 3, "2.0", "Queue report\noffline")
    p3 = proc(50, 24, "3.0", "Sync & merge\nduplicates")
    p4 = proc(20, 46, "4.0", "Warn rider /\nnearby alerts")
    p5 = proc(76, 36, "5.0", "Manage repair\nlifecycle")
    s1 = store(80, 6, "D1  Room outbox")
    s2 = store(49, 42, "D2  reports/")
    s3 = store(20, 27, "D3  detections/")
    s4 = store(66, 58, "D4  activity_logs/")
    d.arrow(mid(rider, "r"), mid(p1, "l"), "camera\nframes", lpos=.5, loff=(0, 3.2))
    d.arrow(mid(p1, "r"), mid(p2, "l"), "confirmed\ndetection", lpos=.5, loff=(0, 3.2))
    d.arrow(mid(p2, "r"), (80, 8.5), "row PENDING", lpos=.5, loff=(0, 2.2))
    d.arrow((91, 11), (71, 26), "pending rows", lpos=.5, loff=(5, 0))
    d.arrow(mid(p3, "l"), (42, 29.5), "detection", lpos=.5, loff=(0, 1.6))
    d.arrow(mid(p3, "b"), (60.5, 42), "new / updated\nreport", lpos=.5, loff=(-6.5, 0))
    d.arrow((49, 44.5), (41, 49), "nearby active\nreports", lpos=.5, loff=(0, -3))
    d.arrow(mid(p4, "l"), (8, 12), "voice, vibration,\nbanner", lpos=.5, loff=(-4, 0))
    d.arrow((71, 44.5), (76, 42), "status", style="<|-|>", lpos=.5, loff=(-1, 2.2))
    d.arrow(mid(city, "b"), (92, 36), "decisions", lpos=.5, loff=(4.5, 0))
    d.arrow((92, 46), mid(con, "t"), "jobs /\nprogress", style="<|-|>", lpos=.5, loff=(-5, 0))
    d.arrow((82, 46), (78, 58), "every status\nchange", lpos=.5, loff=(-6, 0))
    return d.save()


# ---------------------------------------------------------------- 5. detection activity flow
def detection_flow():
    d = D(9, 11.6, "detection_flow")
    cx = 33
    d.term(cx, 3, "Camera frame (640x480)", w=24)
    b1 = d.box(cx - 15, 8, 30, 6, "Rotate to upright, resize to 640x640,\nnormalise -> tensor [1,3,640,640]", "teal")
    b2 = d.box(cx - 15, 17, 30, 6, "YOLOv8s INT8 inference\noutput [1,5,8400]", "teal", solid=True, bold=True)
    b3 = d.box(cx - 15, 26, 30, 6, "Keep boxes with conf >= 0.25,\nNMS (IoU 0.45), severity from area", "teal")
    d.diamond(cx, 39, 30, 8, "best conf >= 0.55 in\n2 of last 3 frames?")
    b4 = d.box(cx - 15, 48, 30, 6, "Instant warning: banner,\nvoice, vibration (2.8 s cooldown)", "orange")
    d.diamond(cx, 61, 30, 8, "3.5 s since last report and\nnot same spot (10 m / 60 s)?")
    d.diamond(cx, 74, 30, 8, "Fresh GPS fix?\n(<= 30 s old, <= 50 m)")
    b5 = d.box(cx - 15, 83, 30, 6, "Save row in Room outbox\n(syncStatus = PENDING)", "green")
    b6 = d.box(cx - 15, 92, 30, 6, "Enqueue unique WorkManager job\n(needs network, exp. backoff)", "green")
    d.term(cx, 103, "Report queued", c="green")
    d.arrow((cx, 5.2), (cx, 8))
    for a, b in ((b1, b2), (b2, b3)):
        d.arrow(mid(a, "b"), mid(b, "t"))
    d.arrow(mid(b3, "b"), (cx, 35))
    d.arrow((cx, 43), mid(b4, "t"), "yes", lpos=.4, loff=(3, 0))
    d.arrow(mid(b4, "b"), (cx, 57))
    d.arrow((cx, 65), (cx, 70), "yes", lpos=.4, loff=(3, 0))
    d.arrow((cx, 78), mid(b5, "t"), "yes", lpos=.4, loff=(3, 0))
    d.arrow(mid(b5, "b"), mid(b6, "t"))
    d.arrow(mid(b6, "b"), (cx, 100.8))
    nx = 72
    n1 = d.box(nx - 11, 36, 22, 6, "Next frame", "grey")
    n2 = d.box(nx - 11, 58, 22, 6, "Skip (already reported)", "grey")
    n3 = d.box(nx - 11, 71, 22, 6, "Show \"not reported:\nwaiting for GPS\"", "red")
    d.arrow((cx + 15, 39), mid(n1, "l"), "no", lpos=.4, loff=(0, 1.3))
    d.arrow((cx + 15, 61), mid(n2, "l"), "no", lpos=.4, loff=(0, 1.3))
    d.arrow((cx + 15, 74), mid(n3, "l"), "no", lpos=.4, loff=(0, 1.3))
    d.poly([(nx, 36), (nx, 3), (cx + 8, 3)], c=GREY)
    return d.save()


# ---------------------------------------------------------------- 6. report lifecycle (state machine)
def lifecycle():
    d = D(11.6, 5.8, "lifecycle")
    d.ax.set_xlim(-8, 108)
    states = [("NEW", 6, 10, "red"), ("UNDER_REVIEW", 25, 10, "orange"), ("VERIFIED", 44, 10, "orange"),
              ("ASSIGNED", 63, 10, "blue"), ("ACCEPTED", 82, 10, "blue"), ("IN_PROGRESS", 99, 10, "teal"),
              ("REPAIR_SUBMITTED", 99, 30, "purple"), ("CITY_VERIFICATION", 78, 30, "purple"),
              ("RESOLVED", 53, 30, "green")]
    pos = {}
    for n, x, y, c in states:
        d.box(x - 8.5, y - 3, 17, 6, n, c, fs=7.4, bold=True, r=2.5)
        pos[n] = (x, y)
    d.ax.add_patch(Ellipse((-5, d.y(10)), 2.2, 2.2, fc=NAVY))
    d.arrow((-3.9, 10), (-2.5, 10))
    seq = ["NEW", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"]
    labels = ["city opens", "city verifies", "assign +\ndeadline", "contractor\naccepts", "work\nstarts"]
    for (a, b), l in zip(zip(seq, seq[1:]), labels):
        d.arrow((pos[a][0] + 8.5, 10), (pos[b][0] - 8.5, 10), l, lpos=.5, loff=(0, 4.4), fs=6.6)
    d.arrow((99, 13), (99, 27), "submit\nrepair", lpos=.5, loff=(5, 0), fs=6.6)
    d.arrow((90.5, 30), (86.5, 30))
    d.text(88.5, 25.5, "inspect", fs=6.6, c="#334155")
    d.arrow((69.5, 30), (61.5, 30))
    d.text(65.5, 25.5, "approve", fs=6.6, c="#334155")
    d.arrow((53, 33), (53, 38.2))
    d.ax.add_patch(Ellipse((53, d.y(40)), 3, 3, fc="white", ec=NAVY, lw=1.3))
    d.ax.add_patch(Ellipse((53, d.y(40)), 1.6, 1.6, fc=NAVY))
    d.box(-3, 40, 20, 6, "REJECTED / DUPLICATE", "grey", fs=7.2, bold=True, r=2.5)
    d.poly([(4, 13), (4, 40)], c=GREY)
    d.text(10, 24, "city rejects\nor duplicate", fs=6.6, c="#334155")
    d.box(56, 46, 21, 6, "ASSIGNMENT_DECLINED", "red", fs=7.2, bold=True, r=2.5)
    d.poly([(65.5, 13), (65.5, 46)], c=RED)
    d.text(73, 19, "contractor declines", fs=6.6, c=RED)
    d.poly([(56, 49), (40, 49), (40, 13)], c=GREY)
    d.text(33, 46, "back to triage", fs=6.6, c="#334155")
    d.box(86, 44, 19, 6, "REPAIR_REJECTED", "red", fs=7.2, bold=True, r=2.5)
    d.poly([(78, 33), (78, 47), (86, 47)], c=RED)
    d.text(83, 39, "work not\naccepted", fs=6.6, c=RED)
    d.poly([(101, 44), (101, 33)], c=RED)
    d.text(105, 39, "rework", fs=6.6, c=RED)
    d.text(50, 56, "Only the City Corporation can move a report to RESOLVED. Every transition is written to activity_logs/{reportId}.",
           fs=7.4, c=GREY)
    return d.save()


# ---------------------------------------------------------------- 7. sequence diagram helper
def sequence(name, parts, msgs, w=11, h=7, notes=()):
    need = 12 + sum(6.2 if m[0] == m[1] else 5.4 for m in msgs) + 3
    h = max(h, need / 10)
    d = D(w, h, name)
    n = len(parts)
    xs = [10 + i * (w * 10 - 20) / (n - 1) for i in range(n)]
    bottom = h * 10 - 2
    for x, (p, c) in zip(xs, parts):
        d.box(x - 8, 1, 16, 6, p, c, fs=7.8, bold=True, r=.6)
        d.ax.plot([x, x], [d.y(7), d.y(bottom)], color="#94A3B8", lw=1, ls=(0, (4, 3)))
    y = 12
    for m in msgs:
        a, b, t = m[:3]
        dashed = len(m) > 3 and m[3] == "r"
        if a == b:
            x = xs[a]
            d.poly([(x, y - 1), (x + 6, y - 1), (x + 6, y + 2), (x + .5, y + 2)], c="#334155")
            d.text(x + 7, y + .5, t, fs=7.2, ha="left")
            y += 6.2
            continue
        d.arrow((xs[a], y), (xs[b], y), c="#334155", ls="--" if dashed else "-")
        d.text((xs[a] + xs[b]) / 2, y - 1.5, t, fs=7.2)
        y += 5.4
    for (i, yy, t) in notes:
        d.box(xs[i] + 1.5, yy, 21, 5, t, "orange", fs=6.8, r=.3)
    return d.save()


def seq_report():
    return sequence("seq_report",
                    [("Camera\n(CameraX)", "teal"), ("Detection\nController", "teal"), ("PotholeDetector\n(ONNX)", "teal"),
                     ("ReportSubmitter\n+ Room", "green"), ("SyncWorker", "green"), ("Firebase RTDB", "orange"),
                     ("Web dashboard", "blue")],
                    [(0, 1, "analyze(frame)"), (1, 2, "detect(bitmap)"), (2, 1, "List<DetectionResult>", "r"),
                     (1, 1, "2-of-3 confirm, gates"), (1, 3, "submit(location, conf, severity)"),
                     (3, 3, "insert row PENDING"), (3, 4, "enqueueUniqueWork (network)"),
                     (4, 5, "query reports in latitude band"), (5, 4, "nearby active reports", "r"),
                     (4, 5, "create report OR increment totalDetections"), (4, 5, "write detections/{uuid}"),
                     (4, 3, "markSynced(uuid, reportId)"), (5, 6, "onValue(reports) push", "r")],
                    h=8.2)


def seq_companion():
    return sequence("seq_companion",
                    [("Scanner phone", "teal"), ("LiveSession\nManager", "teal"), ("Firebase RTDB", "orange"),
                     ("Companion phone", "purple")],
                    [(0, 1, "createSession()"), (1, 2, "multi-path write: live_sessions + session_codes"),
                     (2, 0, "6-char join code", "r"), (3, 2, "read session_codes/{code}"),
                     (3, 2, "add self to participants"), (0, 2, "location breadcrumb every few seconds"),
                     (0, 2, "broadcastDetection()"), (2, 3, "listener: position + detection", "r"),
                     (3, 3, "alert: new pothole / moved / offline"), (0, 2, "endSession()"),
                     (2, 3, "status = ENDED", "r")],
                    w=10, h=6.6)


def seq_auth():
    return sequence("seq_auth",
                    [("User (web)", "blue"), ("AuthScreen", "blue"), ("Cloud Function\nresolveUsernameLogin", "orange"),
                     ("Firebase Auth", "orange"), ("RTDB users/", "orange")],
                    [(0, 1, "username + password"), (1, 2, "callable(username, password)"),
                     (2, 2, "check lockout (5 fails / 15 min)"), (2, 4, "usernames/{name} -> uid -> email"),
                     (2, 3, "verify password (REST)"), (2, 1, "custom token  (or one generic error)", "r"),
                     (1, 3, "signInWithCustomToken"), (1, 4, "read users/{uid}/role"),
                     (1, 0, "redirect to /city, /contractor or /citizen", "r")],
                    w=10, h=5.8)


# ---------------------------------------------------------------- 8. ER / data model
def er():
    d = D(11, 7, "er")

    def ent(x, y, title, fields, c="blue", w=24):
        h = 4.5 + 2.9 * len(fields)
        d.ax.add_patch(Rectangle((x, d.y(y + h)), w, h, fc="white", ec=EDGE[c], lw=1.3))
        d.ax.add_patch(Rectangle((x, d.y(y + 4.5)), w, 4.5, fc=EDGE[c], ec=EDGE[c]))
        d.text(x + w / 2, y + 2.25, title, fs=8.6, bold=True, c="white")
        for i, f in enumerate(fields):
            d.text(x + 1.2, y + 6.3 + 2.9 * i, f, fs=7.3, ha="left",
                   c=NAVY if f.startswith(("PK", "FK")) else "#1d2430")
        return (x, y, w, h)

    u = ent(2, 3, "users/{uid}", ["PK uid", "name, email", "username", "role (CITIZEN | CITY_CORPORATION |", "        CONTRACTOR)",
                                   "vehicleType, phone", "fcmToken, createdAt"], "navy", w=26)
    r = ent(42, 3, "reports/{reportId}", ["PK reportId", "FK reporterId -> users", "FK contractorId -> users", "latitude, longitude, gpsAccuracy",
                                          "confidence, priority", "status (14 values)", "totalDetections", "first/lastDetectedAt",
                                          "deadline, notes, address", "createdAt, updatedAt"], "orange", w=27)
    de = ent(84, 3, "detections/{uuid}", ["PK detectionId (client UUID)", "FK potholeId -> reports", "FK reporterId -> users", "confidence, severity",
                                          "latitude, longitude", "gpsAccuracy, heading, speed", "sessionId, timestamp"], "teal")
    lg = ent(42, 44, "activity_logs/{reportId}/{id}", ["FK reportId -> reports", "previousStatus, newStatus", "FK changedByUid -> users",
                                                        "changedBy, remarks", "timestamp"], "grey", w=27)
    ls = ent(84, 37, "live_sessions/{id}", ["PK sessionId", "sessionCode", "FK scannerId -> users", "status, startedAt", "participants/{uid}",
                                            "location, detections/"], "purple")
    ro = ent(2, 34, "Room: pothole_reports", ["PK id (auto)", "clientUuid (unique)", "reporterId, reportId", "lat, lng, gpsAccuracy",
                                              "confidence, areaRatio", "priority, source", "syncStatus PENDING/SYNCED/FAILED", "createdAt"], "green", w=26)

    def rel(p1, p2, l1, l2, lab):
        d.arrow(p1, p2, style="-", c="#475569")
        d.text(p1[0] + (2 if p2[0] > p1[0] else -2), p1[1] - 1.4, l1, fs=7.5, bold=True)
        d.text(p2[0] + (-2 if p2[0] > p1[0] else 2), p2[1] - 1.4, l2, fs=7.5, bold=True)
        d.text((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 + 1.6, lab, fs=7, c=GREY)

    rel((28, 12), (42, 12), "1", "N", "files")
    rel((69, 12), (84, 12), "1", "N", "confirmed by")
    rel((55.5, 37.5), (55.5, 44), "1", "N", "")
    d.text(61, 40.7, "history", fs=7, c=GREY)
    rel((28, 28), (42, 28), "1", "N", "assigned (contractor)")
    rel((96, 26), (96, 37), "1", "N", "")
    d.text(101, 31.5, "streams", fs=7, c=GREY)
    d.arrow((15, 34), (15, 27.5), "uploads to", c=GREEN, ls="--", lpos=.5, loff=(5, 0))
    return d.save()


# ---------------------------------------------------------------- 9. Android class diagram
def classes():
    d = D(11, 7.3, "classes")

    def cls(x, y, name, attrs, methods, c="teal", w=26):
        h = 4.2 + 2.6 * (len(attrs) + len(methods)) + 1.4
        d.ax.add_patch(Rectangle((x, d.y(y + h)), w, h, fc="white", ec=EDGE[c], lw=1.2))
        d.ax.add_patch(Rectangle((x, d.y(y + 4.2)), w, 4.2, fc=FILL[c], ec=EDGE[c], lw=1.2))
        d.text(x + w / 2, y + 2.1, name, fs=8.2, bold=True, c=EDGE[c])
        yy = y + 6
        for a in attrs:
            d.text(x + 1, yy, a, fs=6.9, ha="left"); yy += 2.6
        d.ax.plot([x, x + w], [d.y(yy - 1.2), d.y(yy - 1.2)], color=EDGE[c], lw=.8)
        yy += .2
        for m in methods:
            d.text(x + 1, yy, m, fs=6.9, ha="left"); yy += 2.6
        return (x, y, w, h)

    dc = cls(40, 2, "DetectionController", ["- detector: PotholeDetector", "- recentFrames: ArrayDeque", "+ autoReport: Boolean"],
             ["+ startCamera()", "- analyze(ImageProxy)", "- handle(results, ...)", "+ report(result, time)", "+ release()"], w=28)
    pd = cls(2, 2, "PotholeDetector", ["- ortSession: OrtSession", "- confThreshold = 0.25", "- iouThreshold = 0.45"],
             ["+ detect(Bitmap): List", "- classifySeverity()", "- applyNms()", "+ close()"])
    wm = cls(82, 2, "LocalPotholeWarningManager", ["- tts: TextToSpeech", "+ audioEnabled: Boolean"],
             ["+ triggerInstantWarning()", "+ triggerNearbyWarning()", "+ shutdown()"], c="orange", w=27)
    rs = cls(40, 36, "ReportSubmitter  «object»", [], ["+ submit(ctx, loc, conf, ...): Result", "+ enqueueSync(ctx)"], c="green", w=28)
    sw = cls(2, 38, "SyncWorker", [], ["+ doWork(): Result"], c="green")
    dd = cls(2, 54, "SmartPotholeDeduplicator", [], ["+ submitDetection(det, name)", "+ findNearestActiveReport()",
                                                      "+ matchRadiusFor(acc)"], c="orange", w=27)
    db = cls(82, 36, "PotholeReportDao", [], ["+ insertReport(e)", "+ getPendingSyncReports()", "+ markSynced(uuid, id)"], c="grey", w=27)
    ls = cls(82, 56, "LiveSessionManager", [], ["+ createSession()", "+ joinSession(code)", "+ broadcastDetection()"], c="purple", w=27)
    d.arrow((40, 10), (28, 10), "uses", lpos=.5, loff=(0, 1.4))
    d.arrow((68, 10), (82, 10), "warnings", lpos=.5, loff=(0, 1.4))
    d.arrow((54, 28), (54, 36), "submits via", lpos=.5, loff=(5, 0))
    d.arrow((68, 40), (82, 40), "insert", lpos=.5, loff=(0, 1.4))
    d.arrow((40, 44), (28, 42), "enqueues", lpos=.5, loff=(0, 1.6))
    d.arrow((15, 45.5), (15, 54), "uploads via", lpos=.5, loff=(5, 0))
    d.poly([(90, 49.4), (90, 52), (22, 52), (22, 46.2)], "reads PENDING rows", c=GREY, lpos=(56, 52))
    d.arrow((68, 26), (82, 60), "broadcast (session)", c=PURPLE, ls="--", lpos=.55, loff=(-3, 0))
    return d.save()


# ---------------------------------------------------------------- 10. offline sync flow
def sync_flow():
    d = D(10, 6, "sync_flow")
    d.term(10, 5, "WorkManager\nstarts job", w=16, h=6)
    b1 = d.box(24, 2, 18, 6, "Signed in?\nload PENDING +\nFAILED rows", "green", fs=7.6)
    b2 = d.box(46, 2, 18, 6, "for each row:\ndetections/{uuid}\nexists?", "green", fs=7.6)
    b3 = d.box(70, 2, 26, 6, "Already uploaded earlier:\nreuse reportId (idempotent)", "grey", fs=7.6)
    b4 = d.box(46, 17, 18, 7, "Find active report\nwithin clamp(GPS acc,\n10 m, 25 m)", "orange", fs=7.6)
    b5 = d.box(24, 32, 20, 7, "Match: write detection,\ntotalDetections + 1,\nlastDetectedAt", "orange", fs=7.4)
    b6 = d.box(66, 32, 22, 7, "No match: new report\n(status NEW) + detection\n+ activity log", "orange", fs=7.4)
    b7 = d.box(46, 45, 18, 6, "markSynced(uuid,\nreportId)", "green", fs=7.6)
    b8 = d.box(72, 46, 24, 7, "Error: mark FAILED,\nResult.retry() with\nexponential backoff (max 8)", "red", fs=7.4)
    d.arrow((18, 5), (24, 5))
    d.arrow((42, 5), (46, 5))
    d.arrow((64, 5), (70, 5), "yes", lpos=.5, loff=(0, 1.4))
    d.arrow((55, 8), (55, 17), "no", lpos=.5, loff=(2.4, 0))
    d.arrow((50, 24), (38, 32), "found", lpos=.5, loff=(-2, 0))
    d.arrow((60, 24), (72, 32), "none", lpos=.5, loff=(2.5, 0))
    d.arrow((34, 39), (50, 45))
    d.arrow((77, 39), (60, 45))
    d.arrow((64, 48), (72, 49), "", c=RED, ls="--")
    d.poly([(83, 8), (83, 13), (61, 13), (61, 17)], c=GREY)
    return d.save()


# ---------------------------------------------------------------- 11. deployment
def deployment():
    d = D(10, 4.6, "deployment")
    d.group(1, 1, 30, 44, "Rider's Android phone", "teal")
    d.box(3, 7, 26, 6, "SmartPothole APK (Kotlin)", "teal", solid=True, bold=True)
    d.box(3, 15, 26, 5, "assets/pothole_yolov8s.onnx (INT8)", "teal", fs=7.8)
    d.box(3, 22, 26, 5, "ONNX Runtime Mobile (4 threads)", "teal", fs=7.8)
    d.box(3, 29, 26, 5, "Room SQLite + WorkManager", "teal", fs=7.8)
    d.box(3, 36, 26, 5, "GPS, camera, TTS, vibrator", "teal", fs=7.8)
    d.group(36, 1, 30, 44, "Google Firebase (cloud)", "orange")
    d.box(38, 7, 26, 6, "Authentication", "orange")
    d.box(38, 15, 26, 7, "Realtime Database\n(+ database.rules.json)", "orange", solid=True, bold=True)
    d.box(38, 24, 26, 6, "Cloud Functions (Node 20)", "orange")
    d.box(38, 32, 26, 5, "Cloud Messaging (FCM)", "orange")
    d.box(38, 39, 26, 4.5, "Hosting (static export)", "orange", fs=7.8)
    d.group(71, 1, 28, 44, "Browser (city / contractor)", "blue")
    d.box(73, 7, 24, 7, "Next.js 15 / React 19\ndashboard", "blue", solid=True, bold=True)
    d.box(73, 17, 24, 6, "Leaflet map", "blue")
    d.box(73, 26, 24, 7, "OpenStreetMap /\nOpenFreeMap tiles", "grey")
    d.arrow((31, 17), (36, 17), "HTTPS\nWebSocket", lpos=.5, loff=(0, -3.5))
    d.arrow((71, 17), (66, 17), "HTTPS\nWebSocket", lpos=.5, loff=(0, -3.5))
    return d.save()


# ---------------------------------------------------------------- 12. gantt
def gantt():
    tasks = [("Requirement analysis & SRS", 1, 2, NAVY), ("System design & diagrams", 2, 4, NAVY),
             ("AI model export & INT8 quantisation", 3, 5, TEAL), ("Android detection pipeline", 4, 8, TEAL),
             ("Offline outbox + sync + de-dup", 6, 9, TEAL), ("Security rules + rule tests", 7, 9, ORANGE),
             ("Web dashboard (3 roles)", 6, 11, BLUE), ("Live companion, routes, split mode", 9, 12, TEAL),
             ("Testing & bug fixing", 10, 13, RED), ("Documentation & presentation", 12, 14, GREEN)]
    fig, ax = plt.subplots(figsize=(10, 4.2))
    for i, (t, s, e, c) in enumerate(tasks):
        ax.barh(i, e - s + 1, left=s - .5, color=c, alpha=.85, height=.55)
    ax.set_yticks(range(len(tasks)))
    ax.set_yticklabels([t[0] for t in tasks], fontsize=8.5)
    ax.invert_yaxis()
    ax.set_xticks(range(1, 15))
    ax.set_xticklabels([f"W{i}" for i in range(1, 15)], fontsize=8)
    ax.set_xlim(.5, 14.5)
    ax.grid(axis="x", color="#e2e8f0")
    ax.set_axisbelow(True)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.set_xlabel("Week of semester", fontsize=8.5)
    p = os.path.join(ASSETS, "gantt.png")
    fig.savefig(p, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return p


# ---------------------------------------------------------------- 13. model size / latency chart
def model_chart():
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.2))
    names = ["PyTorch FP32", "ONNX FP32", "ONNX INT8"]
    size = [21.48, 42.67, 10.96]
    lat = [62.33, 47.55, 76.91]
    for ax, vals, title, unit in ((axs[0], size, "Model file size", "MB"), (axs[1], lat, "Average latency (desktop CPU)", "ms")):
        bars = ax.bar(names, vals, color=[GREY, BLUE, TEAL], width=.55)
        ax.set_title(title, fontsize=10, color=NAVY, fontweight="bold")
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + max(vals) * .02, f"{v:g} {unit}", ha="center", fontsize=8.5)
        ax.set_ylim(0, max(vals) * 1.18)
        ax.tick_params(labelsize=8.5)
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
    p = os.path.join(ASSETS, "model_chart.png")
    fig.tight_layout()
    fig.savefig(p, dpi=220, facecolor="white")
    plt.close(fig)
    return p


# ---------------------------------------------------------------- 14. role / access matrix figure
def git_flow():
    d = D(10, 3.2, "git_flow")
    d.ax.plot([5, 95], [d.y(10), d.y(10)], color=NAVY, lw=2)
    d.text(3, 10, "main", fs=8.5, bold=True, c=NAVY, ha="right")
    for x, t in ((12, "android app"), (27, "web dashboard"), (42, "rules + tests"), (57, "MapLibre maps"),
                 (72, "docs"), (87, "submission docs")):
        d.ax.add_patch(Ellipse((x, d.y(10)), 2.4, 2.4, fc="white", ec=NAVY, lw=1.6))
        d.text(x, 6, t, fs=7.2)
    d.ax.plot([30, 34, 50, 54], [d.y(10), d.y(22), d.y(22), d.y(10)], color=ORANGE, lw=1.6)
    d.text(42, 25, "feature branch -> pull request -> merge", fs=7.3, c=ORANGE)
    d.box(64, 18, 32, 9, "Forked by each member; work pushed to\nown fork, merged into the team repo", "grey", fs=7.3)
    return d.save()


ALL = [architecture, usecase, dfd0, dfd1, detection_flow, lifecycle, seq_report, seq_companion, seq_auth, er, classes,
       sync_flow, deployment, gantt, model_chart, git_flow]

if __name__ == "__main__":
    for fn in ALL:
        print(fn())
