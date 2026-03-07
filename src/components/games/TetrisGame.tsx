'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  playPopSound,
  playSuccessSound,
  playErrorSound,
  playComboSound,
  playLevelUpSound,
  playNewRecordSound,
} from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

/* ═══════════════════════════════════════════════════════════
   SABİTLER
   ═══════════════════════════════════════════════════════════ */

const COLS = 10;
const ROWS = 18;
const INITIAL_DROP_TIME = 800;
const MIN_DROP_TIME = 80;
const GRID_WIDTH = 280;

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

function randomTetromino(): TetrominoKey {
  const keys = Object.keys(TETROMINOS) as TetrominoKey[];
  return keys[Math.floor(Math.random() * keys.length)];
}

function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/* ═══════════════════════════════════════════════════════════
   BİLEŞEN
   ═══════════════════════════════════════════════════════════ */

const TetrisGame = () => {
  /* ── Render state ─────────────────────────────────────── */
  const [grid, setGrid] = useState<(string | null)[][]>(createEmptyGrid);
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
  const [uiScale, setUiScale] = useState(1);

  /* ── Logic refs (callback'ler her zaman güncel değeri okur) */
  const gridRef = useRef(grid);
  const activePieceRef = useRef<Piece | null>(null);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesComboRef = useRef(0);
  const linesClearedTotalRef = useRef(0);
  const nextPieceTypeRef = useRef<TetrominoKey | null>(null);
  const holdPieceTypeRef = useRef<TetrominoKey | null>(null);
  const canHoldRef = useRef(true);
  const gameStateRef = useRef(gameState);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameTickRef = useRef<() => void>(() => { });

  /* ── ref + state senkron güncelleyiciler (stabil) ──────── */
  const updateGrid = useCallback((g: (string | null)[][]) => {
    gridRef.current = g;
    setGrid(g);
  }, []);
  const updateActivePiece = useCallback((p: Piece | null) => {
    activePieceRef.current = p;
    setActivePiece(p);
  }, []);
  const updateScore = useCallback((s: number) => {
    scoreRef.current = s;
    setScore(s);
  }, []);
  const updateLevel = useCallback((l: number) => {
    levelRef.current = l;
    setLevel(l);
  }, []);
  const updateLinesClearedTotal = useCallback((l: number) => {
    linesClearedTotalRef.current = l;
    setLinesClearedTotal(l);
  }, []);
  const updateNextPieceType = useCallback((t: TetrominoKey) => {
    nextPieceTypeRef.current = t;
    setNextPieceType(t);
  }, []);
  const updateHoldPieceType = useCallback((t: TetrominoKey | null) => {
    holdPieceTypeRef.current = t;
    setHoldPieceType(t);
  }, []);
  const updateCanHold = useCallback((v: boolean) => {
    canHoldRef.current = v;
    setCanHold(v);
  }, []);
  const updateGameState = useCallback((s: 'menu' | 'playing' | 'paused' | 'gameover') => {
    gameStateRef.current = s;
    setGameState(s);
  }, []);

  /* ── Init ──────────────────────────────────────────────── */
  useEffect(() => {
    setHighScore(getHighScore('tetris'));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setUiScale(w < 380 ? Math.min(1, (w - 40) / 300) : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ── Çarpışma kontrolü ─────────────────────────────────── */
  const checkCollision = useCallback(
    (x: number, y: number, shape: number[][], customGrid?: (string | null)[][]) => {
      const g = customGrid ?? gridRef.current;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            const nx = x + c;
            const ny = y + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && g[ny][nx] !== null) return true;
          }
        }
      }
      return false;
    },
    [],
  );

  /* ── Ghost Y ───────────────────────────────────────────── */
  const getGhostY = useCallback(
    (piece: Piece) => {
      let gy = piece.pos.y;
      while (!checkCollision(piece.pos.x, gy + 1, piece.shape)) gy++;
      return gy;
    },
    [checkCollision],
  );

  /* ── Oyun sonu ─────────────────────────────────────────── */
  const handleGameOver = useCallback(() => {
    updateGameState('gameover');
    playErrorSound();
    const finalScore = scoreRef.current;
    const isNew = saveHighScoreObj('tetris', finalScore);
    if (isNew) {
      setIsNewRecord(true);
      setHighScore(finalScore);
      playNewRecordSound();
    }
  }, [updateGameState]);

  /* ── Sonraki parçayı doğur ─────────────────────────────── */
  const spawnNextPiece = useCallback(
    (customGrid?: (string | null)[][]) => {
      const g = customGrid ?? gridRef.current;
      const type = nextPieceTypeRef.current ?? randomTetromino();
      const shape = TETROMINOS[type].shape;
      const startX = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);

      if (checkCollision(startX, 0, shape, g)) {
        handleGameOver();
        return;
      }

      updateActivePiece({ pos: { x: startX, y: 0 }, type, shape });
      updateNextPieceType(randomTetromino());
      updateCanHold(true);
    },
    [checkCollision, handleGameOver, updateActivePiece, updateNextPieceType, updateCanHold],
  );

  /* ── Parçayı kilitle ───────────────────────────────────── */
  const lockPiece = useCallback(() => {
    const piece = activePieceRef.current;
    if (!piece) return;

    const newGrid = gridRef.current.map((row) => [...row]);
    let isAboveGrid = false;

    piece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== 0) {
          const y = piece.pos.y + r;
          const x = piece.pos.x + c;
          if (y < 0) isAboveGrid = true;
          else if (y < ROWS) newGrid[y][x] = piece.type;
        }
      });
    });

    if (isAboveGrid) {
      handleGameOver();
      return;
    }

    /* Satır temizleme */
    let clearedLines = 0;
    const filteredGrid = newGrid.filter((row) => {
      const isFull = row.every((cell) => cell !== null);
      if (isFull) clearedLines++;
      return !isFull;
    });
    while (filteredGrid.length < ROWS) filteredGrid.unshift(Array(COLS).fill(null));

    if (clearedLines > 0) {
      linesComboRef.current += 1;
      const comboMult = Math.min(linesComboRef.current, 4);
      const linePts = [0, 100, 300, 500, 800][clearedLines] ?? 800;
      const curLevel = levelRef.current;
      updateScore(scoreRef.current + linePts * curLevel * comboMult);

      const newTotal = linesClearedTotalRef.current + clearedLines;
      updateLinesClearedTotal(newTotal);

      const newLevel = Math.floor(newTotal / 10) + 1;
      if (newLevel > curLevel) {
        updateLevel(newLevel);
        setDropTime(Math.max(MIN_DROP_TIME, INITIAL_DROP_TIME * Math.pow(0.82, newLevel - 1)));
        playLevelUpSound();
      }

      if (clearedLines >= 3) playComboSound(clearedLines);
      else playSuccessSound();
      if (clearedLines === 4) confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
    } else {
      playPopSound();
      linesComboRef.current = 0;
    }

    updateGrid(filteredGrid);
    spawnNextPiece(filteredGrid);
  }, [handleGameOver, updateScore, updateLinesClearedTotal, updateLevel, updateGrid, spawnNextPiece]);

  /* ── Parçayı hareket ettir ─────────────────────────────── */
  const movePiece = useCallback(
    (dx: number, dy: number, isSoftDrop = false) => {
      const piece = activePieceRef.current;
      if (!piece || gameStateRef.current !== 'playing') return;

      if (!checkCollision(piece.pos.x + dx, piece.pos.y + dy, piece.shape)) {
        if (isSoftDrop && dy > 0) updateScore(scoreRef.current + 1);
        updateActivePiece({ ...piece, pos: { x: piece.pos.x + dx, y: piece.pos.y + dy } });
      } else if (dy > 0) {
        lockPiece();
      }
    },
    [checkCollision, updateActivePiece, updateScore, lockPiece],
  );

  /* ── Döndür ────────────────────────────────────────────── */
  const rotatePiece = useCallback(() => {
    const piece = activePieceRef.current;
    if (!piece || gameStateRef.current !== 'playing') return;

    const rotated = piece.shape[0].map((_, i) => piece.shape.map((row) => row[i]).reverse());
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!checkCollision(piece.pos.x + kick, piece.pos.y, rotated)) {
        updateActivePiece({
          ...piece,
          shape: rotated,
          pos: { ...piece.pos, x: piece.pos.x + kick },
        });
        playPopSound();
        return;
      }
    }
  }, [checkCollision, updateActivePiece]);

  /* ── Sert düşüş ───────────────────────────────────────── */
  const hardDrop = useCallback(() => {
    const piece = activePieceRef.current;
    if (!piece || gameStateRef.current !== 'playing') return;

    let newY = piece.pos.y;
    while (!checkCollision(piece.pos.x, newY + 1, piece.shape)) newY++;

    updateScore(scoreRef.current + (newY - piece.pos.y) * 2);

    /* Ref'i hemen güncelle — lockPiece doğru konumu okusun */
    const droppedPiece: Piece = { ...piece, pos: { ...piece.pos, y: newY } };
    activePieceRef.current = droppedPiece;
    setActivePiece(droppedPiece);

    lockPiece();
  }, [checkCollision, updateScore, lockPiece]);

  /* ── Parça tutma ───────────────────────────────────────── */
  const holdCurrentPiece = useCallback(() => {
    const piece = activePieceRef.current;
    if (!piece || !canHoldRef.current || gameStateRef.current !== 'playing') return;

    updateCanHold(false);
    const currentType = piece.type;
    const held = holdPieceTypeRef.current;

    if (held) {
      const shape = TETROMINOS[held].shape;
      const startX = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
      updateActivePiece({ pos: { x: startX, y: 0 }, type: held, shape });
    } else {
      spawnNextPiece();
    }

    updateHoldPieceType(currentType);
    playPopSound();
  }, [updateCanHold, updateActivePiece, updateHoldPieceType, spawnNextPiece]);

  /* ── Duraklat / Devam ──────────────────────────────────── */
  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') updateGameState('paused');
    else if (gameStateRef.current === 'paused') updateGameState('playing');
  }, [updateGameState]);

  /* ── Oyun döngüsü (stabil interval — yalnızca gameState / dropTime değişince yeniden oluşur) */
  gameTickRef.current = () => movePiece(0, 1);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => gameTickRef.current(), dropTime);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, dropTime]);

  /* ── Klavye ────────────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      /* Duraklat kısayolu */
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'c', 'C'].includes(e.key))
        e.preventDefault();

      switch (e.key) {
        case 'ArrowLeft':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          movePiece(0, 1, true);
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
        case ' ':
          hardDrop();
          break;
        case 'c':
        case 'C':
          holdCurrentPiece();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePiece, rotatePiece, hardDrop, holdCurrentPiece, togglePause]);

  /* ── Oyunu başlat ──────────────────────────────────────── */
  const startGame = useCallback(() => {
    const emptyGrid = createEmptyGrid();
    updateGrid(emptyGrid);
    updateScore(0);
    updateLevel(1);
    updateLinesClearedTotal(0);
    setDropTime(INITIAL_DROP_TIME);
    updateHoldPieceType(null);
    updateCanHold(true);
    linesComboRef.current = 0;
    setIsNewRecord(false);

    const firstType = randomTetromino();
    const nextType = randomTetromino();
    const shape = TETROMINOS[firstType].shape;
    const startX = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);

    updateActivePiece({ pos: { x: startX, y: 0 }, type: firstType, shape });
    updateNextPieceType(nextType);
    updateGameState('playing');
  }, [
    updateGrid,
    updateScore,
    updateLevel,
    updateLinesClearedTotal,
    updateHoldPieceType,
    updateCanHold,
    updateActivePiece,
    updateNextPieceType,
    updateGameState,
  ]);

  /* ── Mini parça render ─────────────────────────────────── */
  const renderMiniPiece = (type: TetrominoKey | null) => {
    if (!type) return <div className="w-12 h-8" />;
    const t = TETROMINOS[type];
    return (
      <div
        className="grid gap-[1px]"
        style={{ gridTemplateColumns: `repeat(${t.shape[0].length}, 10px)` }}
      >
        {t.shape.flat().map((cell, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-[2px] ${cell ? t.solid : 'bg-transparent'}`}
          />
        ))}
      </div>
    );
  };

  /* ── Ölçüler ───────────────────────────────────────────── */
  const cellW = GRID_WIDTH / COLS;
  const gridHeight = ROWS * cellW * 0.95;
  const panelMaxW = Math.round((GRID_WIDTH + 20) * uiScale);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col items-center gap-3 p-4 pb-32">
      {/* ── Skor paneli ──────────────────────────────────── */}
      <div
        className="flex justify-between w-full items-center glass-card p-3"
        style={{ maxWidth: panelMaxW }}
      >
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Puan
            </span>
            <span className="text-xl font-black text-primary">{score}</span>
          </div>
          <div className="flex flex-col border-l border-border pl-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Seviye
            </span>
            <span className="text-xl font-black text-secondary">{level}</span>
          </div>
          <div className="flex flex-col border-l border-border pl-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Satır
            </span>
            <span className="text-xl font-black text-muted-foreground">{linesClearedTotal}</span>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Hold */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tut (C)</span>
            <div
              className={`bg-muted p-1.5 rounded-lg min-w-[40px] min-h-[28px] flex items-center justify-center ${!canHold ? 'opacity-40' : ''}`}
            >
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

      {/* ── Oyun alanı ───────────────────────────────────── */}
      <div
        className="relative glass-card p-2 origin-top"
        style={{
          transform: `scale(${uiScale})`,
          marginBottom:
            uiScale < 1 ? `${Math.round((uiScale - 1) * (gridHeight + 20))}px` : undefined,
        }}
      >
        <div
          className="grid gap-[1px] rounded-lg overflow-hidden relative"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            width: GRID_WIDTH,
            height: gridHeight,
            background: 'hsl(var(--muted) / 0.3)',
          }}
        >
          {/* Kilitlenmiş hücreler */}
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-full h-full transition-colors duration-150 ${cell
                    ? `bg-gradient-to-br ${TETROMINOS[cell as TetrominoKey].color} border border-white/10 rounded-[2px] ${TETROMINOS[cell as TetrominoKey].glow}`
                    : 'bg-background/40'
                  }`}
              />
            )),
          )}

          {/* Ghost parça */}
          {activePiece &&
            gameState === 'playing' &&
            (() => {
              const ghostY = getGhostY(activePiece);
              return activePiece.shape.map((row, r) =>
                row.map((cell, c) => {
                  if (cell === 0) return null;
                  const gx = activePiece.pos.x + c;
                  const gy = ghostY + r;
                  if (gy < 0 || gy >= ROWS) return null;
                  return (
                    <div
                      key={`ghost-${r}-${c}`}
                      className="absolute border border-white/20 rounded-[2px]"
                      style={{
                        width: `${100 / COLS}%`,
                        height: `${100 / ROWS}%`,
                        left: `${gx * (100 / COLS)}%`,
                        top: `${gy * (100 / ROWS)}%`,
                        background: `${TETROMINOS[activePiece.type].hex}15`,
                      }}
                    />
                  );
                }),
              );
            })()}

          {/* Aktif parça */}
          {activePiece &&
            activePiece.shape.map((row, r) =>
              row.map((cell, c) => {
                if (cell === 0) return null;
                const ax = activePiece.pos.x + c;
                const ay = activePiece.pos.y + r;
                if (ay < 0) return null;
                return (
                  <div
                    key={`active-${r}-${c}`}
                    className={`absolute bg-gradient-to-br ${TETROMINOS[activePiece.type].color} border border-white/20 rounded-[3px] ${TETROMINOS[activePiece.type].glow}`}
                    style={{
                      width: `${100 / COLS}%`,
                      height: `${100 / ROWS}%`,
                      left: `${ax * (100 / COLS)}%`,
                      top: `${ay * (100 / ROWS)}%`,
                    }}
                  />
                );
              }),
            )}

          {/* ── Katman: menü / duraklama / oyun sonu ─────── */}
          <AnimatePresence>
            {gameState !== 'playing' && (
              <motion.div
                className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {gameState === 'menu' && (
                  <>
                    <h2 className="text-4xl font-black text-gradient mb-2 italic">TETRİS</h2>
                    <p className="text-muted-foreground font-bold mb-2 text-sm">
                      Blokları yerleştir, satırları tamamla!
                    </p>
                    {highScore > 0 && (
                      <p className="text-primary font-black mb-4">🏆 Rekor: {highScore}</p>
                    )}
                    <button onClick={startGame} className="w-full py-3 btn-gaming text-lg">
                      OYUNA BAŞLA
                    </button>
                  </>
                )}

                {gameState === 'paused' && (
                  <>
                    <div className="text-5xl mb-3">⏸️</div>
                    <h2 className="text-2xl font-black text-blue-400 mb-4">DURAKLADI</h2>
                    <button onClick={togglePause} className="w-full py-3 btn-gaming text-lg">
                      ▶️ DEVAM ET
                    </button>
                    <button
                      onClick={() => updateGameState('menu')}
                      className="w-full py-2 mt-2 glass-card font-bold text-sm text-muted-foreground"
                    >
                      ← Menü
                    </button>
                  </>
                )}

                {gameState === 'gameover' && (
                  <>
                    <div className="text-5xl mb-3">😅</div>
                    <h2 className="text-2xl font-black text-orange-400 mb-1">OYUN BİTTİ!</h2>
                    {isNewRecord && (
                      <motion.p
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-yellow-400 font-black mb-2 animate-pulse"
                      >
                        🏆 YENİ REKOR!
                      </motion.p>
                    )}
                    <p className="text-muted-foreground font-bold mb-1">
                      Puan: <span className="text-primary text-xl">{score}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Seviye {level} • {linesClearedTotal} satır
                    </p>
                    <button onClick={startGame} className="w-full py-3 btn-gaming text-lg">
                      TEKRAR DENE
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Kontroller ───────────────────────────────────── */}
      {gameState === 'playing' && (
        <div className="w-full flex flex-col gap-2" style={{ maxWidth: panelMaxW }}>
          <div className="grid grid-cols-5 gap-2">
            {(
              [
                { label: '⬅️', action: () => movePiece(-1, 0), ariaLabel: 'Sola' },
                { label: '⬇️', action: () => movePiece(0, 1, true), ariaLabel: 'Aşağı (soft drop)' },
                { label: '⏬', action: hardDrop, ariaLabel: 'Sert düşüş' },
                { label: '➡️', action: () => movePiece(1, 0), ariaLabel: 'Sağa' },
                { label: '🔄', action: rotatePiece, ariaLabel: 'Döndür' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                aria-label={btn.ariaLabel}
                className="p-3 glass-card active:scale-90 transition-transform flex items-center justify-center text-xl border border-white/10 hover:border-primary/30 touch-manipulation"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={holdCurrentPiece}
              aria-label="Parça tut"
              className="p-2.5 glass-card active:scale-90 transition-transform flex items-center justify-center text-sm font-bold border border-white/10 hover:border-primary/30 touch-manipulation"
            >
              📦 Tut
            </button>
            <button
              onClick={togglePause}
              aria-label="Duraklat"
              className="p-2.5 glass-card active:scale-90 transition-transform flex items-center justify-center text-sm font-bold border border-white/10 hover:border-primary/30 touch-manipulation"
            >
              ⏸️ Duraklat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;