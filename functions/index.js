import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  SCORE_GAME_IDS,
  isValidGameId,
  isValidScore,
  sanitizeName,
} from './scoreValidation.js';

initializeApp();
const db = getFirestore();

const REGION = 'europe-west1';
const MIN_UPDATE_INTERVAL_MS = 10_000;
const CALLABLE_OPTIONS = {
  region: REGION,
  // Callable endpoints must remain publicly reachable so browser preflight
  // requests can complete. Authentication is still enforced in requireUser.
  invoker: 'public',
  cors: [
    'https://adenerva.netlify.app',
    'https://oyuncak.app',
    'https://www.oyuncak.app',
    /^https:\/\/deploy-preview-\d+--adenerva\.netlify\.app$/,
    /^https?:\/\/localhost(?::\d+)?$/,
    'capacitor://localhost',
  ],
};

function requireUser(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Skor kaydetmek için oturum açılmalıdır.');
  }
  return request.auth.uid;
}

function validateGameId(gameId) {
  if (!isValidGameId(gameId)) {
    throw new HttpsError('invalid-argument', 'Geçersiz oyun kimliği.');
  }
  return gameId;
}

function validateScore(score) {
  if (!isValidScore(score)) {
    throw new HttpsError('invalid-argument', 'Geçersiz skor.');
  }
  return score;
}

/**
 * The only score write path. Admin SDK bypasses Firestore rules after the
 * authenticated caller, game id, score shape, ownership and update cadence
 * have been validated on the server.
 */
export const submitScore = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUser(request);
  const gameId = validateGameId(request.data?.gameId);
  const score = validateScore(request.data?.score);
  const name = sanitizeName(request.data?.name);
  const docRef = db.doc(`scores/${gameId}/leaderboard/${uid}`);
  const now = Timestamp.now();

  const updated = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(docRef);
    const data = existing.data();
    const existingScore = Number.isSafeInteger(data?.score) ? data.score : -1;
    const lastUpdatedAt = data?.updatedAt;

    if (lastUpdatedAt instanceof Timestamp
      && now.toMillis() - lastUpdatedAt.toMillis() < MIN_UPDATE_INTERVAL_MS) {
      throw new HttpsError('resource-exhausted', 'Skor çok sık güncelleniyor.');
    }

    if (existingScore >= score) return false;

    transaction.set(docRef, {
      uid,
      gameId,
      name,
      score,
      date: now.toDate().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });

  return { updated, score };
});

/** Update a player's displayed name without exposing a client-side write. */
export const updateScoreNickname = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUser(request);
  const name = sanitizeName(request.data?.name);
  const refs = [...SCORE_GAME_IDS].map((gameId) =>
    db.doc(`scores/${gameId}/leaderboard/${uid}`));
  const snapshots = await db.getAll(...refs);
  const batch = db.batch();
  let updated = 0;

  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    batch.update(snapshot.ref, { name, updatedAt: FieldValue.serverTimestamp() });
    updated += 1;
  }

  if (updated > 0) await batch.commit();
  return { updated };
});
