import { firestore } from './firebase.js';
import { reportsShardRef, reportsGroupRef, slugify } from './lib/geo.js';
import { filterReports } from './lib/filterReports.js';
import { nextPrefixedId } from './lib/counters.js';
import { severityForDamage, severityFromDetectionScore, scoreForSeverity, nextStatus, randomMapCoord, STATUS_LABELS } from './domain.js';
import { addActivity, addNotification } from './db.js';
import { annotateServedBy, annotateAllServedBy } from './lib/servedBy.js';
import { distanceMeters } from './lib/haversine.js';
import { resolveLocality } from './lib/knownLocalities.js';

const SEVERITY_RANK = { minor: 0, moderate: 1, critical: 2 };


/**
 * Reports are the one high-write, citizen-facing collection, so this is the
 * only repo that's geo-sharded (see server/lib/geo.js). Everything else
 * (fleet, settings, workflow, activity feed) stays flat in db.js — that
 * data is low-volume and admin-facing, so sharding it would add complexity
 * for no real benefit.
 */

// GET /api/reports?search=&severity=&status=
export async function listReports({ search = '', severity = 'all', status = 'all' } = {}) {
  // Native Firestore queries can't do free-text "contains" matching, and the
  // original behavior filtered in-memory anyway — so pull the group, filter/
  // sort in JS. Fine at hackathon/demo scale; if a locality's volume grows,
  // add a search index (Algolia/Typesense) fed by a Cloud Function trigger.
  const snap = await reportsGroupRef(firestore).orderBy('created', 'desc').get();
  return filterReports(annotateAllServedBy(snap.docs.map((d) => d.data())), { search, severity, status });
}

async function findReportDoc(id) {
  const snap = await reportsGroupRef(firestore).where('id', '==', id).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

export async function getReportById(id) {
  const doc = await findReportDoc(id);
  return doc ? annotateServedBy(doc.data()) : null;
}

export async function createReport({ location, damage, description = '', photoUrl = null, state, city, locality, lat, lng, sourceDeviceId }) {
  const severity = severityForDamage(damage);
  const score = scoreForSeverity(severity);
  const id = await nextPrefixedId('nextIdNum', 'RG', 1029);
  const { x, y } = randomMapCoord();
  const now = Date.now();

  const report = {
    id,
    location: location.trim(),
    damage: damage.trim(),
    severity,
    score,
    status: 'open',
    x, y,
    created: now,
    description: description.trim(),
    photoUrl,
    // geo-shard metadata, kept on the doc itself so a doc is self-describing
    // even when read back via a collectionGroup query (which loses the path
    // context you'd otherwise get from doc.ref.parent chain):
    state: state || null,
    city: city || null,
    locality: locality || null,
    stateSlug: slugify(state),
    citySlug: slugify(city),
    localitySlug: slugify(locality),
    lat: lat ?? null,
    lng: lng ?? null,
    sourceDeviceId: sourceDeviceId || null,
  };

  await reportsShardRef(firestore, { state, city, locality }).doc(id).set(report);
  const annotatedReport = annotateServedBy(report);

  const activityEntry = await addActivity({
    tone: severity === 'critical' ? 'red' : severity === 'moderate' ? 'blue' : 'green',
    icon: severity === 'critical' ? '!' : '⌁',
    text: `New ${severity} issue detected at **${report.location}**`,
    time: now,
  });

  let notification = null;
  if (severity === 'critical') {
    notification = await addNotification({
      tone: 'critical-alert',
      icon: '!',
      title: 'Critical issue detected',
      body: `${report.location} · AI confidence ${score}%`,
      time: now,
      read: false,
    });
  }

  return { report: annotatedReport, activityEntry, notification };
}

export async function advanceReportStatus(id) {
  const doc = await findReportDoc(id);
  if (!doc) return null;

  const report = doc.data();
  const previousStatus = report.status;
  const newStatus = nextStatus(previousStatus);
  const now = Date.now();

  await doc.ref.update({ status: newStatus });

  const resolvedNow = newStatus === 'resolved';
  const activityEntry = await addActivity(
    resolvedNow
      ? { tone: 'green', icon: '✓', text: `Issue resolved at **${report.location}**`, time: now }
      : { tone: 'blue', icon: '⌁', text: `Report **#${report.id}** moved to ${STATUS_LABELS[newStatus]}`, time: now }
  );

  return { report: annotateServedBy({ ...report, status: newStatus }), activityEntry, previousStatus };
}

export async function deleteReport(id) {
  const doc = await findReportDoc(id);
  if (!doc) return false;
  await doc.ref.delete();
  return true;
}

/**
 * Ingests a detection from a mobile/edge device (see the payload schema in
 * the architecture PDF, Section 4.1). Unlike createReport (a citizen filing
 * a free-text report), this:
 *   1. Resolves raw lat/lng into a locality shard (device doesn't know it).
 *   2. Runs Haversine dedupe within that shard: if an existing geo-tagged
 *      report sits within DEDUPE_RADIUS_METERS, this is treated as another
 *      sighting of the same pothole — bump its confidence count instead of
 *      creating a duplicate ticket.
 *   3. Otherwise creates a new report, same shape as a citizen report plus
 *      device/telemetry provenance fields.
 */
export async function createOrMergeMobileDetection({ deviceId, timestamp, location = {}, detection = {}, telemetry = {} }) {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    const err = new Error('location.latitude and location.longitude are required numbers');
    err.status = 400;
    throw err;
  }

  const { state, city, locality } = resolveLocality(lat, lng);
  const severity = severityFromDetectionScore(detection.severityScore);
  const score = Math.max(1, Math.min(99, Math.round((detection.confidence ?? 0.75) * 100)));
  const damage = detection.class ? detection.class.charAt(0).toUpperCase() + detection.class.slice(1) : 'Road Anomaly';
  const now = timestamp ? (Date.parse(timestamp) || Date.now()) : Date.now();
  const radiusMeters = Number(process.env.DEDUPE_RADIUS_METERS || 15);

  const shardRef = reportsShardRef(firestore, { state, city, locality });
  const snap = await shardRef.get();
  const geoTagged = snap.docs.filter((d) => typeof d.data().lat === 'number' && typeof d.data().lng === 'number');
  const matchDoc = geoTagged.find((d) => distanceMeters(lat, lng, d.data().lat, d.data().lng) <= radiusMeters) || null;

  if (matchDoc) {
    const existing = matchDoc.data();
    const updates = {
      confidenceCount: (existing.confidenceCount || 1) + 1,
      lastUpdated: now,
      lastAccelZPeak: telemetry.accelZPeak ?? existing.lastAccelZPeak ?? null,
      lastSeenDeviceId: deviceId || existing.lastSeenDeviceId || null,
    };
    // A fresh reading more severe than what's on file promotes the report —
    // e.g. a pothole that's since worsened, or the first pass under-detected it.
    if (SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity]) {
      updates.severity = severity;
      updates.score = Math.max(existing.score, score);
    }
    await matchDoc.ref.update(updates);
    return { merged: true, report: annotateServedBy({ ...existing, ...updates }) };
  }

  const id = await nextPrefixedId('nextIdNum', 'RG', 1029);
  const { x, y } = randomMapCoord();
  const resolvedLabel = locality ? `${locality}, ${city}` : `${lat.toFixed(4)}, ${lng.toFixed(4)} (unassigned)`;

  const report = {
    id,
    location: resolvedLabel,
    damage,
    severity,
    score,
    status: 'open',
    x, y,
    created: now,
    description: `Auto-detected by ${deviceId || 'mobile unit'} — IMU impact confirmed: ${telemetry.imuImpactConfirmed ? 'yes' : 'no'}`,
    photoUrl: null,
    state: state || null,
    city: city || null,
    locality: locality || null,
    stateSlug: slugify(state),
    citySlug: slugify(city),
    localitySlug: slugify(locality),
    lat, lng,
    sourceDeviceId: deviceId || null,
    confidenceCount: 1,
    lastUpdated: now,
    lastAccelZPeak: telemetry.accelZPeak ?? null,
    aiConfidence: detection.confidence ?? null,
  };

  await shardRef.doc(id).set(report);
  const annotatedReport = annotateServedBy(report);

  const activityEntry = await addActivity({
    tone: severity === 'critical' ? 'red' : severity === 'moderate' ? 'blue' : 'green',
    icon: severity === 'critical' ? '!' : '⌁',
    text: `New ${severity} issue auto-detected at **${report.location}**`,
    time: now,
  });

  let notification = null;
  if (severity === 'critical') {
    notification = await addNotification({
      tone: 'critical-alert',
      icon: '!',
      title: 'Critical issue detected (mobile unit)',
      body: `${report.location} · AI confidence ${score}%`,
      time: now,
      read: false,
    });
  }

  return { merged: false, report: annotatedReport, activityEntry, notification };
}
