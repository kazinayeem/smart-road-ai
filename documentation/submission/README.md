# SmartPothole: Submission Documents (SE 331, Section 42_H1)

Submitted to **Dipta Dipayan Kar**. Deadline: 9 December 2026, 11:59 PM. Presentation: 10 December.

| # | Requirement (from the board) | Word | PDF |
|---|---|---|---|
| 1 | SRS large doc (as lab report) + code of main features | `01_SRS_Lab_Report.docx` | `01_SRS_Lab_Report.pdf` |
| 2 | Project proposal | `02_Project_Proposal.docx` | `02_Project_Proposal.pdf` |
| 3 | Only code part + short descriptions | `03_Code_Documentation.docx` | `03_Code_Documentation.pdf` |
| 4 | Diagrams and workflows | `04_Diagrams_and_Workflows.docx` | `04_Diagrams_and_Workflows.pdf` |
| 5 | Group discussion doc | `05_Group_Discussion.docx` | `05_Group_Discussion.pdf` |
| 6 | Presentation slides (project pushed to Git, fork included) | `06_Presentation_Slides.pptx` | `06_Presentation_Slides.pdf` |

## Team
- Mohammad Ali Nayeem (232-35-022), Team Lead: did all of the work (AI/ML, Android, web frontend, Firebase backend, testing, deployment, documents and slides)
- Mubashir Alam (232-35-682), Member: attended the group discussion only
- Nayem Miah (232-35-628), Member: attended the group discussion only

## Links
- Source code: https://github.com/kazinayeem/smart-road-ai
- Android APK: https://shorturl.at/2Ssjl
- Web dashboard: https://shorturl.at/tqoFD
- Project video: https://shorturl.at/wMhFc
- Demo video (YouTube): https://youtu.be/4Cp7OcaJe8g

## Rebuilding
All documents are generated from `build/` (Python 3, `python-docx`, `python-pptx`, `matplotlib`, Google Chrome for PDF).
Code listings are read directly from the repository, so they always match the current code.
The slides are built from the team's own deck (`build/reference_presentation.pptx`): `slides.py` adds the DIU title details, a Team slide, a Links slide with QR codes and the credit line, switches fonts to Arial, and `pptx_to_pdf.py` draws the PDF.

```bash
cd documentation/submission/build
python3 diagrams.py
for f in doc_srs doc_proposal doc_code doc_diagrams doc_discussion slides; do python3 $f.py; done
```

Team details and course info are in `build/render.py` (`TEAM`, `COURSE`).
