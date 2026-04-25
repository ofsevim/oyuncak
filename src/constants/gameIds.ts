/** Tüm oyun ID'leri — tek kaynak */
export const ALL_GAME_IDS = [
  'runner', 'snake', 'tetris', '2048', 'whack-a-mole', 'balloon-pop',
  'basketball', 'piano', 'math', 'counting', 'oddoneout', 'comparison',
  'shapematch', 'simonsays', 'codingturtle', 'spaceshooter',
  'memory-3x3', 'memory-4x4', 'memory-5x5', 'memory-6x6',
] as const;

export type GameId = typeof ALL_GAME_IDS[number];
