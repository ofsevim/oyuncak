/** Router/menu tarafında kullanılan oyun rota kimlikleri. */
export const GAME_ROUTE_IDS = [
  'balloon',
  'basketball',
  'battle-city',
  'whack',
  'runner',
  'tetris',
  'snake',
  'odd-one-out',
  'shapematch',
  'simonsays',
  'memory',
  '2048',
  'piano',
  'counting',
  'math',
  'codingturtle',
  'comparison',
  'spaceshooter',
] as const;

export type GameRouteId = typeof GAME_ROUTE_IDS[number];

/** Ana sayfada kart olarak öne çıkarılan ve rota alan oyunlar. */
export const FEATURED_GAME_ROUTE_IDS = [
  'balloon',
  'tetris',
] as const satisfies readonly GameRouteId[];

export type FeaturedGameRouteId = typeof FEATURED_GAME_ROUTE_IDS[number];

/** Skor, localStorage ve Firestore tarafında kullanılan kimlikler. */
export const SCORE_GAME_IDS = [
  'runner',
  'snake',
  'tetris',
  '2048',
  'whack-a-mole',
  'balloon-pop',
  'basketball',
  'piano',
  'math',
  'counting',
  'oddoneout',
  'comparison',
  'shapematch',
  'simonsays',
  'codingturtle',
  'spaceshooter',
  'memory-3x3',
  'memory-4x4',
  'memory-5x5',
  'memory-6x6',
] as const;

export const ALL_GAME_IDS = SCORE_GAME_IDS;

export type ScoreGameId = typeof SCORE_GAME_IDS[number];
export type GameId = ScoreGameId;

export function isGameRouteId(value: string): value is GameRouteId {
  return GAME_ROUTE_IDS.includes(value as GameRouteId);
}
