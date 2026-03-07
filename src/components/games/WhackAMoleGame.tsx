'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { getNextRandomIndex } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playPopSound, playErrorSound, playComboSound, playSuccessSound, playNewRecordSound } from '@/utils/soundEffects';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

/* ═══════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════ */
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFS: Record<Difficulty, { label: string; time: number; holes: number; cols: number; multiChance: number }> = {
  easy: { label: '🌟 Kolay', time: 35, holes: 6, cols: 3, multiChance: 0 },
  medium: { label: '⭐ Orta', time: 30, holes: 9, cols: 3, multiChance: 0.2 },
  hard: { label: '🔥 Zor', time: 25, holes: 12, cols: 4, multiChance: 0.35 },
};

const MOLE_TYPES = [
  { emoji: '🐹', points: 1, name: 'Hamster', color: 'from-amber-400 to-orange-500', hitEmoji: '😵' },
  { emoji: '🐰', points: 2, name: 'Tavşan', color: 'from-pink-400 to-rose-500', hitEmoji: '🌟' },
  { emoji: '🦊', points: 5, name: 'Tilki', color: 'from-orange-400 to-red-500', hitEmoji: '💫' },
  { emoji: '🦨', points: -3, name: 'Kokarca', color: 'from-gray-400 to-gray-600', hitEmoji: '😵‍💫' },
];

interface ActiveMole {
  type: typeof MOLE_TYPES[0];
  state: 'rising' | 'up' | 'hit' | 'falling';
  hitTime?: number;
}

interface FloatingText {
  id: number; x: number; y: number; text: string; color: string;
}

interface Butterfly {
  id: number; x: number; y: number; speed: number; phase: number;
}


/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const WhackAMoleGame = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [, setHoleVersion] = useState(0); // For forcing renders on ref update
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start');
  const [showSuccess, setShowSuccess] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Refs for stable logic & sync
  const containerRef = useRef<HTMLDivElement>(null);
  const { safeTimeout: hookTimeout, safeInterval: hookInterval, clearAll: hookClearAll } = useSafeTimeouts();
  const gamePhaseRef = useRef(gamePhase);
  const activeHolesRef = useRef<Map<number, ActiveMole>>(new Map());
  const spawnMoleRef = useRef<() => void>(() => { });
  const lastHoleRef = useRef<number | null>(null);
  const floatIdRef = useRef(0);
  const lastWhackRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);

  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = useMemo(() => DIFFS[difficulty], [difficulty]);

  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);
  useEffect(() => { setHighScore(getHighScore('whack-a-mole')); }, []);

  // Stabilize decorative elements
  const butterflies = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: 10 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2,
    }))
    , []);

  const grassBlades = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: i * 5 + Math.random() * 3,
      height: 12 + Math.random() * 10,
      hue: 110 + Math.random() * 20,
      lightness: 40 + Math.random() * 20,
      duration: 2 + Math.random(),
      delay: Math.random(),
    }))
    , []);

  /* Helper to force render after ref mutation */
  const updateHoles = useCallback((updater: (m: Map<number, ActiveMole>) => void) => {
    updater(activeHolesRef.current);
    setHoleVersion(v => v + 1);
  }, []);

  /* Central timer management (game-phase-aware wrapper) */
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    return hookTimeout(() => {
      if (gamePhaseRef.current !== 'playing') return;
      fn();
    }, ms);
  }, [hookTimeout]);

  const clearAllTimers = useCallback(() => {
    hookClearAll();
    if (moleRef.current) clearTimeout(moleRef.current);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
  }, [hookClearAll]);

  /* Floating text helper */
  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = floatIdRef.current++;
    const container = containerRef.current?.getBoundingClientRect();
    const cx = x - (container?.left || 0);
    const cy = y - (container?.top || 0);

    setFloatingTexts(prev => [...prev, { id, x: cx, y: cy, text, color }]);
    safeTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000);
  }, [safeTimeout]);

  /* Screen shake via class */
  const triggerShake = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.classList.add('shake-anim');
    setTimeout(() => el.classList.remove('shake-anim'), 200);
  }, []);

  /* Spawn mole */
  const spawnMole = useCallback(() => {
    if (gamePhaseRef.current !== 'playing') return;
    if (moleRef.current) clearTimeout(moleRef.current);

    // Find available holes
    const activeSet = new Set(activeHolesRef.current.keys());
    const available = Array.from({ length: config.holes }, (_, i) => i)
      .filter(i => !activeSet.has(i));

    if (available.length === 0) {
      moleRef.current = safeTimeout(() => spawnMoleRef.current(), 100);
      return;
    }

    const hole = available[Math.floor(Math.random() * available.length)];
    lastHoleRef.current = hole;

    // Type selection
    const rand = Math.random();
    let type: typeof MOLE_TYPES[0];
    if (rand < 0.12) type = MOLE_TYPES[3];      // kokarca
    else if (rand < 0.22) type = MOLE_TYPES[2];  // tilki
    else if (rand < 0.48) type = MOLE_TYPES[1];  // tavşan
    else type = MOLE_TYPES[0];                    // hamster

    const mole: ActiveMole = { type, state: 'rising' };
    updateHoles(m => m.set(hole, mole));

    // Rising → up
    safeTimeout(() => {
      updateHoles(m => {
        const existing = m.get(hole);
        if (existing && existing.state === 'rising') m.set(hole, { ...existing, state: 'up' });
      });
    }, 200);

    // Dynamic duration based on time and score
    const elapsed = config.time - timeLeft;
    const timeFactor = Math.min(elapsed / config.time, 1);
    const scoreFactor = Math.min(scoreRef.current / 120, 1);
    const difficultyFactor = Math.max(timeFactor, scoreFactor);

    const duration = Math.max(500, 1600 - difficultyFactor * 950);

    moleRef.current = safeTimeout(() => {
      updateHoles(m => {
        const existing = m.get(hole);
        if (existing && (existing.state === 'up' || existing.state === 'rising')) {
          m.set(hole, { ...existing, state: 'falling' });
          safeTimeout(() => updateHoles(mm => mm.delete(hole)), 300);
        }
      });
      // Combo break on miss
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboRef.current = 0;
      setCombo(0);

      // Next spawn
      const nextDelay = Math.random() * 250 + 100;
      moleRef.current = safeTimeout(() => spawnMoleRef.current(), nextDelay);
    }, duration);
  }, [config, timeLeft, safeTimeout, updateHoles]);

  useEffect(() => { spawnMoleRef.current = spawnMole; }, [spawnMole]);

  /* Multi-mole spawn for medium/hard */
  /* Multi-mole spawn loop */
  useEffect(() => {
    if (gamePhase !== 'playing' || config.multiChance === 0) return;
    hookInterval(() => {
      if (Math.random() < config.multiChance) {
        const activeSet = new Set(activeHolesRef.current.keys());
        const available = Array.from({ length: config.holes }, (_, i) => i)
          .filter(i => !activeSet.has(i) && i !== lastHoleRef.current);

        if (available.length === 0) return;

        const hole = available[Math.floor(Math.random() * available.length)];
        const type = MOLE_TYPES[Math.floor(Math.random() * 3)];
        const mole: ActiveMole = { type, state: 'up' };

        updateHoles(m => m.set(hole, mole));

        safeTimeout(() => {
          updateHoles(m => {
            const existing = m.get(hole);
            if (existing && existing.state === 'up') {
              m.set(hole, { ...existing, state: 'falling' });
              safeTimeout(() => updateHoles(mm => mm.delete(hole)), 300);
            }
          });
        }, 900);
      }
    }, 2200);
  }, [gamePhase, config, safeTimeout, updateHoles, hookInterval]);

  /* Start game loop */
  /* Initial spawn delay */
  useEffect(() => {
    if (gamePhase === 'playing') {
      const t = safeTimeout(() => spawnMoleRef.current(), 600);
      return () => clearTimeout(t);
    } else {
      updateHoles(m => m.clear());
    }
  }, [gamePhase, safeTimeout, updateHoles]);

  const startGame = useCallback(() => {
    clearAllTimers();
    activeHolesRef.current.clear();
    scoreRef.current = 0; comboRef.current = 0; maxComboRef.current = 0;
    lastHoleRef.current = null; lastWhackRef.current = 0;
    moleRef.current = null; comboTimerRef.current = null;
    setScore(0); setTimeLeft(config.time); setGamePhase('playing');
    setShowSuccess(false); setCombo(0); setMaxCombo(0); setIsNewRecord(false);
    setFloatingTexts([]);
  }, [config.time, clearAllTimers]);

  /* Timer */
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setGamePhase('ended');
          setShowSuccess(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gamePhase]);

  /* Game over — stop everything & save score */
  useEffect(() => {
    if (gamePhase !== 'ended') return;
    clearAllTimers();
    activeHolesRef.current.clear();
    const isNew = saveHighScoreObj('whack-a-mole', scoreRef.current);
    if (isNew) {
      setIsNewRecord(true);
      setHighScore(scoreRef.current);
      playNewRecordSound();
    } else {
      playSuccessSound();
    }
  }, [gamePhase, clearAllTimers]);


  /* ═══════════════════════════════════════════
     WHACK HANDLER
     ═══════════════════════════════════════════ */
  const handleWhack = (index: number, e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    // Debounce & Multi-touch protection (80ms)
    const now = Date.now();
    if (now - lastWhackRef.current < 80) return;
    lastWhackRef.current = now;

    const moleData = activeHolesRef.current.get(index);
    if (!moleData || moleData.state === 'hit' || moleData.state === 'falling' || gamePhaseRef.current !== 'playing') return;

    // Get click position for floating text
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fx = rect.left + rect.width / 2;
    const fy = rect.top;

    if (moleData.type.points < 0) {
      // Bad mole — penalty
      playErrorSound();
      comboRef.current = 0;
      setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current + moleData.type.points);
      setScore(scoreRef.current);
      addFloat(fx, fy, `${moleData.type.points}`, '#ef4444');
      triggerShake();
    } else {
      // Good mole — score + combo
      comboRef.current++;
      setCombo(comboRef.current);

      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current;
        setMaxCombo(comboRef.current);
      }

      // Combo multiplier
      let multiplier = 1;
      if (comboRef.current >= 10) multiplier = 5;
      else if (comboRef.current >= 5) multiplier = 2;

      const points = moleData.type.points * multiplier;
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (comboRef.current > 2) {
        playComboSound(comboRef.current);
      } else {
        playPopSound();
      }

      // Floating text
      const comboText = multiplier > 1 ? ` x${multiplier}` : '';
      addFloat(fx, fy, `+${points}${comboText}`, multiplier >= 5 ? '#fbbf24' : multiplier >= 2 ? '#a855f7' : '#22c55e');

      if (comboRef.current >= 5) {
        addFloat(fx - 30, fy - 20, `🔥 ${comboRef.current} Kombo!`, '#f97316');
      }

      triggerShake();

      // Reset combo timer
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = hookTimeout(() => {
        comboRef.current = 0;
        setCombo(0);
      }, 2000);
    }

    // Set mole to hit state
    updateHoles(m => {
      m.set(index, { ...moleData, state: 'hit', hitTime: Date.now() });
    });

    // Remove after hit animation
    safeTimeout(() => {
      updateHoles(m => m.delete(index));
      if (moleRef.current) clearTimeout(moleRef.current);
      moleRef.current = safeTimeout(() => spawnMoleRef.current(), Math.random() * 120 + 60);
    }, 500);
  };


  /* ═══════════════════════════════════════════
     START SCREEN
     ═══════════════════════════════════════════ */
  if (gamePhase === 'start') {
    return (
      <motion.div className="flex flex-col items-center gap-5 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <motion.span className="text-6xl block" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}>🐹</motion.span>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Köstebek Yakala!</h2>
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

        <Leaderboard gameId="whack-a-mole" />

        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }


  /* ═══════════════════════════════════════════
     GAME SCREEN — Professional quality
     ═══════════════════════════════════════════ */
  return (
    <motion.div
      ref={containerRef}
      className="flex flex-col items-center gap-4 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <style>{`
        @keyframes gameShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-4px, 2px); }
          50% { transform: translate(4px, -2px); }
          75% { transform: translate(-2px, 4px); }
        }
        .shake-anim { animation: gameShake 0.15s ease-in-out; }

        @keyframes butterfly-float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(30px, -15px) rotate(5deg); }
            50% { transform: translate(-20px, 10px) rotate(-5deg); }
            75% { transform: translate(40px, -20px) rotate(3deg); }
        }
        .animate-butterfly { animation: butterfly-float var(--duration, 8s) ease-in-out infinite; }

        @keyframes grass-sway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(6deg); }
          50% { transform: rotate(-4deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-grass-sway { animation: grass-sway var(--duration, 2s) ease-in-out infinite; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── HUD — Glassmorphism ── */}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <div className="px-4 py-2 rounded-2xl flex items-center gap-1.5"
          style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <span className="text-lg font-black text-primary" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>⚡ {score}</span>
        </div>
        <div className="px-4 py-2 rounded-2xl"
          style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: `1px solid ${timeLeft <= 10 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
          <span className={`text-lg font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>⏱️ {timeLeft}s</span>
        </div>
        <AnimatePresence>
          {combo >= 3 && (
            <motion.div key={`combo-${combo}`} initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
              className="px-3 py-2 rounded-2xl"
              style={{
                background: combo >= 10 ? 'rgba(251,191,36,0.25)' : combo >= 5 ? 'rgba(168,85,247,0.2)' : 'rgba(249,115,22,0.2)',
                backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)'
              }}>
              <span className={`text-sm font-black ${combo >= 10 ? 'text-yellow-400' : combo >= 5 ? 'text-purple-400' : 'text-orange-400'}`}>
                🔥 x{combo >= 10 ? 5 : combo >= 5 ? 2 : combo}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Dynamic Garden Background + Game Grid ── */}
      <div className="relative w-full max-w-xl">
        {/* Garden background */}
        <div className="absolute inset-0 -m-4 rounded-3xl overflow-hidden -z-10"
          style={{
            background: `
              radial-gradient(ellipse at 70% 20%, rgba(251,191,36,0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 30% 80%, rgba(34,197,94,0.08) 0%, transparent 40%),
              linear-gradient(180deg, #86efac 0%, #4ade80 30%, #65a30d 60%, #3f6212 100%)
            `,
          }}
        />

        {/* God rays */}
        <div className="absolute inset-0 -m-4 overflow-hidden rounded-3xl -z-10 pointer-events-none">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="absolute"
              style={{
                top: '-20%', right: `${10 + i * 25}%`,
                width: '60px', height: '140%',
                background: 'linear-gradient(180deg, rgba(255,251,235,0.15) 0%, rgba(255,251,235,0) 100%)',
                transformOrigin: 'top center',
                transform: `rotate(${15 + i * 8}deg)`,
              }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 + i, ease: 'easeInOut', delay: i * 0.5 }}
            />
          ))}
        </div>

        {/* Butterflies */}
        {butterflies.map(b => (
          <div key={b.id} className="absolute pointer-events-none -z-5 text-lg animate-butterfly"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              '--duration': `${8 / b.speed}s`,
              animationDelay: `${b.phase}s`
            } as any}>
            🦋
          </div>
        ))}

        {/* Grass blades at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 -z-5 pointer-events-none overflow-hidden">
          {grassBlades.map(gb => (
            <div key={gb.id} className="absolute bottom-0 animate-grass-sway"
              style={{
                left: `${gb.left}%`,
                width: 3,
                height: gb.height,
                background: `hsl(${gb.hue}, 60%, ${gb.lightness}%)`,
                borderRadius: '2px 2px 0 0',
                transformOrigin: 'bottom center',
                '--duration': `${gb.duration}s`,
                animationDelay: `${gb.delay}s`
              } as any}
            />
          ))}
        </div>

        {/* ── GAME GRID ── */}
        <div className={`grid gap-3 md:gap-4 p-4 md:p-6 rounded-3xl relative`}
          style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
          {Array.from({ length: config.holes }).map((_, i) => {
            const moleData = activeHolesRef.current.get(i);
            const holeSizeW = config.cols === 4 ? 'clamp(60px, 18vw, 85px)' : 'clamp(70px, 22vw, 100px)';
            const holeSizeH = config.cols === 4 ? 'clamp(65px, 20vw, 95px)' : 'clamp(75px, 24vw, 110px)';

            return (
              <div key={i} className="flex flex-col items-center">
                {/* Hole container with depth */}
                <div className="relative" style={{ width: holeSizeW, height: holeSizeH }}>
                  {/* Hole background — 3D depth */}
                  <div className="absolute inset-0 rounded-[50%] overflow-hidden"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 30%, #4a352a 0%, #2e1d1a 60%, #0d0805 100%)',
                      boxShadow: 'inset 0 10px 25px rgba(0,0,0,0.8), inset 0 -4px 10px rgba(0,0,0,0.4), 0 5px 15px rgba(0,0,0,0.4)',
                    }}
                  />

                  {/* Inner shadow ring for depth */}
                  <div className="absolute inset-1 rounded-[50%] pointer-events-none"
                    style={{
                      boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.5)',
                      border: '2px solid rgba(90,60,30,0.4)',
                    }}
                  />

                  {/* Mole container — overflow hidden for "coming from inside" effect */}
                  <div className="absolute inset-0 rounded-[50%] overflow-hidden" style={{ zIndex: 2 }}>
                    <AnimatePresence>
                      {moleData && (
                        <motion.button
                          key={`mole-${i}-${moleData.state}`}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleWhack(i, e);
                          }}
                          className="absolute inset-0 flex items-center justify-center cursor-pointer touch-manipulation select-none"
                          style={{ touchAction: 'manipulation', zIndex: 3 }}
                          initial={{ y: '100%' }}
                          animate={
                            moleData.state === 'hit'
                              ? { y: '15%', rotate: [0, -15, 15, -10, 0], scale: [1, 0.8, 1.1, 0.9] }
                              : moleData.state === 'falling'
                                ? { y: '100%' }
                                : { y: '15%' }
                          }
                          exit={{ y: '100%' }}
                          transition={
                            moleData.state === 'hit'
                              ? { duration: 0.4, ease: 'easeOut' }
                              : moleData.state === 'falling'
                                ? { duration: 0.3, ease: 'easeIn' }
                                : { type: 'spring', stiffness: 500, damping: 25 }
                          }
                        >
                          {/* Mole body background */}
                          <div className={`absolute inset-2 rounded-full bg-gradient-to-b ${moleData.type.color} shadow-lg`}
                            style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)` }} />

                          {/* Mole emoji */}
                          <motion.span className="text-3xl md:text-4xl relative z-10 select-none"
                            animate={moleData.state === 'hit' ? { scale: [1, 1.3, 0.7] } : moleData.state === 'up' ? { scale: [0.95, 1.05, 0.95] } : {}}
                            transition={moleData.state === 'up' ? { repeat: Infinity, duration: 0.8 } : { duration: 0.3 }}>
                            {moleData.state === 'hit' ? moleData.type.hitEmoji : moleData.type.emoji}
                          </motion.span>

                          {/* Hit stars effect */}
                          {moleData.state === 'hit' && (
                            <>
                              {[0, 1, 2].map(s => (
                                <motion.span key={s} className="absolute text-xs pointer-events-none"
                                  initial={{ opacity: 1, scale: 0 }}
                                  animate={{ opacity: 0, scale: 1.5, x: (s - 1) * 25, y: -20 - s * 10 }}
                                  transition={{ duration: 0.5, delay: s * 0.05 }}>
                                  ⭐
                                </motion.span>
                              ))}
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Dirt rim on top — covers mole bottom for depth illusion */}
                  <div className="absolute bottom-0 left-[-5%] right-[-5%] h-[40%] rounded-b-[50%] pointer-events-none"
                    style={{
                      background: 'linear-gradient(180deg, transparent 0%, #5c4023 20%, #7A5C12 60%, #634b25 100%)',
                      zIndex: 4,
                      boxShadow: '0 -3px 8px rgba(0,0,0,0.3)',
                      clipPath: 'ellipse(50% 50% at 50% 50%)'
                    }}
                  />

                  {/* Grass tufts on rim */}
                  <div className="absolute bottom-[28%] left-[10%] pointer-events-none" style={{ zIndex: 5 }}>
                    <div className="w-1.5 h-3 bg-green-500 rounded-t-full -rotate-12" />
                  </div>
                  <div className="absolute bottom-[30%] right-[12%] pointer-events-none" style={{ zIndex: 5 }}>
                    <div className="w-1.5 h-2.5 bg-green-600 rounded-t-full rotate-12" />
                  </div>
                  <div className="absolute bottom-[26%] left-[45%] pointer-events-none" style={{ zIndex: 5 }}>
                    <div className="w-1 h-2 bg-green-400 rounded-t-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Floating texts overlay — Absolute to container ── */}
      <AnimatePresence>
        {floatingTexts.map(ft => (
          <motion.div key={ft.id}
            className="absolute pointer-events-none font-black text-lg z-50 transition-none"
            style={{ left: ft.x, top: ft.y, color: ft.color, textShadow: '0 2px 8px rgba(0,0,0,0.4)', position: 'absolute' }}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -60, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}>
            {ft.text}
          </motion.div>
        ))}
      </AnimatePresence>

      <SuccessPopup isOpen={showSuccess} onClose={() => { clearAllTimers(); setGamePhase('start'); }} disableVoice={true}
        message={`${score} puan! ${isNewRecord ? '🏆 Yeni Rekor!' : `Maks Kombo: x${maxCombo}`}`} />
    </motion.div>
  );
};

export default WhackAMoleGame;
