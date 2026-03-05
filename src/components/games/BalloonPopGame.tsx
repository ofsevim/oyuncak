'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const isFrozenRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balloonSpawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specialTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHighScore(getHighScore('balloon-pop')); }, []);
  useEffect(() => { isFrozenRef.current = isFrozen; }, [isFrozen]);

  const config = DIFFICULTIES[difficulty];

  const createBalloon = useCallback((color: typeof BALLOON_COLORS[0], delay = 0): Balloon => {
    const spd = config.speed;
    const special = Math.random() < 0.06 ? (['freeze', 'double', 'bomb'] as const)[Math.floor(Math.random() * 3)] : undefined;
    return {
      id: Math.random().toString(36).substr(2, 9) + Date.now(),
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
    setScore(0); setCombo(0); setBestCombo(0);
    setTimeLeft(config.time); setRound(1);
    setGamePhase('playing'); setIsNewRecord(false);
    setIsFrozen(false); setIsDouble(false);
    const nextColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    setTargetColor(nextColor);
    setBalloons(generateBalloons(nextColor));
  }, [generateBalloons, config.time]);

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

  useEffect(() => () => {
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    specialTimersRef.current.forEach(clearTimeout);
    specialTimersRef.current = [];
  }, []);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    timerRef.current = setInterval(() => {
      if (isFrozenRef.current) return;
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGamePhase('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gamePhase, isFrozen]);

  // End game effects
  useEffect(() => {
    if (gamePhase !== 'ended') return;
    confetti({ particleCount: 150, spread: 100 });
    const isNew = saveHighScoreObj('balloon-pop', score);
    if (isNew) { setIsNewRecord(true); setHighScore(score); playNewRecordSound(); }
  }, [gamePhase, score]);

  // Spawn balloons
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    balloonSpawnRef.current = setInterval(() => {
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
    return () => { if (balloonSpawnRef.current) clearInterval(balloonSpawnRef.current); };
  }, [gamePhase, targetColor, createBalloon, isFrozen, config]);

  // Cleanup
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const id = setInterval(() => {
      setBalloons(prev => prev.length > config.maxBalloons * 1.5 ? prev.slice(-config.maxBalloons) : prev);
    }, 5000);
    return () => clearInterval(id);
  }, [gamePhase, config.maxBalloons]);

  const handlePop = (balloon: Balloon, e: React.PointerEvent) => {
    if (gamePhase !== 'playing') return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Special balloons
    if (balloon.special === 'freeze') {
      playSuccessSound(); setIsFrozen(true);
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      specialTimersRef.current.push(setTimeout(() => setIsFrozen(false), 3000));
      setPopEffects(prev => [...prev, { id: balloon.id, x: clientX, y: clientY, color: '#67e8f9', points: 0 }]);
      specialTimersRef.current.push(setTimeout(() => setPopEffects(prev => prev.filter(p => p.id !== balloon.id)), 600));
      return;
    }
    if (balloon.special === 'double') {
      playSuccessSound(); setIsDouble(true);
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      specialTimersRef.current.push(setTimeout(() => setIsDouble(false), 5000));
      setPopEffects(prev => [...prev, { id: balloon.id, x: clientX, y: clientY, color: '#fbbf24', points: 0 }]);
      specialTimersRef.current.push(setTimeout(() => setPopEffects(prev => prev.filter(p => p.id !== balloon.id)), 600));
      return;
    }
    if (balloon.special === 'bomb') {
      playErrorSound(); setCombo(0); setScore(prev => Math.max(0, prev - 5));
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      setPopEffects(prev => [...prev, { id: balloon.id, x: clientX, y: clientY, color: '#ef4444', points: -5 }]);
      specialTimersRef.current.push(setTimeout(() => setPopEffects(prev => prev.filter(p => p.id !== balloon.id)), 600));
      return;
    }

    if (balloon.color.value === targetColor.value) {
      const newCombo = combo + 1;
      const multiplier = Math.min(newCombo, 5);
      const points = multiplier * (isDouble ? 2 : 1);
      if (newCombo > 2) playComboSound(newCombo); else playPopSound();
      setCombo(newCombo);
      setBestCombo(prev => Math.max(prev, newCombo));
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      setPopEffects(prev => [...prev, { id: balloon.id, x: clientX, y: clientY, color: balloon.color.value, points }]);
      setTimeout(() => setPopEffects(prev => prev.filter(p => p.id !== balloon.id)), 600);
      setScore(prev => {
        const newScore = prev + points;
        if (newScore > 0 && newScore % 15 === 0) {
          playSuccessSound();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
          nextRoundTimeoutRef.current = setTimeout(startNewRound, 1000);
        }
        return newScore;
      });
    } else {
      playErrorSound(); setCombo(0);
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
  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto h-[60vh] md:h-[75vh] rounded-2xl overflow-hidden neon-border touch-none"
      style={{ background: 'linear-gradient(180deg, hsl(230 20% 12%) 0%, hsl(230 25% 8%) 100%)' }}>
      {/* Frozen overlay */}
      {isFrozen && <div className="absolute inset-0 z-30 pointer-events-none border-4 border-cyan-400/50 rounded-2xl"><div className="absolute inset-0 bg-cyan-400/5" /></div>}
      {/* Double overlay */}
      {isDouble && <div className="absolute inset-0 z-30 pointer-events-none border-4 border-yellow-400/50 rounded-2xl" />}

      {/* Pop effects */}
      <AnimatePresence>
        {popEffects.map(effect => (
          <motion.div key={effect.id} className="fixed z-50 pointer-events-none" style={{ left: effect.x, top: effect.y }}
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

      {/* Balloons */}
      <AnimatePresence>
        {balloons.map((balloon) => (
          <motion.div key={balloon.id} className="absolute z-10" style={{ left: `${balloon.x}%` }}
            initial={{ top: '105%' }} animate={{ top: '-80px' }} exit={{ scale: 1.5, opacity: 0 }}
            transition={{ top: { duration: isFrozen ? 9999 : balloon.duration, delay: balloon.delay, ease: "linear" }, scale: { duration: 0.12 } }}
            onAnimationComplete={() => setBalloons(prev => prev.filter(b => b.id !== balloon.id))}>
            <motion.div animate={{ x: [-balloon.swayAmount, balloon.swayAmount, -balloon.swayAmount], rotate: [-3, 3, -3] }}
              transition={{ duration: balloon.swayDuration, repeat: Infinity, ease: "easeInOut" }}>
              <button onPointerDown={(e) => { e.preventDefault(); handlePop(balloon, e); }}
                className="relative group active:scale-90 transition-transform cursor-pointer" style={{ transform: `scale(${balloon.size})`, touchAction: 'none' }}>
                <svg width="48" height="64" viewBox="0 0 48 64" className="drop-shadow-lg">
                  <defs>
                    <radialGradient id={`grad-${balloon.id}`} cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                      <stop offset="40%" stopColor={balloon.color.value} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={balloon.color.value} stopOpacity="1" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="24" cy="26" rx="20" ry="24" fill={balloon.color.glow} opacity="0.5" />
                  <ellipse cx="24" cy="26" rx="18" ry="22" fill={`url(#grad-${balloon.id})`} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <ellipse cx="17" cy="18" rx="4" ry="6" fill="white" opacity="0.3" transform="rotate(-20 17 18)" />
                  {balloon.special === 'freeze' && <text x="24" y="30" textAnchor="middle" fontSize="14">❄️</text>}
                  {balloon.special === 'double' && <text x="24" y="30" textAnchor="middle" fontSize="14">2x</text>}
                  {balloon.special === 'bomb' && <text x="24" y="30" textAnchor="middle" fontSize="14">💣</text>}
                  <ellipse cx="24" cy="48" rx="3" ry="2" fill={balloon.color.value} opacity="0.8" />
                  <path d="M24 50 Q22 56 24 62" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BalloonPopGame;
