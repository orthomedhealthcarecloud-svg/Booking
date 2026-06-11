import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

let _app: App | null = null;

function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
  }
  return null;
}

function ensureAdmin(): App {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length) {
    _app = existing[0]!;
    return _app;
  }
  const sa = loadServiceAccount();
  _app = initializeApp(
    sa
      ? {
          credential: cert(sa),
          projectId: sa.project_id,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        }
      : {
          // Falls back to GOOGLE_APPLICATION_CREDENTIALS / application-default credentials.
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        },
  );
  return _app;
}

export function adminAuth(): Auth {
  return getAuth(ensureAdmin());
}

export function adminDb(): Firestore {
  return getFirestore(ensureAdmin());
}

export function adminStorage(): Storage {
  return getStorage(ensureAdmin());
}
