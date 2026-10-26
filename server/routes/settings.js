import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../db.js';

const ALLOWED_REFRESH = ['Real-time', 'Every 5 minutes', 'Every 15 minutes'];
const ALLOWED_LAYERS = ['Road Intelligence', 'Satellite', 'Street'];

export default function settingsRouter(io) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try { res.json({ settings: await getSettings() }); } catch (err) { next(err); }
  });

  router.put('/', requireAuth, async (req, res, next) => {
    try {
      const { refresh, mapLayer, criticalAlerts } = req.body || {};
      if (refresh !== undefined && !ALLOWED_REFRESH.includes(refresh)) {
        return res.status(400).json({ error: `refresh must be one of: ${ALLOWED_REFRESH.join(', ')}` });
      }
      if (mapLayer !== undefined && !ALLOWED_LAYERS.includes(mapLayer)) {
        return res.status(400).json({ error: `mapLayer must be one of: ${ALLOWED_LAYERS.join(', ')}` });
      }
      if (criticalAlerts !== undefined && typeof criticalAlerts !== 'boolean') {
        return res.status(400).json({ error: 'criticalAlerts must be a boolean' });
      }

      const settings = await updateSettings({
        ...(refresh !== undefined ? { refresh } : {}),
        ...(mapLayer !== undefined ? { mapLayer } : {}),
        ...(criticalAlerts !== undefined ? { criticalAlerts } : {}),
      });
      io.emit('settings:updated', settings);
      res.json({ settings });
    } catch (err) { next(err); }
  });

  return router;
}
