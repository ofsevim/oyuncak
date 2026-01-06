'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { speakInstruction } from '@/utils/voiceFeedback';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';

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

  const initializeGame = useCallback(() => {
    const totalCards = gridSize * gridSize;
    const pairCount = Math.floor(totalCards / 2);
    const selectedEmojis = ALL_EMOJIS.slice(0, pairCount);

    let gameEmojis = [...selectedEmojis, ...selectedEmojis];

    // If odd number of cards (3x3, 5x5), add a special "star" card
    if (totalCards % 2 !== 0) {
      gameEmojis.push('⭐');
    }

    const shuffledCards = gameEmojis
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({
        id: i,
        emoji,
        isFlipped: false,
        isMatched: emoji === '⭐' // Star card is automatically matched/revealed or just matched
      }));

    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setShowSuccess(false);
    speakInstruction(`${gridSize}x${gridSize} oyun başlıyor! Kartları çevir ve eşini bul!`);
  }, [gridSize]);

  useEffect(() => { initializeGame(); }, [initializeGame]);

  const handleCardClick = (cardId: number) => {
    if (isChecking) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setIsChecking(true); setMoves(p => p + 1);
      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === cardId);

      if (firstCard?.emoji === secondCard?.emoji) {
        playPopSound(); playSuccessSound();
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === first || c.id === second) ? { ...c, isMatched: true } : c));
          setFlippedCards([]); setIsChecking(false);
        }, 500);
      } else {
        playErrorSound();
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === first || c.id === second) ? { ...c, isFlipped: false } : c));
          setFlippedCards([]); setIsChecking(false);
        }, 1000);
      }
    }
  };

  const allMatched = cards.length > 0 && cards.every(c => c.isMatched);
  useEffect(() => { if (allMatched && !showSuccess) setTimeout(() => setShowSuccess(true), 500); }, [allMatched, showSuccess]);

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
        className="grid gap-2 p-4 bg-muted rounded-3xl"
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
      </div>

      <button onClick={initializeGame} className="px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-bold btn-bouncy">Yeniden Başla</button>
      <SuccessPopup isOpen={showSuccess} onClose={() => { setShowSuccess(false); initializeGame(); }} message={`${moves} hamlede tamamladın!`} />
    </motion.div>
  );
};

export default MemoryFlipGame;
