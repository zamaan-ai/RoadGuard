import { firestore } from './firebase.js';
import { nextNumericId, seedCounters } from './lib/counters.js';
import { reportsShardRef, slugify } from './lib/geo.js';
import { buildSeed } from './seedData.js';

/**
 * Flat (non-sharded) collections: users, fleet, workflow, settings,
 * activity feed, notifications. These are low-volume/admin-facing, so
 * there's no benefit to geo-partitioning them — only server/reportsRepo.js
 * (the citizen-report firehose) is sharded by state/city/locality.
 */

const usersCol = firestore.collection('users');
const fleetCol = firestore.collection('fleet');
const workflowCol = firestore.collection('workflow');
const activityCol = firestore.collection('activity');
const notificationsCol = firestore.collection('notifications');
const settingsDoc = firestore.collection('settings').doc('config');
const seedFlagDoc = firestore.collection('meta').doc('seeded');

// ---- users ----
export async function getUserByUsername(username) {
  const snap = await usersCol.where('username', '==', username).limit(1).get();
  return snap.empty ? null : snap.docs[0].data();
}

// ---- fleet ----
export async function getFleet() {
  const snap = await fleetCol.get();
  return snap.docs.map((d) => d.data());
}

export async function updateFleetStatus(id, status) {
  const ref = fleetCol.doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({ status });
  return { ...snap.data(), status };
}

// ---- workflow ----
export async function getWorkflow() {
  const snap = await workflowCol.orderBy('id').get();
  return snap.docs.map((d) => d.data());
}

export async function advanceWorkflow() {
  const stages = await getWorkflow();
  const idx = stages.findIndex((s) => s.status === 'active');
  if (idx === -1 || idx === stages.length - 1) return { workflow: stages, changed: false };

  const batch = firestore.batch();
  batch.update(workflowCol.doc(String(stages[idx].id)), { status: 'done' });
  batch.update(workflowCol.doc(String(stages[idx + 1].id)), { status: 'active' });
  await batch.commit();

  return { workflow: await getWorkflow(), changed: true, completedTitle: stages[idx].title };
}

// ---- settings ----
export async function getSettings() {
  const snap = await settingsDoc.get();
  return snap.data();
}

export async function updateSettings(patch) {
  await settingsDoc.set(patch, { merge: true });
  return getSettings();
}

// ---- activity ----
export async function getActivity(limit) {
  let q = activityCol.orderBy('time', 'desc');
  if (limit) q = q.limit(limit);
  const snap = await q.get();
  return snap.docs.map((d) => d.data());
}

export async function addActivity(entry) {
  const id = await nextNumericId('nextActivityId', 5);
  const full = { id, ...entry };
  await activityCol.doc(String(id)).set(full);
  return full;
}

// ---- notifications ----
export async function getNotifications() {
  const snap = await notificationsCol.orderBy('time', 'desc').get();
  return snap.docs.map((d) => d.data());
}

export async function addNotification(entry) {
  const id = await nextNumericId('nextNotificationId', 4);
  const full = { id, ...entry };
  await notificationsCol.doc(String(id)).set(full);
  return full;
}

export async function markAllNotificationsRead() {
  const snap = await notificationsCol.get();
  const batch = firestore.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
  return getNotifications();
}

// ---- seeding ----
export async function initDB({ adminUsername, adminPassword, force = false } = {}) {
  const flag = await seedFlagDoc.get();
  if (flag.exists && !force) return;

  const seed = buildSeed({ adminUsername, adminPassword });

  const batch = firestore.batch();
  seed.users.forEach((u) => batch.set(usersCol.doc(u.id), u));
  seed.fleet.forEach((f) => batch.set(fleetCol.doc(f.id), f));
  seed.workflow.forEach((w) => batch.set(workflowCol.doc(String(w.id)), w));
  seed.activity.forEach((a) => batch.set(activityCol.doc(String(a.id)), a));
  seed.notifications.forEach((n) => batch.set(notificationsCol.doc(String(n.id)), n));
  batch.set(settingsDoc, seed.settings);
  batch.set(seedFlagDoc, { seededAt: Date.now() });
  await batch.commit();

  await seedCounters({
    nextIdNum: seed.nextIdNum,
    nextActivityId: seed.nextActivityId,
    nextNotificationId: seed.nextNotificationId,
  });

  // Seed a few sample reports spread across different locality shards, so
  // the geo-partitioning is visible immediately instead of starting empty.
  const sampleShards = [
    { state: 'West Bengal', city: 'Kolkata', locality: 'Ballygunge' },
    { state: 'West Bengal', city: 'Kolkata', locality: 'Salt Lake' },
    { state: 'West Bengal', city: 'Howrah', locality: 'Shibpur' },
  ];
  const seedBatch = firestore.batch();
  seed.reports.forEach((r, i) => {
    const shard = sampleShards[i % sampleShards.length];
    const ref = reportsShardRef(firestore, shard).doc(r.id);
    seedBatch.set(ref, {
      ...r,
      ...shard,
      stateSlug: slugify(shard.state),
      citySlug: slugify(shard.city),
      localitySlug: slugify(shard.locality),
    });
  });
  await seedBatch.commit();
}
