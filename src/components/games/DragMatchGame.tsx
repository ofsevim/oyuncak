'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

interface MatchPair {
  id: string;
  left: { emoji: string; label: string };
  right: { emoji: string; label: string };
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  pairs: MatchPair[];
}

const CATEGORIES: Category[] = [
  {
    id: 'animals-sounds',
    name: 'Hayvan & Ses',
    emoji: '🐾',
    pairs: [
      { id: 'cat', left: { emoji: '🐱', label: 'Kedi' }, right: { emoji: '😺', label: 'Miyav' } },
      { id: 'dog', left: { emoji: '🐶', label: 'Köpek' }, right: { emoji: '🐕', label: 'Hav Hav' } },
      { id: 'cow', left: { emoji: '🐄', label: 'İnek' }, right: { emoji: '🐮', label: 'Möö' } },
      { id: 'duck', left: { emoji: '🦆', label: 'Ördek' }, right: { emoji: '🐥', label: 'Vak Vak' } },
    ],
  },
  {
    id: 'colors-objects',
    name: 'Renk & Nesne',
    emoji: '🎨',
    pairs: [
      { id: 'red', left: { emoji: '🔴', label: 'Kırmızı' }, right: { emoji: '🍎', label: 'Elma' } },
      { id: 'yellow', left: { emoji: '🟡', label: 'Sarı' }, right: { emoji: '🍌', label: 'Muz' } },
      { id: 'orange', left: { emoji: '🟠', label: 'Turuncu' }, right: { emoji: '🥕', label: 'Havuç' } },
      { id: 'green', left: { emoji: '🟢', label: 'Yeşil' }, right: { emoji: '🥒', label: 'Salatalık' } },
    ],
  },
  {
    id: 'animals-homes',
    name: 'Hayvan & Yuva',
    emoji: '🏠',
    pairs: [
      { id: 'bird', left: { emoji: '🐦', label: 'Kuş' }, right: { emoji: '🪺', label: 'Yuva' } },
      { id: 'fish', left: { emoji: '🐟', label: 'Balık' }, right: { emoji: '🌊', label: 'Deniz' } },
      { id: 'bee', left: { emoji: '🐝', label: 'Arı' }, right: { emoji: '🍯', label: 'Kovan' } },
      { id: 'spider', left: { emoji: '🕷️', label: 'Örümcek' }, right: { emoji: '🕸️', label: 'Ağ' } },
    ],
  },
  {
    id: 'baby-animals',
    name: 'Anne & Yavru',
    emoji: '👶',
    pairs: [
      { id: 'hen', left: { emoji: '🐔', label: 'Tavuk' }, right: { emoji: '🐤', label: 'Civciv' } },
      { id: 'sheep', left: { emoji: '🐑', label: 'Koyun' }, right: { emoji: '🐏', label: 'Kuzu' } },
      { id: 'pig', left: { emoji: '🐷', label: 'Domuz' }, right: { emoji: '🐽', label: 'Yavru' } },
      { id: 'horse', left: { emoji: '🐴', label: 'At' }, right: { emoji: '🦄', label: 'Tay' } },
    ],
  },
];

const DragMatchGame = () => {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [shuffledRight, setShuffledRight] = useState<MatchPair[]>([]);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentCategory = CATEGORIES[categoryIndex];

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const initializeRound = useCallback(() => {
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setShuffledRight(shuffleArray(currentCategory.pairs));
  }, [currentCategory.pairs, shuffleArray]);

  // İlk yüklemede ve kategori değiştiğinde
  useState(() => {
    initializeRound();
  });

  const handleLeftClick = (pairId: string) => {
    if (matchedPairs.has(pairId)) return;
    playPopSound();
    setSelectedLeft(pairId);
  };

  const handleRightClick = (pairId: string) => {
    if (!selectedLeft || matchedPairs.has(pairId)) return;
    
    if (selectedLeft === pairId) {
      // Doğru eşleşme!
      playSuccessSound();
      const newMatched = new Set(matchedPairs);
      newMatched.add(pairId);
      setMatchedPairs(newMatched);
      setScore(prev => prev + 10);
      setSelectedLeft(null);
      
      // Tümü eşleşti mi?
      if (newMatched.size === currentCategory.pairs.length) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          // Sonraki kategoriye geç
          if (categoryIndex < CATEGORIES.length - 1) {
            setCategoryIndex(prev => prev + 1);
          }
        }, 2000);
      }
    } else {
      // Yanlış eşleşme
      playErrorSound();
      setSelectedLeft(null);
    }
  };

  const changeCategory = (index: number) => {
    setCategoryIndex(index);
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setShuffledRight(shuffleArray(CATEGORIES[index].pairs));
  };

  // Kategori değiştiğinde shuffle
  useState(() => {
    setShuffledRight(shuffleArray(currentCategory.pairs));
  });

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🎯 Eşleştir</h2>
      
      {/* Kategori seçimi */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat, index) => (
          <button
            key={cat.id}
            onClick={() => changeCategory(index)}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              categoryIndex === index
                ? 'bg-primary text-white scale-105'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>
      
      <div className="flex gap-4">
        <span className="px-4 py-2 bg-primary/10 rounded-full font-black text-primary">
          Puan: {score}
        </span>
        <span className="px-4 py-2 bg-success/10 rounded-full font-black text-success">
          ✓ {matchedPairs.size}/{currentCategory.pairs.length}
        </span>
      </div>
      
      {showCelebration ? (
        <motion.div
          className="text-center py-12"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <span className="text-6xl">🎉</span>
          <p className="text-2xl font-black text-success mt-4">Harika!</p>
          <p className="text-muted-foreground">Tüm eşleşmeleri buldun!</p>
        </motion.div>
      ) : (
        <div className="flex gap-8 md:gap-16">
          {/* Sol taraf */}
          <div className="flex flex-col gap-3">
            {currentCategory.pairs.map((pair) => (
              <motion.button
                key={pair.id}
                onClick={() => handleLeftClick(pair.id)}
                disabled={matchedPairs.has(pair.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-playful transition-all ${
                  matchedPairs.has(pair.id)
                    ? 'bg-success/20 opacity-50'
                    : selectedLeft === pair.id
                      ? 'bg-primary text-white scale-105 ring-4 ring-primary/50'
                      : 'bg-card hover:scale-105'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-3xl">{pair.left.emoji}</span>
                <span className="font-bold text-sm">{pair.left.label}</span>
              </motion.button>
            ))}
          </div>
          
          {/* Sağ taraf (karışık) */}
          <div className="flex flex-col gap-3">
            {(shuffledRight.length > 0 ? shuffledRight : currentCategory.pairs).map((pair) => (
              <motion.button
                key={pair.id}
                onClick={() => handleRightClick(pair.id)}
                disabled={matchedPairs.has(pair.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-playful transition-all ${
                  matchedPairs.has(pair.id)
                    ? 'bg-success/20 opacity-50'
                    : 'bg-card hover:scale-105 hover:bg-secondary'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-3xl">{pair.right.emoji}</span>
                <span className="font-bold text-sm">{pair.right.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={initializeRound}
        className="px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold"
      >
        🔄 Yeniden Başla
      </button>
    </motion.div>
  );
};

export default DragMatchGame;

