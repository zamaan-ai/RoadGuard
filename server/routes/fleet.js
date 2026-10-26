import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getFleet, updateFleetStatus } from '../db.js';

const STATUS_CYCLE = ['Scanning', 'Moving', 'Idle', 'Maintenance'];
const latestLocations = new Map();

function validCoordinate(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }

export default function fleetRouter(io) {
  const router = Router();

  router.get('/locations', (_req, res) => {
    const locations = [...latestLocations.values()];
    res.json({ locations, updatedAt: locations.reduce((latest, item) => !latest || item.updatedAt > latest ? item.updatedAt : latest, null) });
  });

  // GPS devices post their latest position here. Configure GPS_INGEST_KEY and send
  // X-GPS-Key from trusted devices; simulated points are visibly marked as simulated.
  router.post('/:id/location', (req, res) => {
    const configuredKey = process.env.GPS_INGEST_KEY;
    if (!configuredKey || req.get('x-gps-key') !== configuredKey) return res.status(401).json({ error: 'Valid GPS ingestion key required (configure GPS_INGEST_KEY).' });
    const body = req.body || {};
    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude;
    if (!validCoordinate(lat, -90, 90) || !validCoordinate(lng, -180, 180)) return res.status(400).json({ error: 'lat and lng must be valid numeric coordinates.' });
    const location = { vehicleId: req.params.id, lat, lng, status: String(body.status || 'Moving').slice(0, 40), speedKph: Number.isFinite(body.speedKph) ? Math.max(0, Math.min(300, body.speedKph)) : null, heading: Number.isFinite(body.heading) ? ((body.heading % 360) + 360) % 360 : null, updatedAt: new Date().toISOString(), simulated: body.simulated === true };
    latestLocations.set(location.vehicleId, location);
    io.emit('fleet:location', location);
    res.status(202).json({ accepted: true, location });
  });

  router.get('/', async (_req, res, next) => {
    try { res.json({ fleet: await getFleet() }); } catch (err) { next(err); }
  });

  router.patch('/:id/status', requireAuth, async (req, res, next) => {
    try {
      const fleet = await getFleet();
      const current = fleet.find((v) => v.id === req.params.id);
      if (!current) return res.status(404).json({ error: 'Vehicle not found' });

      const { status } = req.body || {};
      if (status && !STATUS_CYCLE.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${STATUS_CYCLE.join(', ')}` });
      }
      const nextStatusValue = status || STATUS_CYCLE[(STATUS_CYCLE.indexOf(current.status) + 1) % STATUS_CYCLE.length];

      const vehicle = await updateFleetStatus(req.params.id, nextStatusValue);
      io.emit('fleet:updated', vehicle);
      res.json({ vehicle });
    } catch (err) { next(err); }
  });

  return router;
}
