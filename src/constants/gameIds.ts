import { GAME_CATALOG } from '../data/gameCatalog';

export type GameRouteId = typeof GAME_CATALOG[number]['id'];
export type ScoreGameId = typeof GAME_CATALOG[number]['scoreIds'][number];
export const GAME_ROUTE_IDS: readonly GameRouteId[] = GAME_CATALOG.map((game) => game.id);
export const SCORE_GAME_IDS: readonly ScoreGameId[] = GAME_CATALOG.flatMap((game) => [...game.scoreIds] as ScoreGameId[]);
export const ALL_GAME_IDS = SCORE_GAME_IDS;
export type GameId = ScoreGameId;
export const FEATURED_GAME_ROUTE_IDS = ['balloon', 'tetris'] as const satisfies readonly GameRouteId[];
export type FeaturedGameRouteId = typeof FEATURED_GAME_ROUTE_IDS[number];
export function isGameRouteId(value: string): value is GameRouteId {
  return GAME_ROUTE_IDS.some((id) => id === value);
}
