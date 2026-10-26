/**
 * A-DASH software simulator
 * -------------------------
 * Simulates N virtual vehicles, each moving inside a fixed locality.
 * Every tick, each vehicle:
 *   1. Takes a small random-walk GPS step within its locality's bounds.
 *   2. Simulates an accelerometer reading. If it spikes past a threshold
 *      (a "bump"), the vehicle treats that as a pothole/road-damage event.
 *   3. On a bump, POSTs a report to the real RoadGuard API — exactly the
 *      request shape a real ESP32+GPS+accelerometer unit would send.
 *
 * This intentionally does NOT touch Firestore/db.js directly. The device
 * (real or simulated) should only ever talk to the API, so all validation,
 * severity scoring, and locality-shard routing stays server-side.
 *
 * Run: node server/simulator/adashSimulator.js
 * Requires: npm install node-fetch form-data   (if on Node <18; Node 18+
 * has global fetch, so only form-data is needed for multipart bodies)
 */

import FormData from 'form-data';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const TICK_MS = Number(process.env.SIM_TICK_MS || 4000);
const BUMP_PROBABILITY = Number(process.env.SIM_BUMP_PROB || 0.15); // per vehicle per tick

// Each "vehicle" is pinned to a locality with a rough lat/lng center it
// wanders around. Add more entries here to simulate more localities/cities.
const VEHICLES = [
  { id: 'V-KOL-BALLYGUNGE-1', state: 'West Bengal', city: 'Kolkata', locality: 'Ballygunge', lat: 22.5265, lng: 88.3654 },
  { id: 'V-KOL-SALTLAKE-1', state: 'West Bengal', city: 'Kolkata', locality: 'Salt Lake', lat: 22.5800, lng: 88.4200 },
  { id: 'V-HOW-SHIBPUR-1', state: 'West Bengal', city: 'Howrah', locality: 'Shibpur', lat: 22.5850, lng: 88.3200 },
  { id: 'V-DEL-DWARKA-1', state: 'Delhi', city: 'New Delhi', locality: 'Dwarka', lat: 28.5921, lng: 77.0460 },
];

const DAMAGE_TYPES = ['Pothole', 'Crack', 'Waterlogging', 'Loose gravel', 'Broken road edge'];

function randomWalk(value, step = 0.0008) {
  return value + (Math.random() - 0.5) * step;
}

function simulateAccelerometerSpike() {
  // A "calm" reading is near 1.0g; a bump produces a higher transient spike.
  const baseline = 1.0 + (Math.random() - 0.5) * 0.05;
  const isBump = Math.random() < BUMP_PROBABILITY;
  const spike = isBump ? 1.8 + Math.random() * 1.5 : 0;
  return { reading: +(baseline + spike).toFixed(2), isBump };
}

async function reportBump(vehicle, accel) {
  const damage = DAMAGE_TYPES[Math.floor(Math.random() * DAMAGE_TYPES.length)];
  const description = `Auto-detected by A-DASH unit ${vehicle.id} — accelerometer spike ${accel.reading}g`;

  // NOTE: assumes the API accepts these extra fields once step 2 (geo-sharded
  // schema) is in place. Until then, the server will just ignore unknown
  // multipart fields — safe to run against the current API as-is.
  const form = new FormData();
  form.append('location', `${vehicle.locality}, ${vehicle.city}`);
  form.append('damage', damage);
  form.append('description', description);
  form.append('state', vehicle.state);
  form.append('city', vehicle.city);
  form.append('locality', vehicle.locality);
  form.append('lat', String(vehicle.lat));
  form.append('lng', String(vehicle.lng));
  form.append('sourceDeviceId', vehicle.id);

  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders ? form.getHeaders() : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[${vehicle.id}] report rejected (${res.status}):`, data.error || data);
    } else {
      console.log(`[${vehicle.id}] bump reported → ${damage} at ${vehicle.locality} (accel ${accel.reading}g)`);
    }
  } catch (err) {
    console.error(`[${vehicle.id}] failed to reach API:`, err.message);
  }
}

function tick() {
  for (const vehicle of VEHICLES) {
    vehicle.lat = randomWalk(vehicle.lat);
    vehicle.lng = randomWalk(vehicle.lng);

    const accel = simulateAccelerometerSpike();
    if (accel.isBump) {
      reportBump(vehicle, accel);
    }
  }
}

console.log(`A-DASH simulator running: ${VEHICLES.length} vehicles, tick every ${TICK_MS}ms, API at ${API_BASE}`);
console.log('Vehicles:', VEHICLES.map((v) => `${v.id} (${v.locality}, ${v.city})`).join(', '));

setInterval(tick, TICK_MS);
