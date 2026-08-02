import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

const REGION = 'europe-west1';
const MAX_SCORE = 9_999_999;
const MIN_UPDATE_INTERVAL_MS = 10_000;

const SCORE_GAME_IDS = new Set([
  'runner', 'snake', 'tetris', 'tank-arena', '2048', 'whack-a-mole',
  'balloon-pop', 'basketball', 'piano', 'math', 'counting', 'oddoneout',
  'comparison', 'shapematch', 'simonsays', 'codingturtle', 'spaceshooter',
  'memory-3x3', 'memory-4x4', 'memory-5x5', 'memory-6x6',
]);

function requireUser(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Skor kaydetmek için oturum açılmalıdır.');
  }
  return request.auth.uid;
}

function validateGameId(gameId) {
  if (typeof gameId !== 'string' || !SCORE_GAME_IDS.has(gameId)) {
    throw new HttpsError('invalid-argument', 'Geçersiz oyun kimliği.');
  }
  return gameId;
}

function validateScore(score) {
  if (!Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE) {
    throw new HttpsError('invalid-argument', 'Geçersiz skor.');
  }
  return score;
}

function sanitizeName(name) {
  const sanitized = typeof name === 'string'
    ? name.replace(/[<>\n\r\t]/g, '').trim().slice(0, 30)
    : '';
  return sanitized || 'Anonim Oyuncu';
}

/**
 * The only score write path. Admin SDK bypasses Firestore rules after the
 * authenticated caller, game id, score shape, ownership and update cadence
 * have been validated on the server.
 */
export const submitScore = onCall({ region: REGION }, async (request) => {
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
export const updateScoreNickname = onCall({ region: REGION }, async (request) => {
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
