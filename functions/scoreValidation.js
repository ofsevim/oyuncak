export const MAX_SCORE = 9_999_999;

export const SCORE_GAME_IDS = new Set([
  'runner', 'snake', 'tetris', 'tank-arena', '2048', 'whack-a-mole',
  'balloon-pop', 'basketball', 'piano', 'math', 'counting', 'oddoneout',
  'shapematch', 'simonsays', 'codingturtle', 'spaceshooter',
  'memory-3x3', 'memory-4x4', 'memory-5x5', 'memory-6x6',  'connect-four', 'word-search', 'color-sort', 'brick-breaker',
  'maze',
]);

export function isValidGameId(gameId) {
  return typeof gameId === 'string' && SCORE_GAME_IDS.has(gameId);
}

export function isValidScore(score) {
  return Number.isSafeInteger(score) && score >= 0 && score <= MAX_SCORE;
}

export function sanitizeName(name) {
  if (typeof name !== 'string') return 'Anonim Oyuncu';
  let out = '';
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) continue;
    if (ch === '<' || ch === '>') continue;
    out += ch;
  }
  const trimmed = out.replace(/\s+/g, ' ').trim();
  const sanitized = [...trimmed].slice(0, 30).join('');
  return sanitized || 'Anonim Oyuncu';
}
