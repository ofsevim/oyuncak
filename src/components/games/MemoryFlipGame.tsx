'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound } from '@/utils/soundEffects';
import { shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const ALL_EMOJIS = [
  '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉',
  '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

type GridSize = 3 | 4 | 5 | 6;

interface MemoryFlipGameProps {
  onActiveGameChange?: (active: boolean) => void;
}

const MemoryFlipGame = ({ onActiveGameChange }: MemoryFlipGameProps) => {
  useEffect(() => {
    onActiveGameChange?.(true);
    return () => onActiveGameChange?.(false);
  }, [onActiveGameChange]);

  const [gridSize, setGridSize] = useState<GridSize>(4);

  const [cards, setCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(1);
  const [showHint, setShowHint] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);
  const [bestMoves, setBestMoves] = useState<Record<GridSize, number>>({ 3: 0, 4: 0, 5: 0, 6: 0 });
  const [autoAdvance, setAutoAdvance] = useState(true);
  const { safeTimeout, safeInterval, clearAll, clearAllIntervals } = useSafeTimeouts();

  useEffect(() => {
    const bests: Record<GridSize, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };
    ([3, 4, 5, 6] as GridSize[]).forEach(s => { bests[s] = getHighScore(`memory-${s}x${s}`); });
    setBestMoves(bests);
  }, []);

  const initializeGame = useCallback((size?: GridSize) => {
    clearAll();
    clearAllIntervals();
    const gs = size ?? gridSize;
    const totalCards = gs * gs;
    const pairCount = Math.floor(totalCards / 2);
    const selectedEmojis = shuffleArray(ALL_EMOJIS).slice(0, pairCount);
    const gameEmojis = [...selectedEmojis, ...selectedEmojis];
    if (totalCards % 2 !== 0) gameEmojis.push('⭐');
    const initialCards = shuffleArray(gameEmojis).map((emoji, i) => ({ id: i, emoji, isFlipped: false, isMatched: false }));
    setCards(initialCards);
    setFlippedCards([]);
    setMoves(0);
    setShowSuccess(false);
    setIsChecking(false);
    setTimer(0);
    setIsTimerRunning(false);
    setHintsLeft(gs <= 4 ? 1 : 2);
    setShowHint(false);
    setMatchedCount(0);
  }, [gridSize, clearAll, clearAllIntervals]);

  useEffect(() => { initializeGame(); }, [initializeGame]);

  // Timer
  useEffect(() => {
    if (isTimerRunning) {
      const id = safeInterval(() => setTimer(p => p + 1), 1000);
      return () => clearInterval(id);
    }
  }, [isTimerRunning, safeInterval]);

  const useHint = () => {
    if (hintsLeft <= 0 || showHint) return;
    setHintsLeft(p => p - 1);
    setShowHint(true);
    setCards(prev => prev.map(c => ({ ...c, isFlipped: true })));
    safeTimeout(() => {
      setCards(prev => prev.map(c => c.isMatched ? c : { ...c, isFlipped: false }));
      setShowHint(false);
    }, 1500);
  };

  const handleCardClick = (cardId: number) => {
    if (isChecking || showHint) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;
    if (!isTimerRunning) setIsTimerRunning(true);

    if (card.emoji === '⭐') {
      // Yıldız kartı her zaman otomatik eşlenir (tek kart, eşi yok)
      if (flippedCards.length > 0) {
        // Önceden açılmış kartı geri çevir
        setCards(prev => prev.map(c =>
          flippedCards.includes(c.id) && !c.isMatched ? { ...c, isFlipped: false } : c
        ));
        setFlippedCards([]);
      }
      playPopSound(); playSuccessSound();
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true, isMatched: true } : c));
      setMoves(p => p + 1); setMatchedCount(p => p + 1);
      return;
    }

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setIsChecking(true); setMoves(p => p + 1);
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === cardId);
      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        playPopSound(); playSuccessSound();
        safeTimeout(() => {
          setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, isMatched: true } : c));
          setFlippedCards([]); setIsChecking(false);
          setMatchedCount(p => p + 1);
        }, 400);
      } else {
        playErrorSound();
        safeTimeout(() => {
          setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, isFlipped: false } : c));
          setFlippedCards([]); setIsChecking(false);
        }, 800);
      }
    }
  };

  const totalPairs = Math.floor(gridSize * gridSize / 2);
  const allMatched = cards.length > 0 && cards.every(c => c.isMatched);

  useEffect(() => {
    if (!allMatched || showSuccess) return;
    setIsTimerRunning(false);
    saveHighScoreObj(`memory-${gridSize}x${gridSize}`, moves > 0 ? Math.floor(10000 / moves) : 0);
    safeTimeout(() => {
      setShowSuccess(true);
      if (autoAdvance && gridSize < 6) playLevelUpSound();
    }, 500);
  }, [allMatched, showSuccess, gridSize, moves, autoAdvance, safeTimeout]);

  const handleSuccessClose = () => {
    setShowSuccess(false);
    if (autoAdvance && gridSize < 6) {
      const next = (gridSize + 1) as GridSize;
      setGridSize(next);
      initializeGame(next);
    } else {
      initializeGame();
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ touchAction: 'manipulation' }}>
      <h2 className="text-2xl md:text-3xl font-black text-gradient">🃏 Hafıza Oyunu</h2>

      <Leaderboard gameId={`memory-${gridSize}x${gridSize}`} />

      {/* Grid size selector */}
      <div className="flex gap-1.5 p-1 rounded-xl glass-card border border-white/10">
        {([3, 4, 5, 6] as GridSize[]).map((size) => (
          <button key={size} onClick={() => { setGridSize(size); initializeGame(size); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${gridSize === size ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-white/5 active:text-foreground active:bg-white/5'}`}>
            {size}x{size}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="glass-card px-3 py-1.5 border border-primary/20 rounded-xl">
          <span className="text-sm font-bold">⚡ {moves} hamle</span>
        </div>
        <div className="glass-card px-3 py-1.5 border border-white/10 rounded-xl">
          <span className="text-sm font-bold">⏱️ {formatTime(timer)}</span>
        </div>
        <div className="glass-card px-3 py-1.5 border border-green-500/20 rounded-xl">
          <span className="text-sm font-bold text-green-400">✓ {matchedCount}/{totalPairs}</span>
        </div>
        <button onClick={useHint} disabled={hintsLeft <= 0 || showHint}
          className={`glass-card px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${hintsLeft > 0 ? 'text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 active:bg-yellow-500/10' : 'text-muted-foreground/40 border border-white/5'}`}>
          💡 İpucu ({hintsLeft})
        </button>
      </div>

      {/* Game grid */}
      <div className="relative w-full flex flex-col items-center">
        <div className="grid gap-1.5 sm:gap-2 p-2 sm:p-3 glass-card neon-border rounded-[32px] w-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: gridSize === 6 ? '480px' : gridSize === 5 ? '440px' : gridSize === 4 ? '400px' : '360px',
            width: '98%'
          }}>
          {cards.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;
            const cardSize = 'w-full aspect-square';
            const emojiSize = gridSize <= 3 ? 'text-3xl' : gridSize === 4 ? 'text-2xl' : gridSize === 5 ? 'text-xl' : 'text-base sm:text-lg';
            return (
              <button key={card.id} onClick={() => handleCardClick(card.id)} disabled={card.isMatched || card.isFlipped}
                className={`${cardSize} rounded-xl transition-all duration-300 flex items-center justify-center relative overflow-hidden touch-manipulation ${isRevealed ? 'glass-card border border-white/10' : 'bg-gradient-to-br from-primary/30 to-secondary/30 border border-primary/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 active:scale-95 active:border-primary/50'
                  } ${card.isMatched ? 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/20' : ''}`}
                style={{ touchAction: 'manipulation' }}>
                {isRevealed ? (
                  <motion.span className={emojiSize} initial={{ scale: 0, rotateY: 180 }} animate={{ scale: 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                    {card.emoji}
                  </motion.span>
                ) : (
                  <span className="text-primary/30 text-lg md:text-xl font-bold">?</span>
                )}
                {card.isMatched && <div className="absolute inset-0 bg-green-400/5 rounded-xl" />}
              </button>
            );
          })}
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={() => initializeGame()} className="px-6 py-2.5 glass-card border border-primary/20 text-primary rounded-full font-bold text-base hover:bg-primary/10 active:bg-primary/10 transition-colors">
            🔄 Yeniden Başla
          </button>
        </div>
      </div>

      <SuccessPopup isOpen={showSuccess} onClose={handleSuccessClose}
        message={autoAdvance && gridSize < 6 ? `${moves} hamlede! Sonraki: ${gridSize + 1}x${gridSize + 1}` : `${moves} hamlede tamamladın!`} />
    </motion.div>
  );
};

export default MemoryFlipGame;
