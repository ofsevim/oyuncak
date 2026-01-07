'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// Piyano notaları ve frekansları
const NOTES = [
  { note: 'C', freq: 261.63, color: 'white', label: 'Do' },
  { note: 'C#', freq: 277.18, color: 'black', label: '' },
  { note: 'D', freq: 293.66, color: 'white', label: 'Re' },
  { note: 'D#', freq: 311.13, color: 'black', label: '' },
  { note: 'E', freq: 329.63, color: 'white', label: 'Mi' },
  { note: 'F', freq: 349.23, color: 'white', label: 'Fa' },
  { note: 'F#', freq: 369.99, color: 'black', label: '' },
  { note: 'G', freq: 392.00, color: 'white', label: 'Sol' },
  { note: 'G#', freq: 415.30, color: 'black', label: '' },
  { note: 'A', freq: 440.00, color: 'white', label: 'La' },
  { note: 'A#', freq: 466.16, color: 'black', label: '' },
  { note: 'B', freq: 493.88, color: 'white', label: 'Si' },
  { note: 'C2', freq: 523.25, color: 'white', label: 'Do' },
];

// Basit melodiler
const MELODIES = [
  {
    name: '🎵 Küçük Kurbağa',
    notes: ['C', 'D', 'E', 'C', 'C', 'D', 'E', 'C', 'E', 'F', 'G', 'E', 'F', 'G'],
  },
  {
    name: '⭐ Twinkle Twinkle',
    notes: ['C', 'C', 'G', 'G', 'A', 'A', 'G', 'F', 'F', 'E', 'E', 'D', 'D', 'C'],
  },
  {
    name: '🎶 Mary Had a Lamb',
    notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', 'D', 'D', 'D', 'E', 'G', 'G'],
  },
];

const PianoGame = () => {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMelody, setCurrentMelody] = useState<typeof MELODIES[0] | null>(null);
  const [melodyIndex, setMelodyIndex] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playNote = useCallback((freq: number, note: string) => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);

    setActiveNotes(prev => new Set(prev).add(note));
    setTimeout(() => {
      setActiveNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }, 200);
  }, [getAudioContext]);

  const handleKeyClick = (noteData: typeof NOTES[0]) => {
    playNote(noteData.freq, noteData.note);

    // Melodi modunda mı?
    if (currentMelody && melodyIndex < currentMelody.notes.length) {
      if (noteData.note === currentMelody.notes[melodyIndex]) {
        setMelodyIndex(prev => prev + 1);
        if (melodyIndex + 1 === currentMelody.notes.length) {
          // Melodi tamamlandı!
          setTimeout(() => {
            setCurrentMelody(null);
            setMelodyIndex(0);
          }, 500);
        }
      }
    }
  };

  const playMelody = async (melody: typeof MELODIES[0]) => {
    if (isPlaying) return;
    setIsPlaying(true);

    for (let i = 0; i < melody.notes.length; i++) {
      const noteData = NOTES.find(n => n.note === melody.notes[i]);
      if (noteData) {
        playNote(noteData.freq, noteData.note);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }

    setIsPlaying(false);
  };

  const startMelodyMode = (melody: typeof MELODIES[0]) => {
    setCurrentMelody(melody);
    setMelodyIndex(0);
  };

  // Klavye desteği
  useEffect(() => {
    const keyMap: Record<string, string> = {
      'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
      'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
      'u': 'A#', 'j': 'B', 'k': 'C2',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        const noteData = NOTES.find(n => n.note === note);
        if (noteData) handleKeyClick(noteData);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMelody, melodyIndex]);

  const whiteKeys = NOTES.filter(n => n.color === 'white');
  const blackKeys = NOTES.filter(n => n.color === 'black');

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🎹 Piyano</h2>
      <p className="text-muted-foreground font-semibold text-center">
        Tuşlara tıkla veya klavyeden çal! (A-S-D-F-G-H-J-K)
      </p>

      {/* Melodi modunda göster */}
      {currentMelody && (
        <div className="bg-primary/10 px-6 py-3 rounded-2xl text-center">
          <p className="font-bold text-primary">
            {currentMelody.name} çalınıyor... ({melodyIndex}/{currentMelody.notes.length})
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Sıradaki nota: <span className="font-black text-primary">{currentMelody.notes[melodyIndex]}</span>
          </p>
        </div>
      )}

      {/* Piyano */}
      <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 p-4 rounded-3xl shadow-2xl">
        <div className="relative flex">
          {/* Beyaz tuşlar */}
          {whiteKeys.map((note, index) => (
            <button
              key={note.note}
              onClick={() => handleKeyClick(note)}
              className={`relative w-12 md:w-16 h-40 md:h-52 rounded-b-lg border-x border-b-4 transition-all duration-75 ${
                activeNotes.has(note.note)
                  ? 'bg-primary border-primary/50 translate-y-1'
                  : 'bg-white border-gray-300 hover:bg-gray-100'
              }`}
              style={{ marginRight: index < whiteKeys.length - 1 ? '-1px' : 0 }}
            >
              <span className={`absolute bottom-3 left-1/2 -translate-x-1/2 text-sm font-bold ${
                activeNotes.has(note.note) ? 'text-white' : 'text-gray-500'
              }`}>
                {note.label}
              </span>
            </button>
          ))}

          {/* Siyah tuşlar */}
          <div className="absolute top-0 left-0 right-0 flex pointer-events-none">
            {whiteKeys.map((whiteNote, index) => {
              const blackNote = blackKeys.find(b => b.note === whiteNote.note + '#');
              if (!blackNote || index === whiteKeys.length - 1) {
                return <div key={whiteNote.note + '-space'} className="w-12 md:w-16" />;
              }
              
              // C# ve D# için özel pozisyon, F# G# A# için de
              const skipBlack = whiteNote.note === 'E' || whiteNote.note === 'B';
              if (skipBlack) {
                return <div key={whiteNote.note + '-space'} className="w-12 md:w-16" />;
              }

              return (
                <div key={blackNote.note} className="w-12 md:w-16 relative">
                  <button
                    onClick={() => handleKeyClick(blackNote)}
                    className={`pointer-events-auto absolute right-0 translate-x-1/2 w-8 md:w-10 h-24 md:h-32 rounded-b-lg z-10 transition-all duration-75 ${
                      activeNotes.has(blackNote.note)
                        ? 'bg-primary translate-y-1'
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Melodiler */}
      <div className="space-y-3 w-full max-w-md">
        <p className="text-center font-bold text-foreground">🎵 Melodiler</p>
        <div className="grid grid-cols-1 gap-2">
          {MELODIES.map((melody) => (
            <div key={melody.name} className="flex gap-2">
              <button
                onClick={() => playMelody(melody)}
                disabled={isPlaying}
                className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
              >
                {melody.name} Dinle
              </button>
              <button
                onClick={() => startMelodyMode(melody)}
                disabled={isPlaying || currentMelody !== null}
                className="px-4 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
              >
                Çal
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PianoGame;

