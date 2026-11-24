# SmartPothole AI — System Architecture Document

## 1. Executive Summary
SmartPothole AI is an enterprise-grade civic technology system engineered for real-time pothole identification, geospatial hazard mapping, and complete end-to-end municipal road maintenance lifecycle management. The system is split across two primary clients backed by a reactive cloud database:
1. **Native Android Application (Citizen & Driver Mode)**: Runs on-device YOLOv8 inference locally via ONNX Runtime Mobile (`com.microsoft.onnxruntime:onnxruntime-android`), caches reports offline using Room SQLite, and synchronizes with Firebase via background WorkManager.
2. **Next.js Web Management Dashboard (City Corporation & Contractors)**: High-density administrative GIS portal using React 19, TypeScript, Tailwind CSS, Leaflet OpenStreetMap, and Firebase Realtime Database.
3. **Firebase Cloud Layer**: Firebase Authentication, Realtime Database (`cryptro-default-rtdb`), Firebase Storage, and role-based security rules.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                          |
|                                                                                         |
|   +------------------------------------+       +------------------------------------+   |
|   |       Native Android Client        |       |        Next.js Web Dashboard       |   |
|   |  - CameraX Road Capture / Preview  |       |  - City Corporation Admin Portal   |   |
|   |  - On-Device YOLOv8s INT8 Model    |       |  - Contractor Operations Desk      |   |
|   |  - LocationTracker (GPS/Accuracy)  |       |  - Citizen Web Reporting View      |   |
|   |  - Room DB (Offline Outbox Queue)  |       |  - Interactive Leaflet GIS Map     |   |
|   |  - WorkManager Automatic Sync      |       |  - LLM Summary Report Generator    |   |
|   +-----------------+------------------+       +-----------------+------------------+   |
+---------------------|--------------------------------------------|----------------------+
                      |                                            |
                      | HTTPS / WSS                                | Realtime WebSockets
                      v                                            v
+-----------------------------------------------------------------------------------------+
|                                  FIREBASE BACKEND TIER                                  |
|                                                                                         |
|   +-----------------------+  +-----------------------+  +-----------------------+       |
|   | Firebase Auth         |  | Realtime Database     |  | Firebase Storage      |       |
|   | - Citizen             |  | /reports/{id}         |  | /reports/{id}/orig    |       |
|   | - City Corporation    |  | /users/{uid}          |  | /repairs/{id}/before  |       |
|   | - Contractor          |  | /contractors/{id}     |  | /repairs/{id}/after   |       |
|   |                       |  | /activity_logs/{id}   |  | /profiles/{uid}/avatar|       |
|   +-----------------------+  +-----------------------+  +-----------------------+       |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Subsystem Breakdown

### 3.1 Edge AI Model (Mobile Inference)
- **Base Architecture**: YOLOv8s single-class detector (`best.pt`, 11.13M parameters).
- **Mobile Format**: Quantized ONNX format (`pothole_yolov8s_quant_int8.onnx`, 10.96 MB).
- **Execution Engine**: ONNX Runtime Mobile with 4 intra-op CPU threads or NNAPI acceleration.
- **Input Tensor**: `[1, 3, 640, 640]` normalized float32.
- **Output Tensor**: `[1, 5, 8400]` containing candidate box coords and confidence scores.
- **Deterministic Severity Engine**:
  $$\text{Area Ratio} = \frac{\text{width} \times \text{height}}{640 \times 640}$$
  - **CRITICAL / HIGH**: $\text{Area Ratio} \ge 0.08$ OR ($\text{Confidence} \ge 0.85$ AND $\text{Area Ratio} \ge 0.04$).
  - **MEDIUM**: $0.03 \le \text{Area Ratio} < 0.08$.
  - **LOW**: $\text{Area Ratio} < 0.03$.

### 3.2 Offline-First Android Client
- Camera preview driven by **CameraX** with live HUD bounding box overlays.
- Detections saved locally to **Room SQLite Database** with idempotency key (`clientUuid`).
- **WorkManager** detects network connectivity return and flushes queued outbox reports to Firebase Storage and Realtime Database.

### 3.3 Web Management Dashboard
- Multi-role role-based switching and UI scoping.
- **Leaflet OpenStreetMap** renders defects with colored pins:
  - **Red**: Unresolved / New Reports
  - **Orange**: Under Review / Verified
  - **Blue**: Assigned to Contractor
  - **Yellow**: Repair In Progress
  - **Purple**: Repair Evidence Submitted
  - **Green**: Certified Resolved

---

## 4. Complete Report Lifecycle Workflow

$$\text{NEW\_REPORT} \longrightarrow \text{UNDER\_REVIEW} \longrightarrow \text{VERIFIED} \longrightarrow \text{ASSIGNED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{REPAIR\_SUBMITTED} \longrightarrow \text{CITY\_VERIFICATION} \longrightarrow \text{RESOLVED}$$

- **Rejected Branch**: $\text{REJECTED}$ or $\text{DUPLICATE}$.
- **Declined Branch**: $\text{ASSIGNMENT\_DECLINED}$ (returns to triage).
- **Rework Branch**: $\text{REPAIR\_REJECTED}$ (contractor must recut/repatch).
- **Audit Requirement**: Every single state change is recorded in an immutable `/activity_logs/{reportId}` entry with previous status, new status, actor name, and timestamp.
