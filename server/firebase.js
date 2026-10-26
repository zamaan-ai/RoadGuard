import 'dotenv/config';
import admin from 'firebase-admin';

/**
 * Firebase Admin SDK bootstrap.
 *
 * Supports two ways of supplying credentials (pick one):
 *   1. GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json  (recommended for local dev)
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars
 *      (recommended for hosting platforms where you can't ship a JSON file, e.g. Render/Vercel)
 */
function buildCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys stored in .env usually have literal "\n" sequences — unescape them.
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS, or ' +
      'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in server/.env'
    );
  }

  return admin.credential.cert({ projectId, clientEmail, privateKey });
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: buildCredential() });
}

export const firestore = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export default admin;
