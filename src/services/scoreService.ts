import {
  doc, setDoc, getDoc,
  collection, query, orderBy, limit, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureAuth, getUid } from './authService';
import { ALL_GAME_IDS } from '@/constants/gameIds';
import { logger } from '@/lib/logger';

const NICKNAME_KEY = 'oyuncak.nickname';

function getNickname(): string {
  try { return localStorage.getItem(NICKNAME_KEY) || 'Anonim Oyuncu'; }
  catch { return 'Anonim Oyuncu'; }
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  date: string;
  isMe?: boolean;
}

/**
 * Firestore'a skor kaydet.
 * Sadece mevcut skordan yüksekse günceller.
 */
export async function syncScore(gameId: string, score: number): Promise<boolean> {
  try {
    const user = await ensureAuth();
    const docRef = doc(db, 'scores', gameId, 'leaderboard', user.uid);

    const existing = await getDoc(docRef);
    if (existing.exists() && existing.data().score >= score) return false;

    await setDoc(docRef, {
      uid: user.uid,
      name: getNickname(),
      score,
      date: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    logger.warn('Firebase skor yazma hatası', { gameId, err: String(err) });
    return false;
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
        name: data.name || 'Anonim Oyuncu',
        score: data.score,
        date: data.date,
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
    const user = await ensureAuth();
    const docRef = doc(db, 'scores', gameId, 'leaderboard', user.uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data().score : 0;
  } catch {
    return 0;
  }
}

/**
 * Takma adı Firestore'daki tüm mevcut skorlarda güncelle.
 * Yeni takma ad seçildiğinde çağrılır.
 */
export async function updateNicknameInScores(newName: string): Promise<void> {
  try {
    const user = await ensureAuth();

    const updates = ALL_GAME_IDS.map(async (gid) => {
      const docRef = doc(db, 'scores', gid, 'leaderboard', user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await setDoc(docRef, { name: newName }, { merge: true });
      }
    });

    await Promise.allSettled(updates);
  } catch {
    /* sessiz */
  }
}
