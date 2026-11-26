"""
Small document renderer used for every submission document.

A document is a list of blocks (plain tuples). The same list is written twice:
  * to .docx with python-docx (editable Word file), and
  * to .html, which headless Chrome prints to .pdf.
Keeping one source of content means the Word and PDF versions never drift apart.

Inline text supports **bold**, *italic* and `code`.
"""
import base64
import html
import os
import re
import subprocess

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(OUT, "build", "assets")
LOGO = os.path.join(ROOT, "documentation", "proposal", "diu_logo.jpg")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

NAVY = RGBColor(0x0B, 0x1B, 0x33)
ACCENT = RGBColor(0x1F, 0x5F, 0x8B)
GREY = RGBColor(0x55, 0x5F, 0x6D)

PROJECT = "SmartPothole: On-Device Pothole Detection and Road-Maintenance Platform"
SUBMISSION_DATE = "9 December 2026"


# ---------------------------------------------------------------- block helpers
def H1(t): return ("h1", t)
def H2(t): return ("h2", t)
def H3(t): return ("h3", t)
def P(t): return ("p", t)
def UL(*items): return ("ul", list(items))
def OL(*items): return ("ol", list(items))
def TABLE(head, rows, widths=None): return ("table", head, rows, widths)
def CODE(text, caption="", lang=""): return ("code", text.strip("\n"), caption, lang)
def IMG(path, width_cm=15.5, caption=""): return ("img", path, width_cm, caption)
def NOTE(t): return ("note", t)
def PB(): return ("pb",)
def TOC(*entries): return ("toc", list(entries))
def SIGN(*labels): return ("sign", list(labels))


def code_from(rel_path, start=None, end=None, between=None):
    """Read real source code from the repository so the documents always show the actual code."""
    with open(os.path.join(ROOT, rel_path), encoding="utf-8") as f:
        lines = f.read().splitlines()
    if between:
        # from the first line containing a, up to (not including) the next line containing b
        a, b = between
        s = next(i for i, l in enumerate(lines) if a in l)
        e = next((i for i in range(s + 1, len(lines)) if b in lines[i]), len(lines))
        lines = lines[s:e]
        while lines and (not lines[-1].strip() or lines[-1].strip().startswith(("/**", "*", "//"))):
            lines.pop()
    elif start or end:
        lines = lines[(start or 1) - 1:end]
    import textwrap
    return textwrap.dedent("\n".join(lines))


_INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\*[^*]+\*)")


def _split_inline(text):
    for part in _INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            yield part[2:-2], "b"
        elif part.startswith("`"):
            yield part[1:-1], "c"
        elif part.startswith("*") and len(part) > 2:
            yield part[1:-1], "i"
        else:
            yield part, ""


# ---------------------------------------------------------------- DOCX
def _shade(cell, hex_fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tcPr.append(shd)


def _cell_margins(table, top=60, bottom=60, left=90, right=90):
    tblPr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        el = OxmlElement(f"w:{k}")
        el.set(qn("w:w"), str(v))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tblPr.append(mar)


_URL = re.compile(r"(https?://[^\s)]*[^\s).,;:])")


def _hyperlink(par, url, size=None):
    rid = par.part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
                             is_external=True)
    h = OxmlElement("w:hyperlink")
    h.set(qn("r:id"), rid)
    r = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    c = OxmlElement("w:color"); c.set(qn("w:val"), "1F5F8B"); rpr.append(c)
    u = OxmlElement("w:u"); u.set(qn("w:val"), "single"); rpr.append(u)
    if size:
        sz = OxmlElement("w:sz"); sz.set(qn("w:val"), str(int(size * 2))); rpr.append(sz)
    r.append(rpr)
    t = OxmlElement("w:t"); t.text = url; t.set(qn("xml:space"), "preserve"); r.append(t)
    h.append(r)
    par._p.append(h)


def _add_runs(par, text, size=None, color=None, bold=False):
    for chunk, style in _split_inline(text):
        if style == "" and _URL.search(chunk):
            for k, piece in enumerate(_URL.split(chunk)):
                if k % 2:
                    _hyperlink(par, piece, size)
                elif piece:
                    _add_runs(par, piece, size, color, bold)
            continue
        r = par.add_run(chunk)
        r.bold = bold or style == "b"
        r.italic = style == "i"
        if style == "c":
            r.font.name = "Consolas"
            r._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
            r.font.size = Pt((size or 11) - 1.5)
        elif size:
            r.font.size = Pt(size)
        if color is not None:
            r.font.color.rgb = color


def _page_number_field(par):
    run = par.add_run()
    for tag, text in (("begin", None), (None, "PAGE"), ("end", None)):
        if tag:
            fc = OxmlElement("w:fldChar")
            fc.set(qn("w:fldCharType"), tag)
            run._r.append(fc)
        else:
            it = OxmlElement("w:instrText")
            it.set(qn("xml:space"), "preserve")
            it.text = text
            run._r.append(it)


def _docx_setup(doc, short_title):
    st = doc.styles["Normal"]
    st.font.name = "Calibri"
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    st.font.size = Pt(11)
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.line_spacing = 1.15
    for name, size, color in (("Heading 1", 16, NAVY), ("Heading 2", 13, ACCENT), ("Heading 3", 11.5, NAVY)):
        s = doc.styles[name]
        s.font.name = "Calibri"
        rf = s.element.rPr.rFonts
        for att in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
            if rf.get(qn(att)) is not None:
                del rf.attrib[qn(att)]  # stop the theme font overriding Calibri
        s.font.size = Pt(size)
        s.font.bold = True
        s.font.color.rgb = color
        s.paragraph_format.space_before = Pt(14 if name == "Heading 1" else 10)
        s.paragraph_format.space_after = Pt(6)
        s.paragraph_format.keep_with_next = True
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(2.3)
    sec.top_margin, sec.bottom_margin = Cm(2.2), Cm(2.0)
    sec.different_first_page_header_footer = True
    hp = sec.header.paragraphs[0]
    _add_runs(hp, f"SmartPothole  |  {short_title}", size=8.5, color=GREY)
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("Page ")
    r.font.size = Pt(8.5)
    _page_number_field(fp)


def _docx_cover(doc, cover):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(LOGO, width=Cm(3.6))
    for text, size, bold, color, after in (
        ("Daffodil International University", 18, True, NAVY, 2),
        ("Department of " + cover.get("department", "Software Engineering"), 11.5, False, GREY, 18),
        (cover["kind"].upper(), 11, True, ACCENT, 4),
        (cover["title"], 20, True, NAVY, 6),
        (cover.get("subtitle", ""), 11.5, False, GREY, 22),
    ):
        q = doc.add_paragraph()
        q.alignment = WD_ALIGN_PARAGRAPH.CENTER
        q.paragraph_format.space_after = Pt(after)
        _add_runs(q, text, size=size, color=color, bold=bold)

    rows = cover["fields"]
    t = doc.add_table(rows=len(rows), cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.style = "Table Grid"
    _cell_margins(t, 90, 90, 120, 120)
    t.autofit = False
    t.columns[0].width, t.columns[1].width = Cm(4.2), Cm(11.3)
    for i, (k, v) in enumerate(rows):
        a, b = t.rows[i].cells
        a.width, b.width = Cm(4.2), Cm(11.3)
        _shade(a, "EEF2F7")
        _add_runs(a.paragraphs[0], k, size=10.5, color=NAVY, bold=True)
        _add_runs(b.paragraphs[0], v or " ", size=10.5)
    q = doc.add_paragraph()
    q.paragraph_format.space_before = Pt(14)
    q.paragraph_format.space_after = Pt(2)
    q.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _add_runs(q, "Project links", size=10, color=ACCENT, bold=True)
    for k, v in LINKS:
        q = doc.add_paragraph()
        q.alignment = WD_ALIGN_PARAGRAPH.CENTER
        q.paragraph_format.space_after = Pt(1)
        _add_runs(q, f"{k}: {v}", size=8.5, color=GREY)
    q = doc.add_paragraph()
    q.paragraph_format.space_before = Pt(12)
    q.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _add_runs(q, f"Submission date: {SUBMISSION_DATE}", size=10.5, color=GREY)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def to_docx(path, cover, blocks, short_title):
    doc = Document()
    _docx_setup(doc, short_title)
    _docx_cover(doc, cover)
    fig = 0
    for b in blocks:
        kind = b[0]
        if kind == "h1":
            doc.add_heading(b[1], level=1)
        elif kind == "h2":
            doc.add_heading(b[1], level=2)
        elif kind == "h3":
            doc.add_heading(b[1], level=3)
        elif kind == "p":
            p = doc.add_paragraph()
            p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            _add_runs(p, b[1])
        elif kind in ("ul", "ol"):
            for item in b[1]:
                p = doc.add_paragraph(style="List Bullet" if kind == "ul" else "List Number")
                p.paragraph_format.space_after = Pt(3)
                _add_runs(p, item)
        elif kind == "note":
            t = doc.add_table(rows=1, cols=1)
            c = t.rows[0].cells[0]
            _shade(c, "EEF4FA")
            _cell_margins(t, 100, 100, 160, 160)
            _add_runs(c.paragraphs[0], b[1], size=10.5)
            doc.add_paragraph().paragraph_format.space_after = Pt(0)
        elif kind == "table":
            head, rows, widths = b[1], b[2], b[3]
            t = doc.add_table(rows=1 + len(rows), cols=len(head))
            t.style = "Table Grid"
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
            _cell_margins(t)
            for j, h in enumerate(head):
                c = t.rows[0].cells[j]
                _shade(c, "1B2F4E")
                _add_runs(c.paragraphs[0], h, size=9.5, color=RGBColor(255, 255, 255), bold=True)
            for i, row in enumerate(rows, start=1):
                for j, val in enumerate(row):
                    c = t.rows[i].cells[j]
                    if i % 2 == 0:
                        _shade(c, "F5F7FA")
                    _add_runs(c.paragraphs[0], str(val), size=9.5)
            if widths:
                tot = sum(widths)
                for row in t.rows:
                    for j, w in enumerate(widths):
                        row.cells[j].width = Cm(16.4 * w / tot)
            doc.add_paragraph().paragraph_format.space_after = Pt(0)
        elif kind == "code":
            text, caption = b[1], b[2]
            t = doc.add_table(rows=1, cols=1)
            c = t.rows[0].cells[0]
            _shade(c, "F4F6F8")
            _cell_margins(t, 80, 80, 140, 140)
            p = c.paragraphs[0]
            p.paragraph_format.line_spacing = 1.0
            p.paragraph_format.space_after = Pt(0)
            lines = text.split("\n")
            for k, line in enumerate(lines):
                r = p.add_run(line)
                r.font.name = "Consolas"
                r._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
                r.font.size = Pt(8)
                if k < len(lines) - 1:
                    r.add_break()
            if caption:
                q = doc.add_paragraph()
                q.alignment = WD_ALIGN_PARAGRAPH.CENTER
                _add_runs(q, caption, size=9, color=GREY)
            else:
                doc.add_paragraph().paragraph_format.space_after = Pt(0)
        elif kind == "img":
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.keep_with_next = True
            p.add_run().add_picture(b[1], width=Cm(b[2]))
            if b[3]:
                fig += 1
                q = doc.add_paragraph()
                q.alignment = WD_ALIGN_PARAGRAPH.CENTER
                _add_runs(q, b[3], size=9, color=GREY)
        elif kind == "pb":
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        elif kind == "toc":
            for num, title in b[1]:
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.left_indent = Cm(0 if "." not in num else 0.8)
                _add_runs(p, f"{num}   {title}", size=11, bold="." not in num)
        elif kind == "sign":
            t = doc.add_table(rows=2, cols=len(b[1]))
            for j, lab in enumerate(b[1]):
                _add_runs(t.rows[0].cells[j].paragraphs[0], "\n\n______________________", size=10)
                _add_runs(t.rows[1].cells[j].paragraphs[0], lab, size=10, color=GREY)
    doc.save(path)


# ---------------------------------------------------------------- HTML / PDF
CSS = """
@page { size: A4; margin: 20mm 21mm 18mm 21mm;
  @bottom-center { content: "Page " counter(page); font: 8.5pt Calibri, Carlito, Arial, sans-serif; color:#6b7480; }
  @top-left { content: "SmartPothole  |  %SHORT%"; font: 8.5pt Calibri, Carlito, Arial, sans-serif; color:#6b7480; } }
@page :first { @bottom-center { content: none } @top-left { content: none } }
* { box-sizing: border-box; }
body { font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1d2430; margin: 0; }
h1 { font-size: 16pt; color: #0B1B33; margin: 20pt 0 7pt; padding-bottom: 4pt; border-bottom: 1.5px solid #c9d3df; break-after: avoid; }
h2 { font-size: 13pt; color: #1F5F8B; margin: 14pt 0 5pt; break-after: avoid; }
h3 { font-size: 11.5pt; color: #0B1B33; margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 0 0 6pt; text-align: justify; }
ul, ol { margin: 0 0 7pt; padding-left: 20pt; } li { margin-bottom: 2.5pt; }
a { color: #1F5F8B; word-break: break-all; }
code { font-family: Consolas, Menlo, monospace; font-size: 9.3pt; background: #eef1f5; padding: 0 2.5pt; border-radius: 2pt; }
table.t { width: 100%; border-collapse: collapse; margin: 4pt 0 10pt; font-size: 9.6pt; break-inside: auto; }
table.t th { background: #1B2F4E; color: #fff; text-align: left; padding: 4.5pt 6pt; border: 1px solid #1B2F4E; }
table.t td { padding: 4.5pt 6pt; border: 1px solid #cfd6df; vertical-align: top; }
table.t tr:nth-child(even) td { background: #F5F7FA; }
table.t tr { break-inside: avoid; }
pre { font-family: Consolas, Menlo, monospace; font-size: 7.9pt; line-height: 1.32; background: #F4F6F8; border: 1px solid #dde3ea;
      border-left: 3px solid #1F5F8B; padding: 7pt 9pt; white-space: pre-wrap; word-break: break-word; margin: 4pt 0 3pt; }
.cap { text-align: center; font-size: 9pt; color: #5b6573; margin: 3pt 0 10pt; }
.fig { text-align: center; margin: 6pt 0 0; break-inside: avoid; }
.fig img { max-width: 100%; }
.note { background: #EEF4FA; border-left: 3px solid #1F5F8B; padding: 7pt 10pt; margin: 4pt 0 10pt; font-size: 10.5pt; }
.pb { break-after: page; }
.toc p { margin: 0 0 3pt; text-align: left; } .toc .sub { padding-left: 18pt; } .toc .top { font-weight: bold; margin-top: 4pt; }
.sign { display: flex; justify-content: space-around; margin-top: 30pt; text-align: center; font-size: 10pt; color: #5b6573; }
.sign div { border-top: 1px solid #333; padding-top: 4pt; width: 22%; }
.cover { height: 255mm; display: flex; flex-direction: column; align-items: center; text-align: center; break-after: page; padding-top: 4mm; }
.cover img.logo { width: 34mm; }
.cover .uni { font-size: 19pt; font-weight: bold; color: #0B1B33; margin-top: 6pt; }
.cover .dept { font-size: 11.5pt; color: #5b6573; margin-bottom: 26pt; }
.cover .kind { font-size: 11pt; letter-spacing: 2.5pt; font-weight: bold; color: #1F5F8B; }
.cover .title { font-size: 21pt; font-weight: bold; color: #0B1B33; max-width: 150mm; margin: 6pt 0; line-height: 1.2; }
.cover .sub { font-size: 11.5pt; color: #5b6573; max-width: 140mm; margin-bottom: 26pt; text-align: center; }
.cover table { border-collapse: collapse; width: 150mm; font-size: 10.5pt; text-align: left; }
.cover td { border: 1px solid #b9c3cf; padding: 6pt 9pt; height: 24pt; }
.cover td.k { background: #EEF2F7; font-weight: bold; color: #0B1B33; width: 52mm; }
.cover .links { margin-top: 14pt; font-size: 8.6pt; color: #5b6573; line-height: 1.5; max-width: 160mm; }
.cover .links b { display: block; color: #1F5F8B; font-size: 10pt; margin-bottom: 2pt; }
.cover .date { margin-top: auto; color: #5b6573; font-size: 10.5pt; }
"""


def _inline_html(text):
    out = []
    for chunk, style in _split_inline(text):
        e = html.escape(chunk)
        if style == "":
            e = _URL.sub(lambda m: f"<a href='{m.group(1)}'>{m.group(1)}</a>", e)
        out.append({"b": f"<strong>{e}</strong>", "i": f"<em>{e}</em>", "c": f"<code>{e}</code>"}.get(style, e))
    return "".join(out)


def _data_uri(path):
    ext = os.path.splitext(path)[1].lower().strip(".")
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
    with open(path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


def to_html(cover, blocks, short_title):
    h = [f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(cover['title'])}</title>",
         f"<style>{CSS.replace('%SHORT%', short_title)}</style></head><body>"]
    rows = "".join(f"<tr><td class='k'>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in cover["fields"])
    links = "".join(f"<div>{html.escape(k)}: <a href='{v}'>{html.escape(v)}</a></div>" for k, v in LINKS)
    h.append(f"""<section class='cover'><img class='logo' src='{_data_uri(LOGO)}'>
<div class='uni'>Daffodil International University</div>
<div class='dept'>Department of {html.escape(cover.get('department', 'Software Engineering'))}</div>
<div class='kind'>{html.escape(cover['kind'].upper())}</div><div class='title'>{html.escape(cover['title'])}</div>
<div class='sub'>{html.escape(cover.get('subtitle', ''))}</div><table>{rows}</table>
<div class='links'><b>Project links</b>{links}</div>
<div class='date'>Submission date: {SUBMISSION_DATE}</div></section>""")
    for b in blocks:
        k = b[0]
        if k in ("h1", "h2", "h3"):
            h.append(f"<{k}>{_inline_html(b[1])}</{k}>")
        elif k == "p":
            h.append(f"<p>{_inline_html(b[1])}</p>")
        elif k in ("ul", "ol"):
            h.append(f"<{k}>" + "".join(f"<li>{_inline_html(i)}</li>" for i in b[1]) + f"</{k}>")
        elif k == "note":
            h.append(f"<div class='note'>{_inline_html(b[1])}</div>")
        elif k == "table":
            head, rows, widths = b[1], b[2], b[3]
            cols = ""
            if widths:
                tot = sum(widths)
                cols = "<colgroup>" + "".join(f"<col style='width:{100 * w / tot:.1f}%'>" for w in widths) + "</colgroup>"
            th = "".join(f"<th>{_inline_html(x)}</th>" for x in head)
            tr = "".join("<tr>" + "".join(f"<td>{_inline_html(str(c))}</td>" for c in r) + "</tr>" for r in rows)
            h.append(f"<table class='t'>{cols}<thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>")
        elif k == "code":
            h.append(f"<pre>{html.escape(b[1])}</pre>")
            if b[2]:
                h.append(f"<div class='cap'>{_inline_html(b[2])}</div>")
        elif k == "img":
            h.append(f"<div class='fig'><img src='{_data_uri(b[1])}' style='width:{b[2] * 10:.0f}mm'></div>")
            if b[3]:
                h.append(f"<div class='cap'>{_inline_html(b[3])}</div>")
        elif k == "pb":
            h.append("<div class='pb'></div>")
        elif k == "toc":
            h.append("<div class='toc'>" + "".join(
                f"<p class='{'sub' if '.' in n else 'top'}'>{html.escape(n)}&nbsp;&nbsp; {_inline_html(t)}</p>"
                for n, t in b[1]) + "</div>")
        elif k == "sign":
            h.append("<div class='sign'>" + "".join(f"<div>{html.escape(l)}</div>" for l in b[1]) + "</div>")
    h.append("</body></html>")
    return "\n".join(h)


def html_to_pdf(html_path, pdf_path):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf_path}", "file://" + html_path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)


def build(basename, cover, blocks, short_title):
    blocks = link_blocks() + list(blocks)
    docx_path = os.path.join(OUT, basename + ".docx")
    pdf_path = os.path.join(OUT, basename + ".pdf")
    html_path = os.path.join(OUT, "build", "html", basename + ".html")
    os.makedirs(os.path.dirname(html_path), exist_ok=True)
    to_docx(docx_path, cover, blocks, short_title)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(to_html(cover, blocks, short_title))
    html_to_pdf(html_path, pdf_path)
    print("built", basename)


GITHUB_URL = "https://github.com/kazinayeem/smart-road-ai"
APK_URL = "https://shorturl.at/2Ssjl"
VIDEO_URL = "https://shorturl.at/wMhFc"
DASHBOARD_URL = "https://shorturl.at/tqoFD"

LINKS = [
    ("GitHub repository", GITHUB_URL),
    ("Web dashboard (live)", DASHBOARD_URL),
    ("Android app (APK) download", APK_URL),
    ("Full project video", VIDEO_URL),
]


def link_blocks():
    return [H1("Project Links"),
            TABLE(["Resource", "Link"], [[k, v] for k, v in LINKS], [1.4, 3.6]),
            P("The repository holds the full source code (Android app, web dashboard, Firebase rules and functions, "
              "AI model scripts) and these documents. The video shows the complete system working end to end."),
            H2("Team and Contribution"),
            TABLE(["Name", "ID", "Contribution"], [[n, i_d, r] for n, i_d, r in TEAM], [1.3, 0.9, 4]),
            NOTE("**Statement of work.** The entire project, including the AI/ML model work, the Android app, the web "
                 "dashboard (frontend), the Firebase backend, testing, deployment and all of these documents, was "
                 "designed and built by **Mohammad Ali Nayeem** (232-35-022). The other two members took part in the "
                 "group discussion only."),
            PB()]


TEAM = [
    ("Mohammad Ali Nayeem", "232-35-022", "Team Lead. Did all of the work: idea, requirements, design, AI/ML model, Android app, web frontend, Firebase backend, testing, deployment, documentation and slides"),
    ("Mubashir Alam", "232-35-682", "Group member. Attended the group discussion only; no development or documentation work"),
    ("Nayem Miah", "232-35-628", "Group member. Attended the group discussion only; no development or documentation work"),
]
COURSE = [("Course Code", "SE 331"), ("Course Title", "Software Engineering Design Capstone Project"),
          ("Section", "42_H1"), ("Submitted To", "Dipta Dipayan Kar")]


def cover_fields(extra=()):
    rows = [("Team Lead" if i == 0 else "Member", f"{n}   (ID: {i_d})") for i, (n, i_d, _) in enumerate(TEAM)]
    return rows + COURSE + list(extra)
