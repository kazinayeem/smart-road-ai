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
const { accounts } = require('./demo_accounts.json');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cryptro';
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://cryptro-default-rtdb.firebaseio.com';
const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!usingEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Refusing to run: set GOOGLE_APPLICATION_CREDENTIALS (service account) or use `npm run seed:emulator`.');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID, databaseURL: DATABASE_URL });
const auth = admin.auth();
const db = admin.database();

async function upsertUser(a) {
  const password = process.env[`DEMO_${a.key}_PASSWORD`] || a.password;
  let user;
  try {
    user = await auth.getUserByEmail(a.email);
    user = await auth.updateUser(user.uid, { password, displayName: a.name });
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ email: a.email, password, displayName: a.name, emailVerified: true });
  }
  const uid = user.uid;
  const lower = a.username.toLowerCase();
  const owner = (await db.ref(`usernames/${lower}`).get()).val();
  if (owner && owner !== uid) throw new Error(`username ${lower} already belongs to another account (${owner})`);

  const profile = {
    uid, name: a.name, email: a.email, username: a.username, usernameLower: lower,
    role: a.role, vehicleType: a.vehicleType || 'CAR',
    ...(a.department ? { department: a.department } : {}),
    ...(a.companyName ? { companyName: a.companyName } : {}),
  };
  const updates = { [`usernames/${lower}`]: uid };
  for (const [k, v] of Object.entries(profile)) updates[`users/${uid}/${k}`] = v;
  const existingCreated = (await db.ref(`users/${uid}/createdAt`).get()).val();
  if (!existingCreated) updates[`users/${uid}/createdAt`] = Date.now();
  if (a.role === 'CONTRACTOR') {
    updates[`contractors/${uid}/id`] = uid;
    updates[`contractors/${uid}/companyName`] = a.companyName;
    updates[`contractors/${uid}/contactPerson`] = a.name;
    updates[`contractors/${uid}/email`] = a.email;
    updates[`contractors/${uid}/active`] = true;
  }
  await db.ref().update(updates);
  return uid;
}

(async () => {
  console.log(`Seeding ${accounts.length} demo accounts into ${usingEmulator ? 'LOCAL EMULATORS' : `project ${PROJECT_ID}`}…`);
  for (const a of accounts) {
    const uid = await upsertUser(a);
    console.log(`  ✓ ${a.role.padEnd(16)} ${a.email.padEnd(24)} username=${a.username.padEnd(16)} uid=${uid}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('Seeding failed:', e.message);
  process.exit(1);
});
