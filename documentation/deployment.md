# SmartPothole AI — Deployment Guide

## 1. Edge AI Model Packaging
1. The original model `best.pt` is exported and dynamically quantized:
   ```bash
   python3 ai-model/scripts/export_and_benchmark.py
   ```
2. The optimized INT8 ONNX model (`pothole_yolov8s_quant_int8.onnx`, 10.96 MB) is packaged directly into the Android application's `app/src/main/assets/` folder.
3. This guarantees **100% offline inference capability** on mobile devices with zero server GPU latency and no data usage.

---

## 2. Firebase Rules & Hosting Deployment

1. Ensure the Firebase CLI is installed:
   ```bash
   npm install -g firebase-tools
   ```
2. Deploy Security Rules:
   ```bash
   firebase deploy --only database,storage --project cryptro
   ```
3. Deploy Web Management Dashboard to Firebase Hosting:
   ```bash
   cd web-dashboard
   npm run build
   cd ..
   firebase deploy --only hosting --project cryptro
   ```

---

## 3. Native Android Build & Release

1. **Generate Signed Release Bundle / APK**:
   ```bash
   cd android-app
   ./gradlew bundleRelease
   # Or for direct sideloading / testing:
   ./gradlew assembleRelease
   ```
2. Output artifact:
   - AAB: `android-app/app/build/outputs/bundle/release/app-release.aab`
   - APK: `android-app/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 4. Environment Verification Checklist
- [x] Pretrained YOLOv8 model evaluated and benchmarked (47.55ms latency).
- [x] INT8 quantization applied (10.96MB model for mobile edge).
- [x] Firebase rules enforcing authentication and role-based permissions.
- [x] Full 9-stage lifecycle audit trail tested.
- [x] Android CameraX, ONNX Runtime Mobile, Room DB, and WorkManager implemented.
- [x] Next.js responsive web management dashboard compiled and tested.
- [x] Interactive Leaflet OpenStreetMap with live colored status markers.
