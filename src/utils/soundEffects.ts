// Gelişmiş prosedürel ses efektleri - Web Audio API
// Daha 'juicy' ve profesyonel bir his için katmanlı osilatörler ve yumuşak zarflar (envelopes) kullanılmıştır.
let audioCtx: AudioContext | null = null;

type WebkitAudioContextWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const getAudioCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as WebkitAudioContextWindow).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
};

/** Hafif ve temiz bir pıt sesi */
export const playPopSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
};

/** Başarı/Doğru cevabı kutlayan melodik ses */
export const playSuccessSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [
    { f: 523.25, d: 0.1 }, // C5
    { f: 659.25, d: 0.1 }, // E5
    { f: 783.99, d: 0.2 }, // G5
    { f: 1046.50, d: 0.3 } // C6
  ];

  notes.forEach((note, i) => {
    const startTime = now + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.f, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.d);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + note.d);
  });
};

/** Yumuşak bir hata/olumsuzluk sesi */
export const playErrorSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  // İki osilatör ile dissonant (uyumsuz) ama temiz bir 'thud' hissi
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.2);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(147, now); // Hafif kayma uyumsuzluk yaratır
  osc2.frequency.linearRampToValueAtTime(77, now + 0.2);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.2);
  osc2.stop(now + 0.2);
};

/** Kombo ses efekti - gittikçe daha 'parlak' hale gelir */
export const playComboSound = (comboLevel: number) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const baseFreq = 440 + Math.min(comboLevel * 60, 1000);

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(baseFreq * 1.01, now);
  osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.15);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.25);
  osc2.stop(now + 0.25);
};

/** Görkemli seviye atlama sesi */
export const playLevelUpSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5 to G6

  scale.forEach((freq, i) => {
    const startTime = now + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = i === scale.length - 1 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
};

/** Triumphant rekor kırma sesi */
export const playNewRecordSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // C arpeggio but with a 'sparkle'
  const notes = [523.25, 783.99, 1046.50, 1318.51, 1567.98];

  notes.forEach((freq, i) => {
    const t = now + i * 0.1;
    const osc = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 2, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    osc.connect(gain);
    oscHarmonic.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    oscHarmonic.start(t);
    osc.stop(t + 0.6);
    oscHarmonic.stop(t + 0.6);
  });
};

/** Temiz mekanik tıklama sesi */
export const playTickSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
};

/** Navigasyon/Menü tıklama sesi - daha yumuşak */
export const playNavSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(1000, now + 0.05);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
};
