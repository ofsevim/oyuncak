import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { getTrajectoryGuideSteps } = await loadTsModule(
    'src/components/games/basketball/basketballTrajectory.ts',
  );

  assert.equal(getTrajectoryGuideSteps(1, false), 60);
  assert.equal(getTrajectoryGuideSteps(1, true), 36);
  assert.equal(getTrajectoryGuideSteps(5, false), 8);
  assert.equal(getTrajectoryGuideSteps(6, false), 0);
}

export default run;
