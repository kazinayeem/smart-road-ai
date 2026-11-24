import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "SmartPothole AI — Research Evaluation & Architectural Comparative Analysis")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 748, 558, 748)
            
        # Footer
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_text)
        self.drawString(54, 32, "Confidential — Academic Research Paper Formulation Roadmap")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#1e3a8a")     # Deep Navy
    c_secondary = colors.HexColor("#0284c7")   # Sky Blue
    c_accent = colors.HexColor("#d97706")      # Amber
    c_dark = colors.HexColor("#0f172a")        # Slate 900
    c_body = colors.HexColor("#334155")        # Slate 700
    c_light = colors.HexColor("#f8fafc")       # Slate 50
    c_success = colors.HexColor("#16a34a")     # Green
    c_danger = colors.HexColor("#dc2626")      # Red
    c_border = colors.HexColor("#cbd5e1")      # Slate 300

    # Custom Typographical Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        spaceAfter=15
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_body
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=c_body,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_dark
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("SmartPothole AI: Research Paper Roadmap & Architectural Comparative Analysis", title_style))
    story.append(Paragraph("Systematic Evaluation of Original Capstone Proposal vs. Current Implemented Codebase", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=0, spaceAfter=10))

    meta_data = [
        [
            Paragraph("<b>Author:</b> Mohammad Ali Nayeem (AI/ML Lead)<br/><b>Project:</b> SmartPothole AI (Group 5, SE 331)", meta_style),
            Paragraph(f"<b>Supervisor:</b> Dipta Dipayan Kar<br/><b>Date:</b> November 24, 2026 | <b>Version:</b> 2.0-Final", meta_style)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[270, 234])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_light),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # Executive Summary Box
    summary_html = """<b>Executive Summary:</b> This evaluation provides an in-depth academic synthesis comparing the original three university capstone documents (October–November 2026) against the working, production-grade repository code implemented in <b>SmartPothole</b>. The current repository excels significantly in <i>privacy-preserving telemetry (zero-media upload)</i>, <i>on-device INT8 Edge AI inference</i>, <i>free OpenStreetMap compliance</i>, and <i>atomic spatial-heading deduplication</i>. However, the original conceptual papers featured advanced mathematical models (camera homography distance estimation, accelerometer multi-modal fusion, and ByteTrack temporal tracking) which remain vital opportunities to incorporate into your formal IEEE/Springer research paper submission."""
    
    t_summary = Table([[Paragraph(summary_html, callout_style)]], colWidths=[504])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BOX', (0,0), (-1,-1), 1.5, c_secondary),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 14))

    # SECTION 1
    story.append(Paragraph("1. Review of the Three Original Foundation Documents", h1_style))
    story.append(Paragraph("The research project originates from three technical papers created during the Fall 2026 capstone curriculum:", body_style))

    doc_data = [
        [Paragraph("Document", table_header), Paragraph("Core Scope & Paradigm", table_header), Paragraph("Key Strengths", table_header), Paragraph("Critical Research Limitations", table_header)],
        [
            Paragraph("<b>Doc 1: Capstone Report</b><br/>(32 Pages, Oct 2026)", table_cell),
            Paragraph("Server-Centric municipal workflow. Citizens upload video/photos; NestJS + BullMQ dispatch to FastAPI (YOLOv8); results mapped to PostgreSQL/PostGIS.", table_cell),
            Paragraph("Exhaustive software engineering specification, complete UML diagrams (Class, Sequence, ERD), ISO/IEC 25010 compliance.", table_cell),
            Paragraph("High cellular bandwidth (video uploads), high server GPU costs, latency > 2s making real-time driver alerts impossible, severe privacy concerns.", table_cell)
        ],
        [
            Paragraph("<b>Doc 2: Driver Mode Plan</b><br/>(10 Pages, Nov 2026)", table_cell),
            Paragraph("Citizen-side extension: On-device Edge AI running on bikes/cars, audio-visual driver warnings, and spatial heading alert dispatch to trailing motorists.", table_cell),
            Paragraph("Pioneered homography optical distance: <i>d = h / tan(θ)</i>, accelerometer z-axis bump fusion, and azimuth traffic direction filtering.", table_cell),
            Paragraph("Remained a design proposal; proposed React Native which suffers high JNI bridge overhead during high-fps native CameraX tensor processing.", table_cell)
        ],
        [
            Paragraph("<b>Doc 3: Architecture Decision</b><br/>(9 Pages, Nov 2026)", table_cell),
            Paragraph("Trade-off study: Cloud GPU streaming vs. Mobile Offline-First architecture for Bangladesh road conditions.", table_cell),
            Paragraph("Formulated 'offline is normal, online is a bonus'. Outlined SQLite outbox buffering, exponential backoff, and delta tile synchronization.", table_cell),
            Paragraph("Did not implement zero-media telemetry (still planned thumbnail uploads); lacked multi-user live collaborative companion sessions.", table_cell)
        ]
    ]

    t_docs = Table(doc_data, colWidths=[110, 140, 124, 130])
    t_docs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light])
    ]))
    story.append(t_docs)
    story.append(Spacer(1, 14))

    # SECTION 2
    story.append(Paragraph("2. Comparative Matrix: Original Proposal vs. Current Implementation", h1_style))
    story.append(Paragraph("The actual repository implemented a vastly upgraded, robust production architecture. Here is where the code exceeds the original proposal, and where gaps exist:", body_style))

    comp_data = [
        [Paragraph("Architectural Dimension", table_header), Paragraph("Original Concept (Docs A, B, C)", table_header), Paragraph("Current Repository Implementation", table_header), Paragraph("Comparative Verdict", table_header)],
        [
            Paragraph("<b>Media & Privacy Protection</b>", table_cell_bold),
            Paragraph("Uploads video clips (500 MB/hr) or compressed JPEG snapshots for server-side verification.", table_cell),
            Paragraph("<b>Strict Zero-Media Telemetry:</b> Raw video/frames never leave device memory. Only JSON coordinates, confidence, and priority synced.", table_cell),
            Paragraph("<font color='#16a34a'><b>Repository Superior</b></font><br/>100% GDPR/privacy safe; minimal 4G data.", table_cell)
        ],
        [
            Paragraph("<b>AI Inference Engine</b>", table_cell_bold),
            Paragraph("Cloud GPU (YOLOv8m) or React Native TFLite proposal.", table_cell),
            Paragraph("<b>Native Kotlin + ONNX Runtime Mobile</b> (INT8 YOLOv8s, 10.96 MB) using direct native NIO ByteBuffer (zero SIGSEGV memory leaks).", table_cell),
            Paragraph("<font color='#16a34a'><b>Repository Superior</b></font><br/>Ultra-stable 47-76ms native execution.", table_cell)
        ],
        [
            Paragraph("<b>GIS & Map Independence</b>", table_cell_bold),
            Paragraph("React Leaflet on web, unspecified on mobile. Later Carto basemaps caused API key watermarks.", table_cell),
            Paragraph("<b>100% Free OpenStreetMap:</b> Native OSM (osmdroid Mapnik) on Android + Leaflet on web with dynamic 120-150m Safe Area circle.", table_cell),
            Paragraph("<font color='#16a34a'><b>Repository Superior</b></font><br/>Zero commercial billing, zero API locks.", table_cell)
        ],
        [
            Paragraph("<b>Collaborative Monitoring</b>", table_cell_bold),
            Paragraph("Only single driver alert or backend post-processing.", table_cell),
            Paragraph("<b>Live Companion Mode:</b> Real-time multi-user sessions via 6-digit codes; companion tracks scanner location and defect pins live.", table_cell),
            Paragraph("<font color='#16a34a'><b>Repository Superior</b></font><br/>Enables team patrol / dispatcher monitoring.", table_cell)
        ],
        [
            Paragraph("<b>Distance Estimation Math</b>", table_cell_bold),
            Paragraph("Trigonometric single-camera homography: <i>d = h / tan(θ)</i> based on mount height and camera pitch.", table_cell),
            Paragraph("Heuristic bounding box area ratio and GPS distance calculation.", table_cell),
            Paragraph("<font color='#d97706'><b>Paper Proposal Better</b></font><br/>Homography provides higher mathematical rigor.", table_cell)
        ],
        [
            Paragraph("<b>Multi-Modal Sensor Fusion</b>", table_cell_bold),
            Paragraph("Accelerometer z-axis bump spike (>1.5g) to confirm pothole presence and boost confidence.", table_cell),
            Paragraph("Vision-only inference; accelerometer code not fully wired into real-time inference loop.", table_cell),
            Paragraph("<font color='#d97706'><b>Paper Proposal Better</b></font><br/>Dual-sensor fusion is highly prized in research.", table_cell)
        ],
        [
            Paragraph("<b>Temporal Object Tracking</b>", table_cell_bold),
            Paragraph("ByteTrack multi-frame association requiring defect detection across ≥ 3 consecutive frames.", table_cell),
            Paragraph("Per-frame spatial cooldown and GPS proximity window deduplication.", table_cell),
            Paragraph("<font color='#d97706'><b>Paper Proposal Better</b></font><br/>ByteTrack filters transient road shadow noise.", table_cell)
        ]
    ]

    t_comp = Table(comp_data, colWidths=[100, 130, 154, 120])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light])
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 14))

    # SECTION 3
    story.append(PageBreak())
    story.append(Paragraph("3. What You Should Do Next: The Roadmap for a Top-Tier Paper", h1_style))
    story.append(Paragraph("To turn your codebase into an IEEE Access, Springer, or ACM Intelligent Transportation Systems (ITS) published paper, implement the following four concrete steps:", body_style))

    roadmap_steps = [
        ("Step 1: Wire Accelerometer Bump Fusion (Multi-Modal AI)",
         "In Android's <code>SensorEventListener</code>, log the z-axis linear acceleration. When the camera detects a pothole and a vertical acceleration spike (|Az| > 1.4g) occurs within 0.5-1.5 seconds later (depending on speed), combine them into a fused confidence score: <i>C_fused = 0.7 * C_vision + 0.3 * C_accel</i>. This gives your paper a multi-modal edge over 90% of computer vision papers."),
        
        ("Step 2: Formalize Optical Homography for Distance",
         "Implement the single-camera trigonometric distance model from Document B: <i>d = h / tan(pitch + atan((y - cy)/fy))</i>. Present the mathematical derivation and plot an Error vs. Distance curve (e.g., ground truth tape measure at 5m, 10m, 15m vs. predicted distance)."),
        
        ("Step 3: Conduct Real-World Empirical Benchmarking in Dhaka",
         "Run a physical 5 km road test on an actual road (e.g., Mirpur Road or Airport Road). Record: (a) Total physical potholes encountered, (b) Detections recorded, (c) GPS drift distribution (±4m to ±15m), and (d) Deduplication success rate. Present this in a standard Confusion Matrix (True Positive, False Positive, False Negative)."),
        
        ("Step 4: Energy & Bandwidth Profiling",
         "Measure battery consumption (mAh per hour) and mobile data footprint (KB per hour). Compare your Zero-Media telemetry (< 2 MB/hour) against traditional video streaming (300-500 MB/hour). This proves your system's commercial and civic feasibility for developing economies.")
    ]

    for title, desc in roadmap_steps:
        p_t = Paragraph(f"<b>{title}</b>", body_bold)
        p_d = Paragraph(desc, body_style)
        t_box = Table([[p_t], [p_d]], colWidths=[504])
        t_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_light),
            ('BOX', (0,0), (-1,-1), 1, c_secondary),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_box)
        story.append(Spacer(1, 8))

    # SECTION 4
    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Recommended Research Paper Outline (IEEE Format)", h1_style))
    
    outline_data = [
        [Paragraph("Section", table_header), Paragraph("Target Contents & Key Data to Report", table_header)],
        [Paragraph("<b>I. Introduction</b>", table_cell), Paragraph("Urban road degradation costs, limitations of cloud-streaming and municipal manual surveys, four specific contributions of SmartPothole.", table_cell)],
        [Paragraph("<b>II. Related Work</b>", table_cell), Paragraph("Comparison with vibration-only systems (Waze/Pothole Patrol) and heavy cloud CV systems. Highlight edge inference novelty.", table_cell)],
        [Paragraph("<b>III. System Architecture</b>", table_cell), Paragraph("Three-tier architecture: Android Edge Client (ONNX), Realtime Sync Broker (Firebase), and Municipal Web GIS Dashboard (OSM).", table_cell)],
        [Paragraph("<b>IV. Methodology & Algorithms</b>", table_cell), Paragraph("YOLOv8s INT8 quantization, NIO native buffer memory safety, atomic spatial-heading deduplication algorithm, dynamic Safe-Area horizon.", table_cell)],
        [Paragraph("<b>V. Experimental Evaluation</b>", table_cell), Paragraph("Inference latency across devices, mAP50 (38.7%-42.0%), Precision (58.6%-66.5%), deduplication accuracy under GPS jitter, battery/data overhead.", table_cell)],
        [Paragraph("<b>VI. Conclusion & Future Work</b>", table_cell), Paragraph("Summary of achievements, integration of vehicular CAN bus data, automated municipal work order dispatching.", table_cell)]
    ]
    t_outline = Table(outline_data, colWidths=[140, 364])
    t_outline.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light])
    ]))
    story.append(t_outline)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF built successfully: {filename}")

if __name__ == '__main__':
    target_path = "documentation/SmartPothole_Research_Evaluation_Report.pdf"
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    build_pdf(target_path)
