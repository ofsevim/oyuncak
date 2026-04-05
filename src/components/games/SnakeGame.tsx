'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const GRID = 18;
const CELL = 20;
const FIELD = GRID * CELL;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };
type FoodKind = 'normal' | 'golden' | 'speed' | 'shrink';
type Diff = 'easy' | 'medium' | 'hard';

interface Particle { id: number; x: number; y: number; dx: number; dy: number; color: string; duration: number; size: number; }

const DIFFS: Record<Diff, { label: string; emoji: string; speed: number; wrap: boolean; obstacles: boolean; desc: string }> = {
  easy: { label: 'Kolay', emoji: '🌟', speed: 160, wrap: true, obstacles: false, desc: 'Yavaş hız, engelsiz' },
  medium: { label: 'Orta', emoji: '⭐', speed: 130, wrap: true, obstacles: false, desc: 'Orta hız, engelsiz' },
  hard: { label: 'Zor', emoji: '🔥', speed: 100, wrap: true, obstacles: true, desc: 'Hızlı + engeller' },
};

const FOOD_STYLES: Record<FoodKind, { colors: string[]; glow: string; emoji: string; points: number }> = {
  normal: { colors: ['#f87171', '#ef4444', '#dc2626'], glow: 'rgba(239,68,68,0.5)', emoji: '🍎', points: 10 },
  golden: { colors: ['#fde68a', '#fbbf24', '#f59e0b'], glow: 'rgba(251,191,36,0.6)', emoji: '⭐', points: 50 },
  speed: { colors: ['#67e8f9', '#22d3ee', '#06b6d4'], glow: 'rgba(6,182,212,0.5)', emoji: '⚡', points: 20 },
  shrink: { colors: ['#d8b4fe', '#c084fc', '#a855f7'], glow: 'rgba(168,85,247,0.5)', emoji: '✂️', points: 15 },
};

const SNAKE_PARTICLE_MS = 520;

/* Glassmorphism pill style */
const pill: React.CSSProperties = {
  background: 'rgba(8,15,15,0.72)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
const SnakeGame = () => {
  const [snake, setSnake] = useState<Pos[]>([{ x: 9, y: 9 }]);
  const [food, setFood] = useState<Pos & { type: FoodKind }>({ x: 14, y: 9, type: 'normal' });
  const [obstacles, setObstacles] = useState<Pos[]>([]);
  const [dir, setDir] = useState<Dir>('RIGHT');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [speed, setSpeed] = useState(160);
  const [diff, setDiff] = useState<Diff>('medium');
  const [combo, setCombo] = useState(0);
  const [eaten, setEaten] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState(false);

  const dirRef = useRef<Dir>('RIGHT');
  const inputQueueRef = useRef<Dir[]>([]);
  const { safeTimeout, safeInterval, clearAllIntervals } = useSafeTimeouts();
  const snakeRef = useRef(snake);
  const scoreRef = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const particleId = useRef(0);

  // Refs for tracking rapidly changing state to avoid interval resets
  const comboRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foodRef = useRef(food);
  const obstaclesRef = useRef(obstacles);

  const [boardScale, setBoardScale] = useState(1);

  /* Viewport'a göre oyun alanını oluştur */
  useEffect(() => {
    const updateScale = () => {
      const maxW = window.innerWidth - 32; // 16px soldan + 16px sağdan
      setBoardScale(Math.min(1, maxW / (FIELD + 8)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { dirRef.current = dir; }, [dir]);
  useEffect(() => { setHighScore(getHighScore('snake')); }, []);

  const cfg = DIFFS[diff];

  /* ── Spawn helpers ── */
  const spawnFood = useCallback((s: Pos[], obs: Pos[] = []): Pos & { type: FoodKind } => {
    const emptyPos: Pos[] = [];
    for (let x = 1; x < GRID - 1; x++) {
      for (let y = 1; y < GRID - 1; y++) {
        const isOccupied = s.some(p => p.x === x && p.y === y) || obs.some(o => o.x === x && o.y === y);
        if (!isOccupied) emptyPos.push({ x, y });
      }
    }

    // Fallback if board is completely full (very rare)
    if (emptyPos.length === 0) return { x: 1, y: 1, type: 'normal' };

    const pos = emptyPos[Math.floor(Math.random() * emptyPos.length)];
    const r = Math.random();
    const type: FoodKind = r < 0.08 ? 'golden' : r < 0.15 ? 'speed' : r < 0.2 ? 'shrink' : 'normal';
    return { ...pos, type };
  }, []);

  const spawnObstacles = useCallback((s: Pos[]): Pos[] => {
    if (!DIFFS[diff].obstacles) return [];
    const obs: Pos[] = [];
    const count = 4 + Math.floor(Math.random() * 4);

    const maxAttempts = 100;
    const center = Math.floor(GRID / 2);

    for (let i = 0; i < count; i++) {
      let pos: Pos = { x: 0, y: 0 };
      let isValid = false;
      let attempts = 0;

      while (!isValid && attempts < maxAttempts) {
        pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
        const isOccupied = s.some(p => p.x === pos.x && p.y === pos.y) ||
          obs.some(o => o.x === pos.x && o.y === pos.y);
        const isNearCenter = Math.abs(pos.x - center) < 3 && Math.abs(pos.y - center) < 3;
        if (!isOccupied && !isNearCenter) {
          isValid = true;
        }
        attempts++;
      }
      if (isValid) obs.push(pos);
    }
    return obs;
  }, [diff]);

  /* ── Particle burst ── */
  const burst = useCallback((cx: number, cy: number, colors: string[]) => {
    const newP: Particle[] = Array.from({ length: 10 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 16 + Math.random() * 24;
      return {
        id: ++particleId.current,
        x: cx, y: cy,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - (8 + Math.random() * 18),
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: SNAKE_PARTICLE_MS + Math.random() * 120,
        size: 4 + Math.random() * 3,
      };
    });
    setParticles(prev => [...prev.slice(-18), ...newP]);
    newP.forEach((particle) => {
      safeTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== particle.id));
      }, particle.duration);
    });
  }, [safeTimeout]);

  /* ── Particle animation loop (delta-time ile FPS bağımsız) ── */

  /* ── Start game ── */
  const startGame = useCallback(() => {
    const center = Math.floor(GRID / 2);
    const init = [{ x: center, y: center }, { x: center - 1, y: center }, { x: center - 2, y: center }];
    const obs = spawnObstacles(init);
    setSnake(init); snakeRef.current = init;
    setObstacles(obs); obstaclesRef.current = obs;
    const initialFood = spawnFood(init, obs);
    setFood(initialFood); foodRef.current = initialFood;
    setDir('RIGHT'); dirRef.current = 'RIGHT';
    inputQueueRef.current = [];
    if (comboTimerRef.current) { clearTimeout(comboTimerRef.current); comboTimerRef.current = null; }
    scoreRef.current = 0;
    setScore(0); setSpeed(cfg.speed); setCombo(0); comboRef.current = 0; setEaten(0); setIsNewRecord(false);
    setParticles([]);
    setGameState('playing');
  }, [spawnFood, spawnObstacles, cfg.speed]);

  /* ── Game over helper ── */
  const endGame = useCallback(() => {
    playErrorSound();
    setScreenShake(true);
    safeTimeout(() => setScreenShake(false), 400);
    setGameState('gameover');
    const s = scoreRef.current;
    const isNew = saveHighScoreObj('snake', s);
    if (isNew) { setIsNewRecord(true); setHighScore(s); playNewRecordSound(); }
  }, [safeTimeout]);

  /* ── Game loop ── */
  useEffect(() => {
    clearAllIntervals();
    if (gameState !== 'playing') { return; }

    safeInterval(() => {
      const cur = [...snakeRef.current];
      const head = { ...cur[0] };
      const currentFood = foodRef.current;
      const currentObs = obstaclesRef.current;

      let nextDir = dirRef.current;
      if (inputQueueRef.current.length > 0) {
        nextDir = inputQueueRef.current.shift()!;
        dirRef.current = nextDir;
        setDir(nextDir);
      }

      if (nextDir === 'UP') head.y -= 1;
      if (nextDir === 'DOWN') head.y += 1;
      if (nextDir === 'LEFT') head.x -= 1;
      if (nextDir === 'RIGHT') head.x += 1;

      if (cfg.wrap) {
        head.x = (head.x + GRID) % GRID;
        head.y = (head.y + GRID) % GRID;
      } else if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        endGame(); return;
      }
      if (cur.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }
      if (currentObs.some(o => o.x === head.x && o.y === head.y)) { endGame(); return; }

      const ns = [head, ...cur];

      if (head.x === currentFood.x && head.y === currentFood.y) {
        comboRef.current += 1;
        const nc = comboRef.current;
        setCombo(nc);
        setEaten(p => p + 1);
        const pts = FOOD_STYLES[currentFood.type].points + Math.min(nc, 5) * 2;

        scoreRef.current += pts;
        setScore(scoreRef.current);

        if (nc > 2) playComboSound(nc); else playSuccessSound();

        // Reset combo after 3 seconds of not eating anything
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = safeTimeout(() => {
          comboRef.current = 0;
          setCombo(0);
          comboTimerRef.current = null;
        }, 3000);

        // Particle burst at food position
        burst(currentFood.x * CELL + CELL / 2, currentFood.y * CELL + CELL / 2, FOOD_STYLES[currentFood.type].colors);

        const eatenType = currentFood.type; // capture before update
        const newFood = spawnFood(ns, currentObs);
        setFood(newFood); foodRef.current = newFood;

        if (eatenType === 'speed') {
          // Lightning bolt now gives a SMALL SPEED REWARD (slows down) instead of penalty
          setSpeed(p => Math.min(cfg.speed, p + 20));
        } else {
          // Gradual speed increase (more noticeable than before)
          setSpeed(p => Math.max(40, p - 1.5));
        }
        if (eatenType === 'shrink' && ns.length > 4) { ns.pop(); ns.pop(); }
        if (eatenType === 'golden') fireConfetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } else {
        ns.pop();
      }

      setSnake(ns); snakeRef.current = ns;
    }, speed);
  }, [gameState, speed, cfg.speed, cfg.wrap, spawnFood, endGame, burst, safeInterval, clearAllIntervals, safeTimeout]);

  /* ── Keyboard ── */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      const lastDir = inputQueueRef.current.length > 0 ? inputQueueRef.current[inputQueueRef.current.length - 1] : dirRef.current;

      const map: Record<string, [Dir, Dir]> = {
        ArrowUp: ['UP', 'DOWN'], w: ['UP', 'DOWN'], ArrowDown: ['DOWN', 'UP'], s: ['DOWN', 'UP'],
        ArrowLeft: ['LEFT', 'RIGHT'], a: ['LEFT', 'RIGHT'], ArrowRight: ['RIGHT', 'LEFT'], d: ['RIGHT', 'LEFT'],
      };

      const entry = map[e.key];
      if (entry && lastDir !== entry[1] && lastDir !== entry[0]) {
        e.preventDefault();
        if (inputQueueRef.current.length < 3) inputQueueRef.current.push(entry[0]);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [gameState]);

  /* ── Touch event listeners directly on board for passive: false ── */
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (!touchStart.current || gameState !== 'playing') return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;

      const lastDir = inputQueueRef.current.length > 0 ? inputQueueRef.current[inputQueueRef.current.length - 1] : dirRef.current;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && lastDir !== 'LEFT' && lastDir !== 'RIGHT') inputQueueRef.current.push('RIGHT');
        if (dx < -20 && lastDir !== 'RIGHT' && lastDir !== 'LEFT') inputQueueRef.current.push('LEFT');
      } else {
        if (dy > 20 && lastDir !== 'UP' && lastDir !== 'DOWN') inputQueueRef.current.push('DOWN');
        if (dy < -20 && lastDir !== 'DOWN' && lastDir !== 'UP') inputQueueRef.current.push('UP');
      }
      touchStart.current = null;
    };

    board.addEventListener('touchstart', handleTouchStart, { passive: false });
    board.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchend', handleTouchEnd);
    }
  }, [gameState]);

  /* ── Snake color gradient ── */
  const segColor = (i: number, total: number) => {
    const hue = 145 + (i / Math.max(total, 1)) * 60;
    const sat = 80 - (i / Math.max(total, 1)) * 15;
    const lit = 55 - (i / Math.max(total, 1)) * 12;
    return `hsl(${hue}, ${sat}%, ${lit}%)`;
  };

  /* ── Eye direction offsets ── */
  const eyeOffset = (d: Dir): { lx: number; ly: number; rx: number; ry: number } => {
    switch (d) {
      case 'UP': return { lx: -3, ly: -2, rx: 3, ry: -2 };
      case 'DOWN': return { lx: -3, ly: 2, rx: 3, ry: 2 };
      case 'LEFT': return { lx: -2, ly: -3, rx: -2, ry: 3 };
      case 'RIGHT': return { lx: 2, ly: -3, rx: 2, ry: 3 };
    }
  };

  /* ── Segment connection (rounded fluid body) ── */
  const getSegmentRadius = (i: number, total: number) => {
    if (i === 0) return CELL * 0.45; // Head is round
    if (i === total - 1) return CELL * 0.35; // Tail tapers
    return CELL * 0.38;
  };

  /* ═══════════════════════════════════════════
     MENU
     ═══════════════════════════════════════════ */
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div className="text-7xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(52,211,153,0.3))' }}
          animate={{ x: [0, 12, 0, -12, 0], rotate: [0, 3, 0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>🐍</motion.div>
        <h2 className="text-4xl md:text-5xl font-black text-gradient">Yılan Oyunu</h2>
        {highScore > 0 && (
          <div className="px-5 py-2.5" style={pill}><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>
        )}
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <p className="text-xs font-bold text-muted-foreground text-center uppercase tracking-wider">Zorluk Seç</p>
          {(Object.entries(DIFFS) as [Diff, typeof DIFFS['easy']][]).map(([key, val]) => (
            <motion.button key={key} onClick={() => setDiff(key)}
              whileHover={{}} whileTap={{}}
              className="p-4 text-left touch-manipulation transition-all"
              style={{ ...pill, background: diff === key ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)', border: diff === key ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{val.emoji}</span>
                <div>
                  <p className="font-bold text-sm">{val.label}</p>
                  <p className="text-xs text-muted-foreground">{val.desc}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        <div className="p-4 text-center text-sm space-y-1" style={pill}>
          <p className="font-bold">🎮 Ok tuşları / WASD / Kaydır</p>
          <p className="text-muted-foreground text-xs">⭐ Altın=50 | ⚡ Yavaşlatır | ✂️ Kısalt</p>
        </div>
        <Leaderboard gameId="snake" />

        <motion.button onClick={startGame} className="btn-gaming px-12 py-4 text-lg"
          whileHover={{ y: -2 }} whileTap={{}}>🚀 BAŞLA!</motion.button>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════
     PLAYING + GAMEOVER
     ═══════════════════════════════════════════ */
  const eyes = eyeOffset(dir);
  const foodStyle = FOOD_STYLES[food.type];

  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))]"
      initial={{ opacity: 0 }} animate={{ opacity: 1, x: screenShake ? [0, -5, 5, -4, 4, 0] : 0 }}
      transition={screenShake ? { duration: 0.35 } : { duration: 0.4 }}>

      {/* ── HUD ── */}
      <motion.div className="flex gap-2 items-center flex-wrap justify-center"
        initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-primary">⭐ {score}</span></div>
        <div className="px-4 py-2" style={pill}><span className="text-sm font-bold text-muted-foreground">📏 {snake.length}</span></div>
        {combo > 1 && (
          <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: [0.5, 1.2, 1] }}
            className="px-4 py-2" style={{ ...pill, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <span className="text-sm font-black text-yellow-400">🔥 x{combo}</span>
          </motion.div>
        )}
        <div className="px-4 py-2" style={pill}><span className="text-xs font-bold text-muted-foreground">🏆 {highScore}</span></div>
      </motion.div>

      {/* ── Game Field ── */}
      {/* Outer wrapper: scale sonrası gerçek görünen boyutu yansıtır */}
      <div style={{
        width: (FIELD + 8) * boardScale,
        height: (FIELD + 8) * boardScale,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}>
        <div className="relative overflow-hidden"
          ref={boardRef}
          role="application"
          aria-label="Snake Game Board"
          style={{
            width: FIELD + 8, height: FIELD + 8, padding: 4,
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
            transform: `scale(${boardScale})`,
            transformOrigin: 'top left',
          }}>

          {/* Grass texture background */}
          <div className="absolute inset-0" style={{
            borderRadius: 20,
            background: `
            radial-gradient(ellipse at 30% 20%, rgba(52,211,153,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(34,197,94,0.06) 0%, transparent 50%),
            linear-gradient(180deg, hsl(150 20% 10%) 0%, hsl(155 25% 8%) 100%)
          `,
          }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            borderRadius: 20,
            backgroundImage: `
            linear-gradient(rgba(52,211,153,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(52,211,153,0.4) 1px, transparent 1px)
          `,
            backgroundSize: `${CELL}px ${CELL}px`,
          }} />
          {/* Grass texture dots */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, rgba(52,211,153,0.8) 0.5px, transparent 0.5px)',
            backgroundSize: '8px 8px',
          }} />

          {/* Obstacles */}
          {obstacles.map((o, i) => (
            <div key={`obs-${i}`} className="absolute" style={{
              width: CELL - 2, height: CELL - 2,
              left: o.x * CELL + 5, top: o.y * CELL + 5,
              borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(100,116,139,0.8), rgba(71,85,105,0.9))',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }} />
          ))}

          {/* Food — pulsing glow + wobble */}
          <motion.div className="absolute z-10 flex items-center justify-center"
            style={{
              width: CELL + 4, height: CELL + 4,
              left: food.x * CELL + 2, top: food.y * CELL + 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${foodStyle.colors[0]}, ${foodStyle.colors[2]})`,
              boxShadow: `0 0 16px ${foodStyle.glow}, 0 0 32px ${foodStyle.glow}`,
            }}
            animate={{ scale: [1, 1.18, 1], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}>
            <span className="text-sm select-none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}>{foodStyle.emoji}</span>
          </motion.div>

          {/* Snake — fluid rounded segments */}
          {snake.map((seg, i) => {
            const isHead = i === 0;
            const isTail = i === snake.length - 1;
            const color = segColor(i, snake.length);
            const radius = getSegmentRadius(i, snake.length);
            const size = isHead ? CELL + 2 : isTail ? CELL - 4 : CELL - 1;
            const offset = isHead ? -1 : isTail ? 2 : 0.5;

            return (
              <div key={`s-${i}`} className="absolute z-20"
                style={{
                  width: size, height: size,
                  left: seg.x * CELL + 4 + offset, top: seg.y * CELL + 4 + offset,
                  borderRadius: radius,
                  background: isHead
                    ? `radial-gradient(circle at 35% 35%, ${color}, hsl(145, 80%, 35%))`
                    : `radial-gradient(circle at 40% 40%, ${color}, ${segColor(i + 1, snake.length)})`,
                  boxShadow: isHead
                    ? `0 0 12px ${color}80, 0 2px 8px rgba(0,0,0,0.3)`
                    : `0 1px 4px rgba(0,0,0,0.2)`,
                }}>
                {/* Eyes on head */}
                {isHead && (
                  <>
                    <div className="absolute bg-white rounded-full" style={{ width: 5, height: 6, left: `calc(50% + ${eyes.lx}px)`, top: `calc(50% + ${eyes.ly}px)`, transform: 'translate(-50%,-50%)', boxShadow: '0 0 3px rgba(255,255,255,0.5)' }}>
                      <div className="absolute bg-gray-900 rounded-full" style={{ width: 2.5, height: 3, left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }} />
                    </div>
                    <div className="absolute bg-white rounded-full" style={{ width: 5, height: 6, left: `calc(50% + ${eyes.rx}px)`, top: `calc(50% + ${eyes.ry}px)`, transform: 'translate(-50%,-50%)', boxShadow: '0 0 3px rgba(255,255,255,0.5)' }}>
                      <div className="absolute bg-gray-900 rounded-full" style={{ width: 2.5, height: 3, left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Particles */}
          {particles.map(p => (
            <motion.div key={p.id} className="absolute z-30 rounded-full pointer-events-none"
              style={{
                width: p.size, height: p.size,
                left: p.x + 4, top: p.y + 4,
                background: p.color,
                boxShadow: `0 0 6px ${p.color}`,
              }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.9 }}
              animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 0.2 }}
              transition={{ duration: p.duration / 1000, ease: 'easeOut' }}
            />
          ))}

          {/* ── GAME OVER OVERLAY ── */}
          <AnimatePresence>
            {gameState === 'gameover' && (
              <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3"
                style={{ borderRadius: 20, background: 'rgba(0,0,0,0.82)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <motion.p className="text-3xl font-black text-gradient"
                  initial={{ scale: 0, y: 30 }} animate={{ scale: [0, 1.3, 1], y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                  Game Over!
                </motion.p>
                {isNewRecord && (
                  <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}
                    className="font-black text-sm" style={{ color: '#fbbf24' }}>🏆 YENİ REKOR!</motion.p>
                )}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-center space-y-1">
                  <p className="text-xl font-bold text-white">{score} Puan</p>
                  <p className="text-xs text-white/60">📏 {snake.length} uzunluk · 🍎 {eaten} yenen</p>
                </motion.div>
                <motion.div className="flex gap-2 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={startGame}
                    className="btn-gaming px-5 py-2 text-sm">🔄 Tekrar</motion.button>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => setGameState('menu')}
                    className="px-5 py-2 font-bold text-xs text-white/60 touch-manipulation" style={pill}>← Menü</motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile D-pad ── */}
      <div className="grid grid-cols-3 gap-3 w-56 md:hidden mt-2" role="group" aria-label="Game Controls">
        <div />
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { if (dirRef.current !== 'DOWN') inputQueueRef.current.push('UP'); }}
          className="flex items-center justify-center text-3xl touch-manipulation p-5" style={{ ...pill, borderRadius: 16 }} aria-label="Move Up">⬆️</motion.button>
        <div />
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { if (dirRef.current !== 'RIGHT') inputQueueRef.current.push('LEFT'); }}
          className="flex items-center justify-center text-3xl touch-manipulation p-5" style={{ ...pill, borderRadius: 16 }} aria-label="Move Left">⬅️</motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { if (dirRef.current !== 'UP') inputQueueRef.current.push('DOWN'); }}
          className="flex items-center justify-center text-3xl touch-manipulation p-5" style={{ ...pill, borderRadius: 16 }} aria-label="Move Down">⬇️</motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { if (dirRef.current !== 'LEFT') inputQueueRef.current.push('RIGHT'); }}
          className="flex items-center justify-center text-3xl touch-manipulation p-5" style={{ ...pill, borderRadius: 16 }} aria-label="Move Right">➡️</motion.button>
      </div>
    </motion.div>
  );
};

export default SnakeGame;
