"""
Presentation slides, built from the team's own deck (reference_presentation.pptx).

Keeps all of its slides and look, and adds what the submission needs:
  * DIU logo, course, team and teacher on the title slide
  * a "Team" slide (who did what) after the title slide
  * a "Project Links" slide with QR codes (APK / dashboard, video, GitHub) before the closing slide
  * "Built by Mohammad Ali Nayeem" on the closing slide
Fonts are switched to Arial so the deck looks the same on any lab PC (Space Grotesk / Inter are not installed
on most machines and fall back to Times). The PDF is drawn from the PPTX by pptx_to_pdf.py and printed with Chrome.
"""
import os

import qrcode
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

from render import ASSETS, COURSE, LINKS, LOGO, OUT, TEAM

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "reference_presentation.pptx")
PPTX = os.path.join(OUT, "06_Presentation_Slides.pptx")
PDF = os.path.join(OUT, "06_Presentation_Slides.pdf")

FONT = "Arial"
NAVY, CARD_DK = "0B1B33", "16294A"
CREAM, CARD, LINE = "F3F0EA", "FBFAF6", "DDD6C8"
INK, BODY, ORANGE, ORANGE_LT, MUTED = "14213D", "4A5568", "C2410C", "FB923C", "CBD5E1"
YOUTUBE = "https://youtu.be/4Cp7OcaJe8g?si=2Ogdcp3R_DOtYyAc"


def rgb(h):
    return RGBColor.from_string(h)


def set_bg(slide, hex_):
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = rgb(hex_)


def text(slide, x, y, w, h, s, size, color, bold=False, spacing=None, align=PP_ALIGN.LEFT, link=None):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(s.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.name = FONT
        r.font.color.rgb = rgb(color)
        if spacing:
            r.font._element.set("spc", str(spacing))
        if link:
            r.hyperlink.address = link
            r.font.color.rgb = rgb(color)
    return tb


def card(slide, x, y, w, h, fill, line=None):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    s.adjustments[0] = 0.077
    s.fill.solid()
    s.fill.fore_color.rgb = rgb(fill)
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(0.5)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    return s


def pill(slide, x, y, w, s, fill, color):
    p = card(slide, x, y, w, 0.35, fill)
    p.adjustments[0] = 0.5
    tf = p.text_frame
    tf.margin_left = tf.margin_right = Inches(0.08)
    tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    r = tf.paragraphs[0].add_run()
    r.text = s
    r.font.size, r.font.bold, r.font.name = Pt(12), True, FONT
    r.font.color.rgb = rgb(color)


def move_slide(prs, old_index, new_index):
    ids = prs.slides._sldIdLst
    el = list(ids)[old_index]
    ids.remove(el)
    ids.insert(new_index, el)


def swap_fonts(prs):
    """Space Grotesk / Inter -> Arial everywhere, so the deck renders the same on any PC."""
    for slide in prs.slides:
        for el in slide._element.iter():
            if el.tag in (qn("a:latin"), qn("a:ea"), qn("a:cs")) and el.get("typeface") in ("Inter", "Space Grotesk"):
                el.set("typeface", FONT)


_FONTS = {}


def _font(size_pt, bold):
    from PIL import ImageFont
    key = (round(size_pt * 4), bold)
    if key not in _FONTS:
        f = "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf"
        _FONTS[key] = ImageFont.truetype(f, max(1, int(size_pt * 4)))  # 4x for precision; widths in 1/4 pt
    return _FONTS[key]


def _wrapped_lines(text_, size_pt, bold, width_pt):
    f = _font(size_pt, bold)
    lines, cur = 0, ""
    for word in text_.split(" "):
        trial = (cur + " " + word).strip()
        if cur and f.getlength(trial) / 4 > width_pt:
            lines += 1
            cur = word
        else:
            cur = trial
    return lines + 1


def fit_text(prs):
    """Shrink text that would overflow its box now that the deck uses Arial (wider than Space Grotesk)."""
    for slide in prs.slides:
        for sh in slide.shapes:
            if not sh.has_text_frame or not sh.text_frame.text.strip() or not sh.width or not sh.height:
                continue
            tf = sh.text_frame
            width_pt = sh.width / 12700 - (tf.margin_left + tf.margin_right) / 12700
            box_h = sh.height / 12700

            def needed(scale):
                total = 0
                for p in tf.paragraphs:
                    runs = p.runs
                    if not runs:
                        total += 12 * scale
                        continue
                    size = (runs[0].font.size.pt if runs[0].font.size else 18) * scale
                    bold = bool(runs[0].font.bold)
                    pPr = p._p.find(qn("a:pPr"))
                    spc = pPr.find(qn("a:lnSpc") + "/" + qn("a:spcPts")) if pPr is not None else None
                    lh = int(spc.get("val")) / 100 * scale if spc is not None else size * 1.2
                    total += lh * _wrapped_lines("".join(r.text for r in runs), size, bold, width_pt)
                return total

            if needed(1.0) <= box_h * 1.08:
                continue
            scale = 1.0
            while scale > 0.6 and needed(scale) > box_h * 1.08:
                scale -= 0.03
            for p in tf.paragraphs:
                for r in p.runs:
                    if r.font.size:
                        r.font.size = Pt(round(r.font.size.pt * scale, 1))
                pPr = p._p.find(qn("a:pPr"))
                spc = pPr.find(qn("a:lnSpc") + "/" + qn("a:spcPts")) if pPr is not None else None
                if spc is not None:
                    spc.set("val", str(int(int(spc.get("val")) * scale)))


def qr_png(url, name):
    path = os.path.join(ASSETS, f"qr_{name}.png")
    q = qrcode.QRCode(border=1, box_size=12, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make(fit=True)
    q.make_image(fill_color="#0B1B33", back_color="white").save(path)
    return path


def build():
    prs = Presentation(REF)
    swap_fonts(prs)
    layout = prs.slides[1].slide_layout
    lead, m1, m2 = TEAM

    # 1. Title slide: DIU identity, course, presenter, teacher
    s1 = prs.slides[0]
    for sh in s1.shapes:
        if sh.has_text_frame and sh.text_frame.text.startswith("PROJECT PRESENTATION"):
            sh.text_frame.paragraphs[0].runs[0].text = "SE 331 · CAPSTONE PROJECT PRESENTATION"
    s1.shapes.add_picture(LOGO, Inches(0.89), Inches(0.42), height=Inches(0.78))
    text(s1, 1.82, 0.5, 5.2, 0.3, "Daffodil International University", 15, "FFFFFF", bold=True)
    text(s1, 1.82, 0.82, 5.2, 0.3, "Department of Software Engineering", 11.5, MUTED)
    text(s1, 0.89, 6.08, 6.3, 0.3, f"Presented by {lead[0]} ({lead[1]}), Team Lead", 12, "FFFFFF", bold=True)
    text(s1, 0.89, 6.4, 6.3, 0.6,
         f"Section 42_H1  ·  Submitted to {dict(COURSE)['Submitted To']}\n"
         f"Team: {m1[0]} ({m1[1]}), {m2[0]} ({m2[1]})", 11, MUTED)

    # 2. Team slide (cream, same style as "The problem")
    t = prs.slides.add_slide(layout)
    set_bg(t, CREAM)
    text(t, 0.89, 0.89, 11.9, 0.25, "THE TEAM", 12, ORANGE, bold=True, spacing=190)
    text(t, 0.89, 1.23, 11.0, 0.7, "One developer built the whole system", 36, INK, bold=True)
    card(t, 0.89, 2.35, 11.55, 2.05, CARD, LINE)
    pill(t, 1.17, 2.62, 1.45, "TEAM LEAD", ORANGE, "FFFFFF")
    text(t, 2.8, 2.6, 9.4, 0.4, f"{lead[0]}  ·  {lead[1]}", 22, INK, bold=True)
    text(t, 1.17, 3.15, 11.0, 1.1,
         "Did all of the work: the idea and requirements, system design, the AI/ML model (YOLOv8s export and INT8 "
         "quantisation), the Android app, the web frontend, the Firebase backend and security rules, testing, "
         "deployment, and every document and slide in this submission.", 14, BODY)
    for i, (n, i_d, _) in enumerate((m1, m2)):
        x = 0.89 + i * 5.87
        card(t, x, 4.6, 5.68, 1.35, CARD, LINE)
        text(t, x + 0.28, 4.83, 5.1, 0.35, f"{n}  ·  {i_d}", 18, INK, bold=True)
        text(t, x + 0.28, 5.27, 5.1, 0.5, "Group member. Attended the group discussion.", 13, BODY)
    text(t, 0.89, 6.33, 11.9, 0.35,
         "SE 331  ·  Software Engineering Design Capstone Project  ·  Section 42_H1  ·  Submitted to Dipta Dipayan Kar",
         12.5, BODY)
    move_slide(prs, len(prs.slides) - 1, 1)

    # 3. Links slide (dark, QR codes) before the closing slide
    L = prs.slides.add_slide(layout)
    set_bg(L, NAVY)
    text(L, 0.89, 0.89, 11.9, 0.25, "TRY IT YOURSELF", 12, ORANGE_LT, bold=True, spacing=190)
    text(L, 0.89, 1.2, 11.9, 0.7, "Scan to download, watch or read the code", 36, "FFFFFF", bold=True)
    items = [("Dashboard + Android APK", LINKS[1][1], "shorturl.at/Ok9CS", "apk"),
             ("Demo video (YouTube)", YOUTUBE, "youtu.be/4Cp7OcaJe8g", "youtube"),
             ("Source code", LINKS[0][1], "github.com/kazinayeem/smart-road-ai", "github")]
    for i, (title, url, short, key) in enumerate(items):
        x = 0.89 + i * 3.92
        card(L, x, 2.3, 3.72, 4.0, CARD_DK)
        card(L, x + 0.81, 2.6, 2.1, 2.1, "FFFFFF").adjustments[0] = 0.06
        L.shapes.add_picture(qr_png(url, key), Inches(x + 0.91), Inches(2.7), Inches(1.9), Inches(1.9))
        text(L, x + 0.2, 4.95, 3.32, 0.35, title, 17, "FFFFFF", bold=True, align=PP_ALIGN.CENTER)
        text(L, x + 0.2, 5.4, 3.32, 0.5, short, 12, ORANGE_LT, align=PP_ALIGN.CENTER, link=url)
    text(L, 0.89, 6.5, 11.9, 0.3, "Full walkthrough also on Google Drive: ", 11.5, MUTED)
    text(L, 3.85, 6.5, 8.9, 0.3, LINKS[2][1], 11.5, ORANGE_LT, link=LINKS[2][1])
    text(L, 0.89, 6.85, 11.9, 0.3, f"Built by {lead[0]}", 11.5, MUTED)
    move_slide(prs, len(prs.slides) - 1, len(prs.slides) - 2)

    # 4. Closing slide: credit line
    last = prs.slides[len(prs.slides) - 1]
    text(last, 0.89, 5.75, 11.9, 0.35, f"Built by {lead[0]} ({lead[1]})  ·  github.com/kazinayeem/smart-road-ai",
         14, "3A2413", bold=True, link=LINKS[0][1])

    fit_text(prs)
    prs.save(PPTX)
    return len(prs.slides)


def export_pdf():
    """Draw each slide as HTML and print it with Chrome (no PowerPoint / LibreOffice needed)."""
    from pptx_to_pdf import convert
    convert(PPTX, PDF, os.path.join(HERE, "html", "06_Presentation_Slides.html"))


if __name__ == "__main__":
    n = build()
    export_pdf()
    print("built slides:", n)
