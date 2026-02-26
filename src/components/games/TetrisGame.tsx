'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

const COLS = 10;
const ROWS = 16;
const INITIAL_DROP_TIME = 800;
const MIN_DROP_TIME = 100;

/** Neon renkli tetromino tanımları */
const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'from-cyan-400 to-cyan-500', solid: 'bg-cyan-400', glow: 'shadow-[0_0_12px_rgba(34,211,238,0.6)]' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'from-blue-500 to-blue-600', solid: 'bg-blue-500', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'from-orange-400 to-orange-500', solid: 'bg-orange-400', glow: 'shadow-[0_0_12px_rgba(251,146,60,0.6)]' },
  O: { shape: [[1, 1], [1, 1]], color: 'from-yellow-400 to-yellow-500', solid: 'bg-yellow-400', glow: 'shadow-[0_0_12px_rgba(250,204,21,0.6)]' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'from-green-400 to-green-500', solid: 'bg-green-400', glow: 'shadow-[0_0_12px_rgba(74,222,128,0.6)]' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'from-purple-500 to-purple-600', solid: 'bg-purple-500', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'from-red-500 to-red-600', solid: 'bg-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]' },
};

type TetrominoKey = keyof typeof TETROMINOS;

const TetrisGame = () => {
  const [grid, setGrid] = useState<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [activePiece, setActivePiece] = useState<{
    pos: { x: number; y: number };
    type: TetrominoKey;
    shape: number[][];
  } | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoKey | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesClearedTotal, setLinesClearedTotal] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME);
  const [scale, setScale] = useState(1);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      if (width < 380) setScale(Math.min(1, (width - 40) / 300));
      else setScale(1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const spawnPiece = useCallback((forcedType?: TetrominoKey) => {
    const keys = Object.keys(TETROMINOS) as TetrominoKey[];
    const type = forcedType ?? keys[Math.floor(Math.random() * keys.length)];
    const piece = { pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, type, shape: TETROMINOS[type].shape };
    const nextType = keys[Math.floor(Math.random() * keys.length)];
    setNextPieceType(nextType);
    if (checkCollision(piece.pos.x, piece.pos.y, piece.shape)) { setGameState('gameover'); return; }
    setActivePiece(piece);
  }, []);

  const checkCollision = (x: number, y: number, shape: number[][], currentGrid = grid) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const newX = x + c, newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && currentGrid[newY][newX] !== null) return true;
        }
      }
    }
    return false;
  };

  const lockPiece = useCallback(() => {
    if (!activePiece) return;
    let isGameOver = false;
    const newGrid = grid.map(row => [...row]);
    activePiece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== 0) {
          const y = activePiece.pos.y + r, x = activePiece.pos.x + c;
          if (y < 0) isGameOver = true;
          else if (y < ROWS) newGrid[y][x] = activePiece.type;
        }
      });
    });
    if (isGameOver) { setGameState('gameover'); playErrorSound(); return; }

    let clearedLines = 0;
    const filteredGrid = newGrid.filter(row => { const isFull = row.every(cell => cell !== null); if (isFull) clearedLines++; return !isFull; });
    while (filteredGrid.length < ROWS) filteredGrid.unshift(Array(COLS).fill(null));

    if (clearedLines > 0) {
      setScore(prev => prev + clearedLines * 100 * level);
      setLinesClearedTotal(prev => {
        const newTotal = prev + clearedLines;
        const newLevel = Math.floor(newTotal / 10) + 1;
        if (newLevel > level) { setLevel(newLevel); setDropTime(Math.max(MIN_DROP_TIME, INITIAL_DROP_TIME * Math.pow(0.85, newLevel - 1))); }
        return newTotal;
      });
      playSuccessSound();
      if (clearedLines === 4) confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else { playPopSound(); }

    setGrid(filteredGrid);
    if (nextPieceType) {
      const nextPiece = { pos: { x: Math.floor(COLS / 2) - 1, y: -1 }, type: nextPieceType, shape: TETROMINOS[nextPieceType].shape };
      if (checkCollision(nextPiece.pos.x, 0, nextPiece.shape, filteredGrid)) { setGameState('gameover'); playErrorSound(); }
      else {
        const keys = Object.keys(TETROMINOS) as TetrominoKey[];
        setNextPieceType(keys[Math.floor(Math.random() * keys.length)]);
        setActivePiece(nextPiece);
      }
    } else spawnPiece();
  }, [activePiece, grid, level]);

  const movePiece = (dx: number, dy: number) => {
    if (!activePiece || gameState !== 'playing') return;
    if (!checkCollision(activePiece.pos.x + dx, activePiece.pos.y + dy, activePiece.shape))
      setActivePiece(prev => prev ? { ...prev, pos: { x: prev.pos.x + dx, y: prev.pos.y + dy } } : null);
    else if (dy > 0) lockPiece();
  };

  const rotatePiece = () => {
    if (!activePiece || gameState !== 'playing') return;
    const rotated = activePiece.shape[0].map((_, i) => activePiece.shape.map(row => row[i]).reverse());
    if (!checkCollision(activePiece.pos.x, activePiece.pos.y, rotated)) {
      setActivePiece(prev => prev ? { ...prev, shape: rotated } : null);
      playPopSound();
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => movePiece(0, 1), dropTime);
    } else { if (gameLoopRef.current) clearInterval(gameLoopRef.current); }
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [gameState, dropTime, activePiece]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') movePiece(-1, 0);
      if (e.key === 'ArrowRight') movePiece(1, 0);
      if (e.key === 'ArrowDown') movePiece(0, 1);
      if (e.key === 'ArrowUp') rotatePiece();
      if (e.key === ' ') {
        if (!activePiece) return;
        while (!checkCollision(activePiece.pos.x, activePiece.pos.y + 1, activePiece.shape)) activePiece.pos.y += 1;
        lockPiece();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePiece, gameState, movePiece, lockPiece, rotatePiece]);

  const startGame = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0); setLevel(1); setLinesClearedTotal(0); setDropTime(INITIAL_DROP_TIME); setNextPieceType(null);
    setGameState('playing'); spawnPiece();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 pb-32">
      {/* Skor paneli */}
      <div className="flex justify-between w-full max-w-[320px] items-center glass-card p-4">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Puan</span>
            <span className="text-2xl font-black text-primary">{score}</span>
          </div>
          <div className="flex flex-col border-l border-border pl-6">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Seviye</span>
            <span className="text-2xl font-black text-secondary">{level}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sonraki</span>
          <div className="bg-muted p-2 rounded-xl min-w-[50px] min-h-[35px] flex items-center justify-center">
            {nextPieceType && (
              <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${TETROMINOS[nextPieceType].shape[0].length}, 8px)` }}>
                {TETROMINOS[nextPieceType].shape.map((row, r) =>
                  row.map((cell, c) => (
                    <div key={`next-${r}-${c}`} className={`w-2 h-2 rounded-[2px] ${cell ? TETROMINOS[nextPieceType].solid : 'bg-transparent'}`} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Oyun alanı */}
      <div className="relative glass-card p-2 origin-top" style={{ transform: `scale(${scale})` }}>
        <div
          className="grid gap-[1px] rounded-lg overflow-hidden relative"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, width: 280, height: 448, background: 'hsl(var(--muted) / 0.3)' }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-full h-full transition-colors duration-200 ${
                  cell
                    ? `bg-gradient-to-br ${TETROMINOS[cell as TetrominoKey].color} border border-white/10 rounded-[2px] ${TETROMINOS[cell as TetrominoKey].glow}`
                    : 'bg-background/40'
                }`}
              />
            ))
          )}

          {/* Aktif parça */}
          {activePiece && activePiece.shape.map((row, r) =>
            row.map((cell, c) => {
              if (cell === 0) return null;
              const x = activePiece.pos.x + c, y = activePiece.pos.y + r;
              if (y < 0) return null;
              return (
                <div
                  key={`active-${r}-${c}`}
                  className={`absolute bg-gradient-to-br ${TETROMINOS[activePiece.type].color} border border-white/20 rounded-[3px] ${TETROMINOS[activePiece.type].glow}`}
                  style={{ width: 'calc(100% / 10)', height: 'calc(100% / 16)', left: `${x * 10}%`, top: `${y * 6.25}%` }}
                />
              );
            })
          )}

          {/* Overlay */}
          <AnimatePresence>
            {gameState !== 'playing' && (
              <motion.div
                className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                {gameState === 'menu' ? (
                  <>
                    <h2 className="text-4xl font-black text-gradient mb-2 italic">TETRİS</h2>
                    <p className="text-muted-foreground font-bold mb-8">Blokları yerleştir, satırları tamamla!</p>
                    <button onClick={startGame} className="w-full py-4 btn-gaming text-lg">OYUNA BAŞLA</button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">💀</div>
                    <h2 className="text-3xl font-black text-destructive mb-2">OYUN BİTTİ!</h2>
                    <p className="text-muted-foreground font-bold mb-6">Puanın: <span className="text-primary text-xl">{score}</span></p>
                    <button onClick={startGame} className="w-full py-4 btn-gaming text-lg">TEKRAR DENE</button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Kontroller */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-4 gap-2 w-full max-w-[280px]">
          {[
            { label: '⬅️', action: () => movePiece(-1, 0) },
            { label: '⬇️', action: () => movePiece(0, 1) },
            { label: '➡️', action: () => movePiece(1, 0) },
            { label: '🔄', action: rotatePiece },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="p-4 glass-card active:scale-90 transition-transform flex items-center justify-center text-2xl border border-white/10 hover:border-primary/30"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
