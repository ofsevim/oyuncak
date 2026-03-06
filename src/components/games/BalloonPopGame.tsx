'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

const BALLOON_COLORS = [
  { name: 'Kırmızı', value: '#ef4444', glow: '#ef444480' },
  { name: 'Mavi', value: '#3b82f6', glow: '#3b82f680' },
  { name: 'Yeşil', value: '#22c55e', glow: '#22c55e80' },
  { name: 'Sarı', value: '#eab308', glow: '#eab30880' },
  { name: 'Turuncu', value: '#f97316', glow: '#f9731680' },
  { name: 'Mor', value: '#a855f7', glow: '#a855f780' },
  { name: 'Cyan', value: '#06b6d4', glow: '#06b6d480' },
];

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTIES: Record<Difficulty, { label: string; time: number; maxBalloons: number; spawnRate: number; speed: [number, number] }> = {
  easy: { label: '🌟 Kolay', time: 45, maxBalloons: 20, spawnRate: 1800, speed: [8, 11] },
  medium: { label: '⭐ Orta', time: 60, maxBalloons: 30, spawnRate: 1200, speed: [6, 9] },
  hard: { label: '🔥 Zor', time: 45, maxBalloons: 40, spawnRate: 800, speed: [4, 7] },
};

interface Balloon {
  id: string;
  color: typeof BALLOON_COLORS[0];
  x: number;
  duration: number;
  delay: number;
  swayAmount: number;
  swayDuration: number;
  size: number;
  special?: 'freeze' | 'double' | 'bomb';
}

type GamePhase = 'start' | 'playing' | 'ended';

const BalloonPopGame = () => {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [targetColor, setTargetColor] = useState(BALLOON_COLORS[0]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gamePhase, setGamePhase] = useState<GamePhase>('start');
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isDouble, setIsDouble] = useState(false);
  const [popEffects, setPopEffects] = useState<{ id: string; x: number; y: number; color: string; points: number }[]>([]);

  // Refs for stable logic & sync
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const balloonIdRef = useRef(0);
  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  const isFrozenRef = useRef(false);
  const isDoubleRef = useRef(false);
  const allTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const allIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);
  useEffect(() => { isFrozenRef.current = isFrozen; }, [isFrozen]);
  useEffect(() => { isDoubleRef.current = isDouble; }, [isDouble]);
  useEffect(() => { setHighScore(getHighScore('balloon-pop')); }, []);

  const config = useMemo(() => DIFFICULTIES[difficulty], [difficulty]);

  /* Central timer management */
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      allTimersRef.current.delete(id);
      if (gamePhaseRef.current !== 'playing') return;
      fn();
    }, ms);
    allTimersRef.current.add(id);
    return id;
  }, []);

  const safeInterval = useCallback((fn: () => void, ms: number) => {
    const id = setInterval(() => {
      if (gamePhaseRef.current !== 'playing') return;
      fn();
    }, ms);
    allIntervalsRef.current.add(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    allTimersRef.current.forEach(clearTimeout);
    allTimersRef.current.clear();
    allIntervalsRef.current.forEach(clearInterval);
    allIntervalsRef.current.clear();
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  /* Helper for ID generation safely */
  const sanitizeId = (str: string) => str.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();

  const createBalloon = useCallback((color: typeof BALLOON_COLORS[0], delay = 0): Balloon => {
    const spd = config.speed;
    const special = Math.random() < 0.06 ? (['freeze', 'double', 'bomb'] as const)[Math.floor(Math.random() * 3)] : undefined;
    const id = `b-${balloonIdRef.current++}`;
    return {
      id,
      color: special ? { name: 'Özel', value: special === 'freeze' ? '#67e8f9' : special === 'double' ? '#fbbf24' : '#1f2937', glow: '#ffffff40' } : color,
      x: Math.random() * 85 + 5,
      duration: spd[0] + Math.random() * (spd[1] - spd[0]),
      delay,
      swayAmount: 3 + Math.random() * 5,
      swayDuration: 3 + Math.random() * 2,
      size: 0.8 + Math.random() * 0.4,
      special,
    };
  }, [config.speed]);

  const generateBalloons = useCallback((color: typeof BALLOON_COLORS[0]) => {
    const newBalloons: Balloon[] = [];
    const count = 5;
    const targetCount = Math.floor(count * 0.4);
    for (let i = 0; i < targetCount; i++) newBalloons.push(createBalloon(color, Math.random() * 5));
    for (let i = targetCount; i < count; i++) {
      const rc = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
      newBalloons.push(createBalloon(rc, Math.random() * 3));
    }
    return newBalloons;
  }, [createBalloon]);

  const startGame = useCallback(() => {
    clearAllTimers();
    setPopEffects([]); // Ensure orphan pop effects are cleared
    scoreRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    setScore(0); setCombo(0); setBestCombo(0);
    setTimeLeft(config.time); setRound(1);
    setGamePhase('playing'); setIsNewRecord(false);
    setIsFrozen(false); setIsDouble(false);
    const nextColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    setTargetColor(nextColor);
    setBalloons(generateBalloons(nextColor));
  }, [generateBalloons, config.time, clearAllTimers]);

  const startNewRound = useCallback(() => {
    const remaining = BALLOON_COLORS.filter(c => c.value !== targetColor.value);
    const nextColor = remaining[Math.floor(Math.random() * remaining.length)];
    setTargetColor(nextColor);
    setBalloons(prev => {
      const kept = prev.slice(-8);
      const newOnes = Array.from({ length: 5 }, () => createBalloon(nextColor, Math.random() * 3));
      return [...kept, ...newOnes];
    });
    setRound(r => r + 1);
  }, [targetColor, createBalloon]);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const intervalId = safeInterval(() => {
      if (isFrozenRef.current) return;
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGamePhase('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [gamePhase, safeInterval]);

  // End game effects
  useEffect(() => {
    if (gamePhase !== 'ended') return;
    confetti({ particleCount: 150, spread: 100 });
    const finalScore = scoreRef.current;
    const isNew = saveHighScoreObj('balloon-pop', finalScore);
    if (isNew) { setIsNewRecord(true); setHighScore(finalScore); playNewRecordSound(); }
  }, [gamePhase]);

  // Spawn balloons
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const spawnId = safeInterval(() => {
      if (isFrozenRef.current) return;
      setBalloons(prev => {
        if (prev.length >= config.maxBalloons) return prev;
        const count = 1 + Math.floor(Math.random() * 2);
        const newOnes: Balloon[] = [];
        for (let i = 0; i < count; i++) {
          const isTarget = Math.random() < 0.4;
          const color = isTarget ? targetColor : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
          newOnes.push(createBalloon(color, Math.random() * 0.3));
        }
        return [...prev, ...newOnes];
      });
    }, config.spawnRate);
    return () => clearInterval(spawnId);
  }, [gamePhase, targetColor, createBalloon, config, safeInterval]);

  // Cleanup
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const cleanupId = safeInterval(() => {
      setBalloons(prev => prev.length > config.maxBalloons * 1.5 ? prev.slice(-config.maxBalloons) : prev);
    }, 5000);
    return () => clearInterval(cleanupId);
  }, [gamePhase, config.maxBalloons, safeInterval]);

  const handlePop = (balloon: Balloon, e: React.PointerEvent) => {
    if (gamePhaseRef.current !== 'playing') return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    const triggerEffect = (color: string, points: number) => {
      const effectId = balloon.id;
      setPopEffects(prev => [...prev, { id: effectId, x: relX, y: relY, color, points }]);
      // Pure timeout, regardless of phase logic so effect unmounts properly.
      setTimeout(() => setPopEffects(prev => prev.filter(p => p.id !== effectId)), 600);
    };

    // Special balloons
    if (balloon.special === 'freeze') {
      playSuccessSound(); setIsFrozen(true);
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      safeTimeout(() => setIsFrozen(false), 3000);
      triggerEffect('#67e8f9', 0);
      return;
    }
    if (balloon.special === 'double') {
      playSuccessSound(); setIsDouble(true);
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      safeTimeout(() => setIsDouble(false), 5000);
      triggerEffect('#fbbf24', 0);
      return;
    }
    if (balloon.special === 'bomb') {
      playErrorSound();
      comboRef.current = 0; setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      triggerEffect('#ef4444', -5);
      return;
    }

    if (balloon.color.value === targetColor.value) {
      comboRef.current += 1;
      const newCombo = comboRef.current;
      const multiplier = Math.min(newCombo, 5);
      const points = multiplier * (isDoubleRef.current ? 2 : 1);

      if (newCombo > 2) playComboSound(newCombo); else playPopSound();

      setCombo(newCombo);
      if (newCombo > bestComboRef.current) {
        bestComboRef.current = newCombo;
        setBestCombo(newCombo);
      }

      const prevScore = scoreRef.current;
      scoreRef.current += points;
      const currentScore = scoreRef.current;
      setScore(currentScore);

      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      triggerEffect(balloon.color.value, points);

      const prevMilestone = Math.floor((prevScore) / 15);
      const newMilestone = Math.floor(currentScore / 15);

      if (newMilestone > Math.max(0, prevMilestone)) {
        playSuccessSound();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        safeTimeout(startNewRound, 1000);
      }
    } else {
      playErrorSound();
      comboRef.current = 0;
      setCombo(0);
    }
  };

  // START SCREEN
  if (gamePhase === 'start') {
    return (
      <motion.div className="flex flex-col items-center justify-center gap-6 p-6 max-w-xl mx-auto min-h-[60vh]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div className="text-7xl" animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🎈</motion.div>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Balon Patlat!</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-muted-foreground text-center">Zorluk Seç:</p>
          {(Object.entries(DIFFICULTIES) as [Difficulty, typeof DIFFICULTIES['easy']][]).map(([key, val]) => (
            <button key={key} onClick={() => setDifficulty(key)}
              className={`px-5 py-3 rounded-xl font-bold transition-all ${difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`}>
              {val.label} ({val.time}s)
            </button>
          ))}
        </div>
        <div className="glass-card p-4 space-y-2 text-center text-sm neon-border">
          <p className="font-bold">🎯 Hedef renkteki balonları patlat</p>
          <p className="font-bold">⚡ Combo yap, çarpan kazan (max 5x)</p>
          <p className="text-muted-foreground">❄️ Mavi = Dondur | 💛 Sarı = 2x Puan | 💣 Siyah = Bomba!</p>
        </div>
        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }

  // END SCREEN
  if (gamePhase === 'ended') {
    return (
      <motion.div className="flex flex-col items-center justify-center gap-6 p-6 max-w-xl mx-auto min-h-[60vh]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <span className="text-7xl">⏰</span>
        <h2 className="text-3xl font-black text-gradient">Süre Doldu!</h2>
        {isNewRecord && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-black text-lg animate-pulse">🏆 YENİ REKOR!</motion.div>}
        <div className="glass-card p-6 space-y-3 text-center neon-border">
          <p className="text-3xl font-black text-primary">🎈 {score} Puan</p>
          <p className="text-lg font-bold text-muted-foreground">🔄 {round} Tur | 🔥 En İyi Combo: {bestCombo}x</p>
          <p className="text-sm text-muted-foreground">🏆 Rekor: {highScore}</p>
        </div>
        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🔄 Tekrar Oyna</button>
      </motion.div>
    );
  }

  // PLAYING
  const supportsDvh = typeof CSS !== 'undefined' && CSS.supports?.('height', '1dvh');

  return (
    <div ref={containerRef}
      className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden neon-border touch-none"
      style={{
        background: 'linear-gradient(180deg, hsl(230 20% 12%) 0%, hsl(230 25% 8%) 100%)',
        height: supportsDvh ? 'clamp(380px, 65dvh, 750px)' : 'clamp(380px, 65vh, 750px)'
      }}>

      {/* Shared SVG Gradients */}
      <svg width="0" height="0" className="absolute invisible">
        <defs>
          {BALLOON_COLORS.map(c => (
            <radialGradient key={c.name} id={`bal-grad-${sanitizeId(c.name)}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="40%" stopColor={c.value} stopOpacity="0.9" />
              <stop offset="100%" stopColor={c.value} stopOpacity="1" />
            </radialGradient>
          ))}
          <radialGradient id="bal-grad-freeze" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="bal-grad-double" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="bal-grad-bomb" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#1f2937" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1f2937" stopOpacity="1" />
          </radialGradient>
        </defs>
      </svg>

      {/* Frozen overlay */}
      {isFrozen && <div className="absolute inset-0 z-30 pointer-events-none border-4 border-cyan-400/50 rounded-2xl"><div className="absolute inset-0 bg-cyan-400/5" /></div>}
      {/* Double overlay */}
      {isDouble && <div className="absolute inset-0 z-30 pointer-events-none border-4 border-yellow-400/50 rounded-2xl" />}

      {/* Pop effects */}
      <AnimatePresence>
        {popEffects.map(effect => (
          <motion.div key={effect.id} className="absolute z-50 pointer-events-none" style={{ left: effect.x, top: effect.y }}
            initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 0], opacity: [1, 0.8, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-16 h-16 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ background: `radial-gradient(circle, ${effect.color}60, transparent)` }} />
            {effect.points !== 0 && (
              <motion.span className="absolute -top-6 left-1/2 -translate-x-1/2 font-black text-lg whitespace-nowrap"
                style={{ color: effect.points > 0 ? '#4ade80' : '#ef4444' }}
                initial={{ y: 0, opacity: 1 }} animate={{ y: -30, opacity: 0 }} transition={{ duration: 0.6 }}>
                {effect.points > 0 ? `+${effect.points}` : effect.points}
              </motion.span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Score UI */}
      <div className="absolute top-2 left-0 right-0 z-20 flex flex-col items-center gap-1 pointer-events-none px-2">
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-1 border border-primary/20"><span className="text-sm font-black text-primary">🎈 {score}</span></div>
          <div className="glass-card px-3 py-1 border border-orange-500/20">
            <span className={`text-sm font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
          </div>
          {combo > 1 && (
            <motion.div key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card px-3 py-1 border border-yellow-500/30">
              <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(combo, 5)}</span>
            </motion.div>
          )}
        </div>
        <motion.div key={targetColor.name} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 glass-card px-4 py-1 border border-white/10">
          <span className="text-sm font-black">{targetColor.name}</span>
          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: targetColor.value, boxShadow: `0 0 12px ${targetColor.glow}` }} />
          <span className="text-sm font-black text-primary">PATLAT!</span>
        </motion.div>
      </div>

      {/* Balloons Container */}
      <AnimatePresence>
        {balloons.map((balloon) => (
          <motion.div key={balloon.id}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute z-10 balloon-animate"
            style={{
              left: `${balloon.x}%`,
              '--rise-duration': `${balloon.duration}s`,
              '--rise-delay': `${balloon.delay}s`,
              '--play-state': isFrozen ? 'paused' : 'running'
            } as any}
            onAnimationEnd={(e) => {
              if (e.animationName === 'balloon-rise') {
                setBalloons(prev => prev.filter(b => b.id !== balloon.id));
              }
            }}
          >
            <div className="balloon-sway-animate" style={{
              '--sway': `${balloon.swayAmount}px`,
              '--sway-duration': `${balloon.swayDuration}s`,
              '--play-state': isFrozen ? 'paused' : 'running'
            } as any}>
              <button
                onPointerDown={(e) => { e.preventDefault(); handlePop(balloon, e); }}
                className="relative group active:scale-95 transition-transform cursor-pointer block p-0 bg-transparent border-none"
                style={{ transform: `scale(${balloon.size})`, touchAction: 'none' }}
              >
                <svg width="48" height="64" viewBox="0 0 48 64" className="drop-shadow-lg">
                  <ellipse cx="24" cy="26" rx="20" ry="24" fill={balloon.color.glow} opacity="0.5" />
                  <ellipse cx="24" cy="26" rx="18" ry="22"
                    fill={`url(#bal-grad-${balloon.special || sanitizeId(balloon.color.name)})`}
                    stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <ellipse cx="17" cy="18" rx="4" ry="6" fill="white" opacity="0.3" transform="rotate(-20 17 18)" />

                  {balloon.special === 'freeze' && <text x="24" y="30" textAnchor="middle" fontSize="14">❄️</text>}
                  {balloon.special === 'double' && <text x="24" y="30" textAnchor="middle" fontSize="14">2x</text>}
                  {balloon.special === 'bomb' && <text x="24" y="30" textAnchor="middle" fontSize="14">💣</text>}

                  <ellipse cx="24" cy="48" rx="3" ry="2" fill={balloon.color.value} opacity="0.8" />
                  <path d="M24 50 Q22 56 24 62" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BalloonPopGame;
