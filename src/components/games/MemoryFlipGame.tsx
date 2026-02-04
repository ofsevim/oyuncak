'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

    // Emojileri karıştır ve ihtiyacımız olan kadarını al
    const selectedEmojis = shuffleArray(ALL_EMOJIS).slice(0, pairCount);

    const gameEmojis = [...selectedEmojis, ...selectedEmojis];

    // Tek sayıda kart varsa (3x3, 5x5), bir adet '⭐' ekle (eşsiz kart)
    if (totalCards % 2 !== 0) {
      gameEmojis.push('⭐');
    }

    const initialCards = shuffleArray(gameEmojis).map((emoji, i) => ({
      id: i,
      emoji,
      isFlipped: false,
      isMatched: false
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
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">🃏 Hafıza Oyunu</h2>

      <div className="flex gap-2 bg-muted p-1 rounded-2xl">
        {[3, 4, 5].map((size) => (
          <button
            key={size}
            onClick={() => setGridSize(size as GridSize)}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${gridSize === size ? 'bg-primary text-white shadow-md' : 'hover:bg-card'}`}
          >
            {size}x{size}
          </button>
        ))}
      </div>

      <span className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold">Hamle: {moves}</span>

      <div
        className="grid gap-2 p-4 bg-muted rounded-3xl relative"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: '100%',
          maxWidth: gridSize === 5 ? '500px' : gridSize === 4 ? '400px' : '300px'
        }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isMatched || card.isFlipped}
            className={`aspect-square rounded-xl md:rounded-2xl text-2xl md:text-3xl transition-all flex items-center justify-center ${(card.isFlipped || card.isMatched) ? 'bg-card shadow-playful' : 'bg-primary hover:scale-105'} ${card.isMatched ? 'ring-4 ring-success opacity-80' : ''}`}
          >
            {(card.isFlipped || card.isMatched) && card.emoji}
          </button>
        ))}

        {/* Restart button inside game area */}
        <button
          onClick={initializeGame}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full px-4 py-2 bg-secondary/90 backdrop-blur-sm text-secondary-foreground rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform"
        >
          🔄 Yeniden Başla
        </button>
      </div>
      <SuccessPopup isOpen={showSuccess} onClose={() => { setShowSuccess(false); initializeGame(); }} message={`${moves} hamlede tamamladın!`} />
    </motion.div>
  );
};

export default MemoryFlipGame;
