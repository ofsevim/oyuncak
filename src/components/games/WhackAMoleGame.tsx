'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getNextRandomIndex, getNextRandom } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFS: Record<Difficulty, { label: string; time: number; holes: number; cols: number }> = {
  easy: { label: '🌟 Kolay', time: 30, holes: 6, cols: 3 },
  medium: { label: '⭐ Orta', time: 30, holes: 9, cols: 3 },
  hard: { label: '🔥 Zor', time: 25, holes: 12, cols: 4 },
};

const MOLE_TYPES = [
  { emoji: '👾', points: 1, name: 'Alien', color: 'from-purple-500/30 to-cyan-500/30' },
  { emoji: '🤖', points: 2, name: 'Robot', color: 'from-blue-500/30 to-green-500/30' },
  { emoji: '👹', points: 5, name: 'Boss', color: 'from-red-500/30 to-orange-500/30' },
  { emoji: '💀', points: -3, name: 'Tuzak', color: 'from-gray-500/30 to-gray-700/30' },
];

const WhackAMoleGame = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeHoles, setActiveHoles] = useState<Map<number, typeof MOLE_TYPES[0]>>(new Map());
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hitEffect, setHitEffect] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [missEffect, setMissEffect] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoleRef = useRef<number | null>(null);

  const config = DIFFS[difficulty];

  useEffect(() => { setHighScore(getHighScore('whack-a-mole')); }, []);

  const spawnMole = useCallback(() => {
    if (gamePhase !== 'playing') return;
    if (moleRef.current) clearTimeout(moleRef.current);
    const hole = getNextRandomIndex(config.holes, lastHoleRef.current);
    lastHoleRef.current = hole;
    // Boss daha nadir, tuzak %15
    const rand = Math.random();
    let type: typeof MOLE_TYPES[0];
    if (rand < 0.15) type = MOLE_TYPES[3]; // tuzak
    else if (rand < 0.25) type = MOLE_TYPES[2]; // boss
    else if (rand < 0.5) type = MOLE_TYPES[1]; // robot
    else type = MOLE_TYPES[0]; // alien

    setActiveHoles(prev => { const m = new Map(prev); m.set(hole, type); return m; });
    const duration = Math.max(500, 1400 - (score * 20));
    moleRef.current = setTimeout(() => {
      setActiveHoles(prev => { const m = new Map(prev); m.delete(hole); return m; });
      const nextDelay = Math.random() * 300 + 150;
      moleRef.current = setTimeout(spawnMole, nextDelay);
    }, duration);
  }, [score, gamePhase, config.holes]);

  useEffect(() => {
    if (gamePhase === 'playing') {
      const t = setTimeout(spawnMole, 500);
      return () => { clearTimeout(t); if (moleRef.current) clearTimeout(moleRef.current); };
    } else {
      setActiveHoles(new Map());
      if (moleRef.current) clearTimeout(moleRef.current);
    }
  }, [gamePhase, spawnMole]);

  // Multi-mole spawn for hard mode
  useEffect(() => {
    if (gamePhase !== 'playing' || difficulty !== 'hard') return;
    const id = setInterval(() => {
      if (Math.random() < 0.3) {
        const hole = getNextRandomIndex(config.holes, lastHoleRef.current);
        const type = MOLE_TYPES[Math.floor(Math.random() * 3)];
        setActiveHoles(prev => { const m = new Map(prev); m.set(hole, type); return m; });
        setTimeout(() => setActiveHoles(prev => { const m = new Map(prev); m.delete(hole); return m; }), 800);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [gamePhase, difficulty, config.holes]);

  const startGame = useCallback(() => {
    setScore(0); setTimeLeft(config.time); setGamePhase('playing');
    setShowSuccess(false); setCombo(0); setIsNewRecord(false);
  }, [config.time]);

  useEffect(() => {
    if (gamePhase === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGamePhase('ended'); setShowSuccess(true);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'ended') return;
    const isNew = saveHighScoreObj('whack-a-mole', score);
    if (isNew) { setIsNewRecord(true); setHighScore(score); playNewRecordSound(); }
  }, [gamePhase, score]);

  const handleWhack = (index: number) => {
    const moleType = activeHoles.get(index);
    if (!moleType || gamePhase !== 'playing') return;

    if (moleType.points < 0) {
      playErrorSound(); setCombo(0);
      setScore(prev => Math.max(0, prev + moleType.points));
      setMissEffect(index); setTimeout(() => setMissEffect(null), 300);
    } else {
      const newCombo = combo + 1;
      const bonus = newCombo >= 3 ? Math.min(newCombo, 5) : 0;
      if (newCombo >= 3) playComboSound(newCombo); else playPopSound();
      setScore(prev => prev + moleType.points + bonus);
      setCombo(newCombo);
      setHitEffect(index); setTimeout(() => setHitEffect(null), 300);
    }
    setActiveHoles(prev => { const m = new Map(prev); m.delete(index); return m; });
    if (moleRef.current) clearTimeout(moleRef.current);
    moleRef.current = setTimeout(spawnMole, Math.random() * 150 + 80);
  };

  if (gamePhase === 'start') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-6 text-center pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative"><span className="text-7xl block animate-bounce">👾</span></div>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Alien Avı!</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-muted-foreground">Zorluk Seç:</p>
          {(Object.entries(DIFFS) as [Difficulty, typeof DIFFS['easy']][]).map(([key, val]) => (
            <button key={key} onClick={() => setDifficulty(key)}
              className={`px-5 py-3 rounded-xl font-bold transition-all ${difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`}>
              {val.label} ({val.holes} delik, {val.time}s)
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {MOLE_TYPES.map((m) => (
            <div key={m.name} className="glass-card border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="text-2xl">{m.emoji}</span>
              <span className={`text-sm font-bold ${m.points < 0 ? 'text-red-400' : 'text-primary'}`}>{m.points > 0 ? '+' : ''}{m.points}</span>
            </div>
          ))}
        </div>
        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <div className="glass-card border border-primary/20 px-4 py-2 rounded-xl"><span className="text-lg font-black text-primary">⚡ {score}</span></div>
        <div className="glass-card border border-white/10 px-4 py-2 rounded-xl">
          <span className={`text-lg font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
        </div>
        {combo >= 3 && (
          <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card border border-yellow-500/20 px-3 py-2 rounded-xl">
            <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(combo, 5)}</span>
          </motion.div>
        )}
      </div>

      <div className={`grid gap-2 md:gap-3 p-4 md:p-6 glass-card neon-border rounded-3xl`}
        style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
        {Array.from({ length: config.holes }).map((_, i) => {
          const moleType = activeHoles.get(i);
          return (
            <button key={i} onClick={() => handleWhack(i)}
              className="relative overflow-hidden rounded-2xl transition-all touch-manipulation active:scale-95"
              style={{ width: 'clamp(70px, 22vw, 110px)', height: 'clamp(70px, 22vw, 110px)', touchAction: 'manipulation' }}>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-muted/80 to-muted border border-white/5" />
              <div className={`absolute inset-1 rounded-xl border-2 transition-all duration-300 ${moleType ? 'border-primary/50 shadow-inner shadow-primary/20' : 'border-white/5'}`} />
              {hitEffect === i && <motion.div className="absolute inset-0 rounded-2xl bg-green-400/30" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
              {missEffect === i && <motion.div className="absolute inset-0 rounded-2xl bg-red-400/30" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
              <AnimatePresence>
                {moleType && (
                  <motion.div initial={{ y: 80, scale: 0.5 }} animate={{ y: 0, scale: 1 }} exit={{ y: 80, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="absolute inset-0 flex items-center justify-center z-10">
                    <div className={`absolute inset-2 rounded-xl bg-gradient-to-br ${moleType.color}`} />
                    <span className="text-3xl md:text-4xl relative z-10 select-none">{moleType.emoji}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <SuccessPopup isOpen={showSuccess} onClose={() => setGamePhase('start')}
        message={`${score} puan! ${isNewRecord ? '🏆 Yeni Rekor!' : 'Harikasın!'}`} />
    </motion.div>
  );
};

export default WhackAMoleGame;
