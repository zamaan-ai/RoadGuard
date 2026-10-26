import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { firestore } from './firebase.js';
import { initDB } from './db.js';
import { UPLOAD_DIR } from './upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deleteCollectionGroup(name) {
  const snap = await firestore.collectionGroup(name).get();
  const batchSize = 400; // stay under Firestore's 500-write batch limit
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = firestore.batch();
    snap.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteTopCollection(name) {
  const snap = await firestore.collection(name).get();
  const batch = firestore.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function main() {
  await deleteCollectionGroup('reports');
  await deleteCollectionGroup('cities');
  await deleteCollectionGroup('localities');
  for (const name of ['states', 'users', 'fleet', 'workflow', 'activity', 'notifications', 'settings', 'meta']) {
    await deleteTopCollection(name);
  }

  if (fs.existsSync(UPLOAD_DIR)) {
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      if (f !== '.gitkeep') fs.rmSync(path.join(UPLOAD_DIR, f));
    }
  }

  await initDB({
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'roadguard123',
    force: true,
  });

  console.log('Firestore reset to seed data.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
