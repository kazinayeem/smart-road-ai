/**
 * resolveUsernameLogin — username + password sign-in for Firebase Auth.
 *
 * Firebase Auth has no username provider, so the client sends {username, password} here.
 * The function maps username -> uid -> email with the Admin SDK (the mapping is never readable by
 * clients), verifies the password with the Identity Toolkit REST API, and returns a custom token.
 *
 * - Every failure returns the SAME error, so the endpoint does not reveal whether a username exists.
 * - Simple lockout: 5 failed attempts per username within 15 minutes blocks that username for
 *   15 minutes (stored under login_attempts/, which clients cannot read or write).
 * - Requires the Blaze plan to deploy. WEB_API_KEY must be set (it is the public web API key).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Explicit URL so the emulator and production read the same database instance.
admin.initializeApp({ databaseURL: process.env.SP_DATABASE_URL || 'https://cryptro-default-rtdb.firebaseio.com' });
const WEB_API_KEY = defineString('WEB_API_KEY', { default: 'REMOVED_FIREBASE_API_KEY' });

const GENERIC = 'Incorrect username/email or password.';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

function identityToolkitUrl() {
  const emu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const base = emu ? `http://${emu}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
  return `${base}/v1/accounts:signInWithPassword?key=${WEB_API_KEY.value()}`;
}

async function passwordOk(email, password) {
  const res = await fetch(identityToolkitUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  });
  return res.ok;
}

exports.resolveUsernameLogin = onCall({ region: 'us-central1', maxInstances: 10 }, async (req) => {
  const username = String(req.data?.username || '').trim().toLowerCase();
  const password = String(req.data?.password || '');
  if (!USERNAME_RE.test(username) || !password || password.length > 256) {
    throw new HttpsError('unauthenticated', GENERIC);
  }

  const db = admin.database();
  const attemptsRef = db.ref(`login_attempts/${username}`);
  const now = Date.now();
  const attempts = (await attemptsRef.get()).val() || { count: 0, since: now };
  if (now - attempts.since > WINDOW_MS) { attempts.count = 0; attempts.since = now; }
  if (attempts.count >= MAX_FAILS) {
    throw new HttpsError('resource-exhausted', 'Too many attempts. Try again in 15 minutes.');
  }

  const uid = (await db.ref(`usernames/${username}`).get()).val();
  const email = uid ? (await db.ref(`users/${uid}/email`).get()).val() : null;
  const ok = !!email && (await passwordOk(email, password));
  if (!ok) {
    await attemptsRef.set({ count: attempts.count + 1, since: attempts.since });
    throw new HttpsError('unauthenticated', GENERIC);
  }
  await attemptsRef.remove();
  return { token: await admin.auth().createCustomToken(uid) };
});
