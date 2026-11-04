/**
 * Labirent üretimi, hareket ve rota doğrulama kuralları.
 *
 * Bileşenden bağımsız tutulur: birim testleri bu modülü doğrudan yükler.
 * Tohum (seed) verildiği için aynı tohum her zaman aynı labirenti üretir.
 */

export type MazeDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface MazePoint {
  x: number;
  y: number;
}

export interface Maze {
  cols: number;
  rows: number;
  /** Satır önceliğinde düz dizi. 1 = duvar, 0 = geçit. */
  cells: number[];
}

const WALL = 1;
const FLOOR = 0;

const DELTAS: Record<MazeDirection, MazePoint> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/** Küçük ve hızlı deterministik PRNG (mulberry32). */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cellIndex(maze: Maze, point: MazePoint): number {
  return point.y * maze.cols + point.x;
}

export function inBounds(maze: Maze, point: MazePoint): boolean {
  return (
    point.x >= 0 && point.y >= 0 && point.x < maze.cols && point.y < maze.rows
  );
}

export function isWall(maze: Maze, point: MazePoint): boolean {
  return !inBounds(maze, point) || maze.cells[cellIndex(maze, point)] === WALL;
}

/** Tek sayı boyutlara yuvarlar; çift boyutlu labirentler simetrisini kaybeder. */
function oddSize(value: number): number {
  const safe = Math.max(5, Math.floor(value));
  return safe % 2 === 0 ? safe + 1 : safe;
}

/**
 * Derinlik öncelikli oyma ile kusursuz labirent üretir.
 * Kenarlık her zaman duvardır; geçitler tek sayılı hücrelerden başlar.
 */
export function generateMaze(cols: number, rows: number, seed: number): Maze {
  const width = oddSize(cols);
  const height = oddSize(rows);
  const cells = new Array<number>(width * height).fill(WALL);
  const rng = createRng(seed);
  const stack: MazePoint[] = [{ x: 1, y: 1 }];
  cells[1 * width + 1] = FLOOR;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options: { cell: MazePoint; wall: MazePoint }[] = [];
    for (const delta of Object.values(DELTAS)) {
      const nx = current.x + delta.x * 2;
      const ny = current.y + delta.y * 2;
      if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
      if (cells[ny * width + nx] === FLOOR) continue;
      options.push({
        cell: { x: nx, y: ny },
        wall: { x: current.x + delta.x, y: current.y + delta.y },
      });
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const pick = options[Math.floor(rng() * options.length)];
    cells[pick.wall.y * width + pick.wall.x] = FLOOR;
    cells[pick.cell.y * width + pick.cell.x] = FLOOR;
    stack.push(pick.cell);
  }

  return { cols: width, rows: height, cells };
}

/**
 * Kusursuz labirentin tek çözüm yolunu kırar: bazı duvarları yıkarak
 * çocuklar için daha bağışlayıcı, döngülü bir labirent üretir.
 */
export function carveLoops(maze: Maze, count: number, seed: number): Maze {
  const cells = [...maze.cells];
  const rng = createRng(seed);
  let carved = 0;
  let attempts = 0;
  const limit = Math.max(count, 1) * 40;

  while (carved < count && attempts < limit) {
    attempts += 1;
    const x = 1 + Math.floor(rng() * (maze.cols - 2));
    const y = 1 + Math.floor(rng() * (maze.rows - 2));
    const index = y * maze.cols + x;
    if (cells[index] !== WALL) continue;
    const horizontalWall = x % 2 === 0 && y % 2 === 1;
    const verticalWall = y % 2 === 0 && x % 2 === 1;
    if (!horizontalWall && !verticalWall) continue;
    cells[index] = FLOOR;
    carved += 1;
  }

  return { ...maze, cells };
}

/** Başlangıçtan her hücreye adım sayısı; ulaşılamayanlar -1. */
export function bfsDistances(maze: Maze, start: MazePoint): Int32Array {
  const distances = new Int32Array(maze.cols * maze.rows).fill(-1);
  if (isWall(maze, start)) return distances;
  distances[cellIndex(maze, start)] = 0;
  const queue: MazePoint[] = [start];

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const distance = distances[cellIndex(maze, current)];
    for (const delta of Object.values(DELTAS)) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (isWall(maze, next)) continue;
      const index = cellIndex(maze, next);
      if (distances[index] !== -1) continue;
      distances[index] = distance + 1;
      queue.push(next);
    }
  }

  return distances;
}

export function isSolvable(maze: Maze, from: MazePoint, to: MazePoint): boolean {
  if (isWall(maze, from) || isWall(maze, to)) return false;
  return bfsDistances(maze, from)[cellIndex(maze, to)] >= 0;
}

/** Başlangıçtan en uzak geçit; çıkışı oraya koymak labirenti anlamlı kılar. */
export function farthestCell(maze: Maze, start: MazePoint): MazePoint {
  const distances = bfsDistances(maze, start);
  let best = start;
  let bestDistance = -1;
  for (let index = 0; index < distances.length; index += 1) {
    if (distances[index] > bestDistance) {
      bestDistance = distances[index];
      best = { x: index % maze.cols, y: Math.floor(index / maze.cols) };
    }
  }
  return best;
}

/**
 * Toplanacakları başlangıca çok yakın olmayan, birbirinden farklı
 * geçitlere dağıtır. Çıkış ve başlangıç hücreleri boş bırakılır.
 */
export function pickCollectibles(
  maze: Maze,
  start: MazePoint,
  exit: MazePoint,
  count: number,
  seed: number,
): MazePoint[] {
  const distances = bfsDistances(maze, start);
  const candidates: MazePoint[] = [];
  for (let index = 0; index < distances.length; index += 1) {
    const point = { x: index % maze.cols, y: Math.floor(index / maze.cols) };
    if (distances[index] < 2) continue;
    if (point.x === exit.x && point.y === exit.y) continue;
    candidates.push(point);
  }

  const rng = createRng(seed);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }

  return candidates.slice(0, Math.max(0, Math.min(count, candidates.length)));
}

/** Bir adımı çözer; duvar veya kenarlık varsa konum değişmez. */
export function planMazeMove(
  maze: Maze,
  from: MazePoint,
  direction: MazeDirection,
): { pos: MazePoint; blocked: boolean } {
  const delta = DELTAS[direction];
  const target = { x: from.x + delta.x, y: from.y + delta.y };
  if (isWall(maze, target)) return { pos: { ...from }, blocked: true };
  return { pos: target, blocked: false };
}

/** Oyuncunun durduğu hücre ve komşuları; keşif sisi bunlarla açılır. */
export function revealAround(maze: Maze, point: MazePoint): number[] {
  const indices = [cellIndex(maze, point)];
  for (const delta of Object.values(DELTAS)) {
    const next = { x: point.x + delta.x, y: point.y + delta.y };
    if (!isWall(maze, next)) indices.push(cellIndex(maze, next));
  }
  return indices;
}

export interface LevelConfig {
  cols: number;
  rows: number;
  stars: number;
  seconds: number;
}

/** Seviye büyüdükçe labirent genişler, süre kısalır. */
export function levelConfig(level: number): LevelConfig {
  const safeLevel = Math.max(1, Math.floor(level));
  const size = Math.min(9 + Math.floor((safeLevel - 1) / 2) * 2, 17);
  return {
    cols: size,
    rows: size,
    stars: Math.min(3 + safeLevel, 8),
    seconds: Math.max(24, 52 - safeLevel * 4),
  };
}

export const MAX_LEVEL = 5;
