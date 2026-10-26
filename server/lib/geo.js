/**
 * Geo-sharding helpers.
 *
 * Reports live at:
 *   states/{stateSlug}/cities/{citySlug}/localities/{localitySlug}/reports/{reportId}
 *
 * This is the "decentralized backend" layer: every locality gets its own
 * Firestore subcollection (its own key-range/shard), so a traffic spike in
 * one locality (e.g. everyone in Ballygunge upvoting after a storm) never
 * scans or contends with documents from an unrelated locality in Howrah or
 * Delhi. Cross-locality views (the admin dashboard's global report list,
 * city/state analytics) use a `collectionGroup('reports')` query, which
 * reads across every shard without needing a single giant flat collection.
 */

const FALLBACK = 'unassigned';

export function slugify(value) {
  if (!value || !String(value).trim()) return FALLBACK;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || FALLBACK;
}

/** Returns the Firestore CollectionReference for one locality's reports. */
export function reportsShardRef(firestore, { state, city, locality }) {
  const s = slugify(state);
  const c = slugify(city);
  const l = slugify(locality);
  return firestore
    .collection('states').doc(s)
    .collection('cities').doc(c)
    .collection('localities').doc(l)
    .collection('reports');
}

/** Returns a collectionGroup query object spanning every locality shard. */
export function reportsGroupRef(firestore) {
  return firestore.collectionGroup('reports');
}

export const UNASSIGNED_SHARD = FALLBACK;
