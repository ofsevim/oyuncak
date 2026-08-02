import {
  doc, getDoc, collection, query, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { ensureAuth, getUid } from './authService';
import { SCORE_GAME_IDS } from '@/constants/gameIds';
import { logger } from '@/lib/logger';
import { sanitizeNickname } from '@/lib/utils';

const NICKNAME_KEY = 'oyuncak.nickname';

function getNickname(): string {
  try { return sanitizeNickname(localStorage.getItem(NICKNAME_KEY) || 'Anonim Oyuncu'); }
  catch { return 'Anonim Oyuncu'; }
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  date: string;
  isMe?: boolean;
}

interface SubmitScoreResult {
  updated: boolean;
  score: number;
}

const submitScoreCall = httpsCallable<
  { gameId: string; score: number; name: string },
  SubmitScoreResult
>(functions, 'submitScore');

const updateNicknameCall = httpsCallable<{ name: string }, { updated: number }>(
  functions,
  'updateScoreNickname',
);

/**
 * Firestore'a skor kaydet.
 * Atomik transaction: paralel yazımlarda en yüksek skor korunur.
 * Yalnızca mevcut skordan yüksekse günceller; aksi hâlde false döner.
 */
export async function syncScore(gameId: string, score: number): Promise<boolean> {
  try {
    await ensureAuth();
    const result = await submitScoreCall({ gameId, score, name: getNickname() });
    if (result.data.updated) {
      window.dispatchEvent(new CustomEvent('oyuncak:score-updated', { detail: { gameId } }));
    }
    return result.data.updated;
  } catch (err) {
    logger.warn('Firebase skor yazma hatası', { gameId, err: String(err) });
    throw err;
  }
}

/**
 * Oyunun top N liderlik tablosunu getir.
 */
export async function getLeaderboard(gameId: string, max = 10): Promise<LeaderboardEntry[]> {
  try {
    await ensureAuth();
    const uid = getUid();
    const colRef = collection(db, 'scores', gameId, 'leaderboard');
    const q = query(colRef, orderBy('score', 'desc'), limit(max));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid,
        name: typeof data.name === 'string' ? data.name : 'Anonim Oyuncu',
        score: typeof data.score === 'number' ? data.score : 0,
        date: typeof data.date === 'string' ? data.date : '',
        isMe: data.uid === uid,
      };
    });
  } catch (err) {
    logger.warn('Firebase leaderboard okuma hatası', { gameId, err: String(err) });
    return [];
  }
}

/**
 * Kullanıcının belirli bir oyundaki kendi rekorunu getir.
 */
export async function getUserScore(gameId: string): Promise<number> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'scores', gameId, 'leaderboard', user.uid);
    const snap = await getDoc(docRef);
    return snap.exists() && typeof snap.data().score === 'number' ? snap.data().score as number : 0;
  } catch {
    return 0;
  }
}

/**
 * Yerel takma ad kaydı bulunmayan eski kullanıcılar için mevcut skorlardan
 * kayıtlı adı geri getirir. Bu, takma ad modalının daha önce skor kaydetmiş
 * kullanıcıya yeniden gösterilmesini önleyen tek seferlik bir geri kazanımdır.
 */
export async function getNicknameFromExistingScores(): Promise<string | null> {
  try {
    await ensureAuth();
    const snapshots = await Promise.all(
      SCORE_GAME_IDS.map((gameId) =>
        getDoc(doc(db, 'scores', gameId, 'leaderboard', user.uid)),
      ),
    );

    for (const snapshot of snapshots) {
      if (!snapshot.exists()) continue;
      const name = snapshot.data().name;
      if (typeof name === 'string' && name.trim()) {
        return sanitizeNickname(name);
      }
    }

    return null;
  } catch (err) {
    logger.warn('Mevcut skorlardan takma ad okunamadı', { err: String(err) });
    return null;
  }
}

/**
 * Takma adı Firestore'daki tüm mevcut skorlarda güncelle.
 * Yeni takma ad seçildiğinde çağrılır.
 */
export async function updateNicknameInScores(newName: string): Promise<void> {
  try {
    await ensureAuth();
    const safeName = sanitizeNickname(newName);

    const result = await updateNicknameCall({ name: safeName });
    if (result.data.updated > 0) {
      window.dispatchEvent(new Event('oyuncak:nickname-changed'));
    }
  } catch {
    /* sessiz */
  }
}
