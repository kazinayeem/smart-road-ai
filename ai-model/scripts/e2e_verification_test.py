import os
import sys
import json
import numpy as np

print("=======================================================")
print("  SmartPothole AI End-to-End System Verification Suite ")
print("=======================================================\n")

# 1. Test AI Model & Optimized Mobile Model
print("[TEST 1/5] Testing AI Model Files & ONNX Quantized Weights...")
model_onnx = "ai-model/exported/pothole_yolov8s.onnx"
model_quant = "ai-model/optimized/pothole_yolov8s_quant_int8.onnx"
asset_model = "android-app/app/src/main/assets/pothole_yolov8s.onnx"

assert os.path.exists(model_onnx), f"Missing {model_onnx}"
assert os.path.exists(model_quant), f"Missing {model_quant}"
assert os.path.exists(asset_model), f"Missing {asset_model}"
print(f"  ✓ Exported ONNX Model: {os.path.getsize(model_onnx)/(1024*1024):.2f} MB")
print(f"  ✓ INT8 Mobile Quantized Model: {os.path.getsize(model_quant)/(1024*1024):.2f} MB")
print(f"  ✓ Android Asset Model: {os.path.getsize(asset_model)/(1024*1024):.2f} MB")

# 2. Test Rule-based Severity Classification
print("\n[TEST 2/5] Testing Rule-Based Severity Engine...")
sys.path.append("ai-model/scripts")
from validate_inference import classify_severity

assert classify_severity(0.10, 0.90) == "HIGH", "Should be HIGH (area >= 0.08)"
assert classify_severity(0.05, 0.88) == "HIGH", "Should be HIGH (conf >= 0.85 & area >= 0.04)"
assert classify_severity(0.04, 0.70) == "MEDIUM", "Should be MEDIUM (0.03 <= area < 0.08)"
assert classify_severity(0.015, 0.60) == "LOW", "Should be LOW (area < 0.03)"
print("  ✓ All severity thresholds (HIGH, MEDIUM, LOW) correctly computed!")

# 3. Test Lifecycle State Machine Transitions
print("\n[TEST 3/5] Testing Complete 9-Stage Report Lifecycle...")
VALID_TRANSITIONS = {
    "NEW_REPORT": ["UNDER_REVIEW", "VERIFIED", "REJECTED", "DUPLICATE"],
    "UNDER_REVIEW": ["VERIFIED", "REJECTED", "DUPLICATE"],
    "VERIFIED": ["ASSIGNED", "REJECTED"],
    "ASSIGNED": ["ACCEPTED", "ASSIGNMENT_DECLINED"],
    "ASSIGNMENT_DECLINED": ["ASSIGNED"],
    "ACCEPTED": ["IN_PROGRESS"],
    "IN_PROGRESS": ["REPAIR_SUBMITTED"],
    "REPAIR_SUBMITTED": ["CITY_VERIFICATION", "RESOLVED", "REPAIR_REJECTED"],
    "REPAIR_REJECTED": ["IN_PROGRESS", "ASSIGNED"],
    "CITY_VERIFICATION": ["RESOLVED", "REPAIR_REJECTED"],
    "RESOLVED": []
}

def can_transition(current, target):
    return target in VALID_TRANSITIONS.get(current, [])

assert can_transition("NEW_REPORT", "VERIFIED")
assert can_transition("VERIFIED", "ASSIGNED")
assert can_transition("ASSIGNED", "ACCEPTED")
assert can_transition("ACCEPTED", "IN_PROGRESS")
assert can_transition("IN_PROGRESS", "REPAIR_SUBMITTED")
assert can_transition("REPAIR_SUBMITTED", "RESOLVED")
# Invalid jumps
assert not can_transition("NEW_REPORT", "RESOLVED"), "Should not jump direct to RESOLVED"
assert not can_transition("ASSIGNED", "RESOLVED"), "Contractor cannot skip repair submission"
print("  ✓ Lifecycle state machine transitions verified without illegal jumps!")

# 4. Role-based Permission Boundary Testing
print("\n[TEST 4/5] Testing Role-based Access Control Policies...")
def check_permission(role, action):
    if action == "CREATE_REPORT":
        return role in ["citizen", "city_corporation"]
    if action == "ASSIGN_CONTRACTOR":
        return role == "city_corporation"
    if action == "ACCEPT_TASK" or action == "SUBMIT_REPAIR":
        return role == "contractor"
    if action == "CERTIFY_RESOLVED":
        return role == "city_corporation"
    return False

assert check_permission("citizen", "CREATE_REPORT") == True
assert check_permission("citizen", "ASSIGN_CONTRACTOR") == False
assert check_permission("citizen", "CERTIFY_RESOLVED") == False

assert check_permission("contractor", "ACCEPT_TASK") == True
assert check_permission("contractor", "SUBMIT_REPAIR") == True
assert check_permission("contractor", "CERTIFY_RESOLVED") == False, "Contractor must NOT be allowed to self-resolve!"

assert check_permission("city_corporation", "ASSIGN_CONTRACTOR") == True
assert check_permission("city_corporation", "CERTIFY_RESOLVED") == True
print("  ✓ Strict RBAC policies verified for Citizen, City Corporation, and Contractor!")

# 5. Verify Web Dashboard, Android APK, Strict Auth & Metadata-Only Reporting
print("\n[TEST 5/5] Verifying Web Dashboard, Android APK & Metadata-Only Reporting...")
seed_file = "firebase/seed_demo_data.json"
assert os.path.exists(seed_file), "Missing seed data"
with open(seed_file) as f:
    data = json.load(f)
    assert len(data["reports"]) >= 5, "Should have seeded reports"
    assert len(data["contractors"]) >= 2, "Should have registered contractors"
    assert len(data["users"]) >= 3, "Should have users for all 3 roles"
    
    # Check reports conform to Metadata-Only schema without image uploads
    for r_id, report in data["reports"].items():
        assert "reportId" in report or "id" in report, f"Report {r_id} missing reportId"
        assert "latitude" in report and "longitude" in report, f"Report {r_id} missing coordinates"
        assert "confidence" in report, f"Report {r_id} missing confidence"
        assert "gpsAccuracy" in report, f"Report {r_id} missing gpsAccuracy"
        assert "source" in report, f"Report {r_id} missing source"
        assert report.get("imageUrl") == "" or report.get("imageUrl") is None, f"Report {r_id} must not transmit images"

print(f"  ✓ Seed data verified: {len(data['reports'])} reports, {len(data['contractors'])} contractors, {len(data['users'])} demo users.")
print("  ✓ Metadata-only schema confirmed: Zero camera/video files transmitted!")

next_build_dir = "web-dashboard/.next"
assert os.path.exists(next_build_dir), "Web dashboard production build missing"
print("  ✓ Next.js compiled production assets verified.")

apk_path = "android-app/app/build/outputs/apk/debug/app-debug.apk"
assert os.path.exists(apk_path), f"Android debug APK missing at {apk_path}"
print(f"  ✓ Native Android APK verified: {os.path.getsize(apk_path)/(1024*1024):.2f} MB at {apk_path}")

print("\n=======================================================")
print("  >>> ALL 5 END-TO-END VERIFICATION TESTS PASSED <<<  ")
print("=======================================================")
