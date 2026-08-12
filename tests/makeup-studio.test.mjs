import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const {
    EMPTY_MAKEUP_LOOK,
    MAKEUP_CATEGORIES,
    MAKEUP_OPTIONS,
    MAKEUP_THEMES,
    countCompletedMakeupSteps,
    getMakeupStarCount,
    scoreMakeupLook,
  } = await loadTsModule('src/components/games/makeupStudioLogic.ts');

  assert.equal(countCompletedMakeupSteps(EMPTY_MAKEUP_LOOK), 0);
  assert.equal(scoreMakeupLook(EMPTY_MAKEUP_LOOK, MAKEUP_THEMES[0]), 0);

  for (const category of MAKEUP_CATEGORIES) {
    assert.ok(MAKEUP_OPTIONS[category].length >= 3, `${category} için yeterli seçenek olmalı`);
  }

  const perfectLook = { ...MAKEUP_THEMES[0].preferred };
  assert.equal(countCompletedMakeupSteps(perfectLook), MAKEUP_CATEGORIES.length);
  assert.equal(scoreMakeupLook(perfectLook, MAKEUP_THEMES[0]), 100);

  const alternativeLook = Object.fromEntries(
    MAKEUP_CATEGORIES.map((category) => [
      category,
      MAKEUP_OPTIONS[category].find((option) => option.id !== MAKEUP_THEMES[0].preferred[category]).id,
    ]),
  );
  assert.equal(scoreMakeupLook(alternativeLook, MAKEUP_THEMES[0]), 52);
  assert.equal(getMakeupStarCount(59), 1);
  assert.equal(getMakeupStarCount(60), 2);
  assert.equal(getMakeupStarCount(85), 3);
}

export default run;
