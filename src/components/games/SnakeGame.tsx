'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

const GRID_SIZE = 20;
const CELL_SIZE = 18;
const INITIAL_SPEED = 150;
const MIN_SPEED = 60;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snakeRef = useRef(snake);

  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { directionRef.current = direction; }, [direction]);

  // Yem oluştur
  const spawnFood = useCallback((currentSnake: Position[]): Position => {
    let pos: Position;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }, []);

  // Oyunu başlat
  const startGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setFood(spawnFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameState('playing');
  }, [spawnFood]);

  // Oyun döngüsü
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    gameLoopRef.current = setInterval(() => {
      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = directionRef.current;

      // Yön hesapla
      if (dir === 'UP') head.y -= 1;
      if (dir === 'DOWN') head.y += 1;
      if (dir === 'LEFT') head.x -= 1;
      if (dir === 'RIGHT') head.x += 1;

      // Duvar çarpışması
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        playErrorSound();
        setGameState('gameover');
        setHighScore(prev => {
          const s = snakeRef.current.length - 3;
          return Math.max(prev, s);
        });
        return;
      }

      // Kendine çarpma
      if (currentSnake.some(s => s.x === head.x && s.y === head.y)) {
        playErrorSound();
        setGameState('gameover');
        setHighScore(prev => Math.max(prev, currentSnake.length - 3));
        return;
      }

      const newSnake = [head, ...currentSnake];

      // Yem yeme
      if (head.x === food.x && head.y === food.y) {
        playSuccessSound();
        setScore(prev => prev + 10);
        setFood(spawnFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - 3));

        if ((newSnake.length - 3) % 10 === 0) {
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        }
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
      snakeRef.current = newSnake;
    }, speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, speed, food, spawnFood]);

  // Klavye kontrolü
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const dir = directionRef.current;

      if ((e.key === 'ArrowUp' || e.key === 'w') && dir !== 'DOWN') {
        e.preventDefault();
        setDirection('UP');
      }
      if ((e.key === 'ArrowDown' || e.key === 's') && dir !== 'UP') {
        e.preventDefault();
        setDirection('DOWN');
      }
      if ((e.key === 'ArrowLeft' || e.key === 'a') && dir !== 'RIGHT') {
        e.preventDefault();
        setDirection('LEFT');
      }
      if ((e.key === 'ArrowRight' || e.key === 'd') && dir !== 'LEFT') {
        e.preventDefault();
        setDirection('RIGHT');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  // Mobil swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

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

  // Yılan renk gradyanı
  const getSegmentColor = (index: number, total: number) => {
    const hue = 185 + (index / total) * 85; // cyan → purple
    const lightness = 55 - (index / total) * 15;
    return `hsl(${hue}, 100%, ${lightness}%)`;
  };

  const gridWidth = GRID_SIZE * CELL_SIZE;

  // MENÜ
  if (gameState === 'menu') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-6 pb-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-black text-gradient">🐍 Snake</h2>
          <p className="text-muted-foreground font-medium">Klasik yılan oyunu, neon versiyonu!</p>
        </div>

        <div className="glass-card p-6 space-y-3 text-center neon-border">
          <p className="text-sm text-muted-foreground">🎮 Ok tuşları veya WASD ile yönlendir</p>
          <p className="text-sm text-muted-foreground">📱 Mobilde kaydır (swipe)</p>
          <p className="text-sm text-muted-foreground">⭐ Yemleri ye, büyü!</p>
        </div>

        {highScore > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
            <span className="text-lg">🏆</span>
            <span className="font-black text-primary">Rekor: {highScore}</span>
          </div>
        )}

        <button
          onClick={startGame}
          className="btn-gaming px-10 py-4 text-lg"
        >
          🚀 BAŞLA
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-4 p-4 pb-32"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Skor bar */}
      <div className="flex gap-3 items-center">
        <div className="glass-card px-4 py-2 neon-border">
          <span className="text-lg font-black text-primary">⭐ {score}</span>
        </div>
        <div className="glass-card px-4 py-2">
          <span className="text-lg font-black text-muted-foreground">📏 {snake.length - 3}</span>
        </div>
        <div className="glass-card px-4 py-2">
          <span className="text-sm font-bold text-secondary">🏆 {highScore}</span>
        </div>
      </div>

      {/* Oyun alanı */}
      <div
        className="relative rounded-2xl overflow-hidden neon-border"
        style={{
          width: gridWidth + 4,
          height: gridWidth + 4,
          background: 'hsl(230 20% 8%)',
          padding: 2,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(hsl(185 100% 55% / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(185 100% 55% / 0.1) 1px, transparent 1px)`,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />

        {/* Yem */}
        <motion.div
          className="absolute rounded-full z-10"
          style={{
            width: CELL_SIZE - 2,
            height: CELL_SIZE - 2,
            left: food.x * CELL_SIZE + 1,
            top: food.y * CELL_SIZE + 1,
            background: 'radial-gradient(circle, hsl(0 90% 65%), hsl(350 90% 50%))',
            boxShadow: '0 0 12px hsl(0 90% 65% / 0.6), 0 0 24px hsl(0 90% 65% / 0.3)',
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />

        {/* Yılan */}
        {snake.map((segment, i) => {
          const isHead = i === 0;
          const color = getSegmentColor(i, snake.length);
          return (
            <motion.div
              key={`${segment.x}-${segment.y}-${i}`}
              className="absolute z-20"
              style={{
                width: CELL_SIZE - (isHead ? 0 : 2),
                height: CELL_SIZE - (isHead ? 0 : 2),
                left: segment.x * CELL_SIZE + (isHead ? 0 : 1),
                top: segment.y * CELL_SIZE + (isHead ? 0 : 1),
                background: color,
                borderRadius: isHead ? '6px' : '4px',
                boxShadow: isHead
                  ? `0 0 10px ${color}, 0 0 20px ${color}40`
                  : `0 0 4px ${color}40`,
              }}
              initial={false}
              animate={{ scale: isHead ? 1 : 0.9 }}
            >
              {/* Baş gözleri */}
              {isHead && (
                <div className="absolute inset-0 flex items-center justify-center gap-1">
                  <div className="w-1.5 h-2 bg-white rounded-full" />
                  <div className="w-1.5 h-2 bg-white rounded-full" />
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Game Over overlay */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4"
              style={{ background: 'hsl(230 20% 7% / 0.85)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.p
                className="text-3xl font-black text-gradient"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                Game Over!
              </motion.p>
              <p className="text-xl font-bold text-foreground">Skor: {score}</p>
              <p className="text-sm text-muted-foreground">Uzunluk: {snake.length - 3}</p>

              <div className="flex gap-3 mt-2">
                <button onClick={startGame} className="btn-gaming px-6 py-3">
                  🔄 Tekrar
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 font-bold text-sm text-muted-foreground hover:bg-white/10 transition-colors"
                >
                  ← Menü
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobil kontroller */}
      <div className="grid grid-cols-3 gap-2 w-40 md:hidden">
        <div />
        <button
          onClick={() => directionRef.current !== 'DOWN' && setDirection('UP')}
          className="glass-card p-3 flex items-center justify-center text-xl active:scale-90 transition-transform neon-border"
        >
          ⬆️
        </button>
        <div />
        <button
          onClick={() => directionRef.current !== 'RIGHT' && setDirection('LEFT')}
          className="glass-card p-3 flex items-center justify-center text-xl active:scale-90 transition-transform neon-border"
        >
          ⬅️
        </button>
        <button
          onClick={() => directionRef.current !== 'UP' && setDirection('DOWN')}
          className="glass-card p-3 flex items-center justify-center text-xl active:scale-90 transition-transform neon-border"
        >
          ⬇️
        </button>
        <button
          onClick={() => directionRef.current !== 'LEFT' && setDirection('RIGHT')}
          className="glass-card p-3 flex items-center justify-center text-xl active:scale-90 transition-transform neon-border"
        >
          ➡️
        </button>
      </div>
    </motion.div>
  );
};

export default SnakeGame;
