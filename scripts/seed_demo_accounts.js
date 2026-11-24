/**
 * Seeds one demo account per role (+ a second citizen) into Firebase Auth and the Realtime Database.
 *
 *   Local emulators:  npm run seed:emulator        (start emulators first)
 *   Real project:     GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json npm run seed:prod
 *
 * Uses the Admin SDK (bypasses security rules, as an admin should); never deletes existing data.
 * Idempotent: existing accounts are updated (password reset to the demo password, role re-applied).
 * Passwords can be overridden with DEMO_<KEY>_PASSWORD, e.g. DEMO_CITY_CORPORATION_PASSWORD.
 */
const admin = require('firebase-admin');
const https = require('https');
const { accounts } = require('./demo_accounts.json');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cryptro';
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://cryptro-default-rtdb.firebaseio.com';
const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const hasServiceAccount = !usingEmulator && !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

let auth = null;
let db = null;

if (usingEmulator || hasServiceAccount) {
  admin.initializeApp({ projectId: PROJECT_ID, databaseURL: DATABASE_URL });
  auth = admin.auth();
  db = admin.database();
}

function restPatch(path, data) {
  return new Promise((resolve, reject) => {
    const trimmedPath = path ? path.replace(/^\/+|\/+$/g, '') : '';
    const endpoint = trimmedPath ? `/${trimmedPath}.json` : '/.json';
    const url = new URL(`${DATABASE_URL.replace(/\/+$/, '')}${endpoint}`);
    const payload = JSON.stringify(data);
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve(body); }
        } else {
          reject(new Error(`REST PATCH failed (${res.statusCode}): ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function upsertUser(a) {
  const password = process.env[`DEMO_${a.key}_PASSWORD`] || a.password;
  let uid = a.key.toLowerCase() + '_demo_uid';

  if (auth) {
    let user;
    try {
      user = await auth.getUserByEmail(a.email);
      user = await auth.updateUser(user.uid, { password, displayName: a.name });
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      user = await auth.createUser({ email: a.email, password, displayName: a.name, emailVerified: true });
    }
    uid = user.uid;
  }

  const lower = a.username.toLowerCase();
  const profile = {
    uid,
    name: a.name,
    email: a.email,
    username: a.username,
    usernameLower: lower,
    role: a.role,
    vehicleType: a.vehicleType || 'CAR',
    createdAt: Date.now(),
    ...(a.department ? { department: a.department } : {}),
    ...(a.companyName ? { companyName: a.companyName } : {}),
  };

  const updates = {
    [`usernames/${lower}`]: uid,
  };
  for (const [k, v] of Object.entries(profile)) {
    updates[`users/${uid}/${k}`] = v;
  }
  if (a.role === 'CONTRACTOR') {
    updates[`contractors/${uid}/id`] = uid;
    updates[`contractors/${uid}/companyName`] = a.companyName;
    updates[`contractors/${uid}/contactPerson`] = a.name;
    updates[`contractors/${uid}/email`] = a.email;
    updates[`contractors/${uid}/active`] = true;
  }

  if (db) {
    await db.ref().update(updates);
  } else {
    await restPatch('', updates);
  }
  return uid;
}

(async () => {
  const targetLabel = usingEmulator ? 'LOCAL EMULATORS (ports 9099 / 9000)' : `PRODUCTION PROJECT ${PROJECT_ID} (${DATABASE_URL})`;
  console.log(`Seeding ${accounts.length} demo accounts into ${targetLabel}…`);
  for (const a of accounts) {
    const uid = await upsertUser(a);
    console.log(`  ✓ ${a.role.padEnd(16)} ${a.email.padEnd(24)} username=${a.username.padEnd(16)} uid=${uid}`);
  }
  console.log('✓ Seeding completed successfully.');
  process.exit(0);
})().catch((e) => {
  console.error('Seeding failed:', e.message);
  process.exit(1);
});
