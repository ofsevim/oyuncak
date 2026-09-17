import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { getAtmosphere, ATMOSPHERE_CYCLE_SECONDS } = await loadTsModule('src/components/games/runner/runnerRuntime.ts');
  const day = getAtmosphere(0);
  assert.deepEqual(getAtmosphere(89), day, 'first 90 seconds stay in daylight');
  assert.equal(getAtmosphere(225).timeOfDay, 'night');
  assert.deepEqual(getAtmosphere(ATMOSPHERE_CYCLE_SECONDS), day);
  assert.deepEqual(getAtmosphere(-1), day);
  assert.deepEqual(getAtmosphere(NaN), day);
  for (const boundary of [90, 135, 180, 225, 330, 390, 420, 480]) {
    const before = getAtmosphere(boundary - 0.001);
    const after = getAtmosphere(boundary + 0.001);
    for (const key of ['sunAlpha', 'moonAlpha', 'sunY', 'moonY', 'starsAlpha', 'firefliesAlpha']) {
      assert.ok(Math.abs(before[key] - after[key]) < 0.001, `${key} must be continuous at ${boundary}s`);
    }
    for (const key of ['skyTop', 'skyBottom', 'cloudColor', 'groundTop', 'groundBottom']) {
      assert.equal(before[key], after[key], `${key} must not snap at a phase boundary`);
    }
  }
  assert.notEqual(getAtmosphere(110).cloudColor, getAtmosphere(120).cloudColor, 'clouds interpolate with the sky');
}
