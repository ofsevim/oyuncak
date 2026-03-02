'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getNextRandomIndex } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

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
  const [activeHoles, setActiveHoles] = useState<Map<number, ActiveMole>>(new Map());
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start');
  const [showSuccess, setShowSuccess] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [butterflies] = useState<Butterfly[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: 10 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2,
    }))
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoleRef = useRef<number | null>(null);
  const floatIdRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  const config = DIFFS[difficulty];

  useEffect(() => { setHighScore(getHighScore('whack-a-mole')); }, []);

  /* Floating text helper */
  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = floatIdRef.current++;
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000);
  }, []);

  /* Screen shake */
  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 200);
  }, []);

  /* Spawn mole */
  const spawnMole = useCallback(() => {
    if (gamePhase !== 'playing') return;
    if (moleRef.current) clearTimeout(moleRef.current);

    const hole = getNextRandomIndex(config.holes, lastHoleRef.current);
    lastHoleRef.current = hole;

    // Type selection
    const rand = Math.random();
    let type: typeof MOLE_TYPES[0];
    if (rand < 0.12) type = MOLE_TYPES[3];      // kokarca
    else if (rand < 0.22) type = MOLE_TYPES[2];  // tilki
    else if (rand < 0.48) type = MOLE_TYPES[1];  // tavşan
    else type = MOLE_TYPES[0];                    // hamster

    const mole: ActiveMole = { type, state: 'rising' };

    setActiveHoles(prev => { const m = new Map(prev); m.set(hole, mole); return m; });

    // Rising → up
    setTimeout(() => {
      setActiveHoles(prev => {
        const m = new Map(prev);
        const existing = m.get(hole);
        if (existing && existing.state === 'rising') m.set(hole, { ...existing, state: 'up' });
        return m;
      });
    }, 200);

    // Auto-hide after duration
    const duration = Math.max(600, 1600 - (scoreRef.current * 8));
    moleRef.current = setTimeout(() => {
      setActiveHoles(prev => {
        const m = new Map(prev);
        const existing = m.get(hole);
        if (existing && (existing.state === 'up' || existing.state === 'rising')) {
          m.set(hole, { ...existing, state: 'falling' });
          setTimeout(() => {
            setActiveHoles(p => { const mm = new Map(p); mm.delete(hole); return mm; });
          }, 300);
        }
        return m;
      });
      // Combo break on miss
      comboRef.current = 0;
      setCombo(0);
      // Next spawn
      const nextDelay = Math.random() * 250 + 100;
      moleRef.current = setTimeout(spawnMole, nextDelay);
    }, duration);
  }, [gamePhase, config.holes]);

  /* Multi-mole spawn for medium/hard */
  useEffect(() => {
    if (gamePhase !== 'playing' || config.multiChance === 0) return;
    const id = setInterval(() => {
      if (Math.random() < config.multiChance) {
        const hole = getNextRandomIndex(config.holes, lastHoleRef.current);
        const type = MOLE_TYPES[Math.floor(Math.random() * 3)];
        const mole: ActiveMole = { type, state: 'up' };
        setActiveHoles(prev => { const m = new Map(prev); m.set(hole, mole); return m; });
        setTimeout(() => {
          setActiveHoles(prev => {
            const m = new Map(prev);
            const existing = m.get(hole);
            if (existing && existing.state === 'up') {
              m.set(hole, { ...existing, state: 'falling' });
              setTimeout(() => { setActiveHoles(p => { const mm = new Map(p); mm.delete(hole); return mm; }); }, 300);
            }
            return m;
          });
        }, 900);
      }
    }, 2200);
    return () => clearInterval(id);
  }, [gamePhase, config]);

  /* Start game loop */
  useEffect(() => {
    if (gamePhase === 'playing') {
      const t = setTimeout(spawnMole, 600);
      return () => { clearTimeout(t); if (moleRef.current) clearTimeout(moleRef.current); };
    } else {
      setActiveHoles(new Map());
      if (moleRef.current) clearTimeout(moleRef.current);
    }
  }, [gamePhase, spawnMole]);

  const startGame = useCallback(() => {
    scoreRef.current = 0; comboRef.current = 0;
    setScore(0); setTimeLeft(config.time); setGamePhase('playing');
    setShowSuccess(false); setCombo(0); setMaxCombo(0); setIsNewRecord(false);
    setFloatingTexts([]);
  }, [config.time]);

  /* Timer */
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

  /* Game over — save score */
  useEffect(() => {
    if (gamePhase !== 'ended') return;
    const isNew = saveHighScoreObj('whack-a-mole', scoreRef.current);
    if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
  }, [gamePhase]);


  /* ═══════════════════════════════════════════
     WHACK HANDLER
     ═══════════════════════════════════════════ */
  const handleWhack = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    const moleData = activeHoles.get(index);
    if (!moleData || moleData.state === 'hit' || moleData.state === 'falling' || gamePhase !== 'playing') return;

    // Get click position for floating text
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fx = rect.left + rect.width / 2;
    const fy = rect.top;

    if (moleData.type.points < 0) {
      // Bad mole — penalty
      playErrorSound();
      comboRef.current = 0; setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current + moleData.type.points);
      setScore(scoreRef.current);
      addFloat(fx, fy, `${moleData.type.points}`, '#ef4444');
      triggerShake();
    } else {
      // Good mole — score + combo
      comboRef.current++;
      setCombo(comboRef.current);
      if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);

      // Combo multiplier
      let multiplier = 1;
      if (comboRef.current >= 10) multiplier = 5;
      else if (comboRef.current >= 5) multiplier = 2;

      const points = moleData.type.points * multiplier;
      scoreRef.current += points;
      setScore(scoreRef.current);

      // Floating text
      const comboText = multiplier > 1 ? ` x${multiplier}` : '';
      addFloat(fx, fy, `+${points}${comboText}`, multiplier >= 5 ? '#fbbf24' : multiplier >= 2 ? '#a855f7' : '#22c55e');

      if (comboRef.current >= 5) {
        playComboSound(comboRef.current);
        addFloat(fx - 30, fy - 20, `🔥 ${comboRef.current} Kombo!`, '#f97316');
      } else {
        playPopSound();
      }

      triggerShake();

      // Reset combo timer
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        comboRef.current = 0; setCombo(0);
      }, 2000);
    }

    // Set mole to hit state
    setActiveHoles(prev => {
      const m = new Map(prev);
      m.set(index, { ...moleData, state: 'hit', hitTime: Date.now() });
      return m;
    });

    // Remove after hit animation
    setTimeout(() => {
      setActiveHoles(prev => { const m = new Map(prev); m.delete(index); return m; });
      if (moleRef.current) clearTimeout(moleRef.current);
      moleRef.current = setTimeout(spawnMole, Math.random() * 120 + 60);
    }, 500);
  };


  /* ═══════════════════════════════════════════
     START SCREEN
     ═══════════════════════════════════════════ */
  if (gamePhase === 'start') {
    return (
      <motion.div className="flex flex-col items-center gap-5 p-4 pb-32 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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

        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }


  /* ═══════════════════════════════════════════
     GAME SCREEN — Professional quality
     ═══════════════════════════════════════════ */
  return (
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-32"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ transform: screenShake ? `translate(${(Math.random() - 0.5) * 6}px, ${(Math.random() - 0.5) * 4}px)` : 'none', transition: 'transform 0.05s' }}>

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
          <motion.div key={b.id} className="absolute pointer-events-none -z-5 text-lg"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            animate={{
              x: [0, 30, -20, 40, 0],
              y: [0, -15, 10, -20, 0],
            }}
            transition={{ repeat: Infinity, duration: 8 / b.speed, ease: 'easeInOut', delay: b.phase }}>
            🦋
          </motion.div>
        ))}

        {/* Grass blades at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 -z-5 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i} className="absolute bottom-0"
              style={{
                left: `${i * 5 + Math.random() * 3}%`, width: 3, height: 12 + Math.random() * 10,
                background: `hsl(${110 + Math.random() * 20}, 60%, ${40 + Math.random() * 20}%)`,
                borderRadius: '2px 2px 0 0', transformOrigin: 'bottom center'
              }}
              animate={{ rotate: [0, 5, -3, 4, 0] }}
              transition={{ repeat: Infinity, duration: 2 + Math.random(), delay: Math.random() }}
            />
          ))}
        </div>

        {/* ── GAME GRID ── */}
        <div className={`grid gap-3 md:gap-4 p-4 md:p-6 rounded-3xl relative`}
          style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
          {Array.from({ length: config.holes }).map((_, i) => {
            const moleData = activeHoles.get(i);
            const holeSize = config.cols === 4 ? 'clamp(68px, 20vw, 100px)' : 'clamp(75px, 24vw, 115px)';

            return (
              <div key={i} className="flex flex-col items-center">
                {/* Hole container with depth */}
                <div className="relative" style={{ width: holeSize, height: holeSize }}>
                  {/* Hole background — 3D depth */}
                  <div className="absolute inset-0 rounded-[50%] overflow-hidden"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 40%, #5c4033 0%, #3e2723 40%, #1a0f0a 100%)',
                      boxShadow: 'inset 0 8px 20px rgba(0,0,0,0.7), inset 0 -4px 8px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.3)',
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
                          onClick={(e) => handleWhack(i, e)}
                          onTouchEnd={(e) => { e.preventDefault(); handleWhack(i, e); }}
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
                  <div className="absolute bottom-0 left-0 right-0 h-[35%] rounded-b-[50%] pointer-events-none"
                    style={{
                      background: 'linear-gradient(180deg, transparent 0%, #6d4c2a 20%, #8B6914 60%, #7a5c2e 100%)',
                      zIndex: 4,
                      boxShadow: '0 -2px 6px rgba(0,0,0,0.2)',
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

      {/* ── Floating texts overlay ── */}
      <AnimatePresence>
        {floatingTexts.map(ft => (
          <motion.div key={ft.id}
            className="fixed pointer-events-none font-black text-lg z-50"
            style={{ left: ft.x, top: ft.y, color: ft.color, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -60, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}>
            {ft.text}
          </motion.div>
        ))}
      </AnimatePresence>

      <SuccessPopup isOpen={showSuccess} onClose={() => setGamePhase('start')}
        message={`${score} puan! ${isNewRecord ? '🏆 Yeni Rekor!' : `Maks Kombo: x${maxCombo}`}`} />
    </motion.div>
  );
};

export default WhackAMoleGame;
