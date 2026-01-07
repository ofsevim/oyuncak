'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

const PUZZLES = [
  { id: 'cat', emoji: '🐱', name: 'Kedi', gridSize: 3 },
  { id: 'dog', emoji: '🐶', name: 'Köpek', gridSize: 3 },
  { id: 'bear', emoji: '🐻', name: 'Ayı', gridSize: 3 },
  { id: 'lion', emoji: '🦁', name: 'Aslan', gridSize: 4 },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', gridSize: 4 },
  { id: 'dragon', emoji: '🐉', name: 'Ejderha', gridSize: 4 },
];

interface Tile {
  id: number;
  currentPos: number;
  correctPos: number;
}

const PuzzleGame = () => {
  const [selectedPuzzle, setSelectedPuzzle] = useState(PUZZLES[0]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gridSize = selectedPuzzle.gridSize;
  const totalTiles = gridSize * gridSize;

  const shuffleTiles = useCallback(() => {
    const newTiles: Tile[] = [];
    const positions = Array.from({ length: totalTiles }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < totalTiles; i++) {
      newTiles.push({
        id: i,
        currentPos: positions[i],
        correctPos: i,
      });
    }

    setTiles(newTiles);
    setMoves(0);
    setIsComplete(false);
    setGameStarted(true);
  }, [totalTiles]);

  useEffect(() => {
    shuffleTiles();
  }, [shuffleTiles]);

  const handleTileClick = (clickedTile: Tile) => {
    if (isComplete) return;

    const emptyTile = tiles.find(t => t.id === totalTiles - 1)!;
    const clickedPos = clickedTile.currentPos;
    const emptyPos = emptyTile.currentPos;

    // Komşu mu kontrol et (yukarı/aşağı/sol/sağ)
    const clickedRow = Math.floor(clickedPos / gridSize);
    const clickedCol = clickedPos % gridSize;
    const emptyRow = Math.floor(emptyPos / gridSize);
    const emptyCol = emptyPos % gridSize;

    const isAdjacent =
      (Math.abs(clickedRow - emptyRow) === 1 && clickedCol === emptyCol) ||
      (Math.abs(clickedCol - emptyCol) === 1 && clickedRow === emptyRow);

    if (!isAdjacent) return;

    playPopSound();

    // Pozisyonları değiştir
    const newTiles = tiles.map(tile => {
      if (tile.id === clickedTile.id) {
        return { ...tile, currentPos: emptyPos };
      }
      if (tile.id === emptyTile.id) {
        return { ...tile, currentPos: clickedPos };
      }
      return tile;
    });

    setTiles(newTiles);
    setMoves(m => m + 1);

    // Tamamlandı mı kontrol et
    const allCorrect = newTiles.every(t => t.currentPos === t.correctPos);
    if (allCorrect) {
      setIsComplete(true);
      playSuccessSound();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    }
  };

  const getTileStyle = (pos: number) => {
    const row = Math.floor(pos / gridSize);
    const col = pos % gridSize;
    const tileSize = 100 / gridSize;
    return {
      left: `${col * tileSize}%`,
      top: `${row * tileSize}%`,
      width: `${tileSize}%`,
      height: `${tileSize}%`,
    };
  };

  const getTileBackground = (tile: Tile) => {
    if (tile.id === totalTiles - 1) return 'transparent'; // Boş kare
    
    const row = Math.floor(tile.correctPos / gridSize);
    const col = tile.correctPos % gridSize;
    const tileSize = 100 / gridSize;
    
    return {
      backgroundPosition: `${-col * 100}% ${-row * 100}%`,
      backgroundSize: `${gridSize * 100}%`,
    };
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-8 p-4">
        <h2 className="text-3xl font-black text-foreground">🧩 Yapboz</h2>
        <p className="text-muted-foreground font-semibold">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🧩 Yapboz</h2>

      {/* Puzzle seçimi */}
      <div className="flex flex-wrap justify-center gap-2">
        {PUZZLES.map((puzzle) => (
          <button
            key={puzzle.id}
            onClick={() => { setSelectedPuzzle(puzzle); }}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              selectedPuzzle.id === puzzle.id
                ? 'bg-primary text-white scale-105'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {puzzle.emoji} {puzzle.name}
          </button>
        ))}
      </div>

      {/* Skor */}
      <div className="flex gap-4">
        <span className="px-4 py-2 bg-primary/10 rounded-full font-black text-primary">
          Hamle: {moves}
        </span>
        {isComplete && (
          <span className="px-4 py-2 bg-success text-white rounded-full font-black animate-bounce">
            🎉 Tamamlandı!
          </span>
        )}
      </div>

      {/* Puzzle alanı */}
      <div
        className="relative bg-white rounded-3xl shadow-playful overflow-hidden"
        style={{ width: 300, height: 300 }}
      >
        {/* Arka plan resmi (hedef) */}
        <div
          className="absolute inset-0 opacity-20 text-center flex items-center justify-center"
          style={{ fontSize: 200 }}
        >
          {selectedPuzzle.emoji}
        </div>

        {/* Puzzle parçaları */}
        {tiles.map((tile) => {
          if (tile.id === totalTiles - 1) return null; // Boş kareyi gösterme
          
          const isCorrect = tile.currentPos === tile.correctPos;
          
          return (
            <motion.button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              className={`absolute flex items-center justify-center text-4xl md:text-5xl bg-card border-2 transition-colors ${
                isCorrect ? 'border-success/50' : 'border-primary/20'
              } hover:border-primary`}
              style={getTileStyle(tile.currentPos)}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span
                style={{
                  fontSize: `${80 / gridSize}px`,
                  opacity: 0.9,
                }}
              >
                {selectedPuzzle.emoji}
              </span>
              <span className="absolute bottom-1 right-2 text-xs font-bold text-muted-foreground">
                {tile.id + 1}
              </span>
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={shuffleTiles}
        className="px-8 py-4 bg-secondary text-secondary-foreground rounded-full font-black text-lg btn-bouncy"
      >
        🔀 Karıştır
      </button>
    </motion.div>
  );
};

export default PuzzleGame;

