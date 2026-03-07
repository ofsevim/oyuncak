import { syncScore } from '@/services/scoreService';
import { ALL_GAME_IDS } from '@/constants/gameIds';

/** localStorage + Firebase tabanlı highscore sistemi */
const PREFIX = 'oyuncak.hs.';
const SYNC_KEY = 'oyuncak.firebase.synced';

/**
 * localStorage'daki mevcut rekorları Firebase'e aktar.
 * Sadece bir kez çalışır (ilk Firebase kurulumunda).
 */
export async function syncExistingScores(): Promise<void> {
  try {
    if (localStorage.getItem(SYNC_KEY)) return;
    const tasks = ALL_GAME_IDS
      .map((id) => ({ id, score: getHighScore(id) }))
      .filter((x) => x.score > 0)
      .map((x) => syncScore(x.id, x.score).catch(() => {}));
    await Promise.allSettled(tasks);
    localStorage.setItem(SYNC_KEY, '1');
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
  if (score > current) {
    try {
      localStorage.setItem(PREFIX + gameId, String(score));
    } catch { /* ignore */ }
    syncScore(gameId, score).catch(() => {});
    return true;
  }
  return false;
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
  if (score > current) {
    try {
      localStorage.setItem(PREFIX + gameId, String(score));
      localStorage.setItem(PREFIX + gameId + '.obj', JSON.stringify({ score, date: new Date().toISOString() }));
    } catch { /* ignore */ }
    syncScore(gameId, score).catch(() => {});
    return true;
  }
  return false;
}
