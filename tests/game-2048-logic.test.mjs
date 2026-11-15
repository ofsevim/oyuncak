import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const {
    GRID_SIZE,
    createEmptyGrid,
    addRandomTile,
    slideRow,
    rotateGrid,
    gridsEqual,
    move,
    canMove,
    getMaxTile,
  } = await loadTsModule('src/components/games/game2048Logic.ts');

  const empty = createEmptyGrid();
  assert.equal(empty.length, GRID_SIZE);
  assert.ok(empty.every(row => row.length === GRID_SIZE && row.every(c => c === null)));

  const withOne = addRandomTile(empty, () => 0);
  assert.equal(withOne[0][0], 2);
  assert.equal(empty[0][0], null, 'addRandomTile does not mutate input grid');

  const withFour = addRandomTile(empty, () => 0.95);
  assert.equal(withFour[3][3], 4);

  const rowResult = slideRow([2, 2, 2, 2]);
  assert.deepEqual(rowResult.newRow, [4, 4, null, null]);
  assert.equal(rowResult.score, 8);
  assert.equal(rowResult.merges, 2);

  const gapped = slideRow([2, null, 2, 4]);
  assert.deepEqual(gapped.newRow, [4, 4, null, null]);
  assert.equal(gapped.score, 4);

  const board = [
    [2, 2, null, null],
    [4, null, 4, null],
    [null, null, null, null],
    [2, 4, 8, 16],
  ];
  const left = move(board, 'left');
  assert.equal(left.moved, true);
  assert.equal(left.score, 12);
  assert.deepEqual(left.newGrid[0], [4, null, null, null]);
  assert.deepEqual(left.newGrid[1], [8, null, null, null]);
  assert.deepEqual(left.newGrid[3], [2, 4, 8, 16]);

  const right = move(
    [
      [2, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ],
    'right',
  );
  assert.deepEqual(right.newGrid[0], [null, null, null, 4]);

  const down = move(
    [
      [4, null, null, null],
      [4, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ],
    'down',
  );
  assert.equal(down.newGrid[3][0], 8);
  assert.equal(down.score, 8);

  const noOp = move(
    [
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ],
    'left',
  );
  assert.equal(noOp.moved, false);
  assert.equal(gridsEqual(rotateGrid(rotateGrid(rotateGrid(rotateGrid(board)))), board), true);

  const fullLocked = [
    [2, 4, 8, 16],
    [16, 8, 4, 2],
    [2, 4, 8, 16],
    [16, 8, 4, 2],
  ];
  assert.equal(canMove(fullLocked), false);
  assert.equal(addRandomTile(fullLocked), fullLocked);
  assert.equal(getMaxTile(fullLocked), 16);

  const verticalMergePossible = [
    [2, 4, 8, 16],
    [2, 8, 4, 32],
    [4, 16, 32, 64],
    [8, 32, 64, 128],
  ];
  assert.equal(canMove(verticalMergePossible), true);
  assert.equal(getMaxTile(verticalMergePossible), 128);
}
