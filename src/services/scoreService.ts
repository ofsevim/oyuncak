import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureAuth, getUid } from './authService';
import { SCORE_GAME_IDS } from '@/constants/gameIds';
import { logger } from '@/lib/logger';
import { sanitizeNickname } from '@/lib/utils';

const NICKNAME_KEY = 'oyuncak.nickname';

function getNickname(): string {
  try {
    return sanitizeNickname(localStorage.getItem(NICKNAME_KEY) || 'Anonim Oyuncu');
  } catch {
    return 'Anonim Oyuncu';
  }
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  date: string;
  isMe?: boolean;
}

/** Saves only a new personal best; Firestore rules enforce ownership and shape. */
export async function syncScore(gameId: string, score: number): Promise<boolean> {
  try {
    if (!SCORE_GAME_IDS.includes(gameId)) throw new Error('Geçersiz oyun kimliği');
    const user = await ensureAuth();
    const scoreRef = doc(db, 'scores', gameId, 'leaderboard', user.uid);
    const updated = await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(scoreRef);
      const existingScore = existing.exists() && Number.isSafeInteger(existing.data().score)
        ? existing.data().score as number
        : -1;

      if (existingScore >= score) return false;

      transaction.set(scoreRef, {
        uid: user.uid,
        gameId,
        name: getNickname(),
        score,
        date: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      return true;
    });

    if (updated) {
      window.dispatchEvent(new CustomEvent('oyuncak:score-updated', { detail: { gameId } }));
    }
    return updated;
  } catch (err) {
    logger.warn('Firebase score write failed', { gameId, err: String(err) });
    throw err;
  }
}

/** Returns the top scores for a game. */
export async function getLeaderboard(gameId: string, max = 10): Promise<LeaderboardEntry[]> {
  try {
    await ensureAuth();
    const uid = getUid();
    const colRef = collection(db, 'scores', gameId, 'leaderboard');
    const scoreQuery = query(colRef, orderBy('score', 'desc'), limit(max));
    const snap = await getDocs(scoreQuery);

    return snap.docs.map((entry) => {
      const data = entry.data();
      return {
        uid: data.uid,
        name: typeof data.name === 'string' ? data.name : 'Anonim Oyuncu',
        score: typeof data.score === 'number' ? data.score : 0,
        date: typeof data.date === 'string' ? data.date : '',
        isMe: data.uid === uid,
      };
    });
  } catch (err) {
    logger.warn('Firebase leaderboard read failed', { gameId, err: String(err) });
    return [];
  }
}

/** Returns the signed-in player's score for one game. */
export async function getUserScore(gameId: string): Promise<number> {
  try {
    const user = await ensureAuth();
    const scoreRef = doc(db, 'scores', gameId, 'leaderboard', user.uid);
    const snap = await getDoc(scoreRef);
    return snap.exists() && typeof snap.data().score === 'number' ? snap.data().score as number : 0;
  } catch {
    return 0;
  }
}

/** Restores a nickname from previously saved scores. */
export async function getNicknameFromExistingScores(): Promise<string | null> {
  try {
    const user = await ensureAuth();
    const snapshots = await Promise.all(
      SCORE_GAME_IDS.map((gameId) => getDoc(doc(db, 'scores', gameId, 'leaderboard', user.uid))),
    );

    for (const snapshot of snapshots) {
      if (!snapshot.exists()) continue;
      const name = snapshot.data().name;
      if (typeof name === 'string' && name.trim()) return sanitizeNickname(name);
    }
    return null;
  } catch (err) {
    logger.warn('Existing score nickname read failed', { err: String(err) });
    return null;
  }
}

/** Updates the signed-in player's displayed name on existing scores. */
export async function updateNicknameInScores(newName: string): Promise<void> {
  try {
    const user = await ensureAuth();
    const safeName = sanitizeNickname(newName);
    const refs = SCORE_GAME_IDS.map((gameId) =>
      doc(db, 'scores', gameId, 'leaderboard', user.uid),
    );
    const snapshots = await Promise.all(refs.map((scoreRef) => getDoc(scoreRef)));
    const batch = writeBatch(db);
    let updated = 0;

    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) return;
      batch.update(refs[index], { name: safeName, updatedAt: serverTimestamp() });
      updated += 1;
    });

    if (updated > 0) await batch.commit();
    window.dispatchEvent(new Event('oyuncak:nickname-changed'));
  } catch (err) {
    logger.warn('Nickname update failed', { err: String(err) });
  }
}
