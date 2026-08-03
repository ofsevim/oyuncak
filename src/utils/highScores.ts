import { SCORE_GAME_IDS } from '@/constants/gameIds';
import { enqueueScoreSync, flushScoreSyncQueue } from './scoreSyncQueue';

/** localStorage + Firebase tabanlı highscore sistemi */
const PREFIX = 'oyuncak.hs.';
const SYNC_KEY = 'oyuncak.firebase.synced.v2';

/**
 * scoreService (ve dolayısıyla firebase/firestore + auth ~370kB) yalnızca
 * gerçekten skor yazılırken dinamik olarak yüklenir; oyun açılış zincirine
 * statik bağlanmaz. Hata/çevrimdışı durumda sessizce geçilir — localStorage yeterli.
 */
/**
 * localStorage'daki mevcut rekorları Firebase'e aktar.
 * Sadece bir kez çalışır (ilk Firebase kurulumunda).
 */
export async function syncExistingScores(): Promise<void> {
  try {
    if (localStorage.getItem(SYNC_KEY)) return;
    const pending = SCORE_GAME_IDS
      .map((id) => ({ id, score: getHighScore(id) }))
      .filter((x) => x.score > 0);

    if (pending.length === 0) {
      localStorage.setItem(SYNC_KEY, '1');
      return;
    }

    pending.forEach((entry) => enqueueScoreSync(entry.id, entry.score));
    localStorage.setItem(SYNC_KEY, '1');
    await flushScoreSyncQueue(true);
  } catch { /* sessiz */ }
}

export function getHighScore(gameId: string): number {
  try {
    const raw = localStorage.getItem(PREFIX + gameId);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function setHighScore(gameId: string, score: number): boolean {
  const current = getHighScore(gameId);
  const isNew = score > current;
  if (isNew) {
    try {
      localStorage.setItem(PREFIX + gameId, String(score));
    } catch { /* ignore */ }
  }
  if (isNew && score > 0) {
    enqueueScoreSync(gameId, score);
  }
  return isNew;
}

export function getHighScoreObj(gameId: string): { score: number; date: string } | null {
  try {
    const raw = localStorage.getItem(PREFIX + gameId + '.obj');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.score === 'number' &&
      typeof parsed.date === 'string' &&
      !isNaN(parsed.score)
    ) {
      return parsed as { score: number; date: string };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * localStorage'a kaydeder + arkaplanda Firebase'e senkronize eder.
 * Firebase hata verirse localStorage yeterlidir.
 */
export function saveHighScoreObj(gameId: string, score: number): boolean {
  const current = getHighScore(gameId);
  const isNew = score > current;
  if (isNew) {
    try {
      localStorage.setItem(PREFIX + gameId, String(score));
      localStorage.setItem(PREFIX + gameId + '.obj', JSON.stringify({ score, date: new Date().toISOString() }));
    } catch { /* ignore */ }
  }
  if (isNew && score > 0) {
    enqueueScoreSync(gameId, score);
  }
  return isNew;
}
