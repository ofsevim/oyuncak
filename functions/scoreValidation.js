export const MAX_SCORE = 9_999_999;

export const SCORE_GAME_IDS = new Set([
  'runner', 'snake', 'tetris', 'tank-arena', '2048', 'whack-a-mole',
  'balloon-pop', 'basketball', 'piano', 'math', 'counting', 'oddoneout',
  'comparison', 'shapematch', 'simonsays', 'codingturtle', 'spaceshooter',
  'memory-3x3', 'memory-4x4', 'memory-5x5', 'memory-6x6',
]);

export function isValidGameId(gameId) {
  return typeof gameId === 'string' && SCORE_GAME_IDS.has(gameId);
}

export function isValidScore(score) {
  return Number.isSafeInteger(score) && score >= 0 && score <= MAX_SCORE;
}

export function sanitizeName(name) {
  const sanitized = typeof name === 'string'
    ? name.replace(/[<>\n\r\t]/g, '').trim().slice(0, 30)
    : '';
  return sanitized || 'Anonim Oyuncu';
}
