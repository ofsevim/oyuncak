'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';
import { getNextRandomIndex, shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

type Operation = '+' | '-' | '×' | '÷';
type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionType = 'normal' | 'reverse' | 'compare';

interface Question {
  display: string;
  answer: number;
  type: QuestionType;
}

const DIFFICULTIES: { id: Difficulty; label: string; range: [number, number]; ops: Operation[]; types: QuestionType[]; timer: number }[] = [
  { id: 'easy', label: '🌟 Kolay (1-10)', range: [1, 10], ops: ['+'], types: ['normal'], timer: 20 },
  { id: 'medium', label: '⭐ Orta (1-20)', range: [1, 20], ops: ['+', '-'], types: ['normal', 'reverse'], timer: 15 },
  { id: 'hard', label: '🔥 Zor (1-50)', range: [1, 50], ops: ['+', '-', '×'], types: ['normal', 'reverse', 'compare'], timer: 12 },
];

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
  const [highScore, setHighScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setHighScore(getHighScore('math')); }, []);

  const getDiffConfig = useCallback(() => DIFFICULTIES.find(d => d.id === difficulty)!, [difficulty]);

  const generateQuestion = useCallback(() => {
    const config = getDiffConfig();
    const [min, max] = config.range;
    const operation = config.ops[Math.floor(Math.random() * config.ops.length)];
    const qType = config.types[Math.floor(Math.random() * config.types.length)];

    let num1 = Math.floor(Math.random() * (max - min + 1)) + min;
    let num2 = Math.floor(Math.random() * (max - min + 1)) + min;
    let answer: number;
    let display: string;

    if (operation === '×') {
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
    }
    if (operation === '-' && num2 > num1) [num1, num2] = [num2, num1];

    answer = operation === '+' ? num1 + num2 : operation === '-' ? num1 - num2 : num1 * num2;

    if (qType === 'reverse') {
      // ? + num2 = answer format
      display = `? ${operation} ${num2} = ${answer}`;
      answer = num1;
    } else {
      display = `${num1} ${operation} ${num2} = ?`;
    }

    const wrongAnswers: number[] = [];
    while (wrongAnswers.length < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const wrong = answer + offset;
      if (wrong !== answer && wrong >= 0 && !wrongAnswers.includes(wrong)) wrongAnswers.push(wrong);
    }

    setQuestion({ display, answer, type: qType });
    setOptions(shuffleArray([answer, ...wrongAnswers]));
    setShowResult(null);
    setTimeLeft(config.timer);
  }, [getDiffConfig]);

  const startGame = () => {
    setGameStarted(true); setScore(0); setStreak(0);
    setTotalQuestions(0); setCorrectCount(0);
    generateQuestion();
  };

  const handleAnswer = (selected: number) => {
    if (showResult || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTotalQuestions(prev => prev + 1);

    if (selected === question.answer) {
      const newStreak = streak + 1;
      const bonus = Math.ceil(timeLeft / 3) + (newStreak >= 3 ? Math.min(newStreak, 5) * 2 : 0);
      if (newStreak >= 3) playComboSound(newStreak); else playSuccessSound();
      setScore(prev => { const n = prev + 10 + bonus; saveHighScoreObj('math', n); return n; });
      setStreak(newStreak); setCorrectCount(p => p + 1); setShowResult('correct');
      if (newStreak >= 5) confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } else {
      playErrorSound(); setStreak(0); setShowResult('wrong');
    }
    setTimeout(generateQuestion, 1200);
  };

  // Timer
  useEffect(() => {
    if (!gameStarted || showResult) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playErrorSound(); setStreak(0); setShowResult('wrong');
          setTotalQuestions(p => p + 1);
          setTimeout(generateQuestion, 1200);
          return getDiffConfig().timer;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameStarted, showResult, generateQuestion, getDiffConfig]);

  if (!gameStarted) {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-6 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-black text-gradient">➕ Matematik</h2>
        {highScore > 0 && <div className="glass-card px-4 py-2 neon-border"><span className="font-black text-primary">🏆 Rekor: {highScore}</span></div>}
        <div className="space-y-2 w-full max-w-sm">
          <p className="font-bold text-center text-sm text-muted-foreground">Zorluk Seç:</p>
          {DIFFICULTIES.map((d) => (
            <button key={d.id} onClick={() => setDifficulty(d.id)}
              className={`w-full px-5 py-3 rounded-xl font-bold transition-all ${difficulty === d.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="glass-card p-4 text-center text-sm space-y-1 neon-border">
          <p className="font-bold">🧮 Toplama, çıkarma{difficulty === 'hard' ? ', çarpma' : ''}</p>
          <p className="text-muted-foreground">⏱️ Her soru zamanlı | 🔥 Combo bonus</p>
          {difficulty !== 'easy' && <p className="text-muted-foreground">❓ Ters sorular: ? + 3 = 7</p>}
        </div>
        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 Başla!</button>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex flex-col items-center gap-5 p-4 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap justify-center gap-2">
        <div className="glass-card px-3 py-1.5 border border-primary/20 rounded-xl"><span className="text-sm font-black text-primary">⭐ {score}</span></div>
        {streak >= 3 && <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1.5 border border-yellow-500/20 rounded-xl"><span className="text-sm font-black text-yellow-400">🔥 x{Math.min(streak, 5)}</span></motion.div>}
        <div className={`glass-card px-3 py-1.5 rounded-xl ${timeLeft <= 5 ? 'border border-red-500/30' : ''}`}>
          <span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
        </div>
        <div className="glass-card px-3 py-1.5 rounded-xl"><span className="text-sm font-bold text-muted-foreground">✓ {correctCount}/{totalQuestions}</span></div>
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
                  className={`w-20 h-20 md:w-24 md:h-24 text-2xl md:text-3xl font-black rounded-2xl transition-all touch-manipulation active:scale-90 ${
                    showResult ? (option === question.answer ? 'bg-green-500/20 text-green-400 ring-2 ring-green-400 scale-105' : 'glass-card text-muted-foreground/40')
                    : 'glass-card border border-primary/20 hover:bg-primary/10 hover:border-primary/40'
                  }`} style={{ touchAction: 'manipulation' }}>
                  {option}
                </button>
              ))}
            </div>
            {showResult && (
              <motion.p className={`text-xl font-black ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                {showResult === 'correct' ? '🎉 Doğru!' : `😅 Cevap: ${question.answer}`}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
      <button onClick={() => setGameStarted(false)} className="px-4 py-2 glass-card text-muted-foreground rounded-full font-bold text-sm">← Zorluk Değiştir</button>
    </motion.div>
  );
};

export default MathGame;
