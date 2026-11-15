import { Play as GardenPlay } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playErrorSound, playComboSound } from '@/utils/soundEffects';
import { fireConfetti } from '@/utils/confettiUtil';
import { useHighScore } from '@/hooks/useHighScore';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';
import {
  type Difficulty,
  type Question,
  DIFFICULTIES,
  getDifficultyConfig,
  generateMathQuestion,
} from './mathLogic';

const MathGame = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [question, setQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameStarted, setGameStarted] = useState(false);
  const { safeTimeout, safeInterval, clearSafeInterval, clearAllIntervals } = useSafeTimeouts();
  // Math rekor anını kendi ses akışında yönetir → rekor sesi çalmaz
  const { highScore, checkAndSave } = useHighScore('math', { playSound: false });

  // Keeps a synchronous copy of timeLeft so the interval callback avoids stale closures
  const timeLeftRef = useRef<number>(15);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const getDiffConfig = useCallback(() => getDifficultyConfig(difficulty), [difficulty]);

  const generateQuestion = useCallback(() => {
    const generated = generateMathQuestion(difficulty);
    setQuestion(generated.question);
    setOptions(generated.options);
    setShowResult(null);
    setTimeLeft(generated.timer);
  }, [difficulty]);

  const startGame = () => {
    setGameStarted(true); setScore(0); setStreak(0);
    setTotalQuestions(0); setCorrectCount(0);
    generateQuestion();
  };

  const handleAnswer = (selected: number) => {
    if (showResult || !question) return;
    clearAllIntervals();
    setTotalQuestions(prev => prev + 1);

    if (selected === question.answer) {
      const newStreak = streak + 1;
      const bonus = Math.ceil(timeLeft / 3) + (newStreak >= 3 ? Math.min(newStreak, 5) * 2 : 0);
      if (newStreak >= 3) playComboSound(newStreak); else playSuccessSound();
      const newScore = score + 10 + bonus;
      setScore(newScore);
      checkAndSave(newScore);
      setStreak(newStreak); setCorrectCount(p => p + 1); setShowResult('correct');
      if (newStreak >= 5) fireConfetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } else {
      playErrorSound(); setStreak(0); setShowResult('wrong');
    }
    safeTimeout(generateQuestion, 1200);
  };

  // Timer — side effects are kept outside the functional updater to avoid double-firing in React 18 Strict Mode
  useEffect(() => {
    if (!gameStarted || showResult) return;
    const id = safeInterval(() => {
      const tl = timeLeftRef.current;
      if (tl <= 1) {
        playErrorSound();
        setStreak(0);
        setShowResult('wrong');
        setTotalQuestions(p => p + 1);
        const resetTime = getDiffConfig().timer;
        timeLeftRef.current = resetTime;
        setTimeLeft(resetTime);
        safeTimeout(generateQuestion, 1200);
      } else {
        timeLeftRef.current = tl - 1;
        setTimeLeft(tl - 1);
      }
    }, 1000);
    return () => clearSafeInterval(id);
  }, [gameStarted, showResult, generateQuestion, getDiffConfig, safeInterval, safeTimeout, clearSafeInterval]);

  if (!gameStarted) {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-6 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="garden-entry-title text-3xl font-black text-gradient">➕ Matematik</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="space-y-2 w-full max-w-sm">
          <p className="font-bold text-center text-sm text-muted-foreground">Zorluk Seç:</p>
          {DIFFICULTIES.map((d) => (
            <button key={d.id} onClick={() => setDifficulty(d.id)}
              className={`garden-choice w-full px-5 py-3 rounded-xl font-bold transition-all ${difficulty === d.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5 active:bg-white/5'}`} aria-pressed={difficulty === d.id}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="glass-card p-4 text-center text-sm space-y-1 neon-border">
          <p className="font-bold">🧮 Toplama, çıkarma{difficulty === 'hard' ? ', çarpma' : ''}</p>
          <p className="text-muted-foreground">⏱️ Her soru zamanlı | 🔥 Combo bonus</p>
          {difficulty !== 'easy' && <p className="text-muted-foreground">❓ Ters sorular: ? + 3 = 7</p>}
        </div>
        <Leaderboard gameId="math" />
        <button onClick={startGame} className="garden-action-primary btn-gaming px-10 py-4 text-lg"><GardenPlay size={16} aria-hidden="true" />Başla!</button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-5 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap justify-center gap-2">
        <div className="glass-card px-2.5 sm:px-3 py-1.5 border border-primary/20 rounded-xl whitespace-nowrap"><span className="text-sm font-black text-primary">⭐ {score}</span></div>
        {streak >= 3 && <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-2.5 sm:px-3 py-1.5 border border-yellow-500/20 rounded-xl whitespace-nowrap"><span className="text-sm font-black text-yellow-400">🔥 x{Math.min(streak, 5)}</span></motion.div>}
        <div className={`glass-card px-2.5 sm:px-3 py-1.5 rounded-xl whitespace-nowrap ${timeLeft <= 5 ? 'border border-red-500/30' : ''}`}>
          <span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
        </div>
        <div className="glass-card px-2.5 sm:px-3 py-1.5 rounded-xl whitespace-nowrap"><span className="text-sm font-bold text-muted-foreground">✓ {correctCount}/{totalQuestions}</span></div>
      </div>

      {question && (
        <AnimatePresence mode="wait">
          <motion.div key={question.display} className="flex flex-col items-center gap-6" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
            <div className="glass-card p-5 md:p-7 rounded-2xl neon-border">
              <p className="text-3xl md:text-5xl font-black text-center text-primary tracking-wide">{question.display}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {options.map((option, i) => (
                <button key={i} onClick={() => handleAnswer(option)} disabled={showResult !== null}
                  className={`garden-answer w-20 h-20 md:w-24 md:h-24 text-2xl md:text-3xl font-black rounded-2xl transition-all touch-manipulation active:scale-90 ${showResult ? (option === question.answer ? 'bg-green-500/20 text-green-400 ring-2 ring-green-400 scale-105' : 'glass-card text-muted-foreground/40')
                    : 'glass-card border border-primary/20 hover:bg-primary/10 hover:border-primary/40 active:bg-primary/10 active:border-primary/40'
                    }`} style={{ touchAction: 'manipulation' }}>
                  {option}
                </button>
              ))}
            </div>
            <div className="min-h-7 flex items-center justify-center">
              {showResult && (
                <motion.p className={`text-xl font-black ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  {showResult === 'correct' ? '🎉 Doğru!' : `😅 Cevap: ${question.answer}`}
                </motion.p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
      <button onClick={() => { clearAllIntervals(); setGameStarted(false); }} className="garden-action-secondary px-4 py-2 glass-card text-muted-foreground rounded-full font-bold text-sm">← Zorluk Değiştir</button>
    </motion.div>
  );
};

export default MathGame;
