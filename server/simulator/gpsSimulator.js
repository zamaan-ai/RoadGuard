/**
 * Development-only GPS simulator. These are synthetic coordinates near Kolkata,
 * not real vehicle telemetry. For real tracking, configure GPS_INGEST_KEY and have
 * a trusted device POST its actual GPS fix to /api/fleet/:vehicleId/location.
 */
import 'dotenv/config';

const API_BASE = (process.env.API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const GPS_KEY = process.env.GPS_INGEST_KEY;
const TICK_MS = Math.max(2000, Number(process.env.GPS_SIM_TICK_MS || 5000));
if (!GPS_KEY) {
  console.error('Set GPS_INGEST_KEY in server/.env before running the GPS simulator.');
  process.exit(1);
}
const vehicles = [
  { id: 'SIM-KOL-01', lat: 22.5726, lng: 88.3639, heading: 35 },
  { id: 'SIM-KOL-02', lat: 22.5800, lng: 88.4200, heading: 210 },
  { id: 'SIM-HOW-01', lat: 22.5850, lng: 88.3200, heading: 90 },
];
async function tick() {
  for (const v of vehicles) {
    v.heading = (v.heading + (Math.random() - 0.5) * 16 + 360) % 360;
    const distance = 0.00012;
    v.lat += Math.cos(v.heading * Math.PI / 180) * distance;
    v.lng += Math.sin(v.heading * Math.PI / 180) * distance;
    try {
      const response = await fetch(`${API_BASE}/fleet/${encodeURIComponent(v.id)}/location`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GPS-Key': GPS_KEY },
        body: JSON.stringify({ lat: v.lat, lng: v.lng, heading: v.heading, speedKph: 18 + Math.random() * 24, status: 'Moving', simulated: true }),
      });
      if (!response.ok) console.error(`${v.id}: HTTP ${response.status} ${await response.text()}`);
    } catch (error) { console.error(`${v.id}: ${error.message}`); }
  }
  console.log(`${new Date().toISOString()} — sent ${vehicles.length} SIMULATED GPS positions`);
}
console.log(`GPS simulator started; tick=${TICK_MS}ms. Positions are synthetic, not real GPS.`);
await tick();
setInterval(tick, TICK_MS);
