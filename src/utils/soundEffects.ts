// Hafif, dosyasız ve mobil uyumlu prosedürel oyun sesleri — Web Audio API.
let audioCtx: AudioContext | null = null;
let masterBus: GainNode | null = null;
let resumeListenersInstalled = false;

let _muted = false;
try { _muted = typeof window !== 'undefined' && localStorage.getItem('oyuncak.muted') === 'true'; } catch { /* ignore */ }

export const isMuted = (): boolean => _muted;

export const setMuted = (value: boolean) => {
  _muted = value;
  if (masterBus && audioCtx) {
    masterBus.gain.cancelScheduledValues(audioCtx.currentTime);
    masterBus.gain.setTargetAtTime(value ? 0 : 0.72, audioCtx.currentTime, 0.015);
  }
  try { localStorage.setItem('oyuncak.muted', String(value)); } catch { /* ignore */ }
};

export const toggleMute = (): boolean => {
  setMuted(!_muted);
  return _muted;
};

type WebkitAudioContextWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const createContext = () => {
  if (audioCtx || typeof window === 'undefined') return audioCtx;
  const Context = window.AudioContext || (window as WebkitAudioContextWindow).webkitAudioContext;
  if (!Context) return null;
  audioCtx = new Context();

  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
  compressor.knee.setValueAtTime(18, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(5, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.004, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.16, audioCtx.currentTime);

  masterBus = audioCtx.createGain();
  masterBus.gain.setValueAtTime(_muted ? 0 : 0.72, audioCtx.currentTime);
  masterBus.connect(compressor);
  compressor.connect(audioCtx.destination);
  return audioCtx;
};

const installResumeListenersOnce = () => {
  if (resumeListenersInstalled || typeof window === 'undefined') return;
  resumeListenersInstalled = true;

  const tryResume = () => {
    if (_muted) return;
    const context = createContext();
    if (context?.state === 'suspended') context.resume().catch(() => { /* ignore */ });
  };

  const options: AddEventListenerOptions = { once: true, capture: true, passive: true };
  window.addEventListener('pointerdown', tryResume, options);
  window.addEventListener('touchstart', tryResume, options);
  window.addEventListener('keydown', tryResume, options);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryResume();
  });
};

if (typeof window !== 'undefined') installResumeListenersOnce();

const getAudioCtx = () => {
  if (_muted) return null;
  const context = createContext();
  if (context?.state === 'suspended') context.resume().catch(() => { /* ignore */ });
  return context;
};

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  duration: number;
  delay?: number;
  gain?: number;
  attack?: number;
  type?: OscillatorType;
  detune?: number;
}

const playTone = (ctx: AudioContext, options: ToneOptions) => {
  if (!masterBus) return;
  const start = ctx.currentTime + (options.delay ?? 0);
  const duration = Math.max(0.025, options.duration);
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const peak = options.gain ?? 0.12;
  const attack = Math.min(options.attack ?? 0.008, duration * 0.4);

  oscillator.type = options.type ?? 'triangle';
  oscillator.frequency.setValueAtTime(Math.max(20, options.frequency), start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), start + duration);
  }
  if (options.detune) oscillator.detune.setValueAtTime(options.detune, start);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(masterBus);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

const playNoise = (
  ctx: AudioContext,
  { duration, frequency, endFrequency, gain = 0.08, delay = 0 }: {
    duration: number; frequency: number; endFrequency?: number; gain?: number; delay?: number;
  },
) => {
  if (!masterBus) return;
  const start = ctx.currentTime + delay;
  const sampleCount = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    const fade = 1 - index / sampleCount;
    samples[index] = (Math.random() * 2 - 1) * fade;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, start);
  if (endFrequency) filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  filter.Q.setValueAtTime(1.4, start);
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(masterBus);
  source.start(start);
  source.stop(start + duration);
};

/** Yumuşak tahta blok / oyuncak marimba dokunuşu. */
export const playPopSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  playTone(ctx, { frequency: 620, endFrequency: 470, duration: 0.075, gain: 0.14, type: 'triangle' });
  playTone(ctx, { frequency: 1240, endFrequency: 940, duration: 0.045, gain: 0.035, type: 'sine' });
};

/** Kısa ve sıcak bir doğru cevap melodisi. */
export const playSuccessSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone(ctx, { frequency, duration: index === 2 ? 0.28 : 0.16, delay: index * 0.07, gain: index === 2 ? 0.13 : 0.1, type: 'triangle' });
    playTone(ctx, { frequency: frequency * 2, duration: 0.1, delay: index * 0.07, gain: 0.018, type: 'sine' });
  });
};

/** Korkutmayan, düşük sesli bir “olmadı” efekti. */
export const playErrorSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  playTone(ctx, { frequency: 260, endFrequency: 185, duration: 0.17, gain: 0.12, type: 'triangle' });
  playTone(ctx, { frequency: 390, endFrequency: 278, duration: 0.13, delay: 0.015, gain: 0.045, type: 'sine' });
  playNoise(ctx, { duration: 0.065, frequency: 340, endFrequency: 190, gain: 0.025 });
};

/** Seri büyüdükçe tizleşen, fakat kulak tırmalamayan kombo sesi. */
export const playComboSound = (comboLevel: number) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const step = Math.min(Math.max(comboLevel, 1), 12);
  const base = 440 * (2 ** (step / 18));
  [1, 1.25, 1.5].forEach((ratio, index) => {
    playTone(ctx, { frequency: base * ratio, endFrequency: base * ratio * 1.08, duration: 0.16 + index * 0.04, delay: index * 0.045, gain: 0.09, type: index === 2 ? 'sine' : 'triangle' });
  });
};

/** Oyuncak trompet ve zil hissinde kısa seviye fanfarı. */
export const playLevelUpSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone(ctx, { frequency, duration: index === 3 ? 0.42 : 0.2, delay: index * 0.085, gain: index === 3 ? 0.14 : 0.1, type: 'triangle' });
  });
  playTone(ctx, { frequency: 2093, endFrequency: 2349, duration: 0.34, delay: 0.29, gain: 0.025, type: 'sine' });
};

/** Rekor için parlak ama kısa bir kutlama melodisi. */
export const playNewRecordSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, index) => {
    playTone(ctx, { frequency, duration: index === 4 ? 0.5 : 0.2, delay: index * 0.075, gain: index === 4 ? 0.14 : 0.085, type: 'triangle' });
  });
  [0.3, 0.38, 0.46].forEach((delay, index) => {
    playTone(ctx, { frequency: 1900 + index * 360, endFrequency: 2300 + index * 420, duration: 0.22, delay, gain: 0.025, type: 'sine' });
  });
};

/** Sayaçlar için çok hafif mekanik tık. */
export const playTickSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  playTone(ctx, { frequency: 1080, endFrequency: 820, duration: 0.035, gain: 0.045, type: 'sine' });
};

/** Basketbol filesinden geçen top için hava ve ip sürtünmesi. */
export const playSwishSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  playNoise(ctx, { duration: 0.26, frequency: 1800, endFrequency: 720, gain: 0.16 });
  playTone(ctx, { frequency: 210, endFrequency: 135, duration: 0.16, delay: 0.08, gain: 0.045, type: 'sine' });
};

/** Menü geçişlerinde minik bir cam/balon dokunuşu. */
export const playNavSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  playTone(ctx, { frequency: 720, endFrequency: 920, duration: 0.07, gain: 0.065, type: 'sine' });
  playTone(ctx, { frequency: 1440, endFrequency: 1840, duration: 0.05, delay: 0.012, gain: 0.018, type: 'sine' });
};

/** Dört Sıra taşının tahtaya düşüşü; iki oyuncunun tonu farklıdır. */
export const playDiscDropSound = (player: 1 | 2) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const base = player === 1 ? 240 : 300;
  playTone(ctx, { frequency: base * 1.8, endFrequency: base, duration: 0.11, gain: 0.13, type: 'triangle' });
  playTone(ctx, { frequency: base / 2, endFrequency: base * 0.42, duration: 0.09, delay: 0.035, gain: 0.075, type: 'sine' });
  playNoise(ctx, { duration: 0.035, frequency: 520, endFrequency: 230, delay: 0.04, gain: 0.025 });
};

/** Renk tüpleri arasında akan sıvı için kısa glissando. */
export const playPourSound = (colorIndex = 0) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const base = 420 + (Math.abs(colorIndex) % 6) * 42;
  playTone(ctx, { frequency: base, endFrequency: base * 1.45, duration: 0.2, gain: 0.085, type: 'sine' });
  playTone(ctx, { frequency: base * 0.5, endFrequency: base * 0.72, duration: 0.17, delay: 0.025, gain: 0.04, type: 'triangle' });
  playNoise(ctx, { duration: 0.13, frequency: 950, endFrequency: 1450, gain: 0.025 });
};

/** Bulunan kelimenin uzunluğuna göre yükselen minik harf melodisi. */
export const playWordFoundSound = (wordLength = 4) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const root = 520 + Math.min(Math.max(wordLength, 3), 8) * 18;
  [1, 1.25, 1.5].forEach((ratio, index) => {
    playTone(ctx, { frequency: root * ratio, duration: index === 2 ? 0.24 : 0.13, delay: index * 0.055, gain: 0.085, type: 'triangle' });
  });
};
