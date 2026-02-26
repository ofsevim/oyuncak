'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

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
  const [showHint, setShowHint] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gridSize, setGridSize] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const difficulty = DIFFICULTIES[currentLevel] || DIFFICULTIES[0];
  const pieceWidth = gridSize / difficulty.cols;
  const pieceHeight = gridSize / difficulty.rows;

  useEffect(() => { setHighScore(getHighScore('puzzle')); }, []);

  useEffect(() => {
    const updateSize = () => {
      const width = Math.min(window.innerWidth - 64, 320);
      setGridSize(width);
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

  const startPuzzle = useCallback((level: number) => {
    const diff = DIFFICULTIES[level];
    const image = PUZZLE_IMAGES[level % PUZZLE_IMAGES.length];
    const totalPieces = diff.cols * diff.rows;
    const newPieces: PuzzlePiece[] = [];
    for (let i = 0; i < totalPieces; i++) {
      newPieces.push({ id: i, row: Math.floor(i / diff.cols), col: i % diff.cols });
    }
    for (let i = newPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPieces[i], newPieces[j]] = [newPieces[j], newPieces[i]];
    }
    setPieces(newPieces);
    setPlacedPieces(new Set());
    setCurrentImage(image);
    setCurrentLevel(level);
    setDraggedPiece(null);
    setGameState('playing');
    setTimer(0);
    setMoves(0);
    setCombo(0);
    setShowHint(false);
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
      const newCombo = combo + 1;
      const comboBonus = Math.min(newCombo, 5) * 10;
      const points = 50 + comboBonus;
      setCombo(newCombo);
      if (newCombo > 2) playComboSound(newCombo); else playSuccessSound();
      setScore(prev => prev + points);

      const newPlaced = new Set(placedPieces);
      newPlaced.add(draggedPiece);
      setPlacedPieces(newPlaced);

      if (newPlaced.size === pieces.length) {
        const timeBonus = Math.max(0, difficulty.timeBonus - timer * 2);
        const finalScore = score + points + timeBonus;
        setScore(finalScore);
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          setGameState('complete');
          setCompletedLevels(prev => Math.max(prev, currentLevel + 1));
          const isNew = saveHighScoreObj('puzzle', finalScore);
          if (isNew) { setIsNewRecord(true); setHighScore(finalScore); playNewRecordSound(); }
        }, 300);
      }
    } else {
      playErrorSound();
      setCombo(0);
    }
    setDraggedPiece(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // MENU
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-4 pb-32 max-w-xl mx-auto min-h-[60vh]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div className="text-7xl" animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🧩</motion.div>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Puzzle</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
          {DIFFICULTIES.map((diff, index) => {
            const isUnlocked = index <= completedLevels;
            const image = PUZZLE_IMAGES[index % PUZZLE_IMAGES.length];
            return (
              <button key={diff.level} onClick={() => isUnlocked && startPuzzle(index)} disabled={!isUnlocked}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all touch-manipulation ${isUnlocked ? 'glass-card hover:bg-white/10 hover:scale-[1.02]' : 'glass-card opacity-40 cursor-not-allowed'}`}>
                <div className="w-10 h-10 rounded-lg bg-cover bg-center border border-primary/30"
                  style={{ backgroundImage: isUnlocked ? `url(${image.src})` : undefined }}>
                  {!isUnlocked && <span className="flex items-center justify-center h-full text-lg">🔒</span>}
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Seviye {diff.level} - {diff.name}</p>
                  <p className="text-xs text-muted-foreground">{diff.pieces} parça</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="glass-card p-4 text-center text-sm neon-border space-y-1">
          <p className="font-bold">🎯 Parçayı seç, yerine yerleştir</p>
          <p className="text-muted-foreground">⚡ Combo yap, bonus kazan</p>
          <p className="text-muted-foreground">⏱️ Hızlı bitir, zaman bonusu al</p>
        </div>
      </motion.div>
    );
  }

  // COMPLETE
  if (gameState === 'complete') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-4 pb-32 max-w-xl mx-auto min-h-[60vh]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="w-48 h-48 rounded-2xl bg-cover bg-center shadow-lg neon-border" style={{ backgroundImage: `url(${currentImage.src})` }} />
        <h2 className="text-3xl font-black text-gradient">🎉 Tebrikler!</h2>
        {isNewRecord && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-black animate-pulse">🏆 YENİ REKOR!</motion.div>}
        <div className="glass-card p-6 space-y-2 text-center neon-border">
          <p className="text-2xl font-black text-primary">🧩 {score} Puan</p>
          <p className="text-sm text-muted-foreground">⏱️ {formatTime(timer)} | 🔄 {moves} hamle</p>
          <p className="text-sm text-muted-foreground">🏆 Rekor: {highScore}</p>
        </div>
        <div className="flex gap-3">
          {currentLevel < DIFFICULTIES.length - 1 ? (
            <button onClick={() => startPuzzle(currentLevel + 1)} className="btn-gaming px-8 py-3 text-lg">Sonraki Seviye →</button>
          ) : (
            <button onClick={() => setGameState('menu')} className="btn-gaming px-8 py-3 text-lg">🏆 Tamamlandı!</button>
          )}
        </div>
        <button onClick={() => setGameState('menu')} className="px-6 py-2 glass-card text-muted-foreground rounded-xl font-bold">← Ana Menü</button>
      </motion.div>
    );
  }

  const unplacedPieces = pieces.filter(p => !placedPieces.has(p.id));

  // PLAYING
  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Score bar */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="glass-card px-3 py-1 border border-primary/20"><span className="text-sm font-black text-primary">🧩 {score}</span></div>
        <div className="glass-card px-3 py-1"><span className="text-sm font-black text-muted-foreground">⏱️ {formatTime(timer)}</span></div>
        <div className="glass-card px-3 py-1"><span className="text-sm font-black text-muted-foreground">{placedPieces.size}/{pieces.length}</span></div>
        {combo > 1 && (
          <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1 border border-yellow-500/30">
            <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(combo, 5)}</span>
          </motion.div>
        )}
        <button onClick={() => setShowHint(prev => !prev)}
          className={`glass-card px-3 py-1 text-sm font-bold touch-manipulation ${showHint ? 'border border-cyan-400/50 text-cyan-400' : 'text-muted-foreground'}`}>
          💡 İpucu
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start w-full max-w-4xl justify-center">
        {/* Puzzle Grid */}
        <div className="relative glass-card p-2 rounded-xl" style={{ width: gridSize + 16 }}>
          <div className="grid gap-0 rounded-lg overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${difficulty.cols}, 1fr)`, width: gridSize, height: gridSize * (difficulty.rows / difficulty.cols) }}>
            {Array.from({ length: difficulty.cols * difficulty.rows }).map((_, index) => {
              const row = Math.floor(index / difficulty.cols);
              const col = index % difficulty.cols;
              const placedPiece = pieces.find(p => p.row === row && p.col === col && placedPieces.has(p.id));
              return (
                <div key={index}
                  className={`relative transition-all touch-manipulation ${draggedPiece !== null && !placedPiece ? 'bg-primary/20 hover:bg-primary/40 cursor-pointer active:bg-primary/50' : 'bg-white/5'}`}
                  style={{ width: pieceWidth, height: pieceHeight, border: '1px dashed rgba(255,255,255,0.1)' }}
                  onClick={() => handleDrop(row, col)}>
                  {placedPiece && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      style={{ width: pieceWidth, height: pieceHeight, backgroundImage: `url(${currentImage.src})`, backgroundSize: `${gridSize}px ${gridSize * (difficulty.rows / difficulty.cols)}px`, backgroundPosition: `-${col * pieceWidth}px -${row * pieceHeight}px` }} />
                  )}
                  {/* Hint overlay */}
                  {showHint && !placedPiece && (
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: `url(${currentImage.src})`, backgroundSize: `${gridSize}px ${gridSize * (difficulty.rows / difficulty.cols)}px`, backgroundPosition: `-${col * pieceWidth}px -${row * pieceHeight}px` }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Mini reference */}
          <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-lg bg-cover bg-center border border-white/20 shadow-lg"
            style={{ backgroundImage: `url(${currentImage.src})` }} />
        </div>

        {/* Piece Pool */}
        <div className="flex-1 w-full max-w-sm">
          <p className="text-xs font-bold text-muted-foreground mb-2 text-center lg:text-left">📦 Parçalar - Seç ve yerine yerleştir</p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start p-3 glass-card rounded-xl min-h-[120px]">
            {unplacedPieces.map(piece => (
              <motion.div key={piece.id}
                className={`cursor-pointer rounded-lg overflow-hidden transition-all touch-manipulation select-none ${draggedPiece === piece.id ? 'scale-110 ring-2 ring-primary shadow-xl z-20' : 'hover:scale-105'}`}
                style={{
                  width: pieceWidth + 4, height: pieceHeight + 4,
                  backgroundImage: `url(${currentImage.src})`,
                  backgroundSize: `${gridSize}px ${gridSize * (difficulty.rows / difficulty.cols)}px`,
                  backgroundPosition: `-${piece.col * pieceWidth}px -${piece.row * pieceHeight}px`,
                  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.2)',
                }}
                onClick={() => handleSelectPiece(piece.id)}
                whileTap={{ scale: 0.95 }} />
            ))}
            {unplacedPieces.length === 0 && <p className="text-center text-muted-foreground w-full py-6">Tüm parçalar yerleştirildi! 🎉</p>}
          </div>
          {draggedPiece !== null && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-primary font-bold mt-2 text-center animate-pulse">
              👆 Parça seçildi - Puzzle'daki yerine tıkla!
            </motion.p>
          )}
        </div>
      </div>

      <button onClick={() => setGameState('menu')} className="px-5 py-2 glass-card text-muted-foreground rounded-xl font-bold mt-2 touch-manipulation">← Ana Menü</button>
    </motion.div>
  );
};

export default PuzzleGame;
