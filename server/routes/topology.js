import { Router } from 'express';
import { NODE_REGISTRY } from '../nodeRegistry.js';

const router = Router();

const TIER_LEVEL = { localities: 'locality', cities: 'city', states: 'state' };

async function pingNode(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { url, status: 'down' };
    const data = await res.json();
    return { url, status: 'up', requestCount: data.requestCount ?? 0 };
  } catch {
    return { url, status: 'down' };
  }
}

// GET /api/topology — the actual proof for a demo: which nodes exist, which
// are alive right now, and how many requests each has handled.
router.get('/', async (_req, res) => {
  const tiers = ['localities', 'cities', 'states'];
  const result = {};

  for (const tier of tiers) {
    const entries = Object.entries(NODE_REGISTRY[tier]);
    result[tier] = await Promise.all(
      entries.map(async ([slug, url]) => ({ slug, level: TIER_LEVEL[tier], ...(await pingNode(url)) }))
    );
  }

  res.json(result);
});

export default router;
