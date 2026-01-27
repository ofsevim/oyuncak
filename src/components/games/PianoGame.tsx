'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSuccessSound } from '@/utils/soundEffects';

// Renkli piyano notaları
const NOTES = [
  { note: 'C', freq: 261.63, color: '#EF4444', label: 'Do', keyColor: 'bg-red-400' },
  { note: 'D', freq: 293.66, color: '#F97316', label: 'Re', keyColor: 'bg-orange-400' },
  { note: 'E', freq: 329.63, color: '#EAB308', label: 'Mi', keyColor: 'bg-yellow-400' },
  { note: 'F', freq: 349.23, color: '#22C55E', label: 'Fa', keyColor: 'bg-green-400' },
  { note: 'G', freq: 392.00, color: '#3B82F6', label: 'Sol', keyColor: 'bg-blue-400' },
  { note: 'A', freq: 440.00, color: '#8B5CF6', label: 'La', keyColor: 'bg-violet-400' },
  { note: 'B', freq: 493.88, color: '#EC4899', label: 'Si', keyColor: 'bg-pink-400' },
  { note: 'C2', freq: 523.25, color: '#EF4444', label: 'Do', keyColor: 'bg-red-500' },
];

// Melodiler (- = es/susma) - Her biri 20-35 nota
const MELODIES = [
  {
    name: '🐸 Küçük Kurbağa',
    notes: ['C', 'D', 'E', 'C', '-', 'C', 'D', 'E', 'C', '-', 'E', 'F', 'G', '-', 'E', 'F', 'G', '-',
      'G', 'A', 'G', 'F', 'E', 'C', '-', 'G', 'A', 'G', 'F', 'E', 'C', '-', 'C', 'G', 'C'],
    difficulty: 'Kolay',
  },
  {
    name: '⭐ Twinkle Twinkle',
    notes: ['C', 'C', 'G', 'G', 'A', 'A', 'G', '-', 'F', 'F', 'E', 'E', 'D', 'D', 'C', '-',
      'G', 'G', 'F', 'F', 'E', 'E', 'D', '-', 'G', 'G', 'F', 'F', 'E', 'E', 'D', '-',
      'C', 'C', 'G', 'G', 'A', 'A', 'G', '-', 'F', 'F', 'E', 'E', 'D', 'D', 'C'],
    difficulty: 'Orta',
  },
  {
    name: '🎶 Mary Had a Lamb',
    notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', '-', 'D', 'D', 'D', '-', 'E', 'G', 'G', '-',
      'E', 'D', 'C', 'D', 'E', 'E', 'E', '-', 'E', 'D', 'D', 'E', 'D', 'C'],
    difficulty: 'Kolay',
  },
  {
    name: '🎵 Do Re Mi Fa Sol',
    notes: ['C', 'D', 'E', 'F', 'G', '-', 'G', '-', 'C', 'D', 'E', 'F', 'G', '-', 'G', '-',
      'G', 'F', 'E', 'D', 'C', '-', 'C', '-', 'G', 'F', 'E', 'D', 'C', '-', 'C'],
    difficulty: 'Çok Kolay',
  },
  {
    name: '🔔 Okul Zili',
    notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', '-', 'D', 'D', 'E', 'D', 'C', '-',
      'E', 'D', 'C', 'D', 'E', 'E', 'E', '-', 'E', 'D', 'D', 'E', 'D', 'C', '-', 'C'],
    difficulty: 'Kolay',
  },
  {
    name: '🎂 Happy Birthday',
    notes: ['C', 'C', 'D', 'C', '-', 'F', 'E', '-', '-', 'C', 'C', 'D', 'C', '-', 'G', 'F', '-', '-',
      'C', 'C', 'C2', 'A', '-', 'F', 'E', 'D', '-', '-', 'B', 'B', 'A', 'F', '-', 'G', 'F'],
    difficulty: 'Orta',
  },
  {
    name: '🎄 Jingle Bells',
    notes: ['E', 'E', 'E', '-', 'E', 'E', 'E', '-', 'E', 'G', 'C', 'D', 'E', '-', '-',
      'F', 'F', 'F', 'F', 'F', 'E', 'E', 'E', 'E', 'D', 'D', 'E', 'D', '-', 'G', '-',
      'E', 'E', 'E', '-', 'E', 'E', 'E', '-', 'E', 'G', 'C', 'D', 'E'],
    difficulty: 'Orta',
  },
  {
    name: '💃 Can Can',
    notes: ['C', 'D', 'E', 'F', 'G', '-', 'G', '-', 'G', '-', 'G', '-', 'A', 'G', 'F', 'E', 'D', 'C', '-',
      'C', 'D', 'E', 'F', 'G', '-', 'G', '-', 'A', 'B', 'C2', '-', 'G', 'E', 'C'],
    difficulty: 'Zor',
  },
];

const PianoGame = () => {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMelody, setCurrentMelody] = useState<typeof MELODIES[0] | null>(null);
  const [melodyIndex, setMelodyIndex] = useState(0);
  const [correctNotes, setCorrectNotes] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
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

    // Daha güzel piyano sesi
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1);

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
      // Es'leri atla
      let checkIndex = melodyIndex;
      while (checkIndex < currentMelody.notes.length && currentMelody.notes[checkIndex] === '-') {
        checkIndex++;
      }

      if (checkIndex < currentMelody.notes.length && noteData.note === currentMelody.notes[checkIndex]) {
        const newIndex = checkIndex + 1;
        setMelodyIndex(newIndex);
        setCorrectNotes(prev => prev + 1);

        // Kalan es'leri de atla ve tamamlanıp tamamlanmadığını kontrol et
        let finalIndex = newIndex;
        while (finalIndex < currentMelody.notes.length && currentMelody.notes[finalIndex] === '-') {
          finalIndex++;
        }
        setMelodyIndex(finalIndex);

        if (finalIndex >= currentMelody.notes.length) {
          // Melodi tamamlandı!
          playSuccessSound();
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setCurrentMelody(null);
            setMelodyIndex(0);
            setCorrectNotes(0);
          }, 2000);
        }
      }
    }
  };

  const playMelody = async (melody: typeof MELODIES[0]) => {
    if (isPlaying) return;
    setIsPlaying(true);

    for (let i = 0; i < melody.notes.length; i++) {
      const note = melody.notes[i];

      if (note === '-') {
        // Es (susma) - sadece bekle
        await new Promise(resolve => setTimeout(resolve, 350));
      } else {
        const noteData = NOTES.find(n => n.note === note);
        if (noteData) {
          playNote(noteData.freq, noteData.note);
          await new Promise(resolve => setTimeout(resolve, 450));
        }
      }
    }

    setIsPlaying(false);
  };

  const startMelodyMode = (melody: typeof MELODIES[0]) => {
    setCurrentMelody(melody);
    setMelodyIndex(0);
    setCorrectNotes(0);
  };

  // Klavye desteği
  useEffect(() => {
    const keyMap: Record<string, string> = {
      'a': 'C', 's': 'D', 'd': 'E', 'f': 'F',
      'g': 'G', 'h': 'A', 'j': 'B', 'k': 'C2',
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

  // Sıradaki notanın verisi
  const nextNoteData = currentMelody
    ? NOTES.find(n => n.note === currentMelody.notes[melodyIndex])
    : null;

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🎹 Renkli Piyano</h2>
      <p className="text-muted-foreground font-semibold text-center">
        Tuşlara tıkla veya klavyeden çal! (A-S-D-F-G-H-J-K)
      </p>

      {/* Başarı mesajı */}
      {showSuccess && (
        <motion.div
          className="bg-success text-white px-8 py-4 rounded-2xl font-black text-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          🎉 Harika! Melodiyi tamamladın!
        </motion.div>
      )}

      {/* Melodi modunda göster */}
      {currentMelody && !showSuccess && (
        <div className="bg-card p-4 rounded-2xl text-center shadow-playful w-full max-w-md">
          <p className="font-bold text-foreground text-lg">
            {currentMelody.name}
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <span className="bg-primary/10 px-3 py-1 rounded-full text-sm font-bold text-primary">
              {melodyIndex}/{currentMelody.notes.length}
            </span>
          </div>
          {nextNoteData && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-muted-foreground font-medium">Sıradaki:</span>
              <motion.div
                key={melodyIndex}
                className="px-6 py-3 rounded-xl text-white font-black text-2xl shadow-lg"
                style={{ backgroundColor: nextNoteData.color }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {nextNoteData.label}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Renkli Piyano Container */}
      <div className="w-full max-w-2xl px-2">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 md:p-6 rounded-3xl shadow-2xl">
          <div className="flex gap-1 md:gap-2 h-[180px] md:h-[220px]">
            {NOTES.map((note) => (
              <motion.button
                key={note.note}
                onClick={() => handleKeyClick(note)}
                className={`relative flex-1 rounded-b-xl md:rounded-b-2xl transition-all duration-75 shadow-lg ${activeNotes.has(note.note)
                  ? 'translate-y-1 brightness-125'
                  : 'active:brightness-110'
                  } ${note.keyColor}`}
                whileTap={{ scale: 0.95 }}
              >
                {/* Işık efekti */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-3 md:h-4 bg-white/30 rounded-full blur-sm" />

                {/* Nota ismi */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <span className="text-white font-black text-[10px] sm:text-xs md:text-lg drop-shadow-lg whitespace-nowrap">
                    {note.label}
                  </span>
                </div>

                {/* Aktif göstergesi */}
                {activeNotes.has(note.note) && (
                  <motion.div
                    className="absolute inset-0 bg-white/30 rounded-b-xl md:rounded-b-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Melodiler */}
      <div className="space-y-4 w-full max-w-lg">
        <p className="text-center font-bold text-foreground text-lg">🎵 Melodileri Öğren</p>
        <div className="grid grid-cols-1 gap-3">
          {MELODIES.map((melody) => (
            <div key={melody.name} className="bg-card p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-foreground">{melody.name}</p>
                <span className="text-xs text-muted-foreground">{melody.difficulty} • {melody.notes.length} nota</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => playMelody(melody)}
                  disabled={isPlaying || currentMelody !== null}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 text-sm"
                >
                  🔊 Dinle
                </button>
                <button
                  onClick={() => startMelodyMode(melody)}
                  disabled={isPlaying || currentMelody !== null}
                  className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 text-sm"
                >
                  🎮 Çal
                </button>
              </div>
            </div>
          ))}
        </div>

        {currentMelody && (
          <button
            onClick={() => { setCurrentMelody(null); setMelodyIndex(0); }}
            className="w-full px-4 py-3 bg-muted text-muted-foreground rounded-xl font-bold"
          >
            ❌ İptal
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default PianoGame;
