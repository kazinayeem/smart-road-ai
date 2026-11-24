# SmartPothole — AI-Powered Smart Pothole Detection & Civic Road Maintenance Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Android](https://img.shields.io/badge/Android-Kotlin%20%7C%20CameraX-green?logo=android)](https://developer.android.com/)
[![YOLOv8](https://img.shields.io/badge/AI%20Model-YOLOv8s%20INT8%20ONNX%20(10.96MB)-orange)](https://github.com/ultralytics/ultralytics)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20RTDB-amber?logo=firebase)](https://firebase.google.com/)

A production-grade, end-to-end civic road maintenance ecosystem featuring **real-time on-device YOLOv8 AI inference on Android (CameraX)**, **zero camera frame / video uploads (metadata-only telemetry transmission)**, **strict role-gated authentication**, and a **multi-role municipal management web portal** for City Corporations, Contractors, and Citizens.

---

## 🚀 Key Highlights & Architectural Features

### 1. Strict Authentication & Role Isolation (No Guest Access)
- **Zero Public Data Leakage**: Unauthenticated visitors are restricted strictly to the **Login / Register** portal. No municipal queues, GIS maps, or contractor listings are accessible without authentication.
- **Three Distinct Roles**:
  - `CITY_CORPORATION`: Municipal Executive Engineer dashboard with triage queue, contractor assignment, SLA management, and final verification & closure authorization.
  - `CONTRACTOR`: Dedicated portal for assigned repair jobs, status updates (`IN_PROGRESS`, `REPAIR_SUBMITTED`), and repair notes. **Contractors cannot self-resolve tickets.**
  - `CITIZEN`: Real-time interactive Leaflet GIS map with color-coded severity markers, 1-tap on-device GPS mark submission, and personal submission tracking.
- **Client-Side Security**: Citizen registration strictly assigns the `CITIZEN` role. Users cannot self-escalate roles. Mock role switches and dev seeding buttons have been completely eliminated from the production interface.

### 2. Live On-Device Android AI Detection (CameraX + ONNX Mobile)
- **Real-Time Continuous Analysis**: CameraX `ImageAnalysis` analyzer feeds frames directly to the quantized YOLOv8 INT8 model (`10.96 MB`) on a dedicated background executor without blocking the preview stream.
- **Zero Image or Video Upload**: Road camera frames and video streams remain **100% on-device**. The mobile client transmits **strictly structured detection metadata**, eliminating bandwidth bottlenecks, battery drain, and storage costs:
  ```json
  {
    "reportId": "PTH-001",
    "reporterId": "USER_ID",
    "detectionClass": "pothole",
    "confidence": 0.94,
    "latitude": 23.8103,
    "longitude": 90.4125,
    "gpsAccuracy": 8.5,
    "timestamp": 1732365000000,
    "source": "LIVE_CAMERA",
    "status": "NEW"
  }
  ```
- **HUD Telemetry**: Live camera overlay displays FPS, inference latency (ms), detection status, confidence %, and detection counter.
- **Duplicate Protection**:
  - 3.5s detection cooldown
  - $\ge 0.55$ confidence threshold
  - 20-meter spatial proximity clustering
  - Auto vs. Manual submission modes

### 3. Offline-First Resilience
- Detections captured without network connectivity are buffered locally in Android SQLite Room DB (`AppDatabase`).
- Android Jetpack `WorkManager` (`SyncWorker`) synchronizes pending records to Firebase Realtime Database upon network reconnection.

### 4. Live Companion Mode (Shared Multi-User Detection)
- **Collaborative Road Hazard Surveillance**: Allows two or more authenticated users to participate in the same live scanning session.
  - **Scanner Mode (User A)**: Mounts device on vehicle dashboard. Executes on-device YOLOv8 edge AI, broadcasting moving GPS breadcrumbs and pothole detections to Firebase Realtime Database. Displays active companion count badge.
  - **Companion Mode (User B)**: Monitors scanning session in real time. Adaptive multi-panel UI displays the scanner's live moving position, breadcrumbs, defect pins on OpenStreetMap, and a live detection stream.
  - **Real-Time Push & In-App Alerts**: Instant notification when a new defect is detected, scanner relocates to a new area (>600m), scanner loses GPS lock (>15s), goes offline (>30s), or session ends.
  - **Strict Zero-Stream Privacy**: No live camera video streaming, no frames or images uploaded. Strictly structured telemetry metadata.

### 5. Instant Local Warnings & Hands-Free Safety (100% Offline)
- **Immediate Detection Warning**: Triggers locally on the scanning device without waiting for Firebase synchronization.
- **Hands-Free Driver Safety**: Offline Android `TextToSpeech` voice prompt ("Warning: Pothole detected ahead") and double-buzz haptic vibration alerts the driver without requiring screen interaction.
- **On-Screen High-Visibility Warning Banner**: Top animated alert banner displays defect confidence and hazard severity.
- **Direction & Heading Awareness**: Distinguishes potholes ahead in the vehicle's path of travel ($\le 65^\circ$ heading delta) from those already passed ($> 70^\circ$).

### 6. Smart Duplicate Detection & Data Separation
- **Separated Schemas**: `potholes/` (physical defects) and `detections/` (individual inspection passes).
- **Spatial Clustering**: Detections within a 20-meter matching window update the existing physical pothole (`totalDetections += 1`), while preserving an immutable record in `detections/`.
- **Atomic Operations**: Firebase transactions ensure concurrency safety when multiple vehicles pass the same pothole simultaneously.

### 7. Mandatory Free & Open Source Mapping (OpenStreetMap)
- **Zero Google Maps Billing / API Keys**:
  - **Android**: `osmdroid` with standard OpenStreetMap tiles (`MAPNIK`), visible OSM attribution watermark, and interactive **Safe Area / Monitoring Horizon Circle** (120m radius).
  - **Web Dashboard**: Leaflet + OpenStreetMap tiles with visible attribution `© OpenStreetMap contributors`, marker clustering, status filters, and 150m Safe Area circle.
  - **Consistent Status Colors**: RED = NEW, ORANGE = UNDER_REVIEW, BLUE = ASSIGNED, YELLOW = IN_PROGRESS, GREEN = RESOLVED, GRAY = REJECTED.

### 8. 9-Stage Municipal Lifecycle & Governance
Tickets transition systematically through:
`NEW` ➔ `UNDER_REVIEW` ➔ `VERIFIED` ➔ `ASSIGNED` ➔ `ACCEPTED` ➔ `IN_PROGRESS` ➔ `REPAIR_SUBMITTED` ➔ `CITY_VERIFICATION` ➔ `RESOLVED`.
- Only `CITY_CORPORATION` can authorize final ticket resolution and closure.

---

## 🔑 Pre-Configured Demo Accounts

Run the development seed script to initialize users and sample reports:
```bash
node scripts/seed_demo_accounts.js
```

| Role | Name | Email | Password |
|---|---|---|---|
| **City Corporation (Admin)** | Kamal Hossain (Executive Engineer, DNCC) | `city@pothole.org` | `CityAdmin@2026!` |
| **Contractor** | M/S Apex Road Infrastructure Ltd. | `contractor@pothole.org` | `Contractor@2026!` |
| **Citizen** | Rahim Ahmed (Citizen Reporter) | `citizen@pothole.org` | `Citizen@2026!` |

---

## 🛠️ Quick Start

### Web Management Dashboard
```bash
cd web-dashboard
npm install --legacy-peer-deps
npm run build
npm start
```
Web dashboard runs on `http://localhost:3000` (or `http://localhost:3300`).

### Android Native Application
```bash
cd android-app
./gradlew assembleDebug
```
Output APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`.

### End-to-End Verification Test Suite
```bash
python3 ai-model/scripts/e2e_verification_test.py
```

---

## 📂 Project Structure

```
├── ai-model/
│   ├── exported/           # ONNX exported model (42.67 MB)
│   ├── optimized/          # INT8 quantized ONNX model (10.96 MB)
│   └── scripts/            # Quantization, export & verification tests
├── android-app/            # Native Kotlin Android App (CameraX, ONNX Runtime Mobile, Room)
│   └── app/src/main/
│       ├── assets/         # pothole_yolov8s.onnx asset
│       └── java/org/smartpothole/app/
│           ├── camera/     # CameraActivity & live CameraX analyzer
│           ├── data/       # Room entity, DAO & AppDatabase
│           ├── sync/       # WorkManager SyncWorker
│           └── ui/         # MainActivity & MapActivity
├── web-dashboard/          # Next.js 14 Web Management Dashboard
│   ├── app/                # App router (role-gated page & auth)
│   ├── components/         # AuthScreen, CityCorpDashboard, ContractorView, CitizenView
│   └── lib/                # Firebase Auth & Realtime Database bindings
├── scripts/
│   └── seed_demo_accounts.js # Secure development seed script
└── documentation/          # Architecture, Setup & Database schema specs
```
