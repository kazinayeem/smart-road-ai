"""Presentation slides: one content list -> .pptx (python-pptx) and .pdf (HTML printed by Chrome)."""
import html
import os

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

from render import ASSETS, COURSE, LINKS, LOGO, OUT, TEAM, _data_uri, html_to_pdf

A = lambda n: os.path.join(ASSETS, n + ".png")  # noqa: E731
NAVY, ORANGE, GREY = RGBColor(0x0B, 0x1B, 0x33), RGBColor(0xC2, 0x41, 0x0C), RGBColor(0x55, 0x5F, 0x6D)

# Each slide: (title, bullets, image or None, layout) ; layout "img-right" | "img-full" | "text"
SLIDES = [
    ("Problem", [
        "Potholes appear fast after rain and heavy traffic, and hurt two-wheelers most",
        "Found late, through complaints with vague locations",
        "Same pothole reported many times; others never reported",
        "No clear record of who checked and approved a repair",
        "Uploading dash-cam video is costly and captures faces and plates",
    ], None, "text"),
    ("Objectives", [
        "Detect potholes in real time on an ordinary Android phone",
        "Never upload images: send position, confidence and time only",
        "Warn the driver immediately, even offline",
        "Merge reports of the same pothole from many riders",
        "Track every pothole from report to verified repair, with roles enforced on the server",
    ], None, "text"),
    ("System Architecture", [], A("architecture"), "img-full"),
    ("Technology Stack", [
        "**AI:** YOLOv8s, ONNX, INT8 quantisation (Python)",
        "**Android:** Kotlin, CameraX, ONNX Runtime, Room, WorkManager, MapLibre",
        "**Web:** Next.js 15, React 19, TypeScript, Tailwind, Leaflet",
        "**Backend:** Firebase Auth, Realtime Database + rules, Cloud Functions, FCM",
        "**Maps:** OpenStreetMap / OpenFreeMap (no paid API keys)",
    ], None, "text"),
    ("Detection Pipeline on the Phone", [
        "Frame → 640x640 tensor → YOLOv8s INT8",
        "Must appear in 2 of 3 frames above 0.55",
        "Warning first: voice, vibration, banner",
        "3.5 s cooldown + 10 m / 60 s same-spot gate",
        "Report only with fresh GPS (≤ 30 s, ≤ 50 m)",
    ], A("detection_flow"), "img-right"),
    ("Model: Size vs Speed", [
        "ONNX FP32: 42.67 MB, too big for the APK",
        "INT8: 10.96 MB, 74.3% smaller, bundled in the app",
        "Desktop latency is higher for INT8; phone benchmark still to do",
    ], A("model_chart"), "img-below"),
    ("Offline Sync and De-duplication", [
        "Save to Room first, upload with WorkManager when online",
        "Client UUID makes retries safe (no double counting)",
        "Match radius = clamp(GPS accuracy, 10 m, 25 m)",
        "Match → +1 confirmation; no match → new report",
    ], A("sync_flow"), "img-below"),
    ("Repair Lifecycle", [], A("lifecycle"), "img-full"),
    ("Security and Roles", [
        "Roles: Citizen (rider), City Corporation, Contractor",
        "New accounts are always Citizen; only the city can change roles",
        "Contractors see and change only their own jobs",
        "Only the city can mark a report RESOLVED",
        "History is append-only; 17 automated rule tests pass",
    ], A("seq_auth"), "img-right"),
    ("Android App", [], A("app_panel1"), "img-full"),
    ("Maps, Routes and Reports", [], A("app_panel2"), "img-full"),
    ("City Corporation Dashboard", [], A("web_triage"), "img-full"),
    ("Testing", [
        "17 security-rule tests on the Firebase emulator: all pass",
        "Android unit tests (severity, radius, gates): 4 / 4 pass",
        "Full web journey on emulators: report → verify → assign → accept",
        "Road tests in Dhaka: 27 reports, all uploaded; one pothole confirmed 12 times",
        "18 documented test cases in the SRS",
    ], None, "text"),
    ("Limitations and Future Work", [
        "Model not yet evaluated on a labelled local dataset (precision, recall, mAP)",
        "Latency on phones not yet benchmarked across devices",
        "Weaker at night and on wet roads",
        "Next: collect local data and retrain, add photo evidence for repairs, run a pilot with a city ward",
    ], None, "text"),
    ("Conclusion", [
        "A phone becomes a road inspector: AI on the device, no video uploaded",
        "Drivers get warnings straight away",
        "The city gets one de-duplicated record per pothole and a full repair history",
    ], None, "text"),
    ("Project Links", [f"**{k}:** {v}" for k, v in LINKS], None, "text"),
]


def _runs(par, text, size, color=None, bold=False):
    import re
    for part in re.split(r"(\*\*.+?\*\*|https?://\S+)", text):
        if not part:
            continue
        r = par.add_run()
        if part.startswith("http"):
            r.text = part
            r.font.size = Pt(size)
            r.hyperlink.address = part
            continue
        r.text = part.strip("*") if part.startswith("**") else part
        r.font.size = Pt(size)
        r.font.bold = bold or part.startswith("**")
        r.font.name = "Calibri"
        if color is not None:
            r.font.color.rgb = color


def build_pptx(path):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    blank = prs.slide_layouts[6]
    W, H = prs.slide_width, prs.slide_height

    def bar(s, n):
        r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, Inches(0.12))
        r.fill.solid(); r.fill.fore_color.rgb = ORANGE; r.line.fill.background()
        tb = s.shapes.add_textbox(Inches(0.5), Inches(7.0), Inches(12.3), Inches(0.35)).text_frame
        p = tb.paragraphs[0]
        _runs(p, f"SmartPothole  |  SE 331 Capstone Project", 10, GREY)
        tb2 = s.shapes.add_textbox(Inches(12.2), Inches(7.0), Inches(0.8), Inches(0.35)).text_frame
        q = tb2.paragraphs[0]; q.alignment = PP_ALIGN.RIGHT
        _runs(q, str(n), 10, GREY)

    # title slide
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid(); bg.fill.fore_color.rgb = NAVY; bg.line.fill.background()
    s.shapes.add_picture(LOGO, Inches(0.7), Inches(0.6), height=Inches(1.3))
    tf = s.shapes.add_textbox(Inches(2.2), Inches(0.75), Inches(10), Inches(1)).text_frame
    _runs(tf.paragraphs[0], "Daffodil International University", 22, RGBColor(255, 255, 255), True)
    p = tf.add_paragraph(); _runs(p, "Department of Software Engineering", 14, RGBColor(0xCB, 0xD5, 0xE1))
    tf = s.shapes.add_textbox(Inches(0.7), Inches(2.4), Inches(12), Inches(2)).text_frame
    tf.word_wrap = True
    _runs(tf.paragraphs[0], "SmartPothole", 46, RGBColor(0xFB, 0x92, 0x3C), True)
    p = tf.add_paragraph(); _runs(p, "On-Device Pothole Detection and Road-Maintenance Platform", 26, RGBColor(255, 255, 255), True)
    tf = s.shapes.add_textbox(Inches(0.7), Inches(4.5), Inches(6.2), Inches(2.5)).text_frame
    for i, (n, i_d, _) in enumerate(TEAM):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        _runs(p, f"{'Team Lead: ' if i == 0 else ''}{n}  ({i_d})", 15, RGBColor(255, 255, 255), i == 0)
    tf = s.shapes.add_textbox(Inches(7.2), Inches(4.5), Inches(5.6), Inches(2.5)).text_frame
    for i, (k, v) in enumerate(COURSE):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        _runs(p, f"{k}: {v}", 14, RGBColor(0xCB, 0xD5, 0xE1))

    for n, (title, bullets, img, layout) in enumerate(SLIDES, start=2):
        s = prs.slides.add_slide(blank)
        bar(s, n)
        tf = s.shapes.add_textbox(Inches(0.6), Inches(0.35), Inches(12), Inches(0.9)).text_frame
        _runs(tf.paragraphs[0], title, 32, NAVY, True)
        top = Inches(1.35)
        if layout == "text":
            box = (Inches(0.8), top, Inches(11.7), Inches(5.4)); size = 22
        elif layout == "img-right":
            box = (Inches(0.6), top, Inches(6.2), Inches(5.4)); size = 18
        elif layout == "img-below":
            box = (Inches(0.6), top, Inches(12.1), Inches(1.9)); size = 17
        else:
            box = None
        if bullets and box:
            tf = s.shapes.add_textbox(*box).text_frame
            tf.word_wrap = True
            for i, b in enumerate(bullets):
                p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                p.space_after = Pt(10 if layout == "text" else 6)
                _runs(p, "•  " + b, size, RGBColor(0x1D, 0x24, 0x30))
        if img:
            from PIL import Image
            iw, ih = Image.open(img).size
            if layout == "img-right":
                ax, ay, aw, ah = Inches(7.0), top, Inches(5.8), Inches(5.5)
            elif layout == "img-below":
                ax, ay, aw, ah = Inches(0.6), Inches(3.4), Inches(12.1), Inches(3.5)
            else:
                ax, ay, aw, ah = Inches(0.6), top, Inches(12.1), Inches(5.55)
            scale = min(aw / iw, ah / ih)
            w, h = int(iw * scale), int(ih * scale)
            s.shapes.add_picture(img, Emu(int(ax + (aw - w) / 2)), Emu(int(ay + (ah - h) / 2)), Emu(w), Emu(h))

    # thank-you slide
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid(); bg.fill.fore_color.rgb = NAVY; bg.line.fill.background()
    tf = s.shapes.add_textbox(Inches(0.7), Inches(2.6), Inches(12), Inches(2)).text_frame
    _runs(tf.paragraphs[0], "Thank you", 54, RGBColor(255, 255, 255), True)
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    p = tf.add_paragraph(); p.alignment = PP_ALIGN.CENTER
    _runs(p, "Questions?", 26, RGBColor(0xFB, 0x92, 0x3C))
    prs.save(path)


CSS = """
@page { size: 13.333in 7.5in; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif; color: #1d2430 }
.s { width: 13.333in; height: 7.5in; position: relative; overflow: hidden; break-after: page; background: #fff; }
.s:before { content: ""; position: absolute; left: 0; top: 0; right: 0; height: .12in; background: #C2410C }
.s h2 { position: absolute; left: .6in; top: .38in; font-size: 32pt; color: #0B1B33 }
.foot { position: absolute; left: .5in; right: .5in; bottom: .22in; font-size: 10pt; color: #555F6D; display: flex; justify-content: space-between }
ul { list-style: none }
li { position: relative; padding-left: .32in; margin-bottom: .17in; line-height: 1.25 }
li:before { content: ""; position: absolute; left: .05in; top: .32em; width: .12in; height: .12in; border-radius: 50%; background: #C2410C }
.text ul { position: absolute; left: .8in; top: 1.5in; right: .8in; font-size: 22pt }
.right ul { position: absolute; left: .6in; top: 1.5in; width: 6.1in; font-size: 18pt }
.right img { position: absolute; right: .5in; top: 1.35in; max-width: 5.8in; max-height: 5.5in }
.below ul { position: absolute; left: .6in; top: 1.35in; right: .6in; font-size: 17pt }
.below li { margin-bottom: .07in }
.below .im { position: absolute; left: .6in; right: .6in; top: 3.4in; height: 3.5in; display: flex; justify-content: center; align-items: center }
.below img, .full img { max-width: 100%; max-height: 100% }
.full .im { position: absolute; left: .6in; right: .6in; top: 1.35in; height: 5.55in; display: flex; justify-content: center; align-items: center }
.dark { background: #0B1B33; color: #fff }
.dark:before { display: none }
"""


def build_pdf(path):
    h = [f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>"]
    team = "".join(f"<div style='font-size:15pt;margin-bottom:6pt;{'font-weight:bold' if i == 0 else ''}'>"
                   f"{'Team Lead: ' if i == 0 else ''}{html.escape(n)} ({i_d})</div>" for i, (n, i_d, _) in enumerate(TEAM))
    course = "".join(f"<div style='font-size:14pt;margin-bottom:6pt;color:#CBD5E1'>{k}: {html.escape(v)}</div>" for k, v in COURSE)
    h.append(f"""<section class='s dark'>
<img src='{_data_uri(LOGO)}' style='position:absolute;left:.7in;top:.6in;height:1.3in'>
<div style='position:absolute;left:2.25in;top:.85in'><div style='font-size:22pt;font-weight:bold'>Daffodil International University</div>
<div style='font-size:14pt;color:#CBD5E1'>Department of Software Engineering</div></div>
<div style='position:absolute;left:.7in;top:2.45in;right:.7in'><div style='font-size:46pt;font-weight:bold;color:#FB923C'>SmartPothole</div>
<div style='font-size:26pt;font-weight:bold'>On-Device Pothole Detection and Road-Maintenance Platform</div></div>
<div style='position:absolute;left:.7in;top:4.6in;width:6.2in'>{team}</div>
<div style='position:absolute;left:7.2in;top:4.6in;width:5.6in'>{course}</div></section>""")
    import re
    for n, (title, bullets, img, layout) in enumerate(SLIDES, start=2):
        cls = {"text": "text", "img-right": "right", "img-below": "below", "img-full": "full"}[layout]
        lis = "".join("<li>" + re.sub(r"(https?://\S+)", r"<a href='\1' style='color:#1F5F8B;word-break:break-all'>\1</a>",
                                      re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(b))) + "</li>" for b in bullets)
        body = f"<ul>{lis}</ul>" if bullets else ""
        if img:
            tag = f"<img src='{_data_uri(img)}'>"
            body += tag if layout == "img-right" else f"<div class='im'>{tag}</div>"
        h.append(f"<section class='s {cls}'><h2>{html.escape(title)}</h2>{body}"
                 f"<div class='foot'><span>SmartPothole &nbsp;|&nbsp; SE 331 Capstone Project</span><span>{n}</span></div></section>")
    h.append("<section class='s dark'><div style='position:absolute;top:2.7in;width:100%;text-align:center'>"
             "<div style='font-size:54pt;font-weight:bold'>Thank you</div><div style='font-size:26pt;color:#FB923C'>Questions?</div></div></section>")
    h.append("</body></html>")
    hp = os.path.join(OUT, "build", "html", "06_Presentation_Slides.html")
    with open(hp, "w", encoding="utf-8") as f:
        f.write("\n".join(h))
    html_to_pdf(hp, path)


if __name__ == "__main__":
    build_pptx(os.path.join(OUT, "06_Presentation_Slides.pptx"))
    build_pdf(os.path.join(OUT, "06_Presentation_Slides.pdf"))
    print("built slides")
