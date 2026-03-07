'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';
import Leaderboard from '@/components/Leaderboard';

const GRID_SIZE = 4;
type Grid = (number | null)[][];

const TILE_STYLES: Record<number, { bg: string; text: string; glow: string }> = {
  2: { bg: 'bg-slate-700', text: 'text-slate-200', glow: '' },
  4: { bg: 'bg-slate-600', text: 'text-slate-100', glow: '' },
  8: { bg: 'bg-orange-600', text: 'text-white', glow: 'shadow-[0_0_12px_rgba(234,88,12,0.4)]' },
  16: { bg: 'bg-orange-500', text: 'text-white', glow: 'shadow-[0_0_16px_rgba(249,115,22,0.5)]' },
  32: { bg: 'bg-red-500', text: 'text-white', glow: 'shadow-[0_0_16px_rgba(239,68,68,0.5)]' },
  64: { bg: 'bg-red-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(220,38,38,0.6)]' },
  128: { bg: 'bg-yellow-500', text: 'text-yellow-950', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]' },
  256: { bg: 'bg-yellow-400', text: 'text-yellow-950', glow: 'shadow-[0_0_24px_rgba(250,204,21,0.6)]' },
  512: { bg: 'bg-purple-500', text: 'text-white', glow: 'shadow-[0_0_24px_rgba(168,85,247,0.6)]' },
  1024: { bg: 'bg-cyan-500', text: 'text-cyan-950', glow: 'shadow-[0_0_28px_rgba(6,182,212,0.6)]' },
  2048: { bg: 'bg-gradient-to-br from-cyan-400 to-purple-500', text: 'text-white', glow: 'shadow-[0_0_32px_rgba(6,182,212,0.7)]' },
};

const getTileStyle = (value: number) =>
  TILE_STYLES[value] || { bg: 'bg-gradient-to-br from-pink-500 to-yellow-400', text: 'text-white', glow: 'shadow-[0_0_32px_rgba(236,72,153,0.7)]' };

const createEmptyGrid = (): Grid => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

const addRandomTile = (grid: Grid): Grid => {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push([r, c]); }));
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
};

const slideRow = (row: (number | null)[]): { newRow: (number | null)[]; score: number; merges: number } => {
  const filtered = row.filter(v => v !== null) as number[];
  let score = 0, merges = 0;
  const merged: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val); score += val; merges++; i++;
    } else merged.push(filtered[i]);
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  return { newRow: merged.map(v => v === 0 ? null : v), score, merges };
};

const rotateGrid = (grid: Grid): Grid => {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => grid[n - 1 - c][r]));
};

const move = (grid: Grid, direction: 'left' | 'right' | 'up' | 'down') => {
  let rotated = grid.map(r => [...r]);
  const rotations = { left: 0, down: 1, right: 2, up: 3 };
  for (let i = 0; i < rotations[direction]; i++) rotated = rotateGrid(rotated);
  let totalScore = 0, totalMerges = 0;
  const slid = rotated.map(row => { const { newRow, score, merges } = slideRow(row); totalScore += score; totalMerges += merges; return newRow; });
  let result = slid;
  for (let i = 0; i < (4 - rotations[direction]) % 4; i++) result = rotateGrid(result);
  const moved = JSON.stringify(grid) !== JSON.stringify(result);
  return { newGrid: result, score: totalScore, moved, merges: totalMerges };
};

const canMove = (grid: Grid): boolean => {
  for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) {
    if (grid[r][c] === null) return true;
    if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return true;
    if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return true;
  }
  return false;
};

const getMaxTile = (grid: Grid): number => {
  let max = 0;
  grid.forEach(row => row.forEach(cell => { if (cell && cell > max) max = cell; }));
  return max;
};

const Game2048 = () => {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'won'>('menu');
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [undoStack, setUndoStack] = useState<{ grid: Grid; score: number }[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [mergeCombo, setMergeCombo] = useState(0);
  const [hasWon, setHasWon] = useState(false); // tracks if 2048 was already reached

  // Refs to avoid stale closures in handleMove
  const gridRef = useRef(grid);
  const scoreRef = useRef(score);
  const mergeComboRef = useRef(mergeCombo);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { mergeComboRef.current = mergeCombo; }, [mergeCombo]);

  useEffect(() => { setBestScore(getHighScore('2048')); }, []);

  const startGame = useCallback(() => {
    let newGrid = createEmptyGrid();
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid); setScore(0); setMoves(0); setUndoStack([]); setIsNewRecord(false); setMergeCombo(0); setHasWon(false);
    setGameState('playing');
  }, []);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setGrid(last.grid); setScore(last.score);
    setUndoStack(prev => prev.slice(0, -1));
    playPopSound();
  };

  const handleMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameState !== 'playing') return;
    const currentGrid = gridRef.current;
    const currentScore = scoreRef.current;
    const currentCombo = mergeComboRef.current;
    const { newGrid, score: gained, moved, merges } = move(currentGrid, direction);
    if (!moved) return;

    // Save undo state
    setUndoStack(prev => [...prev.slice(-5), { grid: currentGrid.map(r => [...r]), score: currentScore }]);
    setMoves(prev => prev + 1);

    if (merges > 0) {
      const newCombo = currentCombo + merges;
      setMergeCombo(newCombo);
      if (merges >= 2) playComboSound(merges); else playPopSound();
    } else { setMergeCombo(0); playPopSound(); }

    const withNew = addRandomTile(newGrid);
    setGrid(withNew);
    setScore(prev => {
      const newScore = prev + gained;
      const isNew = saveHighScoreObj('2048', newScore);
      if (isNew) { setBestScore(newScore); setIsNewRecord(true); }
      return newScore;
    });

    if (!hasWon && withNew.some(row => row.some(cell => cell === 2048))) {
      playSuccessSound();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      playNewRecordSound();
      setHasWon(true);
      setGameState('won');
      return;
    }
    if (!canMove(withNew)) { playErrorSound(); setGameState('gameover'); }
  }, [gameState, hasWon]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleMove, gameState]);

  const handleTouchStart = (e: React.TouchEvent) => { setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY }); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left');
    else handleMove(dy > 0 ? 'down' : 'up');
    setTouchStart(null);
  };

  // Menu
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-6 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-xl mx-auto min-h-[60vh]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <motion.h2 className="text-5xl font-black text-gradient" animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}>2048</motion.h2>
        <p className="text-muted-foreground font-semibold">Kaydır, birleştir, 2048'e ulaş!</p>
        <div className="glass-card p-5 space-y-3 text-center neon-border">
          <p className="text-sm text-muted-foreground">🎯 Aynı sayıları birleştir</p>
          <p className="text-sm text-muted-foreground">⬆️⬇️⬅️➡️ Ok tuşları veya kaydır</p>
          <p className="text-sm text-muted-foreground">↩️ Ctrl+Z ile geri al</p>
          {bestScore > 0 && <p className="text-lg font-black text-primary">🏆 En İyi: {bestScore}</p>}
        </div>
        <Leaderboard gameId="2048" />

        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA</button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ touchAction: 'pan-x pan-y' }}>
      {/* Score bar */}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <div className="glass-card px-4 py-2 neon-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Skor</p>
          <p className="text-xl font-black text-primary">{score}</p>
        </div>
        <div className="glass-card px-4 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">En İyi</p>
          <p className="text-xl font-black text-secondary">{bestScore}</p>
        </div>
        <div className="glass-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hamle</p>
          <p className="text-xl font-black text-muted-foreground">{moves}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={handleUndo} disabled={undoStack.length === 0}
            className="glass-card px-3 py-3 text-sm font-bold text-muted-foreground hover:text-primary active:text-primary transition-colors touch-manipulation disabled:opacity-30">↩️</button>
          <button onClick={startGame} className="glass-card px-3 py-3 text-sm font-bold text-muted-foreground hover:text-primary active:text-primary transition-colors touch-manipulation">🔄</button>
        </div>
      </div>

      {isNewRecord && gameState === 'playing' && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs font-black text-yellow-400 animate-pulse">🏆 Yeni Rekor!</motion.div>
      )}

      {/* Max tile indicator */}
      <div className="text-xs text-muted-foreground">En büyük: <span className="font-black text-primary">{getMaxTile(grid)}</span></div>

      {/* Grid */}
      <div className="glass-card p-2.5 neon-border relative" style={{ touchAction: 'none' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {grid.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                {cell && (
                  <motion.div key={`${r}-${c}-${cell}`} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`w-full h-full rounded-xl flex items-center justify-center font-black ${getTileStyle(cell).bg} ${getTileStyle(cell).text} ${getTileStyle(cell).glow}`}>
                    <span className={`${cell >= 1024 ? 'text-lg md:text-xl' : cell >= 128 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>{cell}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )))}
        </div>

        {/* Overlay */}
        <AnimatePresence>
          {(gameState === 'gameover' || gameState === 'won') && (
            <motion.div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 z-20"
              style={{ background: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {gameState === 'won' ? (
                <>
                  <motion.p className="text-4xl font-black text-gradient" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}>🎉 2048!</motion.p>
                  <p className="text-lg font-bold text-muted-foreground">Tebrikler! Skor: {score}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setGameState('playing')} className="btn-gaming px-6 py-3">▶ Devam Et</button>
                    <button onClick={startGame} className="glass-card px-6 py-3 font-bold text-muted-foreground hover:text-primary transition-colors">🔄 Yeni Oyun</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-destructive">Oyun Bitti!</p>
                  {isNewRecord && <p className="text-yellow-400 font-black animate-pulse">🏆 YENİ REKOR!</p>}
                  <p className="text-lg font-bold text-muted-foreground">Skor: {score}</p>
                  <p className="text-xs text-muted-foreground">{moves} hamle | En büyük: {getMaxTile(grid)}</p>
                  <button onClick={startGame} className="btn-gaming px-8 py-3">🔄 Tekrar Oyna</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 w-44 md:hidden">
        <div />
        <button onClick={() => handleMove('up')} className="glass-card p-3 text-xl active:scale-90 transition-transform touch-manipulation">⬆️</button>
        <div />
        <button onClick={() => handleMove('left')} className="glass-card p-3 text-xl active:scale-90 transition-transform touch-manipulation">⬅️</button>
        <button onClick={() => handleMove('down')} className="glass-card p-3 text-xl active:scale-90 transition-transform touch-manipulation">⬇️</button>
        <button onClick={() => handleMove('right')} className="glass-card p-3 text-xl active:scale-90 transition-transform touch-manipulation">➡️</button>
      </div>
    </motion.div>
  );
};

export default Game2048;
