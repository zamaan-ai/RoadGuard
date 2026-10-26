import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../upload.js';
import { listReports, getReportById, createReport, advanceReportStatus, deleteReport, createOrMergeMobileDetection } from '../reportsRepo.js';
import { filterReports } from '../lib/filterReports.js';
import { localityNodeFor, cityNodeFor, stateNodeFor } from '../nodeRegistry.js';

/**
 * This is the GATEWAY's view of /api/reports. For any locality/city/state
 * that has a dedicated node registered (see server/nodeRegistry.js), the
 * gateway forwards to that node instead of touching Firestore itself —
 * that node absorbs the read/write load for its own region. Anything not
 * yet registered falls back to being handled centrally, so the system
 * degrades gracefully instead of failing for un-onboarded regions.
 */

async function forwardJson(url, path, options) {
  const res = await fetch(`${url}${path}`, options);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export default function reportsRouter(io) {
  const router = Router();

  // GET /api/reports?search=&severity=&status=&locality=&city=&state=
  router.get('/', async (req, res, next) => {
    try {
      const { search = '', severity = 'all', status = 'all', locality, city, state } = req.query;
      const filters = { search, severity, status };

      const localityNode = locality && localityNodeFor(locality);
      const cityNode = !localityNode && city && cityNodeFor(city);
      const stateNode = !localityNode && !cityNode && state && stateNodeFor(state);
      const node = localityNode || cityNode || stateNode;

      if (node) {
        const { status: code, body } = await forwardJson(node, '/reports');
        if (code >= 400) return res.status(code).json(body);
        return res.json({ reports: filterReports(body.reports || [], filters), servedBy: node });
      }

      // No dedicated node for this region (or a global/unscoped query) —
      // handle centrally via the collectionGroup query across every shard.
      const reports = await listReports(filters);
      res.json({ reports });
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const report = await getReportById(req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json({ report });
    } catch (err) { next(err); }
  });

  // POST /api/reports  (multipart/form-data: location, damage, description, photo,
  // state, city, locality, lat, lng, sourceDeviceId)
  router.post('/', upload.single('photo'), async (req, res, next) => {
    try {
      const { location, damage, description = '', state, city, locality, lat, lng, sourceDeviceId } = req.body || {};

      if (!location || !location.trim()) return res.status(400).json({ error: 'location is required' });
      if (!damage || !damage.trim()) return res.status(400).json({ error: 'damage is required' });

      const payload = {
        location, damage, description,
        photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
        state, city, locality,
        lat: lat !== undefined ? Number(lat) : undefined,
        lng: lng !== undefined ? Number(lng) : undefined,
        sourceDeviceId,
      };

      const node = localityNodeFor(locality);
      let result;
      let servedBy = 'gateway (no dedicated node for this locality)';

      if (node) {
        const { status: code, body } = await forwardJson(node, '/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (code >= 400) return res.status(code).json(body);
        result = body;
        servedBy = node;
      } else {
        result = await createReport(payload);
      }

      io.emit('report:created', result.report);
      io.emit('activity:created', result.activityEntry);
      if (result.notification) io.emit('notification:created', result.notification);

      res.status(201).json({ ...result, servedBy });
    } catch (err) { next(err); }
  });

  // POST /api/reports/mobile-detection — ingestion endpoint for phone/edge
  // devices (see architecture PDF §4.1 for the payload shape). Runs spatial
  // dedupe before deciding whether to create a new report or merge into an
  // existing one.
  router.post('/mobile-detection', async (req, res, next) => {
    try {
      const { deviceId, timestamp, location, detection, telemetry } = req.body || {};
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        return res.status(400).json({ error: 'location.latitude and location.longitude (numbers) are required' });
      }

      const result = await createOrMergeMobileDetection({ deviceId, timestamp, location, detection, telemetry });

      if (result.merged) {
        io.emit('report:updated', result.report);
      } else {
        io.emit('report:created', result.report);
        io.emit('activity:created', result.activityEntry);
        if (result.notification) io.emit('notification:created', result.notification);
      }

      res.status(result.merged ? 200 : 201).json({
        status: result.merged ? 'merged' : 'created',
        reportId: result.report.id,
        report: result.report,
      });
    } catch (err) { next(err); }
  });

  // PATCH /api/reports/:id/advance
  router.patch('/:id/advance', requireAuth, async (req, res, next) => {
    try {
      const result = await advanceReportStatus(req.params.id);
      if (!result) return res.status(404).json({ error: 'Report not found' });

      io.emit('report:updated', result.report);
      io.emit('activity:created', result.activityEntry);
      res.json(result);
    } catch (err) { next(err); }
  });

  // DELETE /api/reports/:id
  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      const existed = await deleteReport(req.params.id);
      if (!existed) return res.status(404).json({ error: 'Report not found' });
      io.emit('report:deleted', { id: req.params.id });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}
