import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const {
    MAX_PHYSICS_STEPS_PER_FRAME,
    MIN_RENDER_INTERVAL_MS,
    alignRenderTimestamp,
    planPhysicsFrame,
    shouldRenderFrame,
  } = await loadTsModule('src/components/games/runner/runnerTiming.ts');

  assert.equal(shouldRenderFrame(MIN_RENDER_INTERVAL_MS - 0.1), false);
  assert.equal(shouldRenderFrame(MIN_RENDER_INTERVAL_MS), true);
  assert.equal(shouldRenderFrame(15, 60), false);
  assert.equal(shouldRenderFrame(1000 / 60, 60), true);
  assert.ok(
    Math.abs(alignRenderTimestamp(20.8, 0, 60) - (1000 / 60)) < 0.01,
    'yenileme hızı artığı bir sonraki kareye taşınmalı',
  );

  const normalFrame = planPhysicsFrame(1000 / 60, 0);
  assert.equal(normalFrame.steps, 1);
  assert.ok(normalFrame.accumulator < 0.001);

  const stalledFrame = planPhysicsFrame(1_000, 0);
  assert.equal(stalledFrame.steps, MAX_PHYSICS_STEPS_PER_FRAME);
  assert.ok(stalledFrame.accumulator < 1, 'uzun duraklama catch-up kuyruğu bırakmamalı');

  const highRefreshFrame = planPhysicsFrame(1000 / 120, 0);
  assert.equal(highRefreshFrame.steps, 0);
  assert.ok(highRefreshFrame.accumulator > 0 && highRefreshFrame.accumulator < 1);
}

export default run;
