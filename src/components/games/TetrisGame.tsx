'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playLevelUpSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

const COLS = 10;
const ROWS = 18;
const INITIAL_DROP_TIME = 800;
const MIN_DROP_TIME = 80;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'from-cyan-400 to-cyan-500', solid: 'bg-cyan-400', glow: 'shadow-[0_0_12px_rgba(34,211,238,0.6)]', hex: '#22d3ee' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'from-blue-500 to-blue-600', solid: 'bg-blue-500', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]', hex: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'from-orange-400 to-orange-500', solid: 'bg-orange-400', glow: 'shadow-[0_0_12px_rgba(251,146,60,0.6)]', hex: '#fb923c' },
  O: { shape: [[1, 1], [1, 1]], color: 'from-yellow-400 to-yellow-500', solid: 'bg-yellow-400', glow: 'shadow-[0_0_12px_rgba(250,204,21,0.6)]', hex: '#facc15' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'from-green-400 to-green-500', solid: 'bg-green-400', glow: 'shadow-[0_0_12px_rgba(74,222,128,0.6)]', hex: '#4ade80' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'from-purple-500 to-purple-600', solid: 'bg-purple-500', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]', hex: '#a855f7' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'from-red-500 to-red-600', solid: 'bg-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]', hex: '#ef4444' },
};

type TetrominoKey = keyof typeof TETROMINOS;
type Piece = { pos: { x: number; y: number }; type: TetrominoKey; shape: number[][] };

const TetrisGame = () => {
  const [grid, setGrid] = useState<(string | null)[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoKey | null>(null);
  const [holdPieceType, setHoldPieceType] = useState<TetrominoKey | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesClearedTotal, setLinesClearedTotal] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [linesCombo, setLinesCombo] = useState(0);
  const [scale, setScale] = useState(1);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef(grid);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { setHighScore(getHighScore('tetris')); }, []);
  useEffect(() => {
    const updateScale = () => { const w = window.innerWidth; setScale(w < 380 ? Math.min(1, (w - 40) / 300) : 1); };
    updateScale(); window.addEventListener('resize', updateScale); return () => window.removeEventListener('resize', updateScale);
  }, []);

  const checkCollision = useCallback((x: number, y: number, shape: number[][], currentGrid?: (string | null)[][]) => {
    const g = currentGrid ?? gridRef.current;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const nx = x + c, ny = y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && g[ny][nx] !== null) return true;
        }
      }
    }
    return false;
  }, []);

  // Ghost piece Y position
  const getGhostY = useCallback((piece: Piece) => {
    let ghostY = piece.pos.y;
    while (!checkCollision(piece.pos.x, ghostY + 1, piece.shape)) ghostY++;
    return ghostY;
  }, [checkCollision]);

  const spawnPiece = useCallback((forcedType?: TetrominoKey) => {
    const keys = Object.keys(TETROMINOS) as TetrominoKey[];
    const type = forcedType ?? keys[Math.floor(Math.random() * keys.length)];
    const piece: Piece = { pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, type, shape: TETROMINOS[type].shape };
    if (!nextPieceType) setNextPieceType(keys[Math.floor(Math.random() * keys.length)]);
    else setNextPieceType(keys[Math.floor(Math.random() * keys.length)]);
    if (checkCollision(piece.pos.x, piece.pos.y, piece.shape)) { setGameState('gameover'); return; }
    setActivePiece(piece);
    setCanHold(true);
  }, [checkCollision, nextPieceType]);

  const lockPiece = useCallback(() => {
    if (!activePiece) return;
    let isGameOver = false;
    const newGrid = gridRef.current.map(row => [...row]);
    activePiece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== 0) {
          const y = activePiece.pos.y + r, x = activePiece.pos.x + c;
          if (y < 0) isGameOver = true;
          else if (y < ROWS) newGrid[y][x] = activePiece.type;
        }
      });
    });
    if (isGameOver) {
      setGameState('gameover');
      playErrorSound();
      const isNew = saveHighScoreObj('tetris', score);
      if (isNew) { setIsNewRecord(true); setHighScore(score); playNewRecordSound(); }
      return;
    }

    let clearedLines = 0;
    const filteredGrid = newGrid.filter(row => { const isFull = row.every(cell => cell !== null); if (isFull) clearedLines++; return !isFull; });
    while (filteredGrid.length < ROWS) filteredGrid.unshift(Array(COLS).fill(null));

    if (clearedLines > 0) {
      const newCombo = linesCombo + 1;
      setLinesCombo(newCombo);
      const comboMultiplier = Math.min(newCombo, 4);
      const linePoints = [0, 100, 300, 500, 800][clearedLines] ?? 800;
      setScore(prev => prev + linePoints * level * comboMultiplier);
      setLinesClearedTotal(prev => {
        const newTotal = prev + clearedLines;
        const newLevel = Math.floor(newTotal / 10) + 1;
        if (newLevel > level) { setLevel(newLevel); setDropTime(Math.max(MIN_DROP_TIME, INITIAL_DROP_TIME * Math.pow(0.82, newLevel - 1))); playLevelUpSound(); }
        return newTotal;
      });
      if (clearedLines >= 3) playComboSound(clearedLines); else playSuccessSound();
      if (clearedLines === 4) confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
    } else { playPopSound(); setLinesCombo(0); }

    setGrid(filteredGrid);
    gridRef.current = filteredGrid;
    // Spawn next
    if (nextPieceType) {
      const np: Piece = { pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, type: nextPieceType, shape: TETROMINOS[nextPieceType].shape };
      if (checkCollision(np.pos.x, 0, np.shape, filteredGrid)) {
        setGameState('gameover'); playErrorSound();
        const isNew = saveHighScoreObj('tetris', score);
        if (isNew) { setIsNewRecord(true); setHighScore(score); playNewRecordSound(); }
      } else {
        const keys = Object.keys(TETROMINOS) as TetrominoKey[];
        setNextPieceType(keys[Math.floor(Math.random() * keys.length)]);
        setActivePiece(np);
        setCanHold(true);
      }
    } else spawnPiece();
  }, [activePiece, level, score, linesCombo, nextPieceType, checkCollision, spawnPiece]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!activePiece || gameState !== 'playing') return;
    if (!checkCollision(activePiece.pos.x + dx, activePiece.pos.y + dy, activePiece.shape))
      setActivePiece(prev => prev ? { ...prev, pos: { x: prev.pos.x + dx, y: prev.pos.y + dy } } : null);
    else if (dy > 0) lockPiece();
  }, [activePiece, gameState, checkCollision, lockPiece]);

  const rotatePiece = useCallback(() => {
    if (!activePiece || gameState !== 'playing') return;
    const rotated = activePiece.shape[0].map((_, i) => activePiece.shape.map(row => row[i]).reverse());
    // Wall kick
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!checkCollision(activePiece.pos.x + kick, activePiece.pos.y, rotated)) {
        setActivePiece(prev => prev ? { ...prev, shape: rotated, pos: { ...prev.pos, x: prev.pos.x + kick } } : null);
        playPopSound();
        return;
      }
    }
  }, [activePiece, gameState, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!activePiece || gameState !== 'playing') return;
    let newY = activePiece.pos.y;
    while (!checkCollision(activePiece.pos.x, newY + 1, activePiece.shape)) newY++;
    const dropDist = newY - activePiece.pos.y;
    setScore(prev => prev + dropDist * 2);
    setActivePiece(prev => prev ? { ...prev, pos: { ...prev.pos, y: newY } } : null);
    setTimeout(lockPiece, 10);
  }, [activePiece, gameState, checkCollision, lockPiece]);

  const holdPiece = useCallback(() => {
    if (!activePiece || !canHold || gameState !== 'playing') return;
    setCanHold(false);
    const currentType = activePiece.type;
    if (holdPieceType) {
      const piece: Piece = { pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, type: holdPieceType, shape: TETROMINOS[holdPieceType].shape };
      setActivePiece(piece);
    } else {
      spawnPiece(nextPieceType ?? undefined);
    }
    setHoldPieceType(currentType);
    playPopSound();
  }, [activePiece, canHold, gameState, holdPieceType, nextPieceType, spawnPiece]);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => movePiece(0, 1), dropTime);
    } else { if (gameLoopRef.current) clearInterval(gameLoopRef.current); }
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [gameState, dropTime, movePiece]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'c', 'C'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') movePiece(-1, 0);
      if (e.key === 'ArrowRight') movePiece(1, 0);
      if (e.key === 'ArrowDown') movePiece(0, 1);
      if (e.key === 'ArrowUp') rotatePiece();
      if (e.key === ' ') hardDrop();
      if (e.key === 'c' || e.key === 'C') holdPiece();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, movePiece, rotatePiece, hardDrop, holdPiece]);

  const startGame = () => {
    const emptyGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    setGrid(emptyGrid); gridRef.current = emptyGrid;
    setScore(0); setLevel(1); setLinesClearedTotal(0); setDropTime(INITIAL_DROP_TIME);
    setNextPieceType(null); setHoldPieceType(null); setCanHold(true); setLinesCombo(0); setIsNewRecord(false);
    setGameState('playing'); spawnPiece();
  };

  // Mini piece renderer
  const renderMiniPiece = (type: TetrominoKey | null) => {
    if (!type) return <div className="w-12 h-8" />;
    return (
      <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${TETROMINOS[type].shape[0].length}, 10px)` }}>
        {TETROMINOS[type].shape.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} className={`w-2.5 h-2.5 rounded-[2px] ${cell ? TETROMINOS[type].solid : 'bg-transparent'}`} />
        )))}
      </div>
    );
  };

  const cellW = 280 / COLS;
  const cellH = (ROWS * cellW * 0.95);

  return (
    <div className="flex flex-col items-center gap-3 p-4 pb-32">
      {/* Score panel — genişliği görsel oyun alanıyla eşleştir */}
      <div className="flex justify-between w-full items-center glass-card p-3"
        style={{ maxWidth: Math.round((280 + 20) * scale) }}>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Puan</span>
            <span className="text-xl font-black text-primary">{score}</span>
          </div>
          <div className="flex flex-col border-l border-border pl-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Seviye</span>
            <span className="text-xl font-black text-secondary">{level}</span>
          </div>
          <div className="flex flex-col border-l border-border pl-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Satır</span>
            <span className="text-xl font-black text-muted-foreground">{linesClearedTotal}</span>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Hold */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tut (C)</span>
            <div className={`bg-muted p-1.5 rounded-lg min-w-[40px] min-h-[28px] flex items-center justify-center ${!canHold ? 'opacity-40' : ''}`}>
              {renderMiniPiece(holdPieceType)}
            </div>
          </div>
          {/* Next */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Sonraki</span>
            <div className="bg-muted p-1.5 rounded-lg min-w-[40px] min-h-[28px] flex items-center justify-center">
              {renderMiniPiece(nextPieceType)}
            </div>
          </div>
        </div>
      </div>

      {/* Game area — scale < 1 olduğunda altta boşluk kalmaz */}
      <div className="relative glass-card p-2 origin-top" style={{
        transform: `scale(${scale})`,
        marginBottom: scale < 1 ? `${Math.round((scale - 1) * (cellH + 20))}px` : undefined
      }}>
        <div className="grid gap-[1px] rounded-lg overflow-hidden relative"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, width: 280, height: cellH, background: 'hsl(var(--muted) / 0.3)' }}>
          {grid.map((row, y) => row.map((cell, x) => (
            <div key={`${x}-${y}`}
              className={`w-full h-full transition-colors duration-150 ${cell ? `bg-gradient-to-br ${TETROMINOS[cell as TetrominoKey].color} border border-white/10 rounded-[2px] ${TETROMINOS[cell as TetrominoKey].glow}` : 'bg-background/40'}`} />
          )))}

          {/* Ghost piece */}
          {activePiece && gameState === 'playing' && (() => {
            const ghostY = getGhostY(activePiece);
            return activePiece.shape.map((row, r) => row.map((cell, c) => {
              if (cell === 0) return null;
              const x = activePiece.pos.x + c, y = ghostY + r;
              if (y < 0 || y >= ROWS) return null;
              return (
                <div key={`ghost-${r}-${c}`} className="absolute border border-white/20 rounded-[2px]"
                  style={{ width: `${100 / COLS}%`, height: `${100 / ROWS}%`, left: `${x * (100 / COLS)}%`, top: `${y * (100 / ROWS)}%`, background: `${TETROMINOS[activePiece.type].hex}15` }} />
              );
            }));
          })()}

          {/* Active piece */}
          {activePiece && activePiece.shape.map((row, r) => row.map((cell, c) => {
            if (cell === 0) return null;
            const x = activePiece.pos.x + c, y = activePiece.pos.y + r;
            if (y < 0) return null;
            return (
              <div key={`active-${r}-${c}`}
                className={`absolute bg-gradient-to-br ${TETROMINOS[activePiece.type].color} border border-white/20 rounded-[3px] ${TETROMINOS[activePiece.type].glow}`}
                style={{ width: `${100 / COLS}%`, height: `${100 / ROWS}%`, left: `${x * (100 / COLS)}%`, top: `${y * (100 / ROWS)}%` }} />
            );
          }))}

          {/* Overlay */}
          <AnimatePresence>
            {gameState !== 'playing' && (
              <motion.div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {gameState === 'menu' ? (
                  <>
                    <h2 className="text-4xl font-black text-gradient mb-2 italic">TETRİS</h2>
                    <p className="text-muted-foreground font-bold mb-2 text-sm">Blokları yerleştir, satırları tamamla!</p>
                    {highScore > 0 && <p className="text-primary font-black mb-4">🏆 Rekor: {highScore}</p>}
                    <button onClick={startGame} className="w-full py-3 btn-gaming text-lg">OYUNA BAŞLA</button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">😅</div>
                    <h2 className="text-2xl font-black text-orange-400 mb-1">OYUN BİTTİ!</h2>
                    {isNewRecord && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-yellow-400 font-black mb-2 animate-pulse">🏆 YENİ REKOR!</motion.p>}
                    <p className="text-muted-foreground font-bold mb-1">Puan: <span className="text-primary text-xl">{score}</span></p>
                    <p className="text-xs text-muted-foreground mb-4">Seviye {level} • {linesClearedTotal} satır</p>
                    <button onClick={startGame} className="w-full py-3 btn-gaming text-lg">TEKRAR DENE</button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls — genişliği görsel oyun alanıyla eşleştir */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-5 gap-2 w-full" style={{ maxWidth: Math.round((280 + 20) * scale) }}>
          {[
            { label: '⬅️', action: () => movePiece(-1, 0) },
            { label: '⬇️', action: () => movePiece(0, 1) },
            { label: '⏬', action: hardDrop },
            { label: '➡️', action: () => movePiece(1, 0) },
            { label: '🔄', action: rotatePiece },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className="p-3 glass-card active:scale-90 transition-transform flex items-center justify-center text-xl border border-white/10 hover:border-primary/30 touch-manipulation">
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
