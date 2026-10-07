import assert from "node:assert/strict";
import { loadTsModule } from "./helpers/load-ts-module.mjs";
export async function run() {
  const { planSnakeStep, queueSnakeTurn } = await loadTsModule(
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
  assert.deepEqual(queueSnakeTurn(['UP'], 'RIGHT', 'LEFT'), ['UP','LEFT'], 'rapid turns are validated against the last accepted turn');
  assert.deepEqual(queueSnakeTurn(['UP'], 'RIGHT', 'DOWN'), ['UP'], 'a queued turn cannot reverse into the body');
  assert.deepEqual(queueSnakeTurn(['UP'], 'RIGHT', 'UP'), ['UP'], 'duplicate native/React events do not spend another tick');
  assert.deepEqual(queueSnakeTurn(['UP','LEFT','DOWN'], 'RIGHT', 'RIGHT'), ['UP','LEFT','DOWN'], 'input backlog is bounded');
  for (const [direction, head, expected] of [
    ['RIGHT',{x:9,y:4},{x:0,y:4}], ['LEFT',{x:0,y:4},{x:9,y:4}],
    ['UP',{x:4,y:0},{x:4,y:9}], ['DOWN',{x:4,y:9},{x:4,y:0}],
  ]) {
    const wrapped=planSnakeStep([head],direction,{x:2,y:2},[],10,true);
    assert.deepEqual(wrapped.snake[0],expected);
    assert.equal(wrapped.collision,false);
    assert.equal(planSnakeStep([head],direction,{x:2,y:2},[],10,false).collision,true);
  }
}
