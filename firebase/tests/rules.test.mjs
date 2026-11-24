// Security-rule tests for the Realtime Database. Run with `npm test` (starts the local emulator).
import { test, before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove, query, orderByChild, equalTo, increment } from 'firebase/database';

const here = path.dirname(fileURLToPath(import.meta.url));
let env;

const report = (reporterId, extra = {}) => ({
  id: 'R1', reportId: 'R1', reporterId, latitude: 23.81, longitude: 90.41,
  confidence: 0.9, priority: 'HIGH', status: 'NEW', createdAt: Date.now(), ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-smartpothole',
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: fs.readFileSync(path.join(here, '..', 'database.rules.json'), 'utf8'),
    },
  });
});
after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.database();
    await set(ref(db, 'users/city'), { role: 'CITY_CORPORATION', email: 'c@x' });
    await set(ref(db, 'users/alice'), { role: 'CITIZEN', email: 'a@x' });
    await set(ref(db, 'users/bob'), { role: 'CITIZEN', email: 'b@x' });
    await set(ref(db, 'users/con'), { role: 'CONTRACTOR', email: 'k@x' });
  });
});

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();

// ---- users / roles ----
test('unauthenticated users cannot read reports or users', async () => {
  await assertFails(get(ref(db(null), 'reports')));
  await assertFails(get(ref(db(null), 'users/alice')));
});

test('a citizen cannot promote themselves to CITY_CORPORATION', async () => {
  await assertFails(update(ref(db('alice'), 'users/alice'), { role: 'CITY_CORPORATION' }));
  await assertFails(set(ref(db('alice'), 'users/alice'), { role: 'CONTRACTOR', email: 'a@x' }));
});

test('a new user may only self-register as CITIZEN', async () => {
  await assertSucceeds(set(ref(db('newbie'), 'users/newbie'), { role: 'CITIZEN', email: 'n@x' }));
  await assertFails(set(ref(db('evil'), 'users/evil'), { role: 'CITY_CORPORATION', email: 'e@x' }));
});

test('city admin can change roles; citizens cannot read other profiles', async () => {
  await assertSucceeds(update(ref(db('city'), 'users/bob'), { role: 'CONTRACTOR' }));
  await assertFails(get(ref(db('alice'), 'users/bob')));
  await assertSucceeds(get(ref(db('alice'), 'users/alice')));
});

// ---- usernames ----
test('usernames are unique and claimable only for yourself', async () => {
  await assertSucceeds(set(ref(db('alice'), 'usernames/alice_r'), 'alice'));
  await assertFails(set(ref(db('bob'), 'usernames/alice_r'), 'bob'));
  await assertFails(set(ref(db('bob'), 'usernames/someone'), 'alice'));
  await assertFails(set(ref(db('bob'), 'usernames/Bad Name'), 'bob'));
  await assertFails(get(ref(db('bob'), 'usernames/alice_r')));
  await assertSucceeds(update(ref(db('alice'), 'users/alice'), { username: 'Alice_R', usernameLower: 'alice_r' }));
  await assertFails(update(ref(db('bob'), 'users/bob'), { username: 'alice_r' }));
});

// ---- reports ----
test('citizen can create a NEW report only under their own uid', async () => {
  await assertSucceeds(set(ref(db('alice'), 'reports/R1'), report('alice')));
  await assertFails(set(ref(db('alice'), 'reports/R2'), report('bob')));
  await assertFails(set(ref(db('alice'), 'reports/R3'), report('alice', { status: 'RESOLVED' })));
});

test('reports reject invalid coordinates and statuses', async () => {
  await assertFails(set(ref(db('alice'), 'reports/R1'), report('alice', { latitude: 123 })));
  await assertFails(set(ref(db('city'), 'reports/R1'), report('alice', { status: 'HACKED' })));
});

test('another citizen cannot overwrite or resolve someone else\'s report', async () => {
  await assertSucceeds(set(ref(db('alice'), 'reports/R1'), report('alice')));
  await assertFails(update(ref(db('bob'), 'reports/R1'), { status: 'RESOLVED' }));
  await assertFails(set(ref(db('bob'), 'reports/R1'), report('bob')));
});

test('reporter cannot change status of their own report', async () => {
  await assertSucceeds(set(ref(db('alice'), 'reports/R1'), report('alice')));
  await assertSucceeds(update(ref(db('alice'), 'reports/R1'), { notes: 'deeper than it looks' }));
  await assertFails(update(ref(db('alice'), 'reports/R1'), { status: 'RESOLVED' }));
});

test('any signed-in user can add one confirmation to an existing report', async () => {
  await assertSucceeds(set(ref(db('alice'), 'reports/R1'), report('alice', { totalDetections: 1 })));
  await assertSucceeds(update(ref(db('bob'), 'reports/R1'), { totalDetections: increment(1), lastDetectedAt: Date.now() }));
  await assertFails(update(ref(db('bob'), 'reports/R1'), { totalDetections: 50 }));
});

test('contractor workflow: only allowed transitions on own assignment', async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    set(ref(ctx.database(), 'reports/R1'), report('alice', { status: 'ASSIGNED', contractorId: 'con' })));
  await assertFails(update(ref(db('con'), 'reports/R1'), { status: 'RESOLVED' }));
  await assertFails(update(ref(db('con'), 'reports/R1'), { status: 'IN_PROGRESS' }));
  await assertSucceeds(update(ref(db('con'), 'reports/R1'), { status: 'ACCEPTED' }));
  await assertSucceeds(update(ref(db('con'), 'reports/R1'), { status: 'IN_PROGRESS' }));
  await assertSucceeds(update(ref(db('con'), 'reports/R1'), { status: 'REPAIR_SUBMITTED', repairNotes: 'patched' }));
  await assertFails(update(ref(db('con'), 'reports/R1'), { status: 'RESOLVED' }));
  await assertSucceeds(update(ref(db('city'), 'reports/R1'), { status: 'RESOLVED' }));
});

test('contractor can decline an assignment, other contractors cannot touch it', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database(), 'users/con2'), { role: 'CONTRACTOR' });
    await set(ref(ctx.database(), 'reports/R1'), report('alice', { status: 'ASSIGNED', contractorId: 'con' }));
  });
  await assertFails(update(ref(db('con2'), 'reports/R1'), { status: 'ACCEPTED' }));
  await assertSucceeds(update(ref(db('con'), 'reports/R1'), { status: 'ASSIGNMENT_DECLINED', contractorId: null, assignedTo: null }));
});

// ---- detections ----
test('detections are append-only and private to reporter + city', async () => {
  const det = { reporterId: 'alice', potholeId: 'R1', latitude: 1, longitude: 1, timestamp: Date.now(), confidence: 0.8 };
  await assertSucceeds(set(ref(db('alice'), 'detections/d1'), det));
  await assertFails(set(ref(db('alice'), 'detections/d1'), det));
  await assertFails(set(ref(db('bob'), 'detections/d2'), det));
  await assertFails(get(ref(db('bob'), 'detections')));
  await assertSucceeds(get(query(ref(db('alice'), 'detections'), orderByChild('reporterId'), equalTo('alice'))));
  await assertFails(get(query(ref(db('bob'), 'detections'), orderByChild('reporterId'), equalTo('alice'))));
  await assertSucceeds(get(ref(db('city'), 'detections')));
  await assertSucceeds(get(ref(db('alice'), 'detections/d1')));
  await assertFails(get(ref(db('bob'), 'detections/d1')));
});

// ---- audit log ----
test('activity log entries are append-only and attributed to the writer', async () => {
  const log = { timestamp: Date.now(), changedBy: 'Alice', changedByUid: 'alice', newStatus: 'NEW' };
  await assertSucceeds(set(ref(db('alice'), 'activity_logs/R1/l1'), log));
  await assertFails(set(ref(db('alice'), 'activity_logs/R1/l1'), log));
  await assertFails(set(ref(db('bob'), 'activity_logs/R1/l2'), log));
  await assertFails(remove(ref(db('alice'), 'activity_logs/R1/l1')));
});

// ---- live sessions ----
test('live sessions: only scanner and participants can read; joining by code works', async () => {
  const s = { scannerId: 'alice', sessionCode: 'AB12CD', status: 'ACTIVE', startedAt: 1,
    participants: { alice: { uid: 'alice', role: 'SCANNER' } } };
  await assertSucceeds(update(ref(db('alice')), { 'live_sessions/s1': s, 'session_codes/AB12CD': 's1' }));
  await assertFails(get(ref(db('bob'), 'live_sessions/s1')));
  await assertFails(get(ref(db('bob'), 'live_sessions')));
  await assertSucceeds(get(ref(db('bob'), 'session_codes/AB12CD')));
  await assertFails(set(ref(db('bob'), 'live_sessions/s1/participants/bob'), { uid: 'bob', role: 'SCANNER' }));
  await assertSucceeds(set(ref(db('bob'), 'live_sessions/s1/participants/bob'), { uid: 'bob', role: 'COMPANION' }));
  await assertSucceeds(get(ref(db('bob'), 'live_sessions/s1')));
  await assertFails(set(ref(db('bob'), 'live_sessions/s1/scanner_location'), { latitude: 0 }));
  await assertFails(update(ref(db('bob'), 'live_sessions/s1'), { status: 'ENDED' }));
  await assertSucceeds(update(ref(db('alice'), 'live_sessions/s1'), { status: 'ENDED' }));
  await assertFails(set(ref(db('carol'), 'live_sessions/s1/participants/carol'), { uid: 'carol', role: 'COMPANION' }));
  await assertSucceeds(remove(ref(db('bob'), 'live_sessions/s1/participants/bob')));
});

test('a user cannot hijack someone else\'s session code', async () => {
  const s = { scannerId: 'alice', sessionCode: 'AB12CD', status: 'ACTIVE' };
  await assertSucceeds(update(ref(db('alice')), { 'live_sessions/s1': s, 'session_codes/AB12CD': 's1' }));
  await assertFails(set(ref(db('bob'), 'session_codes/AB12CD'), 's2'));
  await assertFails(set(ref(db('bob'), 'session_codes/ZZ99ZZ'), 's1'));
});

test('legacy potholes node is read-only for non-admins', async () => {
  await assertFails(set(ref(db('alice'), 'potholes/P1'), { latitude: 1 }));
  await assertSucceeds(get(ref(db('alice'), 'potholes')));
});
