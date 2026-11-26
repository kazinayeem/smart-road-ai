# SmartPothole AI — Setup & Installation Guide

## 1. Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **NPM**: v9.0.0 or later
- **Python**: 3.10+ (for model export and benchmark scripts)
- **Android Studio**: Ladybug / Hedgehog or later with Android SDK 35
- **JDK**: Java 17 or Java 21

---

## 2. Web Management Dashboard Setup

1. **Navigate to the dashboard directory**:
   ```bash
   cd web-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000` (or `http://localhost:3300`).

4. **Production Build & Start**:
   ```bash
   npm run build
   npm start
   ```

---

## 3. Strict Authentication & Demo Seed Accounts

The platform operates under **Strict Authentication**:
- Unauthenticated visitors are restricted strictly to the **Login / Register** portal (`AuthScreen`).
- No dashboard metrics, GIS maps, or municipal queues are accessible without authentication.
- Users cannot assign or escalate their own roles. Citizen registration strictly assigns the `CITIZEN` role.
- All development and mock role-switching controls have been eliminated from the production user interface.

### Development-Only Seed Script
To initialize demo accounts and structured metadata reports in Firebase Auth and Realtime Database:

```bash
node scripts/seed_demo_accounts.js
```

### Pre-Configured Demo Credentials

| Role | Name | Email | Password | Scope & Permissions |
|---|---|---|---|---|
| **CITY_CORPORATION** | Kamal Hossain (Executive Engineer) | `city@pothole.org` | `CityAdmin@2026!` | Municipal triage, hazard verification, contractor assignment, and final repair sign-off & ticket closure |
| **CONTRACTOR** | M/S Apex Road Infrastructure Ltd. | `contractor@pothole.org` | `Contractor@2026!` | View dispatched work orders, accept jobs, update repair milestones, and submit repair notes |
| **CITIZEN** | Rahim Ahmed (Citizen Reporter) | `citizen@pothole.org` | `Citizen@2026!` | View nearby hazards on GIS map, submit 1-tap GPS pothole reports, track personal submission status |

---

## 4. Native Android Application Setup

1. **Open Android Studio**:
   - Select **Open an existing project**.
   - Browse to `pothole full porject/android-app`.

2. **Verify Local SDK Configuration**:
   Ensure `android-app/local.properties` contains your Android SDK path:
   ```properties
   sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
   ```

3. **Asset Verification**:
   The quantized mobile AI model (`10.96 MB INT8 ONNX`) is placed in:
   `android-app/app/src/main/assets/pothole_yolov8s.onnx`

4. **Build from Command Line**:
   ```bash
   cd android-app
   ./gradlew assembleDebug
   ```
   The APK will be generated at:
   `android-app/app/build/outputs/apk/debug/app-debug.apk`

---

## 5. Mobile AI & Metadata-Only Architecture

- **Live Camera Stream**: CameraX executes real-time continuous frame analysis directly on the device using YOLOv8 INT8 ONNX inference.
- **Zero Image/Video Upload**: The camera stream strictly remains on-device. The application transmits **only structured detection metadata** (`reportId`, `confidence`, `latitude`, `longitude`, `gpsAccuracy`, `timestamp`, `source`, `status`), completely eliminating bandwidth bottlenecks, storage bills, and camera upload lag.
- **Duplicate Protection**:
  - Cooldown timer: 3.5 seconds
  - Confidence threshold: $\ge 0.55$
  - Spatial proximity check: 20 meters
- **Offline Outbox**: When offline, detections are buffered in Android SQLite Room DB (`AppDatabase`) and synchronized automatically by `SyncWorker` (WorkManager) upon network restoration.

---

## 6. Live Companion Mode (Shared Multi-User Scanning)

The application includes a collaborative **Live Companion Mode**:
1. **Session Hub**: Open the app and tap **"Live Companion Mode"**.
2. **Host as Scanner**: Tap **"Create Scanning Session"**. Share the generated 6-digit code with companions, then tap **"Start Scanner CameraX"**.
3. **Join as Companion**: On a second device, open the Companion Hub, enter the 6-digit code, and tap **"Join Live Session"**.
4. **Multi-Device Simulation Test**:
   Execute the automated dual-device test suite:
   ```bash
   node scripts/test_live_companion_session.js
   ```

---

## 7. Firebase Configuration

The project is preconfigured with the Firebase project `cryptro`:
```javascript
const firebaseConfig = {
  apiKey: "<YOUR_FIREBASE_WEB_API_KEY>",
  authDomain: "cryptro.firebaseapp.com",
  projectId: "cryptro",
  storageBucket: "cryptro.firebasestorage.app",
  messagingSenderId: "211774658995",
  appId: "1:211774658995:web:18f8c0dbf8663bb2d213c6",
  measurementId: "G-QBS80ZJBEY",
  databaseURL: "https://cryptro-default-rtdb.firebaseio.com"
};
```
