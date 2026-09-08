import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const oldWindow = globalThis.window;
  let stored = '{bad-json';
  globalThis.window = new EventTarget();
  globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  try {
    const { getPlayerPreferences, setPlayerPreferences } = await loadTsModule('src/utils/playerPreferences.ts');
    assert.deepEqual(getPlayerPreferences(), { shareScores: true, breakMinutes: 0, reducedMotion: false });
    stored = JSON.stringify({ shareScores: false, breakMinutes: -10, reducedMotion: 'true' });
    assert.deepEqual(getPlayerPreferences(), { shareScores: false, breakMinutes: 0, reducedMotion: false });
    setPlayerPreferences({ breakMinutes: 15 });
    assert.equal(JSON.parse(stored).breakMinutes, 15);
    globalThis.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    setPlayerPreferences({ shareScores: false, reducedMotion: true });
    assert.equal(getPlayerPreferences().shareScores, false, 'Privacy choice remains active when persistence fails');
    assert.equal(getPlayerPreferences().reducedMotion, true);
    stored = JSON.stringify({ shareScores: true, breakMinutes: 30 });
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: 'oyuncak.preferences.v1' });
    globalThis.window.dispatchEvent(event);
    assert.equal(getPlayerPreferences().breakMinutes, 30, 'Other tabs refresh preferences');
  } finally {
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
  }
}
