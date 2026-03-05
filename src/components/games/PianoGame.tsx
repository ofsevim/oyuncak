'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playComboSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

const WHITE_NOTES = [
  { note: 'C', freq: 261.63, label: 'Do', key: 'a' },
  { note: 'D', freq: 293.66, label: 'Re', key: 's' },
  { note: 'E', freq: 329.63, label: 'Mi', key: 'd' },
  { note: 'F', freq: 349.23, label: 'Fa', key: 'f' },
  { note: 'G', freq: 392.00, label: 'Sol', key: 'g' },
  { note: 'A', freq: 440.00, label: 'La', key: 'h' },
  { note: 'B', freq: 493.88, label: 'Si', key: 'j' },
  { note: 'C2', freq: 523.25, label: 'Do²', key: 'k' },
];

const BLACK_NOTES = [
  { note: 'C#', freq: 277.18, label: 'Do#', position: 0, key: 'w' },
  { note: 'D#', freq: 311.13, label: 'Re#', position: 1, key: 'e' },
  { note: 'F#', freq: 369.99, label: 'Fa#', position: 3, key: 't' },
  { note: 'G#', freq: 415.30, label: 'Sol#', position: 4, key: 'y' },
  { note: 'A#', freq: 466.16, label: 'La#', position: 5, key: 'u' },
];

const ALL_NOTES = [...WHITE_NOTES, ...BLACK_NOTES];

const MELODIES = [
  /*
   * Notalar doğrudan C4 oktavına göre yazılmıştır.
   * '-' = bekleme (nota yokken boşluk)
   * C2 = üst Do (C5 = 523 Hz)
   */

  // ── ÇOK KOLAY ──────────────────────────────────────────────
  {
    name: '🎵 Do Re Mi',
    difficulty: 'Çok Kolay',
    notes: ['C', 'D', 'E', 'C', '-', 'C', 'D', 'E', 'C', '-', 'E', 'F', 'G', '-', 'E', 'F', 'G'],
  },
  {
    name: '🐥 Baby Shark',
    difficulty: 'Çok Kolay',
    // D D D D D E  D D D D D E  D D D D D E D
    notes: ['D', 'D', 'D', 'D', 'D', 'E', '-', 'D', 'D', 'D', 'D', 'D', 'E', '-', 'D', 'D', 'D', 'D', 'D', 'E', 'D'],
  },
  {
    name: '🌙 Ay Işığı',
    difficulty: 'Çok Kolay',
    // E E E - C E - G (Beethoven Ay Işığı Sonat - basit versiyon)
    notes: ['E', 'E', 'E', '-', 'C', 'E', '-', 'G', '-', '-', 'G'],
  },

  // ── KOLAY ──────────────────────────────────────────────────
  {
    name: '⭐ Twinkle Twinkle',
    difficulty: 'Kolay',
    // C C G G A A G — F F E E D D C — G G F F E E D — G G F F E E D — C C G G A A G — F F E E D D C
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
    // E D C D  E E E  D D D  E G G  E D C D  E E E  E D D E D C
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
    // C D E C  C D E C  E F G  E F G  G A G F E C  C G C
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
    // G A G F E F G  D E F  E F G  G A G F E F G D G E C
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
    // C C D C F E  C C D C G F  C C C2 A F E D  B B A F G F
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
    // E E E  E E E  E G C D E  F F F F F E E  E D D E D G
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
    // Beethoven - Ode to Joy (9. Senfoni, 4. Bölüm)
    // E E F G  G F E D  C C D E  E D D
    // E E F G  G F E D  C C D E  D C C
    notes: [
      'E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D', '-',
      'E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'D', 'C', 'C',
    ],
  },
  {
    name: '🎺 Ölümsüz Oyun',
    difficulty: 'Orta',
    // Tetris Theme (Korobeiniki) — A versiyon
    // E B C D  C B A A  C E A B  A G G B  C D E C  B A A C  E D C B  A A
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

  // ── ZOR ─────────────────────────────────────────────────────
  {
    name: '💃 Can Can',
    difficulty: 'Zor',
    // Offenbach - Can Can (Galop İnfernal)
    // C D E F G G  A G F E D C  E F G A B C2  G E C
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
    // Beethoven - Für Elise (açılış teması)
    // E D# E D# E B D C A
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
  // ── Beyaz tuşlar: Gürlü, dolu renkler ──
  C: '#F72C3A',   // Kırmızı
  D: '#FF7600',   // Turuncu
  E: '#F5C800',   // Altın Sarı
  F: '#00C04B',   // Canlı Yeşil
  G: '#009BDE',   // Gökyaşı Mavisi
  A: '#8B2BE2',   // Köyü Mor
  B: '#E8006A',   // Fuşya Pembe
  C2: '#F72C3A',   // Kırmızı (üst oktav)

  // ── Siyah tuşlar: koyu-doygun ──
  'C#': '#B5001D',
  'D#': '#C45500',
  'F#': '#007A30',
  'G#': '#006BA0',
  'A#': '#5C0BA5',
};

const PianoGame = () => {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMelody, setCurrentMelody] = useState<typeof MELODIES[0] | null>(null);
  const [melodyIndex, setMelodyIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { setHighScore(getHighScore('piano')); }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playNote = useCallback((freq: number, note: string) => {
    const ctx = getAudioContext();
    // Better piano-like sound with harmonics
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

    setActiveNotes(prev => new Set(prev).add(note));
    setTimeout(() => setActiveNotes(prev => { const s = new Set(prev); s.delete(note); return s; }), 200);
  }, [getAudioContext]);


  const handleKeyClickRef = useRef<(noteStr: string) => void>(() => { });

  const handleKeyClick = (noteStr: string) => {
    const noteData = ALL_NOTES.find(n => n.note === noteStr);
    if (!noteData) return;
    playNote(noteData.freq, noteData.note);

    if (isRecording) setRecordedNotes(prev => [...prev, noteStr]);

    if (currentMelody && melodyIndex < currentMelody.notes.length) {
      let checkIndex = melodyIndex;
      while (checkIndex < currentMelody.notes.length && currentMelody.notes[checkIndex] === '-') checkIndex++;
      if (checkIndex < currentMelody.notes.length && noteStr === currentMelody.notes[checkIndex]) {
        const newCombo = combo + 1;
        const points = 10 + Math.min(newCombo, 5) * 5;
        setCombo(newCombo);
        setScore(prev => prev + points);
        if (newCombo > 2) playComboSound(newCombo);
        let finalIndex = checkIndex + 1;
        while (finalIndex < currentMelody.notes.length && currentMelody.notes[finalIndex] === '-') finalIndex++;
        setMelodyIndex(finalIndex);
        if (finalIndex >= currentMelody.notes.length) {
          playSuccessSound();
          setShowSuccess(true);
          const isNew = saveHighScoreObj('piano', score + points);
          if (isNew) setHighScore(score + points);
          setTimeout(() => { setShowSuccess(false); setCurrentMelody(null); setMelodyIndex(0); setCombo(0); }, 2000);
        }
      } else {
        setCombo(0);
      }
    }
  };

  handleKeyClickRef.current = handleKeyClick;

  const playMelody = async (melody: typeof MELODIES[0]) => {
    if (isPlaying) return;
    setIsPlaying(true);
    for (const note of melody.notes) {
      if (note === '-') { await new Promise(r => setTimeout(r, 350)); }
      else {
        const nd = ALL_NOTES.find(n => n.note === note);
        if (nd) { playNote(nd.freq, nd.note); await new Promise(r => setTimeout(r, 450)); }
      }
    }
    setIsPlaying(false);
  };

  const startMelodyMode = (melody: typeof MELODIES[0]) => {
    setCurrentMelody(melody); setMelodyIndex(0); setScore(0); setCombo(0);
  };

  const playRecording = async () => {
    if (isPlaying || recordedNotes.length === 0) return;
    setIsPlaying(true);
    for (const note of recordedNotes) {
      const nd = ALL_NOTES.find(n => n.note === note);
      if (nd) { playNote(nd.freq, nd.note); await new Promise(r => setTimeout(r, 400)); }
    }
    setIsPlaying(false);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const note = ALL_NOTES.find(n => n.key === e.key.toLowerCase());
      if (note) handleKeyClickRef.current(note.note);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextNoteData = currentMelody ? ALL_NOTES.find(n => n.note === currentMelody.notes[melodyIndex]) : null;

  return (
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-32 w-full max-w-3xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3">
        {/* SVG Piyano ikonu */}
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="38" height="38" rx="8" fill="#1e1b4b" />
          {/* Beyaz tuşlar */}
          {(['#F72C3A', '#FF7600', '#F5C800', '#00C04B', '#009BDE', '#8B2BE2', '#E8006A'].map((c, i) => (
            <rect key={i} x={2 + i * 5} y="8" width="4" height="22" rx="1" fill={c} />
          )))}
          {/* Siyah tuşlar */}
          {([0, 1, 3, 4, 5].map((pos, i) => (
            <rect key={i} x={4 + pos * 5} y="8" width="3" height="13" rx="0.8"
              fill={['#B5001D', '#C45500', '#007A30', '#006BA0', '#5C0BA5'][i]} />
          )))}
        </svg>
        <h2 className="text-3xl font-black text-gradient">Renkli Piyano</h2>
      </div>
      <p className="text-sm text-muted-foreground font-medium text-center">Tuşlara tıkla veya klavyeden çal (A-K beyaz, W-E-T-Y-U siyah)</p>

      {/* Score bar */}
      {(currentMelody || highScore > 0) && (
        <div className="flex gap-2 items-center">
          {currentMelody && <div className="glass-card px-3 py-1"><span className="text-sm font-black text-primary">🎵 {score}</span></div>}
          {combo > 1 && <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1 border border-yellow-500/30"><span className="text-sm font-black text-yellow-400">🔥 x{combo}</span></motion.div>}
          {highScore > 0 && <div className="glass-card px-3 py-1"><span className="text-sm font-bold text-muted-foreground">🏆 {highScore}</span></div>}
        </div>
      )}

      {showSuccess && (
        <motion.div className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-lg" initial={{ scale: 0 }} animate={{ scale: 1 }}>
          🎉 Harika! Melodiyi tamamladın!
        </motion.div>
      )}

      {/* Melody mode indicator */}
      {currentMelody && !showSuccess && (
        <div className="glass-card p-3 rounded-xl text-center w-full max-w-md neon-border">
          <p className="font-bold text-sm">{currentMelody.name}</p>
          <div className="flex justify-center gap-2 mt-1">
            <span className="bg-primary/20 px-2 py-0.5 rounded-full text-xs font-bold text-primary">{melodyIndex}/{currentMelody.notes.filter(n => n !== '-').length}</span>
          </div>
          {nextNoteData && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Sıradaki:</span>
              <motion.div key={melodyIndex} className="px-4 py-2 rounded-lg text-white font-black text-lg shadow-lg"
                style={{ backgroundColor: COLORS[nextNoteData.note] || '#666' }}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                {nextNoteData.label}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Piano — PC'de tam genişlik */}
      <div className="w-full">
        <div className="glass-card p-2 md:p-5 rounded-2xl neon-border">
          <div className="relative" style={{ height: 'clamp(180px, 25vw, 280px)', touchAction: 'none' }}>
            {/* White keys */}
            <div className="flex gap-0.5 md:gap-1 h-full">
              {WHITE_NOTES.map(note => (
                <motion.button key={note.note}
                  onClick={() => handleKeyClick(note.note)}
                  onPointerDown={(e) => { e.preventDefault(); handleKeyClick(note.note); }}
                  className={`relative rounded-b-xl transition-all touch-manipulation select-none flex-1 ${activeNotes.has(note.note) ? 'brightness-110 scale-[0.98]' : ''}`}
                  style={{
                    minWidth: '0',
                    touchAction: 'none',
                    background: activeNotes.has(note.note)
                      ? `linear-gradient(180deg, ${COLORS[note.note]} 0%, ${COLORS[note.note]}cc 100%)`
                      : `linear-gradient(180deg, ${COLORS[note.note]}ee 0%, ${COLORS[note.note]} 100%)`,
                    boxShadow: activeNotes.has(note.note)
                      ? `0 0 32px ${COLORS[note.note]}cc, inset 0 -4px 12px rgba(0,0,0,0.25)`
                      : `0 4px 10px rgba(0,0,0,0.35), inset 0 -3px 10px rgba(0,0,0,0.2)`,
                    border: `3px solid ${COLORS[note.note]}`,
                  }}
                  whileTap={{ scale: 0.97 }}>
                  <div className="absolute bottom-2 md:bottom-3 left-0 right-0 flex flex-col items-center pointer-events-none">
                    <span className={`font-black text-xs md:text-sm drop-shadow-lg text-white`}>{note.label}</span>
                    <span className={`text-[7px] hidden sm:block text-white/70`}>{note.key.toUpperCase()}</span>
                  </div>
                </motion.button>
              ))}
            </div>
            {/* Black keys */}
            <div className="absolute top-0 left-0 right-0 h-[58%] pointer-events-none">
              {BLACK_NOTES.map(note => {
                const whiteKeyCount = WHITE_NOTES.length;
                const whiteKeyWidthPercent = 100 / whiteKeyCount;
                const leftPos = (note.position + 1) * whiteKeyWidthPercent - whiteKeyWidthPercent * 0.32;
                return (
                  <motion.button key={note.note}
                    onClick={() => handleKeyClick(note.note)}
                    onPointerDown={(e) => { e.preventDefault(); handleKeyClick(note.note); }}
                    className="absolute pointer-events-auto rounded-b-lg touch-manipulation select-none z-10"
                    style={{
                      left: `${leftPos}%`,
                      width: `${whiteKeyWidthPercent * 0.64}%`,
                      height: '100%',
                      touchAction: 'none',
                      background: activeNotes.has(note.note)
                        ? `linear-gradient(180deg, ${COLORS[note.note]} 0%, ${COLORS[note.note]}bb 100%)`
                        : `linear-gradient(180deg, ${COLORS[note.note]}dd 0%, ${COLORS[note.note]} 100%)`,
                      boxShadow: activeNotes.has(note.note)
                        ? `0 0 22px ${COLORS[note.note]}cc, inset 0 -3px 10px rgba(0,0,0,0.3)`
                        : `0 4px 10px rgba(0,0,0,0.55), inset 0 -2px 8px rgba(0,0,0,0.3)`,
                      border: `2px md:border-3 solid ${COLORS[note.note]}`,
                    }}
                    whileTap={{ scale: 0.95 }}>
                    <span className="absolute bottom-1 md:bottom-2 left-0 right-0 text-center text-[8px] md:text-[9px] font-bold text-white drop-shadow-lg pointer-events-none">{note.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recording controls */}
      <div className="flex gap-2 items-center">
        <button onClick={() => { setIsRecording(!isRecording); if (!isRecording) setRecordedNotes([]); }}
          className={`px-4 py-2 rounded-xl font-bold text-sm touch-manipulation ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'glass-card text-muted-foreground'}`}>
          {isRecording ? '⏹️ Kaydı Durdur' : '⏺️ Kaydet'}
        </button>
        {recordedNotes.length > 0 && !isRecording && (
          <button onClick={playRecording} disabled={isPlaying}
            className="px-4 py-2 glass-card rounded-xl font-bold text-sm text-primary touch-manipulation disabled:opacity-50">
            ▶️ Kaydı Çal ({recordedNotes.length} nota)
          </button>
        )}
      </div>

      {/* Melodies */}
      <div className="space-y-3 w-full">
        <p className="text-center font-bold text-sm">🎵 Melodileri Öğren</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {MELODIES.map(melody => (
            <div key={melody.name} className="glass-card p-3 rounded-xl flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm">{melody.name}</p>
                <span className="text-xs text-muted-foreground">{melody.difficulty} • {melody.notes.filter(n => n !== '-').length} nota</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => playMelody(melody)} disabled={isPlaying || currentMelody !== null}
                  className="px-3 py-1.5 glass-card rounded-lg font-bold text-xs touch-manipulation disabled:opacity-50">🔊 Dinle</button>
                <button onClick={() => startMelodyMode(melody)} disabled={isPlaying || currentMelody !== null}
                  className="px-3 py-1.5 btn-gaming rounded-lg font-bold text-xs touch-manipulation disabled:opacity-50">🎮 Çal</button>
              </div>
            </div>
          ))}
        </div>
        {currentMelody && (
          <button onClick={() => { setCurrentMelody(null); setMelodyIndex(0); }}
            className="w-full px-4 py-2 glass-card text-muted-foreground rounded-xl font-bold text-sm">❌ İptal</button>
        )}
      </div>
    </motion.div>
  );
};

export default PianoGame;
