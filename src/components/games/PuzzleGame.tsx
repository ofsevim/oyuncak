'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const PUZZLE_IMAGES = [
  { id: 'bunny', name: '🐰 Tavşan', src: '/coloring/bunny.png' },
  { id: 'elephant', name: '🐘 Fil', src: '/coloring/elephant.png' },
  { id: 'cat', name: '🐱 Kedi', src: '/coloring/cat.png' },
  { id: 'dog', name: '🐶 Köpek', src: '/coloring/dog.png' },
  { id: 'dinosaur', name: '🦕 Dinozor', src: '/coloring/dinosaur.png' },
  { id: 'unicorn', name: '🦄 Unicorn', src: '/coloring/unicorn.png' },
  { id: 'lion', name: '🦁 Aslan', src: '/coloring/lion.png' },
  { id: 'butterfly', name: '🦋 Kelebek', src: '/coloring/butterfly.png' },
];

const DIFFICULTIES = [
  { level: 1, cols: 2, rows: 2, name: 'Çok Kolay', pieces: 4, timeBonus: 200 },
  { level: 2, cols: 3, rows: 2, name: 'Kolay', pieces: 6, timeBonus: 300 },
  { level: 3, cols: 3, rows: 3, name: 'Orta', pieces: 9, timeBonus: 500 },
  { level: 4, cols: 4, rows: 3, name: 'Zor', pieces: 12, timeBonus: 800 },
  { level: 5, cols: 4, rows: 4, name: 'Çok Zor', pieces: 16, timeBonus: 1200 },
];

interface PuzzlePiece { id: number; row: number; col: number; }

/* ═══════════════════════════════════════════
   JIGSAW SVG CLIP PATH GENERATOR
   Generates tabs & blanks for each piece edge
   ═══════════════════════════════════════════ */
type TabDir = 1 | -1 | 0; // 1=tab out, -1=blank in, 0=flat edge

function generateEdges(rows: number, cols: number): { right: TabDir[][]; bottom: TabDir[][] } {
  const right: TabDir[][] = [];
  const bottom: TabDir[][] = [];
  for (let r = 0; r < rows; r++) {
    right[r] = [];
    bottom[r] = [];
    for (let c = 0; c < cols; c++) {
      // Right edge: flat if last col, otherwise random tab/blank
      right[r][c] = c === cols - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1);
      // Bottom edge: flat if last row
      bottom[r][c] = r === rows - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1);
    }
  }
  return { right, bottom };
}


/**
 * Build SVG clip-path for a single jigsaw piece.
 * Each piece is 100x100 units with optional tabs/blanks on each side.
 * Tab size ~20% of edge.
 */
function buildPieceClipPath(
  topTab: TabDir,    // from piece above's bottom
  rightTab: TabDir,
  bottomTab: TabDir,
  leftTab: TabDir,   // from piece left's right (inverted)
): string {
  const S = 100; // piece size in SVG units
  const T = 14;  // tab radius

  // Helper: tab curve on an edge
  const tabCurve = (dir: TabDir, axis: 'h' | 'v', pos: number): string => {
    if (dir === 0) return '';
    const d = dir;
    if (axis === 'h') {
      // Horizontal edge (top/bottom), tab goes vertically
      return `C ${pos - T * 0.6} ${d > 0 ? -T * 0.3 : T * 0.3}, ${pos - T} ${d > 0 ? -T * 1.1 : T * 1.1}, ${pos} ${d > 0 ? -T * 1.2 : T * 1.2} C ${pos + T} ${d > 0 ? -T * 1.1 : T * 1.1}, ${pos + T * 0.6} ${d > 0 ? -T * 0.3 : T * 0.3}, ${pos + T * 0.6} 0`;
    } else {
      // Vertical edge (left/right), tab goes horizontally
      return `C ${d > 0 ? -T * 0.3 : T * 0.3} ${pos - T * 0.6}, ${d > 0 ? -T * 1.1 : T * 1.1} ${pos - T}, ${d > 0 ? -T * 1.2 : T * 1.2} ${pos} C ${d > 0 ? -T * 1.1 : T * 1.1} ${pos + T}, ${d > 0 ? -T * 0.3 : T * 0.3} ${pos + T * 0.6}, 0 ${pos + T * 0.6}`;
    }
  };

  let path = `M 0 0 `;

  // Top edge (left to right)
  if (topTab === 0) {
    path += `L ${S} 0 `;
  } else {
    path += `L ${S * 0.35} 0 `;
    // Relative tab
    const cx = S * 0.5;
    const ty = topTab * T * 1.2;
    path += `C ${cx - T * 0.8} 0, ${cx - T} ${-ty * 0.3}, ${cx} ${-ty} `;
    path += `C ${cx + T} ${-ty * 0.3}, ${cx + T * 0.8} 0, ${S * 0.65} 0 `;
    path += `L ${S} 0 `;
  }

  // Right edge (top to bottom)
  if (rightTab === 0) {
    path += `L ${S} ${S} `;
  } else {
    path += `L ${S} ${S * 0.35} `;
    const cy = S * 0.5;
    const tx = rightTab * T * 1.2;
    path += `C ${S} ${cy - T * 0.8}, ${S + tx * 0.3} ${cy - T}, ${S + tx} ${cy} `;
    path += `C ${S + tx * 0.3} ${cy + T}, ${S} ${cy + T * 0.8}, ${S} ${S * 0.65} `;
    path += `L ${S} ${S} `;
  }

  // Bottom edge (right to left)
  if (bottomTab === 0) {
    path += `L 0 ${S} `;
  } else {
    path += `L ${S * 0.65} ${S} `;
    const cx = S * 0.5;
    const ty = bottomTab * T * 1.2;
    path += `C ${cx + T * 0.8} ${S}, ${cx + T} ${S + ty * 0.3}, ${cx} ${S + ty} `;
    path += `C ${cx - T} ${S + ty * 0.3}, ${cx - T * 0.8} ${S}, ${S * 0.35} ${S} `;
    path += `L 0 ${S} `;
  }

  // Left edge (bottom to top)
  if (leftTab === 0) {
    path += `L 0 0 `;
  } else {
    path += `L 0 ${S * 0.65} `;
    const cy = S * 0.5;
    const tx = leftTab * T * 1.2;
    path += `C 0 ${cy + T * 0.8}, ${-tx * 0.3} ${cy + T}, ${-tx} ${cy} `;
    path += `C ${-tx * 0.3} ${cy - T}, 0 ${cy - T * 0.8}, 0 ${S * 0.35} `;
    path += `L 0 0 `;
  }

  path += 'Z';
  return path;
}


/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const PuzzleGame = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentImage, setCurrentImage] = useState(PUZZLE_IMAGES[0]);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [placedPieces, setPlacedPieces] = useState<Set<number>>(new Set());
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const [completedLevels, setCompletedLevels] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timer, setTimer] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showGhost, setShowGhost] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gridSize, setGridSize] = useState(320);
  const [snapGlow, setSnapGlow] = useState<number | null>(null);
  const [edges, setEdges] = useState<ReturnType<typeof generateEdges>>({ right: [], bottom: [] });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  const difficulty = DIFFICULTIES[currentLevel] || DIFFICULTIES[0];
  const pieceW = gridSize / difficulty.cols;
  const pieceH = gridSize / difficulty.rows;
  // Extra space for tabs
  const tabExtra = pieceW * 0.17;

  useEffect(() => { setHighScore(getHighScore('puzzle')); }, []);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 48, 380);
      setGridSize(w);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  /* Get edge tabs for a piece */
  const getPieceTabs = useCallback((row: number, col: number) => {
    const top: TabDir = row === 0 ? 0 : -(edges.bottom[row - 1]?.[col] || 0) as TabDir;
    const right: TabDir = edges.right[row]?.[col] || 0;
    const bottom: TabDir = edges.bottom[row]?.[col] || 0;
    const left: TabDir = col === 0 ? 0 : -(edges.right[row]?.[col - 1] || 0) as TabDir;
    return { top, right, bottom, left };
  }, [edges]);

  const startPuzzle = useCallback((level: number) => {
    const diff = DIFFICULTIES[level];
    const image = PUZZLE_IMAGES[level % PUZZLE_IMAGES.length];
    const totalPieces = diff.cols * diff.rows;
    const newPieces: PuzzlePiece[] = [];
    for (let i = 0; i < totalPieces; i++) {
      newPieces.push({ id: i, row: Math.floor(i / diff.cols), col: i % diff.cols });
    }
    // Shuffle
    for (let i = newPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPieces[i], newPieces[j]] = [newPieces[j], newPieces[i]];
    }
    // Generate jigsaw edges
    setEdges(generateEdges(diff.rows, diff.cols));
    setPieces(newPieces);
    setPlacedPieces(new Set());
    setCurrentImage(image);
    setCurrentLevel(level);
    setDraggedPiece(null);
    setGameState('playing');
    setTimer(0); setMoves(0); setCombo(0);
    setShowGhost(false); setSnapGlow(null);
    scoreRef.current = 0; setScore(0);
    setIsNewRecord(false);
    playPopSound();
  }, []);

  const handleSelectPiece = (pieceId: number) => {
    if (placedPieces.has(pieceId)) return;
    if (draggedPiece === pieceId) { setDraggedPiece(null); return; }
    setDraggedPiece(pieceId);
    playPopSound();
  };

  const handleDrop = (targetRow: number, targetCol: number) => {
    if (draggedPiece === null) return;
    const piece = pieces.find(p => p.id === draggedPiece);
    if (!piece) return;
    setMoves(prev => prev + 1);

    if (piece.row === targetRow && piece.col === targetCol) {
      // Correct placement — snap + glow
      const newCombo = combo + 1;
      const comboBonus = Math.min(newCombo, 5) * 10;
      const points = 50 + comboBonus;
      setCombo(newCombo);
      if (newCombo > 2) playComboSound(newCombo); else playSuccessSound();
      scoreRef.current += points;
      setScore(scoreRef.current);

      // Snap glow effect
      const cellIdx = targetRow * difficulty.cols + targetCol;
      setSnapGlow(cellIdx);
      setTimeout(() => setSnapGlow(null), 500);

      const newPlaced = new Set(placedPieces);
      newPlaced.add(draggedPiece);
      setPlacedPieces(newPlaced);

      if (newPlaced.size === pieces.length) {
        const timeBonus = Math.max(0, difficulty.timeBonus - timer * 2);
        scoreRef.current += timeBonus;
        setScore(scoreRef.current);
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          setGameState('complete');
          setCompletedLevels(prev => Math.max(prev, currentLevel + 1));
          const isNew = saveHighScoreObj('puzzle', scoreRef.current);
          if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
        }, 400);
      }
    } else {
      playErrorSound();
      setCombo(0);
    }
    setDraggedPiece(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;


  /* ═══════════════════════════════════════════
     MENU
     ═══════════════════════════════════════════ */
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-5 p-4 pb-32 max-w-xl mx-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div className="text-6xl" animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🧩</motion.div>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Yapboz</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
          {DIFFICULTIES.map((diff, index) => {
            const isUnlocked = index <= completedLevels;
            const image = PUZZLE_IMAGES[index % PUZZLE_IMAGES.length];
            return (
              <button key={diff.level} onClick={() => isUnlocked && startPuzzle(index)} disabled={!isUnlocked}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all touch-manipulation ${isUnlocked ? 'glass-card hover:bg-white/10 hover:scale-[1.02]' : 'glass-card opacity-40 cursor-not-allowed'}`}>
                <div className="w-10 h-10 rounded-lg bg-cover bg-center border border-primary/30 flex-shrink-0"
                  style={{ backgroundImage: isUnlocked ? `url(${image.src})` : undefined }}>
                  {!isUnlocked && <span className="flex items-center justify-center h-full text-lg">🔒</span>}
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Seviye {diff.level} — {diff.name}</p>
                  <p className="text-xs text-muted-foreground">{diff.pieces} parça</p>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => startPuzzle(0)} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════
     COMPLETE
     ═══════════════════════════════════════════ */
  if (gameState === 'complete') {
    return (
      <motion.div className="flex flex-col items-center gap-5 p-4 pb-32 max-w-xl mx-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="w-48 h-48 rounded-2xl bg-cover bg-center shadow-lg neon-border" style={{ backgroundImage: `url(${currentImage.src})` }} />
        <h2 className="text-3xl font-black text-gradient">🎉 Tebrikler!</h2>
        {isNewRecord && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-black animate-pulse">🏆 YENİ REKOR!</motion.div>}
        <div className="glass-card p-6 space-y-2 text-center neon-border">
          <p className="text-2xl font-black text-primary">🧩 {score} Puan</p>
          <p className="text-sm text-muted-foreground">⏱️ {formatTime(timer)} | 🔄 {moves} hamle</p>
        </div>
        <div className="flex gap-3">
          {currentLevel < DIFFICULTIES.length - 1 && (
            <button onClick={() => startPuzzle(currentLevel + 1)} className="btn-gaming px-8 py-3 text-lg">Sonraki →</button>
          )}
          <button onClick={() => setGameState('menu')} className="px-6 py-2 glass-card text-muted-foreground rounded-xl font-bold">← Menü</button>
        </div>
      </motion.div>
    );
  }


  /* ═══════════════════════════════════════════
     PLAYING — Professional puzzle UI
     ═══════════════════════════════════════════ */
  const unplacedPieces = pieces.filter(p => !placedPieces.has(p.id));
  const gridH = gridSize * (difficulty.rows / difficulty.cols);

  /* Render a single jigsaw piece with SVG clip */
  const renderPiece = (piece: PuzzlePiece, size: number, isSelected: boolean, isInGrid: boolean) => {
    const tabs = getPieceTabs(piece.row, piece.col);
    const clipId = `clip-${piece.id}-${isInGrid ? 'g' : 't'}`;
    const clipPath = buildPieceClipPath(tabs.top, tabs.right, tabs.bottom, tabs.left);

    // SVG viewBox needs extra space for tabs
    const extra = 20; // tab protrusion in SVG units
    const vbX = -extra;
    const vbY = -extra;
    const vbW = 100 + extra * 2;
    const vbH = 100 + extra * 2;

    const displaySize = size + (size * 0.34); // extra for tabs

    return (
      <svg width={displaySize} height={displaySize} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{ overflow: 'visible', filter: isSelected && !isInGrid ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' : isInGrid ? 'none' : 'drop-shadow(0 3px 8px rgba(0,0,0,0.25))' }}>
        <defs>
          <clipPath id={clipId}>
            <path d={clipPath} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {/* Background image */}
          <image
            href={currentImage.src}
            x={-piece.col * 100}
            y={-piece.row * 100}
            width={difficulty.cols * 100}
            height={difficulty.rows * 100}
            preserveAspectRatio="none"
          />
        </g>
        {/* Piece outline */}
        <path d={clipPath} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        {isSelected && !isInGrid && (
          <path d={clipPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.8" />
        )}
      </svg>
    );
  };

  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ── HUD ── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-sm font-black text-primary">🧩 {score}</span>
        </div>
        <div className="px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-sm font-bold text-muted-foreground">⏱️ {formatTime(timer)}</span>
        </div>
        <div className="px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-sm font-bold text-muted-foreground">✓ {placedPieces.size}/{pieces.length}</span>
        </div>
        {combo > 1 && (
          <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
            className="px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(251,191,36,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(combo, 5)}</span>
          </motion.div>
        )}
        {/* Ghost image hint button */}
        <button
          onMouseDown={() => setShowGhost(true)} onMouseUp={() => setShowGhost(false)} onMouseLeave={() => setShowGhost(false)}
          onTouchStart={() => setShowGhost(true)} onTouchEnd={() => setShowGhost(false)}
          className="px-3 py-1.5 rounded-2xl touch-manipulation transition-all"
          style={{ background: showGhost ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: `1px solid ${showGhost ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
          <Eye className="w-4 h-4 inline-block mr-1" style={{ opacity: showGhost ? 1 : 0.5 }} />
          <span className="text-xs font-bold" style={{ color: showGhost ? '#60a5fa' : 'inherit' }}>İpucu</span>
        </button>
      </div>

      {/* ── Main area with wood texture background ── */}
      <div className="relative w-full max-w-4xl">
        {/* Wood texture background */}
        <div className="absolute inset-0 -m-3 rounded-3xl"
          style={{
            background: `
              repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(139,90,43,0.06) 18px, rgba(139,90,43,0.06) 19px),
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(139,90,43,0.03) 40px, rgba(139,90,43,0.03) 41px),
              linear-gradient(135deg, #d4a574 0%, #c2956b 25%, #b8865c 50%, #c2956b 75%, #d4a574 100%)
            `,
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
          }}
        />

        <div className="relative flex flex-col lg:flex-row gap-4 items-center lg:items-start justify-center p-3">
          {/* ── Puzzle Grid ── */}
          <div className="relative rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.08)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)' }}>
            <div className="grid gap-0 rounded-xl overflow-visible relative"
              style={{ gridTemplateColumns: `repeat(${difficulty.cols}, ${pieceW}px)`, width: gridSize, height: gridH }}>
              {Array.from({ length: difficulty.cols * difficulty.rows }).map((_, index) => {
                const row = Math.floor(index / difficulty.cols);
                const col = index % difficulty.cols;
                const placedPiece = pieces.find(p => p.row === row && p.col === col && placedPieces.has(p.id));
                const isGlowing = snapGlow === index;
                const isDropTarget = draggedPiece !== null && !placedPiece;

                return (
                  <div key={index}
                    className={`relative transition-all touch-manipulation ${isDropTarget ? 'cursor-pointer' : ''}`}
                    style={{ width: pieceW, height: pieceH, border: '1px dashed rgba(255,255,255,0.08)' }}
                    onClick={() => isDropTarget && handleDrop(row, col)}>

                    {/* Drop target highlight */}
                    {isDropTarget && (
                      <div className="absolute inset-0 bg-primary/15 hover:bg-primary/30 active:bg-primary/40 transition-colors rounded-sm" />
                    )}

                    {/* Placed piece with jigsaw shape */}
                    {placedPiece && (
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="absolute flex items-center justify-center"
                        style={{ left: -tabExtra / 2, top: -tabExtra / 2, zIndex: 2 }}>
                        {renderPiece(placedPiece, pieceW, false, true)}
                      </motion.div>
                    )}

                    {/* Snap glow effect */}
                    <AnimatePresence>
                      {isGlowing && (
                        <motion.div className="absolute inset-0 rounded-sm pointer-events-none z-10"
                          initial={{ opacity: 0, boxShadow: '0 0 0 0 rgba(59,130,246,0)' }}
                          animate={{ opacity: [0, 1, 0], boxShadow: ['0 0 0 0 rgba(59,130,246,0)', '0 0 20px 4px rgba(59,130,246,0.5)', '0 0 0 0 rgba(59,130,246,0)'] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          style={{ background: 'rgba(59,130,246,0.15)' }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Ghost image hint */}
                    {showGhost && !placedPiece && (
                      <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: `url(${currentImage.src})`, backgroundSize: `${gridSize}px ${gridH}px`, backgroundPosition: `-${col * pieceW}px -${row * pieceH}px` }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mini reference image */}
            <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-lg bg-cover bg-center shadow-lg"
              style={{ backgroundImage: `url(${currentImage.src})`, border: '2px solid rgba(255,255,255,0.2)', zIndex: 5 }} />
          </div>

          {/* ── Piece Tray — scrollable ── */}
          <div className="flex-1 w-full lg:max-w-xs">
            <p className="text-xs font-bold text-muted-foreground mb-2 text-center lg:text-left">📦 Parçalar</p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start p-3 rounded-2xl max-h-[300px] overflow-y-auto"
              style={{ background: 'rgba(0,0,0,0.12)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {unplacedPieces.map(piece => {
                const isSelected = draggedPiece === piece.id;
                return (
                  <motion.div key={piece.id}
                    className={`cursor-pointer touch-manipulation select-none transition-all rounded-lg ${isSelected ? 'z-20' : 'hover:z-10'}`}
                    style={{ transform: isSelected ? 'scale(1.15)' : 'scale(1)' }}
                    onClick={() => handleSelectPiece(piece.id)}
                    whileTap={{ scale: 0.92 }}
                    layout>
                    {renderPiece(piece, Math.min(pieceW, 80), isSelected, false)}
                  </motion.div>
                );
              })}
              {unplacedPieces.length === 0 && <p className="text-center text-muted-foreground w-full py-6 text-sm">Tüm parçalar yerleştirildi! 🎉</p>}
            </div>
            {draggedPiece !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-primary font-bold mt-2 text-center animate-pulse">
                👆 Parça seçildi — yerine tıkla!
              </motion.p>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => setGameState('menu')} className="px-5 py-2 glass-card text-muted-foreground rounded-xl font-bold mt-2 touch-manipulation">← Menü</button>
    </motion.div>
  );
};

export default PuzzleGame;
