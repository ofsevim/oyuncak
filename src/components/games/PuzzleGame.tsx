'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

// Zorluk seviyeleri
const DIFFICULTIES = [
  { id: 'easy', name: '😊 Kolay', gridSize: 3, label: '3x3' },
  { id: 'medium', name: '🤔 Orta', gridSize: 4, label: '4x4' },
];

interface Tile {
  value: number;
  currentPos: number;
}

const PuzzleGame = () => {
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gridSize = difficulty.gridSize;
  const totalTiles = gridSize * gridSize;

  // Sayıları karıştır
  const shuffleTiles = useCallback(() => {
    const numbers: number[] = [];

    // 1'den (n²-1)'e kadar sayılar + 0 (boş kare)
    for (let i = 1; i < totalTiles; i++) {
      numbers.push(i);
    }
    numbers.push(0); // 0 = boş kare

    // Fisher-Yates shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const newTiles: Tile[] = numbers.map((value, index) => ({
      value,
      currentPos: index,
    }));

    setTiles(newTiles);
    setMoves(0);
    setIsComplete(false);
    setGameStarted(true);
  }, [totalTiles]);

  useEffect(() => {
    shuffleTiles();
  }, [shuffleTiles]);

  // Kare tıklandığında
  const handleTileClick = (clickedTile: Tile) => {
    if (isComplete || clickedTile.value === 0) return;

    const emptyTile = tiles.find(t => t.value === 0)!;
    const clickedPos = clickedTile.currentPos;
    const emptyPos = emptyTile.currentPos;

    // Komşu mu kontrol et
    const clickedRow = Math.floor(clickedPos / gridSize);
    const clickedCol = clickedPos % gridSize;
    const emptyRow = Math.floor(emptyPos / gridSize);
    const emptyCol = emptyPos % gridSize;

    const isAdjacent =
      (Math.abs(clickedRow - emptyRow) === 1 && clickedCol === emptyCol) ||
      (Math.abs(clickedCol - emptyCol) === 1 && clickedRow === emptyRow);

    if (!isAdjacent) {
      playErrorSound();
      return;
    }

    playPopSound();

    // Pozisyonları değiştir
    const newTiles = tiles.map(tile => {
      if (tile.value === clickedTile.value) {
        return { ...tile, currentPos: emptyPos };
      }
      if (tile.value === 0) {
        return { ...tile, currentPos: clickedPos };
      }
      return tile;
    });

    setTiles(newTiles);
    setMoves(m => m + 1);

    // Tamamlandı mı kontrol et (1,2,3...n, 0 sıralaması)
    const sorted = [...newTiles].sort((a, b) => a.currentPos - b.currentPos);
    const allCorrect = sorted.every((tile, index) => {
      if (index === totalTiles - 1) return tile.value === 0;
      return tile.value === index + 1;
    });

    if (allCorrect) {
      setIsComplete(true);
      playSuccessSound();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    }
  };

  // Kare stilini hesapla
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

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-8 p-4">
        <h2 className="text-3xl font-black text-foreground">🧩 Sayı Bulmacası</h2>
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
      <h2 className="text-3xl font-black text-foreground">🧩 Sayı Bulmacası</h2>

      <p className="text-muted-foreground font-semibold text-center max-w-xs">
        Sayıları sıraya diz: 1, 2, 3... Boş kareyi kullanarak kaydır!
      </p>

      {/* Zorluk seçimi */}
      <div className="flex gap-2">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff.id}
            onClick={() => { setDifficulty(diff); }}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${difficulty.id === diff.id
                ? 'bg-primary text-white scale-105'
                : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
          >
            {diff.name}
          </button>
        ))}
      </div>

      {/* Skor */}
      <div className="flex gap-4">
        <span className="px-4 py-2 bg-primary/10 rounded-full font-black text-primary">
          Hamle: {moves}
        </span>
        {isComplete && (
          <motion.span
            className="px-4 py-2 bg-success text-white rounded-full font-black"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            🎉 Tamamlandı!
          </motion.span>
        )}
      </div>

      {/* Puzzle alanı */}
      <div
        className="relative bg-card rounded-3xl shadow-playful overflow-hidden border-4 border-primary/20"
        style={{ width: 280, height: 280 }}
      >
        {/* Puzzle parçaları */}
        {tiles.map((tile) => {
          if (tile.value === 0) return null; // Boş kareyi gösterme

          // Doğru pozisyonda mı?
          const correctPos = tile.value - 1;
          const isCorrect = tile.currentPos === correctPos;

          return (
            <motion.button
              key={tile.value}
              onClick={() => handleTileClick(tile)}
              className={`absolute flex items-center justify-center text-2xl md:text-3xl font-black rounded-xl transition-colors ${isCorrect
                  ? 'bg-success/20 text-success border-2 border-success/50'
                  : 'bg-primary text-white border-2 border-primary/50 hover:bg-primary/90'
                }`}
              style={{
                ...getTileStyle(tile.currentPos),
                padding: '4px',
              }}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-full h-full flex items-center justify-center rounded-lg">
                {tile.value}
              </div>
            </motion.button>
          );
        })}

        {/* Boş kare göstergesi */}
        {tiles.filter(t => t.value === 0).map(emptyTile => (
          <div
            key="empty"
            className="absolute bg-muted/30 rounded-xl border-2 border-dashed border-muted"
            style={{
              ...getTileStyle(emptyTile.currentPos),
              padding: '4px',
            }}
          />
        ))}
      </div>

      {/* Hedef gösterimi */}
      <div className="bg-card p-4 rounded-2xl shadow-sm">
        <p className="text-sm text-muted-foreground text-center mb-2">Hedef sıralama:</p>
        <div className="flex flex-wrap gap-1 justify-center" style={{ maxWidth: 180 }}>
          {Array.from({ length: totalTiles - 1 }, (_, i) => (
            <span
              key={i}
              className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded font-bold text-sm"
            >
              {i + 1}
            </span>
          ))}
          <span className="w-8 h-8 flex items-center justify-center bg-muted rounded text-muted-foreground text-sm">
            ⬜
          </span>
        </div>
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
