import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getWorkflow, advanceWorkflow } from '../db.js';

export default function workflowRouter(io) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try { res.json({ workflow: await getWorkflow() }); } catch (err) { next(err); }
  });

  router.post('/advance', requireAuth, async (_req, res, next) => {
    try {
      const result = await advanceWorkflow();
      if (result.changed) io.emit('workflow:updated', result.workflow);
      res.json(result);
    } catch (err) { next(err); }
  });

  return router;
}
