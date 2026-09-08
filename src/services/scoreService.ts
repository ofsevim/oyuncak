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
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureAuth, getExistingUser } from './authService';
import { getPlayerPreferences } from '@/utils/playerPreferences';
import { SCORE_GAME_IDS } from '@/constants/gameIds';
import { logger } from '@/lib/logger';
import { sanitizeNickname } from '@/lib/utils';
import { withTimeout } from '@/utils/promiseTimeout';

const NICKNAME_KEY = 'oyuncak.nickname';
let pendingDeletion: Promise<void> | null = null;

function checkPendingDeletion(): void {
  if (pendingDeletion) throw new Error('Önceki skor silme isteğinin tamamlanması bekleniyor.');
}

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
    if (!SCORE_GAME_IDS.some((id) => id === gameId)) throw new Error('Geçersiz oyun kimliği');
    if (!Number.isSafeInteger(score) || score < 0 || score > 9_999_999) throw new Error('Geçersiz skor');
    if (!getPlayerPreferences().shareScores) return false;
    checkPendingDeletion();
    const user = await ensureAuth();
    const scoreRef = doc(db, 'scores', gameId, 'leaderboard', user.uid);
    const updated = await runTransaction(db, async (transaction) => {
      if (!getPlayerPreferences().shareScores) return false;
      checkPendingDeletion();
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
    if (!navigator.onLine) throw new Error('offline');
    const uid = (await getExistingUser())?.uid;
    const colRef = collection(db, 'scores', gameId, 'leaderboard');
    const scoreQuery = query(colRef, orderBy('score', 'desc'), limit(max));
    const snap = await withTimeout(getDocs(scoreQuery));

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
    throw err;
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
    const user = await getExistingUser();
    if (!user) return null;
    const profile = await getDoc(doc(db, 'profiles', user.uid));
    if (profile.exists() && typeof profile.data().name === 'string') return sanitizeNickname(profile.data().name);
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
    if (!getPlayerPreferences().shareScores) return;
    checkPendingDeletion();
    if (!navigator.onLine) throw new Error('Takma adı güncellemek için internet bağlantısı gerekli.');
    const user = await getExistingUser();
    if (!user) return;
    checkPendingDeletion();
    const safeName = sanitizeNickname(newName);
    await setDoc(doc(db, 'profiles', user.uid), { name: safeName, updatedAt: serverTimestamp() });
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
    throw err;
  }
}

/** Deletes only the currently authenticated player's documents, on request. */
export function deleteCloudScores(): Promise<void> {
  // Retrying after a UI timeout waits for the same write instead of submitting another batch.
  if (pendingDeletion) return pendingDeletion;
  pendingDeletion = (async () => {
    if (!navigator.onLine) throw new Error('Global skorları silmek için internet bağlantısı gerekli.');
    const user = await getExistingUser();
    if (!user) return;
    const batch = writeBatch(db);
    SCORE_GAME_IDS.forEach((gameId) => batch.delete(doc(db, 'scores', gameId, 'leaderboard', user.uid)));
    batch.delete(doc(db, 'profiles', user.uid));
    await batch.commit();
    window.dispatchEvent(new Event('oyuncak:nickname-changed'));
  })().finally(() => { pendingDeletion = null; });
  return pendingDeletion;
}
