# SmartPothole AI — Database Schema Specification

## 1. Firebase Realtime Database Structure

The Firebase Realtime Database is structured as a normalized tree supporting real-time listeners and multi-role operations:

```json
{
  "users": {
    "{uid}": {
      "name": "Kamal Hossain",
      "email": "city@pothole.org",
      "role": "CITY_CORPORATION",
      "phone": "+8801711000002",
      "department": "DNCC Zone 4",
      "createdAt": 1732360000000
    }
  },
  "reports": {
    "{reportId}": {
      "id": "PTH-001",
      "reportId": "PTH-001",
      "reporterId": "citizen_demo_uid",
      "reporterName": "Rahim Ahmed",
      "detectionClass": "pothole",
      "confidence": 0.94,
      "latitude": 23.8069,
      "longitude": 90.3687,
      "gpsAccuracy": 5.4,
      "priority": "HIGH",
      "status": "NEW",
      "source": "LIVE_CAMERA",
      "address": "Mirpur 10 Roundabout, Section 10, Dhaka",
      "notes": "Deep road surface cavity near metro rail pillar 142. Severe hazard for two-wheelers.",
      "contractorId": null,
      "assignedTo": null,
      "deadline": null,
      "createdAt": 1732365000000,
      "updatedAt": 1732365000000,
      "timestamp": 1732365000000
    }
  },
  "contractors": {
    "{contractorId}": {
      "id": "contractor_demo_uid",
      "companyName": "Apex Road Infrastructure Ltd.",
      "contactPerson": "Tariqul Islam",
      "email": "contractor@pothole.org",
      "phone": "+8801711000003",
      "active": true,
      "assignedTasksCount": 2,
      "completedTasksCount": 8,
      "rating": 4.8
    }
  },
  "activity_logs": {
    "{logId}": {
      "reportId": "PTH-001",
      "action": "DETECTION_SUBMITTED",
      "actor": "Rahim Ahmed",
      "role": "CITIZEN",
      "timestamp": 1732365000000,
      "details": "AI detected pothole via live CameraX on-device inference with 94% confidence"
    }
  }
}
```

---

## 2. Android Local SQLite Room Database Schema

On the Android client, offline persistence is managed by Room Database (`smart_pothole_database`, version 2):

```sql
CREATE TABLE IF NOT EXISTS pothole_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    clientUuid TEXT NOT NULL,
    reportId TEXT NOT NULL DEFAULT '',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    gpsAccuracy REAL NOT NULL DEFAULT 5.0,
    confidence REAL NOT NULL,
    areaRatio REAL NOT NULL,
    detectionClass TEXT NOT NULL DEFAULT 'pothole',
    source TEXT NOT NULL DEFAULT 'LIVE_CAMERA',
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    imagePath TEXT NOT NULL DEFAULT '',
    syncStatus TEXT NOT NULL DEFAULT 'PENDING',
    createdAt INTEGER NOT NULL
);
```

### Key Highlights
- **imagePath**: Retained as empty string `""` — image transmission is completely bypassed.
- **reportId**: Client-generated unique hazard code (`PTH-...`).
- **syncStatus**: `PENDING` when captured offline; transitioned to `SYNCED` upon Firebase push.
- **WorkManager**: Background `SyncWorker` queries `syncStatus == 'PENDING'` upon network connectivity and updates Firebase RTDB.
