export interface GameSoundProfile {
  root: number;
  wave: OscillatorType;
  accent: number;
  brightness: number;
  gain: number;
}

export const DEFAULT_SOUND_PROFILE: GameSoundProfile = {
  root: 440,
  wave: 'triangle',
  accent: 2,
  brightness: 1,
  gain: 1,
};

/** Her oyunun genel geri bildirim seslerine kendi tını kimliğini verir. */
export const GAME_SOUND_PROFILES = {
  balloon: { root: 690, wave: 'sine', accent: 1.82, brightness: 1.35, gain: 0.86 },
  basketball: { root: 235, wave: 'triangle', accent: 1.58, brightness: 0.72, gain: 0.92 },
  'tank-arena': { root: 118, wave: 'sawtooth', accent: 1.42, brightness: 0.48, gain: 0.62 },
  whack: { root: 315, wave: 'triangle', accent: 2.18, brightness: 0.78, gain: 1.02 },
  runner: { root: 465, wave: 'square', accent: 1.68, brightness: 1.08, gain: 0.62 },
  tetris: { root: 278, wave: 'square', accent: 2, brightness: 0.86, gain: 0.58 },
  snake: { root: 196, wave: 'sawtooth', accent: 1.76, brightness: 0.66, gain: 0.58 },
  'odd-one-out': { root: 615, wave: 'sine', accent: 2.12, brightness: 1.22, gain: 0.9 },
  shapematch: { root: 525, wave: 'triangle', accent: 1.9, brightness: 1.12, gain: 0.86 },
  simonsays: { root: 392, wave: 'sine', accent: 2.5, brightness: 1.28, gain: 0.92 },
  memory: { root: 349, wave: 'sine', accent: 1.5, brightness: 0.9, gain: 0.88 },
  '2048': { root: 247, wave: 'triangle', accent: 2.25, brightness: 0.82, gain: 0.88 },
  piano: { root: 523.25, wave: 'sine', accent: 2, brightness: 1.18, gain: 0.82 },
  counting: { root: 480, wave: 'triangle', accent: 1.6, brightness: 1.04, gain: 0.9 },
  math: { root: 330, wave: 'square', accent: 1.88, brightness: 0.96, gain: 0.56 },
  codingturtle: { root: 415, wave: 'square', accent: 2.4, brightness: 1.02, gain: 0.56 },
  comparison: { root: 294, wave: 'triangle', accent: 1.72, brightness: 0.76, gain: 0.9 },
  spaceshooter: { root: 760, wave: 'sawtooth', accent: 1.44, brightness: 1.42, gain: 0.46 },
  'connect-four': { root: 262, wave: 'triangle', accent: 1.52, brightness: 0.7, gain: 0.9 },
  'word-search': { root: 587, wave: 'sine', accent: 2.22, brightness: 1.16, gain: 0.86 },
  'color-sort': { root: 436, wave: 'sine', accent: 1.66, brightness: 1.3, gain: 0.84 },
  'makeup-studio': { root: 554, wave: 'sine', accent: 1.8, brightness: 1.24, gain: 0.78 },
} as const satisfies Record<string, GameSoundProfile>;

export type GameSoundProfileId = keyof typeof GAME_SOUND_PROFILES;

export const getGameSoundProfile = (id?: string): GameSoundProfile =>
  id && id in GAME_SOUND_PROFILES
    ? GAME_SOUND_PROFILES[id as GameSoundProfileId]
    : DEFAULT_SOUND_PROFILE;
