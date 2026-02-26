'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import { getNextRandomIndex, getNextRandom } from '@/utils/shuffle';

const GAME_TIME = 30;
const HOLES_COUNT = 9;
const MOLE_TYPES = [
  { emoji: '👾', points: 1, name: 'Alien', color: 'from-purple-500/30 to-cyan-500/30' },
  { emoji: '🤖', points: 2, name: 'Robot', color: 'from-blue-500/30 to-green-500/30' },
  { emoji: '👹', points: 5, name: 'Boss', color: 'from-red-500/30 to-orange-500/30' },
];

const WhackAMoleGame = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [moleType, setMoleType] = useState(MOLE_TYPES[0]);
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hitEffect, setHitEffect] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoleRef = useRef<number | null>(null);
  const lastMoleTypeRef = useRef<typeof MOLE_TYPES[0] | null>(null);

  const spawnMole = useCallback(() => {
    if (gamePhase !== 'playing') return;
    if (moleRef.current) clearTimeout(moleRef.current);

    const randomHole = getNextRandomIndex(HOLES_COUNT, lastHoleRef.current);
    const randomType = getNextRandom(MOLE_TYPES, lastMoleTypeRef.current);

    lastHoleRef.current = randomHole;
    lastMoleTypeRef.current = randomType;

    setActiveHole(randomHole);
    setMoleType(randomType);

    const duration = Math.max(600, 1500 - (score * 25));

    moleRef.current = setTimeout(() => {
      setActiveHole(null);
      const nextDelay = Math.random() * 400 + 200;
      moleRef.current = setTimeout(spawnMole, nextDelay);
    }, duration);
  }, [score, gamePhase]);

  useEffect(() => {
    if (gamePhase === 'playing') {
      const initialTimeout = setTimeout(spawnMole, 500);
      return () => {
        clearTimeout(initialTimeout);
        if (moleRef.current) clearTimeout(moleRef.current);
      };
    } else {
      setActiveHole(null);
      if (moleRef.current) clearTimeout(moleRef.current);
    }
  }, [gamePhase, spawnMole]);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(GAME_TIME);
    setGamePhase('playing');
    setShowSuccess(false);
  }, []);

  useEffect(() => {
    if (gamePhase === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGamePhase('ended');
            setShowSuccess(true);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gamePhase]);

  const handleWhack = (index: number) => {
    if (index === activeHole && gamePhase === 'playing') {
      playPopSound();
      setScore(prev => prev + moleType.points);
      setHitEffect(index);
      setTimeout(() => setHitEffect(null), 300);
      setActiveHole(null);
      if (moleRef.current) clearTimeout(moleRef.current);
      const nextDelay = Math.random() * 200 + 100;
      moleRef.current = setTimeout(spawnMole, nextDelay);
    }
  };

  // Start screen
  if (gamePhase === 'start') {
    return (
      <motion.div
        className="flex flex-col items-center gap-8 p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          <span className="text-8xl block animate-bounce">👾</span>
          <div className="absolute inset-0 blur-3xl bg-purple-500/20 rounded-full" />
        </div>
        <h2 className="text-4xl font-black text-gradient">Alien Avı!</h2>
        <p className="text-lg text-muted-foreground max-w-sm">
          Portallardan çıkan uzaylılara tıkla ve puan topla!
        </p>

        {/* Point info */}
        <div className="flex gap-3">
          {MOLE_TYPES.map((m) => (
            <div key={m.name} className="glass-card border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-sm font-bold text-primary">+{m.points}</span>
            </div>
          ))}
        </div>

        <button
          onClick={startGame}
          className="btn-gaming px-12 py-5 text-xl"
        >
          🚀 BAŞLA!
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-6 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Score bar */}
      <div className="flex gap-3 items-center">
        <div className="glass-card border border-primary/20 px-5 py-2 rounded-xl">
          <span className="text-xl font-black text-primary">⚡ {score}</span>
        </div>
        <div className="glass-card border border-white/10 px-5 py-2 rounded-xl">
          <span className={`text-xl font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
            ⏱️ {timeLeft}s
          </span>
        </div>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 p-6 glass-card neon-border rounded-3xl relative">
        {Array.from({ length: HOLES_COUNT }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleWhack(i)}
            className="relative overflow-hidden rounded-2xl transition-all"
            style={{
              width: 'clamp(80px, 25vw, 120px)',
              height: 'clamp(80px, 25vw, 120px)',
            }}
          >
            {/* Portal base */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-muted/80 to-muted border border-white/5" />

            {/* Portal glow ring */}
            <div className={`absolute inset-1 rounded-xl border-2 transition-all duration-300 ${
              activeHole === i
                ? 'border-primary/50 shadow-inner shadow-primary/20'
                : 'border-white/5'
            }`} />

            {/* Hit effect */}
            {hitEffect === i && (
              <motion.div
                className="absolute inset-0 rounded-2xl bg-primary/30"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}

            {/* Mole/Alien */}
            <AnimatePresence>
              {activeHole === i && (
                <motion.div
                  initial={{ y: 80, scale: 0.5 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 80, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="absolute inset-0 flex items-center justify-center z-10"
                >
                  <div className={`absolute inset-2 rounded-xl bg-gradient-to-br ${moleType.color}`} />
                  <span className="text-4xl md:text-5xl relative z-10 select-none">{moleType.emoji}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      <SuccessPopup
        isOpen={showSuccess}
        onClose={() => setGamePhase('start')}
        message={`${score} puan topladın! Harikasın!`}
      />
    </motion.div>
  );
};

export default WhackAMoleGame;
