import { firestore } from '../firebase.js';

const COUNTERS_DOC = firestore.collection('meta').doc('counters');

/**
 * Firestore has no auto-increment, so counters are kept in one small
 * document and incremented inside a transaction (safe under concurrent
 * writes from multiple locality shards at once).
 */
async function increment(field, start) {
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(COUNTERS_DOC);
    const current = snap.exists ? (snap.data()[field] ?? start) : start;
    tx.set(COUNTERS_DOC, { [field]: current + 1 }, { merge: true });
    return current;
  });
}

/** e.g. nextPrefixedId('nextIdNum', 'RG') -> "RG-1029" */
export async function nextPrefixedId(field, prefix, start = 1) {
  const num = await increment(field, start);
  return `${prefix}-${num}`;
}

/** e.g. nextNumericId('nextActivityId') -> 5 */
export async function nextNumericId(field, start = 1) {
  return increment(field, start);
}

export async function seedCounters(initial) {
  await COUNTERS_DOC.set(initial, { merge: true });
}
