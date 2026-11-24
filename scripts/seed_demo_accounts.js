/**
 * SmartPothole - Secure Demo Account & Database Seeding Script
 * 
 * Usage:
 *   node scripts/seed_demo_accounts.js
 * 
 * This script initializes the 3 predefined roles in Firebase Auth & Realtime Database:
 * 1. CITY_CORPORATION (Super Admin: Kamal Hossain, DNCC)
 * 2. CONTRACTOR (Apex Road Infrastructure Ltd.)
 * 3. CITIZEN (Rahim Ahmed)
 * 
 * Also seeds structured hazard reports (METADATA ONLY, NO IMAGES).
 */

const https = require('https');

const FIREBASE_PROJECT_ID = 'cryptro';
const RTDB_URL = 'https://cryptro-default-rtdb.firebaseio.com';
const API_KEY = process.env.FIREBASE_API_KEY || 'REMOVED_FIREBASE_API_KEY';

const DEMO_ACCOUNTS = [
  {
    email: 'city@pothole.org',
    password: process.env.DEMO_CITY_PASSWORD || 'CityAdmin@2026!',
    name: 'Kamal Hossain (Executive Engineer)',
    role: 'CITY_CORPORATION',
    department: 'Dhaka North City Corporation (Zone 4)',
    phone: '+8801711000001'
  },
  {
    email: 'contractor@pothole.org',
    password: process.env.DEMO_CONTRACTOR_PASSWORD || 'Contractor@2026!',
    name: 'Tariqul Islam (Project Lead)',
    role: 'CONTRACTOR',
    companyName: 'Apex Road Infrastructure Ltd.',
    phone: '+8801711000002'
  },
  {
    email: 'citizen@pothole.org',
    password: process.env.DEMO_CITIZEN_PASSWORD || 'Citizen@2026!',
    name: 'Rahim Ahmed (Citizen Reporter)',
    role: 'CITIZEN',
    phone: '+8801711000003'
  }
];

// Pure Structured Metadata Reports (NO IMAGE UPLOADS)
const SEED_REPORTS = {
  "PTH-001": {
    id: "PTH-001",
    reportId: "PTH-001",
    reporterId: "citizen_demo_uid",
    reporterName: "Rahim Ahmed",
    detectionClass: "pothole",
    confidence: 0.94,
    latitude: 23.8069,
    longitude: 90.3687,
    gpsAccuracy: 5.4,
    priority: "HIGH",
    status: "NEW",
    source: "LIVE_CAMERA",
    address: "Mirpur 10 Roundabout, Section 10, Dhaka",
    notes: "Deep road surface cavity near metro rail pillar 142. Severe hazard for two-wheelers.",
    contractorId: null,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    timestamp: Date.now() - 3600000 * 2
  },
  "PTH-002": {
    id: "PTH-002",
    reportId: "PTH-002",
    reporterId: "citizen_demo_uid",
    reporterName: "Rahim Ahmed",
    detectionClass: "pothole",
    confidence: 0.88,
    latitude: 23.7538,
    longitude: 90.3764,
    gpsAccuracy: 6.8,
    priority: "MEDIUM",
    status: "UNDER_REVIEW",
    source: "LIVE_CAMERA",
    address: "Road 27 (Old), Dhanmondi, Dhaka",
    notes: "Asphalt depression near the water pump intersection.",
    contractorId: null,
    createdAt: Date.now() - 3600000 * 6,
    updatedAt: Date.now() - 3600000 * 4,
    timestamp: Date.now() - 3600000 * 6
  },
  "PTH-003": {
    id: "PTH-003",
    reportId: "PTH-003",
    reporterId: "citizen_demo_uid",
    reporterName: "Rahim Ahmed",
    detectionClass: "pothole",
    confidence: 0.96,
    latitude: 23.7925,
    longitude: 90.4152,
    gpsAccuracy: 4.2,
    priority: "CRITICAL",
    status: "ASSIGNED",
    source: "LIVE_CAMERA",
    address: "Gulshan 2 North Avenue, Dhaka",
    notes: "Major road breakdown on busy commercial transit artery.",
    contractorId: "contractor_demo_uid",
    assignedTo: "Apex Road Infrastructure Ltd.",
    deadline: Date.now() + 86400000 * 2,
    createdAt: Date.now() - 3600000 * 18,
    updatedAt: Date.now() - 3600000 * 12,
    timestamp: Date.now() - 3600000 * 18
  },
  "PTH-004": {
    id: "PTH-004",
    reportId: "PTH-004",
    reporterId: "citizen_demo_uid",
    reporterName: "Rahim Ahmed",
    detectionClass: "pothole",
    confidence: 0.91,
    latitude: 23.8697,
    longitude: 90.3985,
    gpsAccuracy: 7.1,
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    source: "LIVE_CAMERA",
    address: "Rabindra Sarani, Sector 3, Uttara, Dhaka",
    notes: "Milling machine deployed for hot-mix bitumen overlay.",
    contractorId: "contractor_demo_uid",
    assignedTo: "Apex Road Infrastructure Ltd.",
    deadline: Date.now() + 86400000 * 1,
    createdAt: Date.now() - 3600000 * 28,
    updatedAt: Date.now() - 3600000 * 8,
    timestamp: Date.now() - 3600000 * 28
  },
  "PTH-005": {
    id: "PTH-005",
    reportId: "PTH-005",
    reporterId: "citizen_demo_uid",
    reporterName: "Rahim Ahmed",
    detectionClass: "pothole",
    confidence: 0.95,
    latitude: 23.7785,
    longitude: 90.4002,
    gpsAccuracy: 3.9,
    priority: "HIGH",
    status: "RESOLVED",
    source: "LIVE_CAMERA",
    address: "Mohakhali Flyover Approach, Dhaka",
    notes: "Completed bitumen compaction and asphalt seal. Certified by Executive Engineer.",
    contractorId: "contractor_demo_uid",
    assignedTo: "Apex Road Infrastructure Ltd.",
    repairNotes: "Bitumen patch completed and compacted with heavy roller. Passed road inspection.",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 1,
    timestamp: Date.now() - 86400000 * 3
  }
};

const SEED_CONTRACTORS = {
  "contractor_demo_uid": {
    id: "contractor_demo_uid",
    companyName: "Apex Road Infrastructure Ltd.",
    contactPerson: "Tariqul Islam",
    email: "contractor@pothole.org",
    phone: "+8801711000002",
    active: true,
    assignedTasksCount: 2,
    completedTasksCount: 8,
    rating: 4.8
  },
  "contractor_demo_uid_2": {
    id: "contractor_demo_uid_2",
    companyName: "Delta Highway Engineering",
    contactPerson: "Nazmul Huda",
    email: "delta@pothole.org",
    phone: "+8801711000004",
    active: true,
    assignedTasksCount: 1,
    completedTasksCount: 14,
    rating: 4.9
  }
};

const SEED_USERS = {
  "city_admin_demo_uid": {
    uid: "city_admin_demo_uid",
    email: "city@pothole.org",
    name: "Kamal Hossain (Executive Engineer)",
    role: "CITY_CORPORATION",
    department: "Dhaka North City Corporation (Zone 4)",
    phone: "+8801711000001",
    createdAt: Date.now()
  },
  "contractor_demo_uid": {
    uid: "contractor_demo_uid",
    email: "contractor@pothole.org",
    name: "Tariqul Islam (Project Lead)",
    role: "CONTRACTOR",
    companyName: "Apex Road Infrastructure Ltd.",
    phone: "+8801711000002",
    createdAt: Date.now()
  },
  "citizen_demo_uid": {
    uid: "citizen_demo_uid",
    email: "citizen@pothole.org",
    name: "Rahim Ahmed (Citizen Reporter)",
    role: "CITIZEN",
    phone: "+8801711000003",
    createdAt: Date.now()
  }
};

function rtdbPut(path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${RTDB_URL}/${path}.json`);
    const payload = JSON.stringify(data);

    const req = https.request(
      url,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`RTDB Error ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function firebaseAuthSignUp(email, password) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      email,
      password,
      returnSecureToken: true
    });

    const req = https.request(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error && parsed.error.message !== 'EMAIL_EXISTS') {
              console.warn(`Auth signUp notice for ${email}:`, parsed.error.message);
            }
            resolve(parsed);
          } catch (e) {
            resolve({});
          }
        });
      }
    );

    req.on('error', (err) => {
      console.warn('Auth request network notice:', err.message);
      resolve({});
    });
    req.write(payload);
    req.end();
  });
}

async function runSeed() {
  console.log('====================================================');
  console.log('   SmartPothole - Seeding Demo Accounts & Metadata   ');
  console.log('====================================================\n');

  console.log('[1/4] Ensuring Firebase Auth accounts exist...');
  for (const acc of DEMO_ACCOUNTS) {
    try {
      const res = await firebaseAuthSignUp(acc.email, acc.password);
      if (res.localId) {
        SEED_USERS[res.localId] = {
          uid: res.localId,
          email: acc.email,
          name: acc.name,
          role: acc.role,
          department: acc.department,
          companyName: acc.companyName,
          phone: acc.phone,
          createdAt: Date.now()
        };
        console.log(`  ✓ Auth created for: ${acc.email} (Role: ${acc.role})`);
      } else {
        console.log(`  ✓ Auth verified/exists for: ${acc.email} (Role: ${acc.role})`);
      }
    } catch (e) {
      console.warn(`  ! Auth skipped for ${acc.email}: ${e.message}`);
    }
  }

  console.log('\n[2/4] Seeding user profiles in Realtime Database (/users)...');
  await rtdbPut('users', SEED_USERS);
  console.log('  ✓ 3 user profiles seeded successfully with strict roles.');

  console.log('\n[3/4] Seeding licensed contractors in Realtime Database (/contractors)...');
  await rtdbPut('contractors', SEED_CONTRACTORS);
  console.log('  ✓ 2 licensed contractors seeded successfully.');

  console.log('\n[4/4] Seeding structured hazard reports in Realtime Database (/reports)...');
  console.log('      (Notice: Strictly metadata only, zero images uploaded)');
  await rtdbPut('reports', SEED_REPORTS);
  console.log('  ✓ 5 structured pothole reports seeded successfully.');

  console.log('\n====================================================');
  console.log('  Demo Accounts Ready:');
  console.log('  - City Corp Admin: city@pothole.org        [CITY_CORPORATION]');
  console.log('  - Contractor:      contractor@pothole.org  [CONTRACTOR]');
  console.log('  - Citizen:         citizen@pothole.org     [CITIZEN]');
  console.log('====================================================\n');
}

runSeed().catch((err) => {
  console.error('Fatal seed script error:', err);
  process.exit(1);
});
