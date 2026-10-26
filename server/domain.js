import { DAMAGE_SEVERITY_TABLE } from './seedData.js';

export const STATUS_ORDER = ['open', 'assigned', 'repair', 'resolved'];

export const STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  repair: 'In Repair',
  resolved: 'Resolved',
};

export function severityForDamage(damage) {
  return DAMAGE_SEVERITY_TABLE[damage] || 'minor';
}

// Mobile/edge detections report severity as HIGH/MEDIUM/LOW (see the
// ingestion payload schema in the architecture PDF) rather than a damage
// type string — map that scale onto the same critical/moderate/minor used
// everywhere else in the app.
export function severityFromDetectionScore(severityScore) {
  const key = String(severityScore || '').toUpperCase();
  if (key === 'HIGH') return 'critical';
  if (key === 'MEDIUM') return 'moderate';
  return 'minor';
}


export function scoreForSeverity(severity) {
  if (severity === 'critical') return 90 + Math.floor(Math.random() * 9); // 90-98
  if (severity === 'moderate') return 78 + Math.floor(Math.random() * 12); // 78-89
  return 60 + Math.floor(Math.random() * 15); // 60-74
}

export function nextStatus(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
}

export function randomMapCoord() {
  return {
    x: Math.round((15 + Math.random() * 70) * 100) / 100,
    y: Math.round((15 + Math.random() * 70) * 100) / 100,
  };
}

export function computeStats(reports) {
  const critical = reports.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length;
  const moderate = reports.filter((r) => r.severity === 'moderate' && r.status !== 'resolved').length;
  const total = reports.length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const openWorkOrders = reports.filter((r) => r.status !== 'resolved').length;
  return { critical, moderate, total, resolved, openWorkOrders };
}

export function nextId(counterKey, db, prefix) {
  const num = db[counterKey];
  db[counterKey] = num + 1;
  return `${prefix}-${num}`;
}

export function nextSimpleId(counterKey, db) {
  const id = db[counterKey];
  db[counterKey] = id + 1;
  return id;
}
