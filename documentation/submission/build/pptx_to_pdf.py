"""
Minimal PPTX -> HTML -> PDF converter for the presentation deck.

It handles what the deck uses: solid / gradient slide backgrounds, rectangles, rounded rectangles, the two kinds
of custom shapes in the deck (round number badges and thin accent bars on card tops), text boxes with run
formatting and hyperlinks, and pictures (with rounded corners). Chrome prints the HTML to PDF.
"""
import base64
import html
import os

from pptx import Presentation
from pptx.oxml.ns import qn
from pptx.util import Emu

from render import html_to_pdf

EMU_IN = 914400


def _px(emu):  # 96 px per inch
    return emu / EMU_IN * 96


def _color(el):
    """Return a CSS colour from an element containing a:srgbClr (with optional alpha)."""
    c = el.find(qn("a:srgbClr")) if el is not None else None
    if c is None:
        return None
    a = c.find(qn("a:alpha"))
    hexv = c.get("val")
    if a is not None:
        r, g, b = int(hexv[0:2], 16), int(hexv[2:4], 16), int(hexv[4:6], 16)
        return f"rgba({r},{g},{b},{int(a.get('val')) / 100000:.2f})"
    return "#" + hexv


def _fill(spPr):
    if spPr is None:
        return None
    sf = spPr.find(qn("a:solidFill"))
    if sf is not None:
        return _color(sf)
    gf = spPr.find(qn("a:gradFill"))
    if gf is not None:
        stops = []
        for gs in gf.iter(qn("a:gs")):
            stops.append(f"{_color(gs)} {int(gs.get('pos')) / 1000:.0f}%")
        if gf.find(qn("a:path")) is not None:
            return f"radial-gradient(circle at center, {', '.join(stops)})"
        lin = gf.find(qn("a:lin"))
        ang = int(lin.get("ang")) / 60000 + 90 if lin is not None else 180
        return f"linear-gradient({ang:.0f}deg, {', '.join(stops)})"
    return None


def _line(spPr):
    ln = spPr.find(qn("a:ln")) if spPr is not None else None
    if ln is None or ln.find(qn("a:solidFill")) is None:
        return ""
    w = max(1, _px(int(ln.get("w", "9525"))))
    return f"border:{w:.1f}px solid {_color(ln.find(qn('a:solidFill')))};"


def _radius(spPr, w, h):
    geom = spPr.find(qn("a:prstGeom")) if spPr is not None else None
    if geom is None:
        return 0
    prst = geom.get("prst")
    if prst == "ellipse":
        return min(w, h) / 2
    if prst == "roundRect":
        gd = geom.find(".//" + qn("a:gd"))
        adj = int(gd.get("fmla").split()[1]) / 100000 if gd is not None else 0.16667
        return min(w, h) * adj
    return 0


def _text_html(sp):
    if not sp.has_text_frame:
        return ""
    tf = sp.text_frame
    body = tf._txBody.find(qn("a:bodyPr"))
    anchor = {"ctr": "center", "b": "flex-end"}.get(body.get("anchor") if body is not None else None, "flex-start")
    ins = [int(body.get(k, d)) for k, d in (("tIns", 45720), ("rIns", 91440), ("bIns", 45720), ("lIns", 91440))] \
        if body is not None else [45720, 91440, 45720, 91440]
    paras = []
    for p in tf.paragraphs:
        pPr = p._p.find(qn("a:pPr"))
        align = {"ctr": "center", "r": "right", "just": "justify"}.get(pPr.get("algn") if pPr is not None else None, "left")
        lh = "line-height:1.2;"
        if pPr is not None:
            sp_pts = pPr.find(qn("a:lnSpc") + "/" + qn("a:spcPts"))
            if sp_pts is not None:
                lh = f"line-height:{int(sp_pts.get('val')) / 100 * 96 / 72:.1f}px;"
        runs = []
        base = 18.0
        if p.runs:
            r0 = p.runs[0]._r.find(qn("a:rPr"))
            if r0 is not None and r0.get("sz"):
                base = int(r0.get("sz")) / 100
        for r in p.runs:
            rPr = r._r.find(qn("a:rPr"))
            size = int(rPr.get("sz")) / 100 if rPr is not None and rPr.get("sz") else 18
            css = f"font-size:{size * 96 / 72:.1f}px;" + lh
            if rPr is not None:
                if rPr.get("b") == "1":
                    css += "font-weight:700;"
                if rPr.get("spc"):
                    css += f"letter-spacing:{int(rPr.get('spc')) / 100 * 96 / 72:.2f}px;"
                col = _color(rPr.find(qn("a:solidFill")))
                if col:
                    css += f"color:{col};"
            t = html.escape(r.text)
            if r.hyperlink.address:
                t = f"<a href='{html.escape(r.hyperlink.address)}' style='color:inherit;text-decoration:none'>{t}</a>"
            runs.append(f"<span style='{css}'>{t}</span>")
        if not runs:
            runs.append("&nbsp;")
        paras.append(f"<div style='text-align:{align};font-size:{base * 96 / 72:.1f}px;{lh}'>{''.join(runs)}</div>")
    pad = ";".join(f"padding-{s}:{_px(v):.1f}px" for s, v in zip(("top", "right", "bottom", "left"), ins))
    return (f"<div style='position:absolute;inset:0;display:flex;flex-direction:column;justify-content:{anchor};{pad}'>"
            f"{''.join(paras)}</div>")


def slide_html(slide):
    bg = slide._element.find(qn("p:cSld") + "/" + qn("p:bg"))
    bg_css = _fill(bg.find(qn("p:bgPr"))) if bg is not None else "#FFFFFF"
    out = [f"<section class='s' style='background:{bg_css or '#fff'}'>"]
    for sh in slide.shapes:
        x, y, w, h = (_px(v or 0) for v in (sh.left, sh.top, sh.width, sh.height))
        box = f"position:absolute;left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:{h:.1f}px;"
        spPr = sh._element.find(qn("p:spPr"))
        if sh.shape_type == 13:  # picture
            blob = sh.image.blob
            mime = "image/png" if sh.image.ext == "png" else "image/jpeg"
            rad = _radius(spPr, w, h)
            out.append(f"<img src='data:{mime};base64,{base64.b64encode(blob).decode()}' "
                       f"style='{box}object-fit:cover;border-radius:{rad:.1f}px'>")
            continue
        fill = _fill(spPr)
        style = box + _line(spPr)
        if spPr is not None and spPr.find(qn("a:custGeom")) is not None:
            if abs(w - h) < 2:  # round number badge
                style += "border-radius:50%;"
            else:  # thin accent bar along the top of a card
                style = (f"position:absolute;left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:4px;"
                         f"border-radius:{min(17, w / 2):.0f}px {min(17, w / 2):.0f}px 0 0;")
        else:
            style += f"border-radius:{_radius(spPr, w, h):.1f}px;"
        if fill:
            style += f"background:{fill};"
        out.append(f"<div style='{style}'>{_text_html(sh)}</div>")
    out.append("</section>")
    return "\n".join(out)


def convert(pptx_path, pdf_path, html_path):
    prs = Presentation(pptx_path)
    W, H = prs.slide_width / EMU_IN, prs.slide_height / EMU_IN
    css = (f"@page {{ size: {W}in {H}in; margin: 0 }} * {{ box-sizing: border-box; margin: 0; padding: 0 }}"
           f"body {{ font-family: Arial, Helvetica, sans-serif }}"
           f".s {{ width: {W}in; height: {H}in; position: relative; overflow: hidden; break-after: page }}")
    doc = [f"<!doctype html><html><head><meta charset='utf-8'><style>{css}</style></head><body>"]
    doc += [slide_html(s) for s in prs.slides]
    doc.append("</body></html>")
    os.makedirs(os.path.dirname(html_path), exist_ok=True)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write("\n".join(doc))
    html_to_pdf(html_path, pdf_path)
