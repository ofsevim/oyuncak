import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const {
    BALLOON_COLORS,
    DIFFICULTIES,
    SPECIAL_COLORS,
    hexId,
    getGradId,
    GAME_STYLES,
  } = await loadTsModule('src/components/games/balloonPopLogic.ts');

  assert.doesNotMatch(
    GAME_STYLES,
    /contain\s*:[^;]*\bpaint\b/,
    'paint containment ölçeklenen ve sallanan balonları kırpmamalı',
  );
  assert.match(GAME_STYLES, /@keyframes\s+balloon-rise\b/);
  assert.match(GAME_STYLES, /\.balloon-rise-animate\b[\s\S]*animation:\s*balloon-rise\s+var\(--rise-duration\)/);
  assert.match(GAME_STYLES, /\.balloon-sway-animate\b[\s\S]*overflow:\s*visible/);

  assert.ok(BALLOON_COLORS.length >= 5);
  assert.equal(hexId('#ef4444'), 'ef4444');
  assert.equal(getGradId({ color: BALLOON_COLORS[0] }), 'bal-ef4444');
  assert.equal(getGradId({ special: 'freeze', color: SPECIAL_COLORS.freeze }), 'bal-freeze');
  assert.equal(getGradId({ special: 'double', color: SPECIAL_COLORS.double }), 'bal-double');
  assert.equal(getGradId({ special: 'bomb', color: SPECIAL_COLORS.bomb }), 'bal-bomb');

  for (const key of ['easy', 'medium', 'hard']) {
    const cfg = DIFFICULTIES[key];
    assert.ok(cfg.time > 0 && cfg.maxBalloons > 0 && cfg.spawnRate > 0 && cfg.popsPerRound > 0);
    assert.ok(cfg.speed[0] < cfg.speed[1]);
  }

  const tsx = await readFile('src/components/games/BalloonPopGame.tsx', 'utf8');
  assert.match(tsx, /<style>\{GAME_STYLES\}<\/style>/, 'BalloonPopGame exported GAME_STYLES stilini render etmeli');
}

export default run;
