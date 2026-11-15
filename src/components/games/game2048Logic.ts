export const GRID_SIZE = 4;
export type Grid = (number | null)[][];

export const createEmptyGrid = (): Grid =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

export const addRandomTile = (grid: Grid, rng: () => number = Math.random): Grid => {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push([r, c]); }));
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(rng() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = rng() < 0.9 ? 2 : 4;
  return newGrid;
};

export const slideRow = (
  row: (number | null)[],
): { newRow: (number | null)[]; score: number; merges: number } => {
  const filtered = row.filter((v): v is number => v !== null);
  let score = 0;
  let merges = 0;
  const merged: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      merges++;
      i++;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  return { newRow: merged.map(v => (v === 0 ? null : v)), score, merges };
};

export const rotateGrid = (grid: Grid): Grid => {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[n - 1 - c][r]),
  );
};

export const gridsEqual = (a: Grid, b: Grid): boolean => {
  for (let r = 0; r < GRID_SIZE; r++) {
    const rowA = a[r];
    const rowB = b[r];
    for (let c = 0; c < GRID_SIZE; c++) {
      if (rowA[c] !== rowB[c]) return false;
    }
  }
  return true;
};

export const move = (grid: Grid, direction: 'left' | 'right' | 'up' | 'down') => {
  let rotated = grid.map(r => [...r]);
  const rotations = { left: 0, down: 1, right: 2, up: 3 };
  for (let i = 0; i < rotations[direction]; i++) rotated = rotateGrid(rotated);
  let totalScore = 0;
  let totalMerges = 0;
  const slid = rotated.map(row => {
    const { newRow, score, merges } = slideRow(row);
    totalScore += score;
    totalMerges += merges;
    return newRow;
  });
  let result = slid;
  for (let i = 0; i < (4 - rotations[direction]) % 4; i++) result = rotateGrid(result);
  const moved = !gridsEqual(grid, result);
  return { newGrid: result, score: totalScore, moved, merges: totalMerges };
};

export const canMove = (grid: Grid): boolean => {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) return true;
      if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
};

export const getMaxTile = (grid: Grid): number => {
  let max = 0;
  grid.forEach(row => row.forEach(cell => { if (cell && cell > max) max = cell; }));
  return max;
};
