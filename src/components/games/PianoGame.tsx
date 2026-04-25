import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playComboSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

/* ═══════════════════════════════════════════════════════════
   SABİTLER
   ═══════════════════════════════════════════════════════════ */

const WHITE_NOTES = [
  { note: 'C', freq: 261.63, label: 'Do', key: 'a' },
  { note: 'D', freq: 293.66, label: 'Re', key: 's' },
  { note: 'E', freq: 329.63, label: 'Mi', key: 'd' },
  { note: 'F', freq: 349.23, label: 'Fa', key: 'f' },
  { note: 'G', freq: 392.0, label: 'Sol', key: 'g' },
  { note: 'A', freq: 440.0, label: 'La', key: 'h' },
  { note: 'B', freq: 493.88, label: 'Si', key: 'j' },
  { note: 'C2', freq: 523.25, label: 'Do²', key: 'k' },
];

const BLACK_NOTES = [
  { note: 'C#', freq: 277.18, label: 'Do#', position: 0, key: 'w' },
  { note: 'D#', freq: 311.13, label: 'Re#', position: 1, key: 'e' },
  { note: 'F#', freq: 369.99, label: 'Fa#', position: 3, key: 't' },
  { note: 'G#', freq: 415.3, label: 'Sol#', position: 4, key: 'y' },
  { note: 'A#', freq: 466.16, label: 'La#', position: 5, key: 'u' },
];

const ALL_NOTES = [...WHITE_NOTES, ...BLACK_NOTES];

const MELODIES = [
  // ── ÇOK KOLAY ─────────────────────────────────────────────
  {
    name: '🎵 Do Re Mi',
    difficulty: 'Çok Kolay',
    notes: ['C', 'D', 'E', 'C', '-', 'C', 'D', 'E', 'C', '-', 'E', 'F', 'G', '-', 'E', 'F', 'G'],
  },
  {
    name: '🐥 Baby Shark',
    difficulty: 'Çok Kolay',
    notes: ['D', 'D', 'D', 'D', 'D', 'E', '-', 'D', 'D', 'D', 'D', 'D', 'E', '-', 'D', 'D', 'D', 'D', 'D', 'E', 'D'],
  },
  {
    name: '🌙 Ay Işığı',
    difficulty: 'Çok Kolay',
    notes: ['E', 'E', 'E', '-', 'C', 'E', '-', 'G', '-', '-', 'G'],
  },

  // ── KOLAY ──────────────────────────────────────────────────
  {
    name: '⭐ Twinkle Twinkle',
    difficulty: 'Kolay',
    notes: [
      'C', 'C', 'G', 'G', 'A', 'A', 'G', '-',
      'F', 'F', 'E', 'E', 'D', 'D', 'C', '-',
      'G', 'G', 'F', 'F', 'E', 'E', 'D', '-',
      'G', 'G', 'F', 'F', 'E', 'E', 'D', '-',
      'C', 'C', 'G', 'G', 'A', 'A', 'G', '-',
      'F', 'F', 'E', 'E', 'D', 'D', 'C',
    ],
  },
  {
    name: '🎶 Mary Had a Lamb',
    difficulty: 'Kolay',
    notes: [
      'E', 'D', 'C', 'D', 'E', 'E', 'E', '-',
      'D', 'D', 'D', '-',
      'E', 'G', 'G', '-',
      'E', 'D', 'C', 'D', 'E', 'E', 'E', '-',
      'E', 'D', 'D', 'E', 'D', 'C',
    ],
  },
  {
    name: '🐸 Küçük Kurbağa',
    difficulty: 'Kolay',
    notes: [
      'C', 'D', 'E', 'C', '-',
      'C', 'D', 'E', 'C', '-',
      'E', 'F', 'G', '-',
      'E', 'F', 'G', '-',
      'G', 'A', 'G', 'F', 'E', 'C', '-',
      'C', 'G', 'C',
    ],
  },
  {
    name: '🌉 London Bridge',
    difficulty: 'Kolay',
    notes: [
      'G', 'A', 'G', 'F', 'E', 'F', 'G', '-',
      'D', 'E', 'F', '-',
      'E', 'F', 'G', '-',
      'G', 'A', 'G', 'F', 'E', 'F', 'G', '-',
      'D', 'G', 'E', 'C',
    ],
  },

  // ── ORTA ───────────────────────────────────────────────────
  {
    name: '🎂 Happy Birthday',
    difficulty: 'Orta',
    notes: [
      'C', 'C', 'D', 'C', 'F', 'E', '-',
      'C', 'C', 'D', 'C', 'G', 'F', '-',
      'C', 'C', 'C2', 'A', 'F', 'E', 'D', '-',
      'B', 'B', 'A', 'F', 'G', 'F',
    ],
  },
  {
    name: '🎄 Jingle Bells',
    difficulty: 'Orta',
    notes: [
      'E', 'E', 'E', '-',
      'E', 'E', 'E', '-',
      'E', 'G', 'C', 'D', 'E', '-',
      'F', 'F', 'F', 'F', 'F', 'E', 'E', '-',
      'E', 'D', 'D', 'E', 'D', '-',
      'G', '-',
      'E', 'E', 'E', '-',
      'E', 'E', 'E', '-',
      'E', 'G', 'C', 'D', 'E', '-',
      'F', 'F', 'F', 'F', 'E', 'D', 'C',
    ],
  },
  {
    name: '🎻 Neşeye Övgü',
    difficulty: 'Orta',
    notes: [
      'E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D', '-',
      'E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'D', 'C', 'C',
    ],
  },
  {
    name: '🎺 Ölümsüz Oyun',
    difficulty: 'Orta',
    notes: [
      'E', 'B', 'C', 'D', 'C', 'B', 'A', '-',
      'A', 'C', 'E', 'A', '-',
      'B', '-', 'C', 'D', '-',
      'E', 'C', '-', 'B', '-',
      'A', '-', 'A', 'C', 'E', '-',
      'D', 'C', 'B', '-', 'C', '-',
      'D', '-', 'E', '-', 'C', '-',
      'A', '-', 'A',
    ],
  },

  // ── ZOR ────────────────────────────────────────────────────
  {
    name: '💃 Can Can',
    difficulty: 'Zor',
    notes: [
      'C', 'D', 'E', 'F', 'G', '-', 'G', '-',
      'A', 'G', 'F', 'E', 'D', 'C', '-',
      'E', 'F', 'G', 'A', 'B', 'C2', '-',
      'G', 'E', 'C', '-',
      'C', 'D', 'E', 'F', 'G', '-', 'G', '-',
      'A', 'G', 'F', 'E', 'D', 'C', '-',
      'E', 'D', 'C',
    ],
  },
  {
    name: '🦋 Für Elise',
    difficulty: 'Zor',
    notes: [
      'E', 'D#', 'E', 'D#', 'E', 'B', 'D', 'C', 'A', '-',
      'C', 'E', 'A', 'B', '-',
      'E', 'G#', 'B', 'C', '-',
      'E', 'D#', 'E', 'D#', 'E', 'B', 'D', 'C', 'A', '-',
      'C', 'E', 'A', 'B', '-',
      'E', 'C', 'B', 'A',
    ],
  },
];

const COLORS: Record<string, string> = {
  C: '#F72C3A',
  D: '#FF7600',
  E: '#F5C800',
  F: '#00C04B',
  G: '#009BDE',
  A: '#8B2BE2',
  B: '#E8006A',
  C2: '#F72C3A',
  'C#': '#B5001D',
  'D#': '#C45500',
  'F#': '#007A30',
  'G#': '#006BA0',
  'A#': '#5C0BA5',
};

const MOBILE_PIANO_MIN_WIDTH = 336;

/* ═══════════════════════════════════════════════════════════
   YARDIMCI: melodyIndex → ilk gerçek nota indexini bul
   ═══════════════════════════════════════════════════════════ */
function skipDashes(notes: string[], from: number): number {
  let i = from;
  while (i < notes.length && notes[i] === '-') i++;
  return i;
}

/* ═══════════════════════════════════════════════════════════
   BİLEŞEN
   ═══════════════════════════════════════════════════════════ */
const PianoGame = () => {
  /* ── State ─────────────────────────────────────────────── */
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMelody, setCurrentMelody] = useState<(typeof MELODIES)[0] | null>(null);
  const [melodyIndex, setMelodyIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<string[]>([]);

  /* ── Refs (stale-closure koruması) ─────────────────────── */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const melodyIndexRef = useRef(0);
  const currentMelodyRef = useRef<(typeof MELODIES)[0] | null>(null);
  const isPlayingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const abortRef = useRef(false);
  const pointerHandledRef = useRef(false);
  const { safeTimeout } = useSafeTimeouts();
  const noteTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Ref ↔ State senkronu */
  useEffect(() => { currentMelodyRef.current = currentMelody; }, [currentMelody]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { melodyIndexRef.current = melodyIndex; }, [melodyIndex]);

  /* ── Init & Cleanup ────────────────────────────────────── */
  useEffect(() => { setHighScore(getHighScore('piano')); }, []);

  useEffect(() => {
    const noteTimeouts = noteTimeoutsRef.current;
    return () => {
      abortRef.current = true;
      noteTimeouts.forEach(clearTimeout);
      noteTimeouts.clear();
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  /* ── AudioContext (iOS Safari resume desteği) ──────────── */
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  /* ── Nota çalma (oscillator + cleanup) ─────────────────── */
  const playNote = useCallback(
    (freq: number, note: string) => {
      const ctx = getAudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);

      /* Ses grafiği temizliği */
      osc1.onended = () => {
        osc1.disconnect();
        osc2.disconnect();
        gain.disconnect();
      };

      /* Görsel vurgu */
      setActiveNotes((prev) => new Set(prev).add(note));

      const prevT = noteTimeoutsRef.current.get(note);
      if (prevT) clearTimeout(prevT);

      const t = safeTimeout(() => {
        setActiveNotes((prev) => {
          const s = new Set(prev);
          s.delete(note);
          return s;
        });
        noteTimeoutsRef.current.delete(note);
      }, 200);
      noteTimeoutsRef.current.set(note, t);
    },
    [getAudioContext, safeTimeout],
  );

  /* ── Tuş tıklama / basma mantığı ──────────────────────── */
  const handleKeyClick = useCallback(
    (noteStr: string) => {
      /* Melodi dinletilirken tuşları kilitle */
      if (isPlayingRef.current) return;

      const noteData = ALL_NOTES.find((n) => n.note === noteStr);
      if (!noteData) return;

      playNote(noteData.freq, noteData.note);

      /* Kayıt modu (melodi modu aktifken kayıt engellenir) */
      if (isRecordingRef.current && !currentMelodyRef.current) {
        setRecordedNotes((prev) => [...prev, noteStr]);
      }

      /* ── Melodi modu kontrolü ──────────────────────────── */
      const melody = currentMelodyRef.current;
      if (!melody) return;

      const checkIndex = skipDashes(melody.notes, melodyIndexRef.current);
      if (checkIndex >= melody.notes.length) return;

      if (noteStr === melody.notes[checkIndex]) {
        /* DOĞRU */
        comboRef.current += 1;
        const newCombo = comboRef.current;
        const points = 10 + Math.min(newCombo, 5) * 5;
        scoreRef.current += points;

        setCombo(newCombo);
        setScore(scoreRef.current);
        if (newCombo > 2) playComboSound(newCombo);

        const finalIndex = skipDashes(melody.notes, checkIndex + 1);
        melodyIndexRef.current = finalIndex;
        setMelodyIndex(finalIndex);

        /* Melodi tamamlandı mı? */
        if (finalIndex >= melody.notes.length) {
          playSuccessSound();
          setShowSuccess(true);

          const isNew = saveHighScoreObj('piano', scoreRef.current);
          if (isNew) setHighScore(scoreRef.current);

          if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
          successTimeoutRef.current = safeTimeout(() => {
            setShowSuccess(false);
            setCurrentMelody(null);
            currentMelodyRef.current = null;
            melodyIndexRef.current = 0;
            setMelodyIndex(0);
            comboRef.current = 0;
            setCombo(0);
          }, 2000);
        }
      } else {
        /* YANLIŞ */
        comboRef.current = 0;
        setCombo(0);
      }
    },
    [playNote, safeTimeout],
  );

  /* Klavye listener'ı için güncel ref */
  const handleKeyClickRef = useRef(handleKeyClick);
  useEffect(() => {
    handleKeyClickRef.current = handleKeyClick;
  }, [handleKeyClick]);

  /* ── Klavye desteği (e.repeat engeli) ──────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = ALL_NOTES.find((n) => n.key === e.key.toLowerCase());
      if (note) handleKeyClickRef.current(note.note);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ── Melodi dinletme (iptal edilebilir) ────────────────── */
  const playMelody = useCallback(
    async (melody: (typeof MELODIES)[0]) => {
      if (isPlayingRef.current) return;
      abortRef.current = false;
      setIsPlaying(true);
      isPlayingRef.current = true;

      for (const note of melody.notes) {
        if (abortRef.current) break;
        if (note === '-') {
          await new Promise((r) => safeTimeout(() => r(undefined), 350));
        } else {
          const nd = ALL_NOTES.find((n) => n.note === note);
          if (nd) {
            playNote(nd.freq, nd.note);
            await new Promise((r) => safeTimeout(() => r(undefined), 450));
          }
        }
      }

      setIsPlaying(false);
      isPlayingRef.current = false;
    },
    [playNote, safeTimeout],
  );

  /* ── Melodi modunu başlat ──────────────────────────────── */
  const startMelodyMode = useCallback((melody: (typeof MELODIES)[0]) => {
    setCurrentMelody(melody);
    currentMelodyRef.current = melody;
    melodyIndexRef.current = 0;
    setMelodyIndex(0);
    scoreRef.current = 0;
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
  }, []);

  /* ── Kaydı çal (iptal edilebilir) ──────────────────────── */
  const playRecording = useCallback(async () => {
    if (isPlayingRef.current || recordedNotes.length === 0) return;
    abortRef.current = false;
    setIsPlaying(true);
    isPlayingRef.current = true;

    for (const note of recordedNotes) {
      if (abortRef.current) break;
      const nd = ALL_NOTES.find((n) => n.note === note);
      if (nd) {
        playNote(nd.freq, nd.note);
        await new Promise((r) => safeTimeout(() => r(undefined), 400));
      }
    }

    setIsPlaying(false);
    isPlayingRef.current = false;
  }, [playNote, recordedNotes, safeTimeout]);

  /* ── Çalmayı durdur ────────────────────────────────────── */
  const stopPlayback = useCallback(() => {
    abortRef.current = true;
  }, []);

  /* ── Pointer / Click çift-ateşleme koruması ────────────── */
  const onPointerDown = useCallback(
    (note: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      pointerHandledRef.current = true;
      handleKeyClick(note);
    },
    [handleKeyClick],
  );

  const onClick = useCallback(
    (note: string) => () => {
      if (pointerHandledRef.current) {
        pointerHandledRef.current = false;
        return;
      }
      handleKeyClick(note);
    },
    [handleKeyClick],
  );

  /* ── Türetilmiş değerler ───────────────────────────────── */
  const nextNoteData = currentMelody
    ? (() => {
      const idx = skipDashes(currentMelody.notes, melodyIndex);
      return idx < currentMelody.notes.length
        ? ALL_NOTES.find((n) => n.note === currentMelody.notes[idx]) ?? null
        : null;
    })()
    : null;

  const totalPlayableNotes = currentMelody
    ? currentMelody.notes.filter((n) => n !== '-').length
    : 0;

  const playedNotes = currentMelody
    ? currentMelody.notes.slice(0, melodyIndex).filter((n) => n !== '-').length
    : 0;

  const progressPercent =
    totalPlayableNotes > 0 ? (playedNotes / totalPlayableNotes) * 100 : 0;

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <motion.div
      className="flex flex-col items-center gap-4 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="38" height="38" rx="8" fill="#1e1b4b" />
          {['#F72C3A', '#FF7600', '#F5C800', '#00C04B', '#009BDE', '#8B2BE2', '#E8006A'].map((c, i) => (
            <rect key={i} x={2 + i * 5} y="8" width="4" height="22" rx="1" fill={c} />
          ))}
          {[0, 1, 3, 4, 5].map((pos, i) => (
            <rect
              key={`b${i}`}
              x={4 + pos * 5}
              y="8"
              width="3"
              height="13"
              rx="0.8"
              fill={['#B5001D', '#C45500', '#007A30', '#006BA0', '#5C0BA5'][i]}
            />
          ))}
        </svg>
        <h2 className="text-3xl font-black text-gradient">Renkli Piyano</h2>
      </div>

      <p className="text-sm text-muted-foreground font-medium text-center">
        Tuşlara tıkla veya klavyeden çal (A-K beyaz, W-E-T-Y-U siyah)
      </p>

      <Leaderboard gameId="piano" />

      {/* Skor çubuğu */}
      {(currentMelody || highScore > 0) && (
        <div className="flex gap-2 items-center flex-wrap justify-center">
          {currentMelody && (
            <div className="glass-card px-3 py-1">
              <span className="text-sm font-black text-primary">🎵 {score}</span>
            </div>
          )}
          {combo > 1 && (
            <motion.div
              key={combo}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="glass-card px-3 py-1 border border-yellow-500/30"
            >
              <span className="text-sm font-black text-yellow-400">🔥 x{combo}</span>
            </motion.div>
          )}
          {highScore > 0 && (
            <div className="glass-card px-3 py-1">
              <span className="text-sm font-bold text-muted-foreground">🏆 {highScore}</span>
            </div>
          )}
        </div>
      )}

      {/* Başarı mesajı */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            🎉 Harika! Melodiyi tamamladın!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Melodi modu göstergesi */}
      {currentMelody && !showSuccess && (
        <div className="glass-card p-3 rounded-xl text-center w-full max-w-md neon-border">
          <p className="font-bold text-sm">{currentMelody.name}</p>

          <div className="flex justify-center gap-2 mt-1">
            <span className="bg-primary/20 px-2 py-0.5 rounded-full text-xs font-bold text-primary">
              {playedNotes}/{totalPlayableNotes}
            </span>
          </div>

          {/* İlerleme çubuğu */}
          <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {nextNoteData && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Sıradaki:</span>
              <motion.div
                key={melodyIndex}
                className="px-4 py-2 rounded-lg text-white font-black text-lg shadow-lg"
                style={{ backgroundColor: COLORS[nextNoteData.note] || '#666' }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {nextNoteData.label}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* ── PİYANO ───────────────────────────────────────── */}
      <div className="w-full overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <div
          className="glass-card p-2 md:p-5 rounded-2xl neon-border min-w-[336px]"
          style={{ minWidth: `${MOBILE_PIANO_MIN_WIDTH}px` }}
        >
          <div
            className="relative"
            style={{ height: 'clamp(170px, 40vw, 280px)', touchAction: 'none' }}
          >
            {/* Beyaz tuşlar */}
            <div className="flex gap-px md:gap-1 h-full">
              {WHITE_NOTES.map((note) => {
                const isActive = activeNotes.has(note.note);
                return (
                  <motion.button
                    key={note.note}
                    aria-label={`${note.label} notası`}
                    onClick={onClick(note.note)}
                    onPointerDown={onPointerDown(note.note)}
                    className={`relative rounded-b-xl transition-all touch-manipulation select-none flex-1 ${isActive ? 'brightness-110 scale-[0.98]' : ''
                      }`}
                    style={{
                      minWidth: 0,
                      touchAction: 'none',
                      background: isActive
                        ? `linear-gradient(180deg, ${COLORS[note.note]} 0%, ${COLORS[note.note]}cc 100%)`
                        : `linear-gradient(180deg, ${COLORS[note.note]}ee 0%, ${COLORS[note.note]} 100%)`,
                      boxShadow: isActive
                        ? `0 0 32px ${COLORS[note.note]}cc, inset 0 -4px 12px rgba(0,0,0,0.25)`
                        : `0 4px 10px rgba(0,0,0,0.35), inset 0 -3px 10px rgba(0,0,0,0.2)`,
                      border: `3px solid ${COLORS[note.note]}`,
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="absolute bottom-2 md:bottom-3 left-0 right-0 flex flex-col items-center pointer-events-none">
                      <span className="font-black text-[10px] md:text-sm drop-shadow-lg text-white">
                        {note.label}
                      </span>
                      <span className="text-[7px] hidden sm:block text-white/70">
                        {note.key.toUpperCase()}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Siyah tuşlar */}
            <div className="absolute top-0 left-0 right-0 h-[58%] pointer-events-none">
              {BLACK_NOTES.map((note) => {
                const isActive = activeNotes.has(note.note);
                const whiteKeyCount = WHITE_NOTES.length;
                const whiteKeyWidthPercent = 100 / whiteKeyCount;
                const leftPos =
                  (note.position + 1) * whiteKeyWidthPercent - whiteKeyWidthPercent * 0.32;

                return (
                  <motion.button
                    key={note.note}
                    aria-label={`${note.label} notası`}
                    onClick={onClick(note.note)}
                    onPointerDown={onPointerDown(note.note)}
                    className="absolute pointer-events-auto rounded-b-lg touch-manipulation select-none z-10"
                    style={{
                      left: `${leftPos}%`,
                      width: `${whiteKeyWidthPercent * 0.64}%`,
                      height: '100%',
                      touchAction: 'none',
                      background: isActive
                        ? `linear-gradient(180deg, ${COLORS[note.note]} 0%, ${COLORS[note.note]}bb 100%)`
                        : `linear-gradient(180deg, ${COLORS[note.note]}dd 0%, ${COLORS[note.note]} 100%)`,
                      boxShadow: isActive
                        ? `0 0 22px ${COLORS[note.note]}cc, inset 0 -3px 10px rgba(0,0,0,0.3)`
                        : `0 4px 10px rgba(0,0,0,0.55), inset 0 -2px 8px rgba(0,0,0,0.3)`,
                      border: `2px solid ${COLORS[note.note]}`,
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                      <span className="absolute bottom-1 md:bottom-2 left-0 right-0 text-center text-[8px] md:text-[9px] font-bold text-white drop-shadow-lg pointer-events-none hidden sm:block">
                        {note.label}
                      </span>
                    </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Kayıt kontrolleri */}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <button
          onClick={() => {
            if (!isRecording) setRecordedNotes([]);
            setIsRecording(!isRecording);
          }}
          disabled={!!currentMelody}
          className={`px-4 py-2 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'glass-card text-muted-foreground'
            }`}
        >
          {isRecording ? '⏹️ Kaydı Durdur' : '⏺️ Kaydet'}
        </button>

        {recordedNotes.length > 0 && !isRecording && (
          <button
            onClick={playRecording}
            disabled={isPlaying}
            className="px-4 py-2 glass-card rounded-xl font-bold text-sm text-primary touch-manipulation disabled:opacity-50"
          >
            ▶️ Kaydı Çal ({recordedNotes.length} nota)
          </button>
        )}

        {isPlaying && (
          <button
            onClick={stopPlayback}
            className="px-4 py-2 glass-card rounded-xl font-bold text-sm text-red-400 touch-manipulation"
          >
            ⏹️ Durdur
          </button>
        )}
      </div>

      {/* Melodiler */}
      <div className="space-y-3 w-full">
        <p className="text-center font-bold text-sm">🎵 Melodileri Öğren</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {MELODIES.map((melody) => (
            <div
              key={melody.name}
              className="glass-card p-3 rounded-xl flex items-center justify-between gap-2"
            >
              <div>
                <p className="font-bold text-sm">{melody.name}</p>
                <span className="text-xs text-muted-foreground">
                  {melody.difficulty} • {melody.notes.filter((n) => n !== '-').length} nota
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => playMelody(melody)}
                  disabled={isPlaying || currentMelody !== null}
                  className="px-3 py-1.5 glass-card rounded-lg font-bold text-xs touch-manipulation disabled:opacity-50"
                >
                  🔊 Dinle
                </button>
                <button
                  onClick={() => startMelodyMode(melody)}
                  disabled={isPlaying || currentMelody !== null}
                  className="px-3 py-1.5 btn-gaming rounded-lg font-bold text-xs touch-manipulation disabled:opacity-50"
                >
                  🎮 Çal
                </button>
              </div>
            </div>
          ))}
        </div>

        {currentMelody && (
          <button
            onClick={() => {
              setCurrentMelody(null);
              currentMelodyRef.current = null;
              melodyIndexRef.current = 0;
              setMelodyIndex(0);
              comboRef.current = 0;
              setCombo(0);
              scoreRef.current = 0;
              setScore(0);
            }}
            className="w-full px-4 py-2 glass-card text-muted-foreground rounded-xl font-bold text-sm"
          >
            ❌ İptal
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default PianoGame;
