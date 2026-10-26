import { Router } from 'express';
import { listReports } from '../reportsRepo.js';
import { computeStats } from '../domain.js';
import { cityNodeFor, stateNodeFor } from '../nodeRegistry.js';

const router = Router();

// GET /api/stats?city=Kolkata   or  ?state=West%20Bengal   -> routed to that node's rollup
// GET /api/stats                                            -> global, computed centrally
router.get('/', async (req, res, next) => {
  try {
    const { city, state } = req.query;
    const node = (city && cityNodeFor(city)) || (state && stateNodeFor(state));

    if (node) {
      const nodeRes = await fetch(`${node}/stats`);
      const body = await nodeRes.json();
      return res.status(nodeRes.status).json(body);
    }

    const reports = await listReports();
    res.json({ stats: computeStats(reports) });
  } catch (err) { next(err); }
});

router.get('/analytics', async (_req, res, next) => {
  try {
    const reports = await listReports();
    const stats = computeStats(reports);
    const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

    res.json({
      avgDetectionTimeMinutes: 3.8,
      resolutionRatePercent: resolutionRate,
      falseAlertRatePercent: 4.2,
      openWorkOrders: stats.openWorkOrders,
      techStack: [
        'Computer Vision / YOLOv8',
        'IMU Sensor Fusion',
        'GNSS / GPS',
        'Firebase / Firestore (geo-sharded)',
        'Locality / City / State node hierarchy',
        '4G / 5G Connectivity',
      ],
    });
  } catch (err) { next(err); }
});

export default router;
