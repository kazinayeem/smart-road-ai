/**
 * Live Companion Mode — Multi-Device Realtime Verification Script
 * 
 * Tests concurrent session lifecycle between two separate devices:
 * - Device A (Scanner): Creates session, streams real-time GPS coordinates, broadcasts AI detection metadata
 * - Device B (Companion): Joins using 6-digit session code, verifies live location tracking, verifies instant pothole detection feeds
 * - Verifies zero image/video data transmitted (strictly structured metadata)
 * - Verifies session status transitions and termination
 */

const https = require('https');

const RTDB_URL = 'https://cryptro-default-rtdb.firebaseio.com';

function httpRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${RTDB_URL}${path}.json`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDualDeviceTest() {
  console.log("=====================================================================");
  console.log("  SmartPothole — Dual-Device Live Companion Mode Simulation Test     ");
  console.log("=====================================================================\n");

  const sessionId = `test_sess_${Date.now()}`;
  const sessionCode = String(Math.floor(100000 + Math.random() * 900000));
  const scannerUid = `device_a_scanner_${Date.now().toString().slice(-4)}`;
  const companionUid = `device_b_companion_${Date.now().toString().slice(-4)}`;

  console.log(`[STAGE 1] Device A (Scanner) creates session code: ${sessionCode}...`);
  const sessionInitData = {
    sessionId: sessionId,
    sessionCode: sessionCode,
    scannerId: scannerUid,
    scannerName: "Scanner Unit Alpha (Vehicle #402)",
    status: "ACTIVE",
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    participants: {
      [scannerUid]: {
        uid: scannerUid,
        name: "Scanner Unit Alpha",
        role: "SCANNER",
        joinedAt: Date.now(),
        lastSeenAt: Date.now()
      }
    }
  };

  const createRes = await httpRequest('PUT', `/live_sessions/${sessionId}`, sessionInitData);
  if (createRes.status !== 200) {
    throw new Error(`Failed to create session on RTDB: ${JSON.stringify(createRes)}`);
  }
  console.log(`  ✓ Session ${sessionId} initialized in RTDB.`);

  console.log(`\n[STAGE 2] Device B (Companion) queries active session with code ${sessionCode}...`);
  const getSessionRes = await httpRequest('GET', `/live_sessions/${sessionId}`);
  if (!getSessionRes.data || getSessionRes.data.sessionCode !== sessionCode) {
    throw new Error(`Companion could not verify session code: ${JSON.stringify(getSessionRes)}`);
  }
  console.log(`  ✓ Companion verified session status: ${getSessionRes.data.status}`);

  console.log(`\n[STAGE 3] Device B joins session as COMPANION...`);
  const companionJoinData = {
    uid: companionUid,
    name: "Companion Monitor Beta (Supervisor)",
    role: "COMPANION",
    joinedAt: Date.now(),
    lastSeenAt: Date.now()
  };
  const joinRes = await httpRequest('PUT', `/live_sessions/${sessionId}/participants/${companionUid}`, companionJoinData);
  if (joinRes.status !== 200) {
    throw new Error(`Companion join failed: ${JSON.stringify(joinRes)}`);
  }
  console.log(`  ✓ Device B registered as COMPANION.`);

  console.log(`\n[STAGE 4] Device A streams continuous GPS location breadcrumbs...`);
  const gpsUpdates = [
    { latitude: 23.8103, longitude: 90.4125, accuracy: 4.8, speed: 7.2, bearing: 45.0, timestamp: Date.now() },
    { latitude: 23.8109, longitude: 90.4131, accuracy: 4.5, speed: 7.8, bearing: 48.0, timestamp: Date.now() + 2500 },
    { latitude: 23.8115, longitude: 90.4138, accuracy: 4.2, speed: 8.1, bearing: 50.0, timestamp: Date.now() + 5000 }
  ];

  for (let i = 0; i < gpsUpdates.length; i++) {
    const loc = gpsUpdates[i];
    await httpRequest('PUT', `/live_sessions/${sessionId}/scanner_location`, loc);
    await httpRequest('PUT', `/live_sessions/${sessionId}/lastActiveAt`, loc.timestamp);
    console.log(`  ✓ GPS Breadcrumb ${i + 1}/3 broadcast: [${loc.latitude}, ${loc.longitude}] Speed: ${(loc.speed * 3.6).toFixed(1)} km/h`);
  }

  console.log(`\n[STAGE 5] Device A runs YOLOv8 edge AI and broadcasts 2 pothole detection events...`);
  const detections = [
    {
      detectionId: `PTH_LIVE_001_${Date.now().toString().slice(-4)}`,
      latitude: 23.8108,
      longitude: 90.4130,
      confidence: 0.94,
      gpsAccuracy: 4.5,
      timestamp: Date.now(),
      status: "NEW",
      detectionClass: "pothole",
      severity: "HIGH"
    },
    {
      detectionId: `PTH_LIVE_002_${Date.now().toString().slice(-4)}`,
      latitude: 23.8114,
      longitude: 90.4137,
      confidence: 0.88,
      gpsAccuracy: 4.2,
      timestamp: Date.now() + 3000,
      status: "NEW",
      detectionClass: "pothole",
      severity: "MEDIUM"
    }
  ];

  for (const det of detections) {
    await httpRequest('PUT', `/live_sessions/${sessionId}/detections/${det.detectionId}`, det);
    console.log(`  ✓ Detection Broadcast: ${det.detectionId} (${(det.confidence * 100).toFixed(0)}% Conf • ${det.severity}) at [${det.latitude}, ${det.longitude}]`);
  }

  console.log(`\n[STAGE 6] Device B receives and verifies session state...`);
  const finalStateRes = await httpRequest('GET', `/live_sessions/${sessionId}`);
  const state = finalStateRes.data;

  // 1. Verify Participants
  const participantCount = Object.keys(state.participants || {}).length;
  console.log(`  ✓ Total Participants: ${participantCount} (Device A: Scanner, Device B: Companion)`);
  if (participantCount < 2) throw new Error("Expected at least 2 participants.");

  // 2. Verify Scanner Location Telemetry
  console.log(`  ✓ Scanner Current Position: [${state.scanner_location.latitude}, ${state.scanner_location.longitude}], Accuracy: ±${state.scanner_location.accuracy}m`);
  if (!state.scanner_location || state.scanner_location.latitude !== gpsUpdates[2].latitude) {
    throw new Error("Scanner location mismatch.");
  }

  // 3. Verify Detections & Schema Compliance (Zero Images / Structured Metadata Only)
  const receivedDetections = Object.values(state.detections || {});
  console.log(`  ✓ Received Detections Count: ${receivedDetections.length}`);
  if (receivedDetections.length !== 2) throw new Error("Expected 2 detections.");

  for (const det of receivedDetections) {
    if (det.imageUrl || det.frameUrl || det.videoUrl) {
      throw new Error(`VIOLATION: Detection ${det.detectionId} contains image/video URL!`);
    }
    if (!det.confidence || !det.latitude || !det.longitude || !det.gpsAccuracy) {
      throw new Error(`Incomplete structured telemetry on detection ${det.detectionId}`);
    }
  }
  console.log(`  ✓ Strict Telemetry Schema Confirmed: Zero image or video frames transmitted.`);

  console.log(`\n[STAGE 7] Device A ends session...`);
  await httpRequest('PATCH', `/live_sessions/${sessionId}`, { status: "ENDED", lastActiveAt: Date.now() });
  const endedRes = await httpRequest('GET', `/live_sessions/${sessionId}/status`);
  console.log(`  ✓ Session status updated to: ${endedRes.data}`);
  if (endedRes.data !== "ENDED") throw new Error("Session status not ENDED");

  // Cleanup test session to keep RTDB clean
  await httpRequest('DELETE', `/live_sessions/${sessionId}`);
  console.log(`  ✓ Test session cleaned up from RTDB.`);

  console.log("\n=====================================================================");
  console.log("  >>> DUAL-DEVICE LIVE COMPANION SIMULATION PASSED COMPLETELY <<<   ");
  console.log("=====================================================================\n");
}

runDualDeviceTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
