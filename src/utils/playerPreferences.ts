export const PREFERENCES_EVENT = 'oyuncak:preferences-changed';
const KEY = 'oyuncak.preferences.v1';
export interface PlayerPreferences { shareScores: boolean; breakMinutes: number; reducedMotion: boolean }
const defaults: PlayerPreferences = { shareScores: true, breakMinutes: 0, reducedMotion: false };
let session: PlayerPreferences | undefined;

export function getPlayerPreferences(): PlayerPreferences {
  if (session) return session;
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      shareScores: typeof value.shareScores === 'boolean' ? value.shareScores : defaults.shareScores,
      breakMinutes: [0, 15, 30, 45].includes(value.breakMinutes) ? value.breakMinutes : 0,
      reducedMotion: value.reducedMotion === true,
    };
  } catch { return { ...defaults }; }
}

export function setPlayerPreferences(patch: Partial<PlayerPreferences>): PlayerPreferences {
  session = { ...getPlayerPreferences(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(session)); }
  catch { /* Keep the choice effective for the current session. */ }
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
  return session;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) {
      session = undefined;
      window.dispatchEvent(new Event(PREFERENCES_EVENT));
    }
  });
}
