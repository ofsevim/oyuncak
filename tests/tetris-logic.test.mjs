import assert from "node:assert/strict";
import { loadTsModule } from "./helpers/load-ts-module.mjs";
export async function run() {
  const { planHoldTransition, collides } = await loadTsModule(
    "src/components/games/tetrisLogic.ts",
  );
  const shapes = {
    I: [[1, 1, 1, 1]],
    O: [
      [1, 1],
      [1, 1],
    ],
  };
  const board = Array.from({ length: 18 }, () => Array(10).fill(null));
  const first = planHoldTransition({
    currentType: "I",
    heldType: null,
    nextType: "O",
    canHold: true,
    board,
    shapes,
  });
  assert.equal(first.canHold, false, "first hold must not grant a second hold");
  assert.equal(first.heldType, "I");
  assert.equal(first.active.type, "O");
  assert.equal(first.consumeNext, true);
  assert.equal(
    planHoldTransition({
      currentType: "O",
      heldType: "I",
      nextType: "O",
      canHold: false,
      board,
      shapes,
    }),
    null,
  );
  const swapped = planHoldTransition({
    currentType: "O",
    heldType: "I",
    nextType: "O",
    canHold: true,
    board,
    shapes,
  });
  assert.equal(swapped.consumeNext, false);
  assert.equal(swapped.active.type, "I");
  board[0][3] = "O";
  assert.equal(
    planHoldTransition({
      currentType: "O",
      heldType: "I",
      nextType: "O",
      canHold: true,
      board,
      shapes,
    }).blocked,
    true,
    "held piece must validate spawn collision",
  );
  assert.equal(collides(board, -1, 0, shapes.O), true);
  assert.equal(collides(board, 4, -2, shapes.O), false);
}
