import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { GAME_ROUTE_IDS } = await loadTsModule('src/constants/gameIds.ts');
  const { GAME_SOUND_PROFILES } = await loadTsModule('src/utils/gameSoundProfiles.ts');
  const profileIds = Object.keys(GAME_SOUND_PROFILES).sort();

  assert.deepEqual(profileIds, [...GAME_ROUTE_IDS].sort(), 'her oyun için bir ses profili bulunmalı');

  const signatures = Object.values(GAME_SOUND_PROFILES).map(
    (profile) => `${profile.root}:${profile.wave}:${profile.accent}:${profile.brightness}:${profile.gain}`,
  );
  assert.equal(new Set(signatures).size, signatures.length, 'oyun ses profilleri birbirinden farklı olmalı');
}

export default run;
