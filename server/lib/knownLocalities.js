/**
 * Real mobile devices only send raw lat/lng — they don't know which
 * locality/city/state shard they belong to. This is a small anchor table
 * (nearest-anchor lookup) used to resolve coordinates into the
 * state/city/locality tuple that server/lib/geo.js shards reports by.
 *
 * This is a placeholder for a real reverse-geocoding service (Google
 * Geocoding API, Nominatim/OpenStreetMap, etc). Swap resolveLocality's
 * body for a real API call when you're ready — everything downstream
 * (dedupe, sharding, dashboard) only cares about the {state,city,locality}
 * it returns, not how it was derived.
 */
import { distanceMeters } from './haversine.js';

export const KNOWN_LOCALITIES = [
  { state: 'West Bengal', city: 'Kolkata', locality: 'Ballygunge', lat: 22.5265, lng: 88.3654 },
  { state: 'West Bengal', city: 'Kolkata', locality: 'Salt Lake', lat: 22.5800, lng: 88.4200 },
  { state: 'West Bengal', city: 'Howrah', locality: 'Shibpur', lat: 22.5850, lng: 88.3200 },
  { state: 'Delhi', city: 'New Delhi', locality: 'Dwarka', lat: 28.5921, lng: 77.0460 },
];

// Beyond this radius, we don't guess — the report is stored as "unassigned"
// rather than silently attributed to the wrong locality.
const MAX_ANCHOR_DISTANCE_METERS = 8000;

export function resolveLocality(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { state: null, city: null, locality: null };
  }
  let best = null;
  let bestDistance = Infinity;
  for (const anchor of KNOWN_LOCALITIES) {
    const d = distanceMeters(lat, lng, anchor.lat, anchor.lng);
    if (d < bestDistance) {
      bestDistance = d;
      best = anchor;
    }
  }
  if (!best || bestDistance > MAX_ANCHOR_DISTANCE_METERS) {
    return { state: null, city: null, locality: null };
  }
  return { state: best.state, city: best.city, locality: best.locality };
}
