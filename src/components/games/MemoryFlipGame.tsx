'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import { shuffleArray } from '@/utils/shuffle';

const ALL_EMOJIS = [
  '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉',
  '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

type GridSize = 3 | 4 | 5;

const MemoryFlipGame = () => {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [cards, setCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  const initializeGame = useCallback(() => {
    clearAllTimeouts();
    const totalCards = gridSize * gridSize;
    const pairCount = Math.floor(totalCards / 2);
    const selectedEmojis = shuffleArray(ALL_EMOJIS).slice(0, pairCount);
    const gameEmojis = [...selectedEmojis, ...selectedEmojis];
    if (totalCards % 2 !== 0) gameEmojis.push('⭐');

    const initialCards = shuffleArray(gameEmojis).map((emoji, i) => ({
      id: i, emoji, isFlipped: false, isMatched: false
    }));

    setCards(initialCards);
    setFlippedCards([]);
    setMoves(0);
    setShowSuccess(false);
    setIsChecking(false);
  }, [gridSize, clearAllTimeouts]);

  useEffect(() => { initializeGame(); }, [initializeGame]);

  const handleCardClick = (cardId: number) => {
    if (isChecking) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    if (card.emoji === '⭐' && flippedCards.length === 0) {
      playPopSound();
      playSuccessSound();
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true, isMatched: true } : c));
      setMoves(p => p + 1);
      return;
    }

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setIsChecking(true);
      setMoves(p => p + 1);
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === cardId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        playPopSound();
        playSuccessSound();
        const t = setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, isMatched: true } : c));
          setFlippedCards([]);
          setIsChecking(false);
        }, 500);
        timeoutsRef.current.push(t);
      } else {
        playErrorSound();
        const t = setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, isFlipped: false } : c));
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
        timeoutsRef.current.push(t);
      }
    }
  };

  const allMatched = cards.length > 0 && cards.every(c => c.isMatched);
  useEffect(() => {
    if (!allMatched || showSuccess) return;
    const t = setTimeout(() => setShowSuccess(true), 500);
    timeoutsRef.current.push(t);
    return () => clearTimeout(t);
  }, [allMatched, showSuccess]);

  return (
    <motion.div className="flex flex-col items-center gap-6 p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl md:text-3xl font-black text-gradient">🃏 Hafıza Oyunu</h2>

      {/* Grid size selector */}
      <div className="flex gap-2 p-1 rounded-xl glass-card border border-white/10">
        {[3, 4, 5].map((size) => (
          <button
            key={size}
            onClick={() => setGridSize(size as GridSize)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              gridSize === size
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {size}x{size}
          </button>
        ))}
      </div>

      {/* Moves counter */}
      <div className="flex items-center gap-2 px-4 py-2 glass-card border border-primary/20 rounded-xl">
        <span className="text-primary font-black">⚡</span>
        <span className="font-bold text-sm">Hamle: <span className="text-primary">{moves}</span></span>
      </div>

      {/* Game grid */}
      <div
        className="grid gap-2 p-4 glass-card neon-border rounded-2xl relative"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: '100%',
          maxWidth: gridSize === 5 ? '500px' : gridSize === 4 ? '400px' : '300px'
        }}
      >
        {cards.map((card) => {
          const isRevealed = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched || card.isFlipped}
              className={`aspect-square rounded-xl text-2xl md:text-3xl transition-all duration-300 flex items-center justify-center relative overflow-hidden ${
                isRevealed
                  ? 'glass-card border border-white/10'
                  : 'bg-gradient-to-br from-primary/30 to-secondary/30 border border-primary/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-105'
              } ${card.isMatched ? 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/20' : ''}`}
            >
              {isRevealed ? (
                <motion.span
                  initial={{ scale: 0, rotateY: 180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {card.emoji}
                </motion.span>
              ) : (
                <span className="text-primary/40 text-lg">?</span>
              )}
              {/* Neon glow on matched */}
              {card.isMatched && (
                <div className="absolute inset-0 bg-green-400/5 rounded-xl" />
              )}
            </button>
          );
        })}

        {/* Restart */}
        <button
          onClick={initializeGame}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full px-4 py-2 glass-card border border-primary/20 text-primary rounded-full font-bold text-sm hover:bg-primary/10 transition-colors"
        >
          🔄 Yeniden Başla
        </button>
      </div>

      <SuccessPopup
        isOpen={showSuccess}
        onClose={() => { setShowSuccess(false); initializeGame(); }}
        message={`${moves} hamlede tamamladın!`}
      />
    </motion.div>
  );
};

export default MemoryFlipGame;
