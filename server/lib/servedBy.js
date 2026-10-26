import { localityNodeFor, cityNodeFor, stateNodeFor } from '../nodeRegistry.js';

export const CENTRAL_LABEL = 'central (no dedicated node yet)';

/** Which node is responsible for this report's region, based on the
 * registry — independent of which node actually handled the request, so
 * even seeded/legacy reports show where they'd route today. */
export function resolveServedBy({ locality, city, state }) {
  return localityNodeFor(locality) || cityNodeFor(city) || stateNodeFor(state) || CENTRAL_LABEL;
}

export function annotateServedBy(report) {
  return { ...report, servedBy: resolveServedBy(report) };
}

export function annotateAllServedBy(reports) {
  return reports.map(annotateServedBy);
}
