import assert from "node:assert/strict";
import { loadTsModule } from "./helpers/load-ts-module.mjs";
export async function run() {
  const { planSnakeStep } = await loadTsModule(
    "src/components/games/snakeLogic.ts",
  );
  const snake = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 1 },
  ];
  const intoTail = planSnakeStep(snake, "RIGHT", { x: 8, y: 8 }, [], 10, true);
  assert.equal(
    intoTail.collision,
    false,
    "departing tail is free on a non-growing step",
  );
  assert.deepEqual(intoTail.snake[0], { x: 2, y: 1 });
  assert.equal(intoTail.snake.length, 4);
  assert.equal(
    planSnakeStep(snake, "DOWN", { x: 8, y: 8 }, [], 10, true).collision,
    true,
    "body stays occupied",
  );
  assert.equal(
    planSnakeStep(snake, "RIGHT", { x: 2, y: 1 }, [], 10, true).collision,
    true,
    "tail stays occupied while growing",
  );
  const growing = planSnakeStep(
    [{ x: 1, y: 1 }],
    "RIGHT",
    { x: 2, y: 1 },
    [],
    10,
    true,
  );
  assert.equal(growing.ate, true);
  assert.equal(growing.snake.length, 2);
  assert.equal(
    planSnakeStep([{ x: 0, y: 0 }], "LEFT", { x: 8, y: 8 }, [], 10, false)
      .collision,
    true,
  );
  assert.equal(
    planSnakeStep([{ x: 0, y: 0 }], "LEFT", { x: 8, y: 8 }, [], 10, true)
      .snake[0].x,
    9,
  );
  assert.equal(
    planSnakeStep(
      [{ x: 1, y: 1 }],
      "RIGHT",
      { x: 8, y: 8 },
      [{ x: 2, y: 1 }],
      10,
      true,
    ).collision,
    true,
  );
  assert.deepEqual(snake[0], { x: 1, y: 1 }, "input remains unchanged");
}
