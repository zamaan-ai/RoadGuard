import 'dotenv/config';
import express from 'express';
import { firestore } from '../firebase.js';
import { reportsGroupRef, slugify } from '../lib/geo.js';
import { createReport } from '../reportsRepo.js';
import { computeStats } from '../domain.js';

/**
 * One process = one node responsible for one region, at one of three tiers:
 *
 *   LEVEL=locality  -> owns write + read traffic for exactly one locality.
 *                      This is the tier that actually absorbs citizen
 *                      report traffic, so this is what prevents "everyone
 *                      hitting one server at once" for the write path.
 *   LEVEL=city      -> read-only rollups across every locality in a city
 *                      (queries Firestore directly, filtered by citySlug —
 *                      it does NOT proxy through locality nodes, since
 *                      aggregation is Firestore's job, not an HTTP hop).
 *   LEVEL=state     -> same idea, one tier up, filtered by stateSlug.
 *
 * Start with e.g.:
 *   LEVEL=locality REGION="Ballygunge" PORT=4101 node server/nodes/regionalServer.js
 *   LEVEL=city     REGION="Kolkata"    PORT=4201 node server/nodes/regionalServer.js
 *   LEVEL=state    REGION="West Bengal" PORT=4301 node server/nodes/regionalServer.js
 */

const LEVEL = process.env.LEVEL; // 'locality' | 'city' | 'state'
const REGION = process.env.REGION;
const REGION_SLUG = slugify(REGION);
const PORT = process.env.PORT || 4100;
let requestCount = 0;

if (!['locality', 'city', 'state'].includes(LEVEL) || !REGION) {
  console.error('Usage: LEVEL=locality|city|state REGION="<name>" PORT=<port> node server/nodes/regionalServer.js');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use((_req, _res, next) => { requestCount += 1; next(); });

app.get('/health', (_req, res) => res.json({ ok: true, level: LEVEL, region: REGION, regionSlug: REGION_SLUG, port: Number(PORT), requestCount }));

if (LEVEL === 'locality') {
  // Owns this locality's report writes. The gateway forwards here instead
  // of writing to Firestore itself, so this node — not the gateway — is
  // what takes the hit if this locality suddenly gets a burst of reports.
  app.post('/reports', async (req, res, next) => {
    try {
      const { location, damage, description, photoUrl, city, state, lat, lng, sourceDeviceId, locality } = req.body || {};
      if (slugify(locality) !== REGION_SLUG) {
        return res.status(400).json({ error: `This node only accepts reports for locality "${REGION}"` });
      }
      const result = await createReport({ location, damage, description, photoUrl, state, city, locality, lat, lng, sourceDeviceId });
      res.status(201).json(result);
    } catch (err) { next(err); }
  });

  app.get('/reports', async (_req, res, next) => {
    try {
      const snap = await reportsGroupRef(firestore).where('localitySlug', '==', REGION_SLUG).orderBy('created', 'desc').get();
      res.json({ reports: snap.docs.map((d) => d.data()) });
    } catch (err) { next(err); }
  });
}

if (LEVEL === 'city' || LEVEL === 'state') {
  const field = LEVEL === 'city' ? 'citySlug' : 'stateSlug';

  app.get('/reports', async (_req, res, next) => {
    try {
      const snap = await reportsGroupRef(firestore).where(field, '==', REGION_SLUG).orderBy('created', 'desc').get();
      res.json({ reports: snap.docs.map((d) => d.data()) });
    } catch (err) { next(err); }
  });

  app.get('/stats', async (_req, res, next) => {
    try {
      const snap = await reportsGroupRef(firestore).where(field, '==', REGION_SLUG).get();
      const reports = snap.docs.map((d) => d.data());
      res.json({ region: REGION, level: LEVEL, stats: computeStats(reports) });
    } catch (err) { next(err); }
  });
}

app.use((err, _req, res, _next) => {
  console.error(`[${LEVEL}:${REGION}]`, err);
  res.status(err.status || 500).json({ error: err.message || 'Node error' });
});

app.listen(PORT, () => {
  console.log(`Regional node up — level=${LEVEL} region="${REGION}" (slug=${REGION_SLUG}) on :${PORT}`);
});
