'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

const GRID_SIZE = 18;
const CELL_SIZE = 18;
const INITIAL_SPEED = 150;
const MIN_SPEED = 55;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type FoodType = 'normal' | 'golden' | 'speed' | 'shrink';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: Record<Difficulty, { label: string; speed: number; wrap: boolean; obstacles: boolean }> = {
  easy: { label: '🌟 Kolay', speed: 170, wrap: true, obstacles: false },
  medium: { label: '⭐ Orta', speed: 140, wrap: false, obstacles: false },
  hard: { label: '🔥 Zor', speed: 110, wrap: false, obstacles: true },
};

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 9, y: 9 }]);
  const [food, setFood] = useState<Position & { type: FoodType }>({ x: 14, y: 9, type: 'normal' });
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [combo, setCombo] = useState(0);
  const [eatenCount, setEatenCount] = useState(0);

  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snakeRef = useRef(snake);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { setHighScore(getHighScore('snake')); }, []);

  const config = DIFFICULTIES[difficulty];

  const spawnFood = useCallback((currentSnake: Position[], obs: Position[] = []): Position & { type: FoodType } => {
    let pos: Position;
    do {
      pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    } while (currentSnake.some(s => s.x === pos.x && s.y === pos.y) || obs.some(o => o.x === pos.x && o.y === pos.y));
    const rand = Math.random();
    const type: FoodType = rand < 0.08 ? 'golden' : rand < 0.15 ? 'speed' : rand < 0.2 ? 'shrink' : 'normal';
    return { ...pos, type };
  }, []);

  const spawnObstacles = useCallback((currentSnake: Position[]): Position[] => {
    if (!DIFFICULTIES[difficulty].obstacles) return [];
    const obs: Position[] = [];
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      let pos: Position;
      do {
        pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      } while (currentSnake.some(s => s.x === pos.x && s.y === pos.y) || obs.some(o => o.x === pos.x && o.y === pos.y) || (Math.abs(pos.x - 9) < 3 && Math.abs(pos.y - 9) < 3));
      obs.push(pos);
    }
    return obs;
  }, [difficulty]);

  const startGame = useCallback(() => {
    const initialSnake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
    const obs = spawnObstacles(initialSnake);
    setSnake(initialSnake); snakeRef.current = initialSnake;
    setObstacles(obs);
    setFood(spawnFood(initialSnake, obs));
    setDirection('RIGHT'); directionRef.current = 'RIGHT';
    setScore(0); setSpeed(config.speed); setCombo(0); setEatenCount(0); setIsNewRecord(false);
    setGameState('playing');
  }, [spawnFood, spawnObstacles, config.speed]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') { if (gameLoopRef.current) clearInterval(gameLoopRef.current); return; }
    gameLoopRef.current = setInterval(() => {
      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = directionRef.current;
      if (dir === 'UP') head.y -= 1;
      if (dir === 'DOWN') head.y += 1;
      if (dir === 'LEFT') head.x -= 1;
      if (dir === 'RIGHT') head.x += 1;

      // Wrap or wall collision
      if (config.wrap) {
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;
      } else if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        playErrorSound();
        setGameState('gameover');
        const s = snakeRef.current.length * 10;
        const isNew = saveHighScoreObj('snake', s);
        if (isNew) { setIsNewRecord(true); setHighScore(s); playNewRecordSound(); }
        return;
      }

      // Self collision
      if (currentSnake.some(s => s.x === head.x && s.y === head.y)) {
        playErrorSound(); setGameState('gameover');
        const s = snakeRef.current.length * 10;
        const isNew = saveHighScoreObj('snake', s);
        if (isNew) { setIsNewRecord(true); setHighScore(s); playNewRecordSound(); }
        return;
      }

      // Obstacle collision
      if (obstacles.some(o => o.x === head.x && o.y === head.y)) {
        playErrorSound(); setGameState('gameover');
        const s = snakeRef.current.length * 10;
        const isNew = saveHighScoreObj('snake', s);
        if (isNew) { setIsNewRecord(true); setHighScore(s); playNewRecordSound(); }
        return;
      }

      const newSnake = [head, ...currentSnake];

      if (head.x === food.x && head.y === food.y) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        setEatenCount(prev => prev + 1);
        const points = food.type === 'golden' ? 50 : food.type === 'speed' ? 20 : food.type === 'shrink' ? 15 : 10;
        const comboBonus = Math.min(newCombo, 5) * 2;
        setScore(prev => prev + points + comboBonus);
        if (newCombo > 2) playComboSound(newCombo); else playSuccessSound();
        setFood(spawnFood(newSnake, obstacles));

        if (food.type === 'speed') setSpeed(prev => Math.max(MIN_SPEED, prev - 15));
        if (food.type === 'shrink' && newSnake.length > 4) { newSnake.pop(); newSnake.pop(); }
        if (food.type === 'golden') confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });

        setSpeed(prev => Math.max(MIN_SPEED, prev - 1));
        if ((newSnake.length - 3) % 10 === 0) confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      } else {
        newSnake.pop();
        setCombo(0);
      }

      setSnake(newSnake); snakeRef.current = newSnake;
    }, speed);
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [gameState, speed, food, obstacles, combo, config.wrap, spawnFood]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const dir = directionRef.current;
      const map: Record<string, [Direction, Direction]> = {
        ArrowUp: ['UP', 'DOWN'], w: ['UP', 'DOWN'], ArrowDown: ['DOWN', 'UP'], s: ['DOWN', 'UP'],
        ArrowLeft: ['LEFT', 'RIGHT'], a: ['LEFT', 'RIGHT'], ArrowRight: ['RIGHT', 'LEFT'], d: ['RIGHT', 'LEFT'],
      };
      const entry = map[e.key];
      if (entry && dir !== entry[1]) { e.preventDefault(); setDirection(entry[0]); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const dir = directionRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && dir !== 'LEFT') setDirection('RIGHT');
      if (dx < -20 && dir !== 'RIGHT') setDirection('LEFT');
    } else {
      if (dy > 20 && dir !== 'UP') setDirection('DOWN');
      if (dy < -20 && dir !== 'DOWN') setDirection('UP');
    }
    touchStart.current = null;
  };

  const getSegmentColor = (index: number, total: number) => {
    const hue = 185 + (index / total) * 85;
    const lightness = 55 - (index / total) * 15;
    return `hsl(${hue}, 100%, ${lightness}%)`;
  };

  const gridWidth = GRID_SIZE * CELL_SIZE;

  const foodColors: Record<FoodType, { bg: string; glow: string; emoji: string }> = {
    normal: { bg: 'radial-gradient(circle, hsl(0 90% 65%), hsl(350 90% 50%))', glow: '0 0 12px hsl(0 90% 65% / 0.6)', emoji: '' },
    golden: { bg: 'radial-gradient(circle, #fef08a, #f59e0b)', glow: '0 0 16px rgba(245,158,11,0.7)', emoji: '⭐' },
    speed: { bg: 'radial-gradient(circle, #67e8f9, #06b6d4)', glow: '0 0 16px rgba(6,182,212,0.7)', emoji: '⚡' },
    shrink: { bg: 'radial-gradient(circle, #c084fc, #9333ea)', glow: '0 0 16px rgba(147,51,234,0.7)', emoji: '✂️' },
  };

  // MENU
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-6 pb-32 max-w-xl mx-auto min-h-[60vh]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div className="text-6xl" animate={{ x: [0, 10, 0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🐍</motion.div>
        <h2 className="text-4xl font-black text-gradient">Snake</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-muted-foreground text-center">Zorluk Seç:</p>
          {(Object.entries(DIFFICULTIES) as [Difficulty, typeof DIFFICULTIES['easy']][]).map(([key, val]) => (
            <button key={key} onClick={() => setDifficulty(key)}
              className={`px-5 py-3 rounded-xl font-bold transition-all touch-manipulation ${difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`}>
              {val.label} {val.wrap ? '(Geçişli)' : ''} {val.obstacles ? '(Engelli)' : ''}
            </button>
          ))}
        </div>
        <div className="glass-card p-4 space-y-2 text-center text-sm neon-border">
          <p className="font-bold">🎮 Ok tuşları / WASD / Kaydır</p>
          <p className="text-muted-foreground">⭐ Altın = 50 puan | ⚡ Hız = Hızlan | ✂️ Kısalt</p>
        </div>
        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <div className="glass-card px-3 py-1 neon-border"><span className="text-sm font-black text-primary">⭐ {score}</span></div>
        <div className="glass-card px-3 py-1"><span className="text-sm font-black text-muted-foreground">📏 {snake.length}</span></div>
        {combo > 1 && <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1 border border-yellow-500/30"><span className="text-sm font-black text-yellow-400">🔥 x{combo}</span></motion.div>}
        <div className="glass-card px-3 py-1"><span className="text-xs font-bold text-muted-foreground">🏆 {highScore}</span></div>
      </div>

      <div className="relative rounded-2xl overflow-hidden neon-border" style={{ width: gridWidth + 4, height: gridWidth + 4, background: 'hsl(230 20% 8%)', padding: 2 }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `linear-gradient(hsl(185 100% 55% / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(185 100% 55% / 0.1) 1px, transparent 1px)`, backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px` }} />

        {/* Obstacles */}
        {obstacles.map((o, i) => (
          <div key={`obs-${i}`} className="absolute rounded-sm z-5" style={{ width: CELL_SIZE - 2, height: CELL_SIZE - 2, left: o.x * CELL_SIZE + 1, top: o.y * CELL_SIZE + 1, background: 'linear-gradient(135deg, #475569, #334155)', boxShadow: '0 0 6px rgba(71,85,105,0.5)' }} />
        ))}

        {/* Food */}
        <motion.div className="absolute rounded-full z-10" style={{ width: CELL_SIZE - 2, height: CELL_SIZE - 2, left: food.x * CELL_SIZE + 1, top: food.y * CELL_SIZE + 1, background: foodColors[food.type].bg, boxShadow: foodColors[food.type].glow }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
          {food.type !== 'normal' && <span className="absolute inset-0 flex items-center justify-center text-[10px]">{foodColors[food.type].emoji}</span>}
        </motion.div>

        {/* Snake */}
        {snake.map((segment, i) => {
          const isHead = i === 0;
          const color = getSegmentColor(i, snake.length);
          return (
            <motion.div key={`${segment.x}-${segment.y}-${i}`} className="absolute z-20"
              style={{ width: CELL_SIZE - (isHead ? 0 : 2), height: CELL_SIZE - (isHead ? 0 : 2), left: segment.x * CELL_SIZE + (isHead ? 0 : 1), top: segment.y * CELL_SIZE + (isHead ? 0 : 1), background: color, borderRadius: isHead ? '6px' : '4px', boxShadow: isHead ? `0 0 10px ${color}, 0 0 20px ${color}40` : `0 0 4px ${color}40` }}
              initial={false} animate={{ scale: isHead ? 1 : 0.9 }}>
              {isHead && <div className="absolute inset-0 flex items-center justify-center gap-1"><div className="w-1.5 h-2 bg-white rounded-full" /><div className="w-1.5 h-2 bg-white rounded-full" /></div>}
            </motion.div>
          );
        })}

        {/* Game Over */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3" style={{ background: 'hsl(230 20% 7% / 0.85)', backdropFilter: 'blur(8px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.p className="text-2xl font-black text-gradient" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}>Game Over!</motion.p>
              {isNewRecord && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-yellow-400 font-black animate-pulse">🏆 YENİ REKOR!</motion.p>}
              <p className="text-lg font-bold">Skor: {score}</p>
              <p className="text-xs text-muted-foreground">Uzunluk: {snake.length} | Yenen: {eatenCount}</p>
              <div className="flex gap-2 mt-1">
                <button onClick={startGame} className="btn-gaming px-5 py-2 text-sm">🔄 Tekrar</button>
                <button onClick={() => setGameState('menu')} className="px-5 py-2 rounded-xl border border-white/10 bg-white/5 font-bold text-xs text-muted-foreground touch-manipulation">← Menü</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 w-36 md:hidden">
        <div />
        <button onClick={() => directionRef.current !== 'DOWN' && setDirection('UP')} className="glass-card p-2.5 flex items-center justify-center text-lg active:scale-90 transition-transform touch-manipulation neon-border">⬆️</button>
        <div />
        <button onClick={() => directionRef.current !== 'RIGHT' && setDirection('LEFT')} className="glass-card p-2.5 flex items-center justify-center text-lg active:scale-90 transition-transform touch-manipulation neon-border">⬅️</button>
        <button onClick={() => directionRef.current !== 'UP' && setDirection('DOWN')} className="glass-card p-2.5 flex items-center justify-center text-lg active:scale-90 transition-transform touch-manipulation neon-border">⬇️</button>
        <button onClick={() => directionRef.current !== 'LEFT' && setDirection('RIGHT')} className="glass-card p-2.5 flex items-center justify-center text-lg active:scale-90 transition-transform touch-manipulation neon-border">➡️</button>
      </div>
    </motion.div>
  );
};

export default SnakeGame;
