/** Basit localStorage tabanlı highscore sistemi */
const PREFIX = 'oyuncak.hs.';

export function getHighScore(gameId: string): number {
  try {
    const raw = localStorage.getItem(PREFIX + gameId);
    return raw ? parseInt(raw, 10) : 0;
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
    return true;
  }
  return false;
}

export function getHighScoreObj(gameId: string): { score: number; date: string } | null {
  try {
    const raw = localStorage.getItem(PREFIX + gameId + '.obj');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveHighScoreObj(gameId: string, score: number): boolean {
  const current = getHighScore(gameId);
  if (score > current) {
    try {
      localStorage.setItem(PREFIX + gameId, String(score));
      localStorage.setItem(PREFIX + gameId + '.obj', JSON.stringify({ score, date: new Date().toISOString() }));
    } catch { /* ignore */ }
    return true;
  }
  return false;
}
