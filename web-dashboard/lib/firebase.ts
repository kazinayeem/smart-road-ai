import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { getDatabase, ref, get, update, onValue, push } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PotholeReport, UserProfile, Contractor, ActivityLogEntry, UserRole } from '@/types';

// Firebase web config is public by design (it identifies the project; it is not a secret).
// Access control is enforced by firebase/database.rules.json, never by this client.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'REMOVED_FIREBASE_API_KEY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'cryptro.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cryptro',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cryptro.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || '211774658995',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:211774658995:web:18f8c0dbf8663bb2d213c6',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://cryptro-default-rtdb.firebaseio.com',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export const GENERIC_LOGIN_ERROR = 'Incorrect username/email or password.';
const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;

export function normalizeRole(role: unknown): UserRole {
  return role === 'CITY_CORPORATION' || role === 'CONTRACTOR' ? role : 'CITIZEN';
}

// The signed-in profile, kept in memory only (no role is ever trusted from localStorage).
let currentProfile: UserProfile | null = null;
export const getCurrentProfile = () => currentProfile;

async function loadProfile(user: FirebaseUser): Promise<UserProfile> {
  const snap = await get(ref(rtdb, `users/${user.uid}`));
  const data = snap.exists() ? snap.val() : {};
  const profile: UserProfile = {
    uid: user.uid,
    name: data.name || user.displayName || user.email || 'User',
    email: user.email || data.email || '',
    username: data.username,
    role: normalizeRole(data.role), // missing record => least privilege
    phone: data.phone,
    department: data.department,
    companyName: data.companyName,
    vehicleType: data.vehicleType,
    createdAt: data.createdAt || Date.now(),
  };
  currentProfile = profile;
  return profile;
}

/** Subscribe to auth state; resolves the profile from RTDB `users/{uid}`. */
export function subscribeToAuth(cb: (profile: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      currentProfile = null;
      cb(null);
      return;
    }
    try {
      cb(await loadProfile(user));
    } catch {
      currentProfile = null;
      cb(null);
    }
  });
}

/** Email or username + password. Any failure surfaces as the same generic error. */
export async function login(identifier: string, password: string): Promise<UserProfile> {
  const id = identifier.trim();
  try {
    if (id.includes('@')) {
      await signInWithEmailAndPassword(auth, id, password);
    } else {
      const call = httpsCallable<{ username: string; password: string }, { token: string }>(
        getFunctions(app),
        'resolveUsernameLogin'
      );
      const res = await call({ username: id, password });
      await signInWithCustomToken(auth, res.data.token);
    }
  } catch {
    throw new Error(GENERIC_LOGIN_ERROR);
  }
  return loadProfile(auth.currentUser!);
}

/** Self-registration always creates a CITIZEN; roles are granted only by a city admin (enforced by rules). */
export async function registerCitizen(input: {
  name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  vehicleType?: string;
}): Promise<UserProfile> {
  if (!input.name.trim()) throw new Error('Please enter your full name.');
  if (!USERNAME_RE.test(input.username)) throw new Error("Username must be 3–20 letters, digits, '_' or '.'.");
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
  const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = cred.user.uid;
  const lower = input.username.toLowerCase();
  try {
    await update(ref(rtdb), {
      [`usernames/${lower}`]: uid,
      [`users/${uid}`]: {
        uid,
        name: input.name.trim(),
        username: input.username,
        usernameLower: lower,
        email: input.email.trim(),
        phone: input.phone || null,
        role: 'CITIZEN',
        vehicleType: input.vehicleType || 'CAR',
        createdAt: Date.now(),
      },
    });
  } catch {
    await cred.user.delete().catch(() => undefined);
    throw new Error('That username is already taken. Please choose another.');
  }
  await updateProfile(cred.user, { displayName: input.name.trim() }).catch(() => undefined);
  return loadProfile(cred.user);
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim()).catch(() => undefined);
}

export async function logoutUser() {
  currentProfile = null;
  await signOut(auth);
}

/** Live reports. Errors are reported to the caller instead of being replaced by fake data. */
export function subscribeToReports(
  callback: (reports: PotholeReport[]) => void,
  onError?: (message: string) => void
) {
  return onValue(
    ref(rtdb, 'reports'),
    (snapshot) => {
      const data = snapshot.val() || {};
      callback(
        Object.entries(data).map(([key, v]) => ({ ...(v as PotholeReport), id: (v as PotholeReport).id || key }))
      );
    },
    (err) => onError?.(err.message)
  );
}

export async function getContractors(): Promise<Contractor[]> {
  const snapshot = await get(ref(rtdb, 'contractors'));
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val()).map(([key, v]) => ({ ...(v as Contractor), id: (v as Contractor).id || key }));
}

export async function getReportLogs(reportId: string): Promise<ActivityLogEntry[]> {
  const snapshot = await get(ref(rtdb, `activity_logs/${reportId}`));
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val()).map(([key, v]) => ({ ...(v as ActivityLogEntry), id: key }));
}

function requireProfile(): UserProfile {
  if (!auth.currentUser || !currentProfile) throw new Error('You are signed out. Please sign in again.');
  return currentProfile;
}

/**
 * Apply a workflow change. Only the changed fields are written (never a stale full copy),
 * and the audit entry is attributed to the signed-in user. The database rules decide whether
 * this user may make this transition.
 */
export async function updateReportWorkflow(
  reportId: string,
  updates: Partial<PotholeReport>,
  remarks: string
) {
  const me = requireProfile();
  const current = await get(ref(rtdb, `reports/${reportId}/status`));
  const prevStatus = current.exists() ? current.val() : null;
  const newStatus = updates.status || prevStatus;
  const now = Date.now();
  await update(ref(rtdb, `reports/${reportId}`), { ...updates, updatedAt: now });
  await push(ref(rtdb, `activity_logs/${reportId}`), {
    timestamp: now,
    previousStatus: prevStatus,
    newStatus,
    changedBy: me.name,
    changedByUid: me.uid,
    remarks: remarks || `Transitioned to ${newStatus}`,
  });
}

/** Submit a citizen report. Reporter identity always comes from the signed-in account. */
export async function submitPotholeReport(
  report: Pick<PotholeReport, 'latitude' | 'longitude' | 'priority' | 'confidence'> &
    Partial<Pick<PotholeReport, 'address' | 'notes' | 'gpsAccuracy' | 'source'>>
): Promise<PotholeReport> {
  const me = requireProfile();
  const id = push(ref(rtdb, 'reports')).key!;
  const now = Date.now();
  const full: PotholeReport = {
    id,
    reportId: id,
    reporterId: me.uid,
    reporterName: me.name,
    detectionClass: 'pothole',
    confidence: report.confidence,
    latitude: report.latitude,
    longitude: report.longitude,
    gpsAccuracy: report.gpsAccuracy ?? 0,
    priority: report.priority,
    status: 'NEW',
    source: report.source || 'MANUAL_GPS',
    address: report.address || '',
    notes: report.notes || '',
    totalDetections: 1,
    timestamp: now,
    firstDetectedAt: now,
    lastDetectedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await update(ref(rtdb), {
    [`reports/${id}`]: full,
  });
  await push(ref(rtdb, `activity_logs/${id}`), {
    timestamp: now,
    previousStatus: null,
    newStatus: 'NEW',
    changedBy: me.name,
    changedByUid: me.uid,
    remarks: `Reported from web (${full.source})`,
  });
  return full;
}

export const ROLE_HOME: Record<UserRole, string> = {
  CITIZEN: '/citizen',
  CITY_CORPORATION: '/city',
  CONTRACTOR: '/contractor',
};
