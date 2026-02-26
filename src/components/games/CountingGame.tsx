'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';
import { getNextRandomIndex, getNextRandom, shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

const ITEMS = ['🍎','⭐️','🚗','🐱','🍦','🎈','🌸','🐶','🎸','🦋'];

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFS: Record<Difficulty, { label: string; range: [number, number]; options: number; timer: number }> = {
  easy: { label: '🌟 Kolay (1-5)', range: [1, 5], options: 3, timer: 0 },
  medium: { label: '⭐ Orta (1-10)', range: [1, 10], options: 4, timer: 15 },
  hard: { label: '🔥 Zor (1-15)', range: [1, 15], options: 5, timer: 10 },
};

const CountingGame = () => {
  const [count, setCount] = useState(1);
  const [emoji, setEmoji] = useState('🍎');
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [animatedItems, setAnimatedItems] = useState<number[]>([]);
  const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCountRef = useRef<number | null>(null);
  const lastEmojiRef = useRef<string | null>(null);

  useEffect(() => { setHighScore(getHighScore('counting')); }, []);

  const config = DIFFS[difficulty];

  const setupRound = useCallback(() => {
    const [min, max] = config.range;
    const newCount = getNextRandomIndex(max - min + 1, lastCountRef.current === null ? null : lastCountRef.current - min) + min;
    const newEmoji = getNextRandom(ITEMS, lastEmojiRef.current);
    lastCountRef.current = newCount;
    lastEmojiRef.current = newEmoji;
    setCount(newCount); setEmoji(newEmoji);
    setShowResult(null);
    if (config.timer > 0) setTimeLeft(config.timer);

    // Animated items appear one by one
    setAnimatedItems([]);
    for (let i = 0; i < newCount; i++) {
      setTimeout(() => setAnimatedItems(prev => [...prev, i]), i * 120);
    }

    const ops = new Set<number>();
    ops.add(newCount);
    while (ops.size < config.options) {
      const offset = Math.floor(Math.random() * 7) - 3;
      const option = Math.max(1, Math.min(max + 2, newCount + offset));
      if (option !== newCount) ops.add(option);
    }
    setOptions(shuffleArray(Array.from(ops)));
  }, [config]);

  const startGame = () => {
    setGameStarted(true); setScore(0); setStreak(0); setTotal(0);
    setupRound();
  };

  useEffect(() => {
    return () => {
      if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer for medium/hard
  useEffect(() => {
    if (!gameStarted || config.timer === 0 || showResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playErrorSound(); setStreak(0); setTotal(p => p + 1);
          setShowResult('wrong');
          if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
          nextRoundTimeoutRef.current = setTimeout(setupRound, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameStarted, config.timer, showResult, setupRound]);

  const handleGuess = (guess: number) => {
    if (showResult) return;
    setTotal(p => p + 1);
    if (guess === count) {
      playPopSound(); playSuccessSound();
      const newStreak = streak + 1;
      const bonus = newStreak >= 3 ? Math.min(newStreak, 5) : 0;
      setScore(prev => prev + 10 + bonus);
      setStreak(newStreak);
      setShowResult('correct');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      if (newStreak % 5 === 0) playLevelUpSound();
      saveHighScoreObj('counting', score + 10 + bonus);
      if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = setTimeout(setupRound, 1500);
    } else {
      playErrorSound(); setStreak(0); setShowResult('wrong');
      if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = setTimeout(setupRound, 2000);
    }
  };

  if (!gameStarted) {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-6 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-black text-gradient">🔢 Sayma Oyunu</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-muted-foreground text-center">Zorluk Seç:</p>
          {(Object.entries(DIFFS) as [Difficulty, typeof DIFFS['easy']][]).map(([key, val]) => (
            <button key={key} onClick={() => setDifficulty(key)}
              className={`px-5 py-3 rounded-xl font-bold transition-all ${difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`}>
              {val.label}
            </button>
          ))}
        </div>
        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-6 p-4 max-w-2xl mx-auto pb-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-2xl font-black text-gradient">🔢 Sayma Oyunu</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <div className="glass-card px-3 py-1.5 border border-primary/20 rounded-xl"><span className="text-sm font-black text-primary">⭐ {score}</span></div>
        {streak >= 3 && <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1.5 border border-yellow-500/20 rounded-xl"><span className="text-sm font-black text-yellow-400">🔥 x{Math.min(streak, 5)}</span></motion.div>}
        {config.timer > 0 && <div className="glass-card px-3 py-1.5 rounded-xl"><span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span></div>}
        <div className="glass-card px-3 py-1.5 rounded-xl"><span className="text-sm font-bold text-muted-foreground">✓ {total} soru</span></div>
      </div>

      <div className="glass-card p-4 md:p-8 w-full flex flex-wrap justify-center items-center gap-3 md:gap-5 min-h-[180px] md:min-h-[220px] overflow-hidden neon-border">
        <AnimatePresence mode="wait">
          <motion.div key={`${count}-${emoji}`} className="flex flex-wrap justify-center gap-3 md:gap-5"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
            {Array.from({ length: count }).map((_, i) => (
              <motion.span key={i} className="text-4xl md:text-6xl drop-shadow-sm"
                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                animate={animatedItems.includes(i) ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                {emoji}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {showResult && (
        <motion.p className={`text-xl font-black ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}
          initial={{ scale: 0 }} animate={{ scale: 1 }}>
          {showResult === 'correct' ? '🎉 Doğru!' : `😅 Cevap: ${count}`}
        </motion.p>
      )}

      <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
        {options.map((option) => (
          <button key={option} onClick={() => handleGuess(option)} disabled={showResult !== null}
            className={`w-14 h-14 md:w-18 md:h-18 text-xl md:text-2xl font-black rounded-2xl shadow-playful transition-all touch-manipulation active:scale-90 ${
              showResult ? (option === count ? 'bg-green-500 text-white scale-110' : 'bg-muted/50') : 'glass-card border border-primary/20 hover:bg-primary/10 hover:border-primary/40'
            }`} style={{ touchAction: 'manipulation' }}>
            {option}
          </button>
        ))}
      </div>

      <button onClick={() => setGameStarted(false)} className="px-4 py-2 glass-card text-muted-foreground rounded-full font-bold text-sm">← Zorluk Değiştir</button>
    </motion.div>
  );
};

export default CountingGame;
