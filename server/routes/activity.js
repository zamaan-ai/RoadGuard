import { Router } from 'express';
import { getActivity } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || undefined;
    res.json({ activity: await getActivity(limit) });
  } catch (err) { next(err); }
});

export default router;
