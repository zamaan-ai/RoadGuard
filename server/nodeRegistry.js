import { slugify } from './lib/geo.js';

/**
 * Static routing table: which physical node owns which locality / city /
 * state. In a real deployment each entry would be a different machine (or
 * container) running server/nodes/regionalServer.js with its own PORT.
 * Here they're all localhost on different ports so the whole hierarchy can
 * be demoed on one machine — but nothing about the code assumes that;
 * point these URLs at real hosts and it's a genuinely distributed system.
 *
 * Anything NOT listed here has no dedicated node yet, and the gateway
 * falls back to handling it centrally (see server/index.js) — so adding
 * regions to this table is incremental, not all-or-nothing.
 */
export const NODE_REGISTRY = {
  localities: {
    'ballygunge': 'http://localhost:4101',
    'salt-lake': 'http://localhost:4102',
    'shibpur': 'http://localhost:4103',
  },
  cities: {
    'kolkata': 'http://localhost:4201',
    'howrah': 'http://localhost:4202',
  },
  states: {
    'west-bengal': 'http://localhost:4301',
  },
};

export function localityNodeFor(locality) {
  return NODE_REGISTRY.localities[slugify(locality)] || null;
}

export function cityNodeFor(city) {
  return NODE_REGISTRY.cities[slugify(city)] || null;
}

export function stateNodeFor(state) {
  return NODE_REGISTRY.states[slugify(state)] || null;
}
