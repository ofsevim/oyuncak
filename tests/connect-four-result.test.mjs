import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { findConnectFourResult, describeConnectFourLine } = await loadTsModule(
    'src/components/games/connectFourLogic.ts',
  );

  const screenshotBoard = [
    [0, 0, 2, 0, 0, 0, 0],
    [0, 0, 2, 2, 0, 0, 0],
    [0, 0, 2, 2, 2, 0, 0],
    [0, 0, 1, 1, 1, 2, 0],
    [0, 0, 1, 2, 1, 1, 0],
    [0, 1, 2, 1, 1, 1, 2],
  ];
  const diagonal = findConnectFourResult(screenshotBoard);
  assert.equal(diagonal.winner, 2);
  assert.deepEqual(diagonal.line, [
    { row: 0, column: 2 },
    { row: 1, column: 3 },
    { row: 2, column: 4 },
    { row: 3, column: 5 },
  ]);
  assert.equal(
    describeConnectFourLine(diagonal.line, diagonal.winner),
    'Bilgisayar sol üstten sağ alta çapraz dörtleme yaptı.',
  );

  const verticalBoard = Array.from({ length: 6 }, () => Array(7).fill(0));
  [2, 3, 4, 5].forEach((row) => { verticalBoard[row][1] = 1; });
  const vertical = findConnectFourResult(verticalBoard);
  assert.equal(vertical.winner, 1);
  assert.equal(describeConnectFourLine(vertical.line, 1), 'Sen 2. sütunda dikey dörtleme yaptın.');
}

export default run;
