'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

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

interface Particle { id: number; x: number; y: number; vx: number; vy: number; color: string; life: number; }

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

/* Glassmorphism pill style */
const pill: React.CSSProperties = {
  background: 'rgba(0,0,0,0.25)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
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
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snakeRef = useRef(snake);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const particleId = useRef(0);

  const animRef = useRef<number>(0);
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
    let pos: Pos;
    do { pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
    while (s.some(p => p.x === pos.x && p.y === pos.y) || obs.some(o => o.x === pos.x && o.y === pos.y));
    const r = Math.random();
    const type: FoodKind = r < 0.08 ? 'golden' : r < 0.15 ? 'speed' : r < 0.2 ? 'shrink' : 'normal';
    return { ...pos, type };
  }, []);

  const spawnObstacles = useCallback((s: Pos[]): Pos[] => {
    if (!DIFFS[diff].obstacles) return [];
    const obs: Pos[] = [];
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      let pos: Pos;
      do { pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
      while (s.some(p => p.x === pos.x && p.y === pos.y) || obs.some(o => o.x === pos.x && o.y === pos.y) || (Math.abs(pos.x - 9) < 3 && Math.abs(pos.y - 9) < 3));
      obs.push(pos);
    }
    return obs;
  }, [diff]);

  /* ── Particle burst ── */
  const burst = useCallback((cx: number, cy: number, colors: string[]) => {
    const newP: Particle[] = Array.from({ length: 10 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      return {
        id: ++particleId.current,
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      };
    });
    setParticles(prev => [...prev, ...newP]);
  }, []);

  /* ── Particle animation loop ── */
  useEffect(() => {
    if (particles.length === 0) return;
    const tick = () => {
      setParticles(prev => {
        const next = prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.08, life: p.life - 0.03 })).filter(p => p.life > 0);
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [particles.length > 0]);

  /* ── Start game ── */
  const startGame = useCallback(() => {
    const init = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
    const obs = spawnObstacles(init);
    setSnake(init); snakeRef.current = init;
    setObstacles(obs);
    setFood(spawnFood(init, obs));
    setDir('RIGHT'); dirRef.current = 'RIGHT';
    setScore(0); setSpeed(cfg.speed); setCombo(0); setEaten(0); setIsNewRecord(false);
    setParticles([]);
    setGameState('playing');
  }, [spawnFood, spawnObstacles, cfg.speed]);

  /* ── Game over helper ── */
  const endGame = useCallback(() => {
    playErrorSound();
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
    setGameState('gameover');
    const s = snakeRef.current.length * 10;
    setScore(s);
    const isNew = saveHighScoreObj('snake', s);
    if (isNew) { setIsNewRecord(true); setHighScore(s); playNewRecordSound(); }
  }, []);

  /* ── Game loop ── */
  useEffect(() => {
    if (gameState !== 'playing') { if (loopRef.current) clearInterval(loopRef.current); return; }
    loopRef.current = setInterval(() => {
      const cur = [...snakeRef.current];
      const head = { ...cur[0] };
      const d = dirRef.current;
      if (d === 'UP') head.y -= 1;
      if (d === 'DOWN') head.y += 1;
      if (d === 'LEFT') head.x -= 1;
      if (d === 'RIGHT') head.x += 1;

      if (cfg.wrap) {
        head.x = (head.x + GRID) % GRID;
        head.y = (head.y + GRID) % GRID;
      } else if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        endGame(); return;
      }
      if (cur.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }
      if (obstacles.some(o => o.x === head.x && o.y === head.y)) { endGame(); return; }

      const ns = [head, ...cur];

      if (head.x === food.x && head.y === food.y) {
        const nc = combo + 1;
        setCombo(nc);
        setEaten(p => p + 1);
        const pts = FOOD_STYLES[food.type].points + Math.min(nc, 5) * 2;
        setScore(p => p + pts);
        if (nc > 2) playComboSound(nc); else playSuccessSound();

        // Particle burst at food position
        burst(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, FOOD_STYLES[food.type].colors);

        setFood(spawnFood(ns, obstacles));
        if (food.type === 'speed') setSpeed(p => Math.max(50, p - 12));
        if (food.type === 'shrink' && ns.length > 4) { ns.pop(); ns.pop(); }
        if (food.type === 'golden') confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        // Gradual eased speed increase
        setSpeed(p => Math.max(50, p - 0.8));
      } else {
        ns.pop();
        setCombo(0);
      }

      setSnake(ns); snakeRef.current = ns;
    }, speed);
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [gameState, speed, food, obstacles, combo, cfg.wrap, spawnFood, endGame, burst]);

  /* ── Keyboard ── */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const d = dirRef.current;
      const map: Record<string, [Dir, Dir]> = {
        ArrowUp: ['UP', 'DOWN'], w: ['UP', 'DOWN'], ArrowDown: ['DOWN', 'UP'], s: ['DOWN', 'UP'],
        ArrowLeft: ['LEFT', 'RIGHT'], a: ['LEFT', 'RIGHT'], ArrowRight: ['RIGHT', 'LEFT'], d: ['RIGHT', 'LEFT'],
      };
      const entry = map[e.key];
      if (entry && d !== entry[1]) { e.preventDefault(); setDir(entry[0]); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [gameState]);

  /* ── Touch swipe ── */
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const d = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && d !== 'LEFT') setDir('RIGHT');
      if (dx < -20 && d !== 'RIGHT') setDir('LEFT');
    } else {
      if (dy > 20 && d !== 'UP') setDir('DOWN');
      if (dy < -20 && d !== 'DOWN') setDir('UP');
    }
    touchStart.current = null;
  };

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
  const getSegmentRadius = (i: number, total: number, prev?: Pos, next?: Pos, cur?: Pos) => {
    if (i === 0) return CELL * 0.45; // Head is round
    if (i === total - 1) return CELL * 0.35; // Tail tapers
    return CELL * 0.38;
  };

  /* ═══════════════════════════════════════════
     MENU
     ═══════════════════════════════════════════ */
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-5 pb-32 max-w-lg mx-auto"
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
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
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
          <p className="text-muted-foreground text-xs">⭐ Altın=50 | ⚡ Hız | ✂️ Kısalt</p>
        </div>
        <motion.button onClick={startGame} className="btn-gaming px-12 py-4 text-lg"
          whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>🚀 BAŞLA!</motion.button>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════
     PLAYING + GAMEOVER
     ═══════════════════════════════════════════ */
  const eyes = eyeOffset(dir);
  const foodStyle = FOOD_STYLES[food.type];

  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-32"
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
          style={{
            width: FIELD + 8, height: FIELD + 8, padding: 4,
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
            transform: `scale(${boardScale})`,
            transformOrigin: 'top left',
          }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

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
            <div key={p.id} className="absolute z-30 rounded-full pointer-events-none"
              style={{
                width: 5, height: 5,
                left: p.x + 4, top: p.y + 4,
                background: p.color,
                opacity: p.life,
                boxShadow: `0 0 6px ${p.color}`,
                transition: 'opacity 0.05s',
              }} />
          ))}

          {/* ── GAME OVER OVERLAY ── */}
          <AnimatePresence>
            {gameState === 'gameover' && (
              <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3"
                style={{ borderRadius: 20, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
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
      <div className="grid grid-cols-3 gap-2 w-40 md:hidden mt-1">
        <div />
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => dirRef.current !== 'DOWN' && setDir('UP')}
          className="flex items-center justify-center text-lg touch-manipulation p-3" style={{ ...pill, borderRadius: 14 }}>⬆️</motion.button>
        <div />
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => dirRef.current !== 'RIGHT' && setDir('LEFT')}
          className="flex items-center justify-center text-lg touch-manipulation p-3" style={{ ...pill, borderRadius: 14 }}>⬅️</motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => dirRef.current !== 'UP' && setDir('DOWN')}
          className="flex items-center justify-center text-lg touch-manipulation p-3" style={{ ...pill, borderRadius: 14 }}>⬇️</motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => dirRef.current !== 'LEFT' && setDir('RIGHT')}
          className="flex items-center justify-center text-lg touch-manipulation p-3" style={{ ...pill, borderRadius: 14 }}>➡️</motion.button>
      </div>
    </motion.div>
  );
};

export default SnakeGame;
