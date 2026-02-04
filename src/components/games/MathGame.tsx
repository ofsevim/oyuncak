'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';
import { getNextRandomIndex, shuffleArray } from '@/utils/shuffle';

type Operation = '+' | '-';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Question {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
}

const DIFFICULTIES: { id: Difficulty; label: string; range: [number, number]; ops: Operation[] }[] = [
  { id: 'easy', label: '🌟 Kolay (1-10)', range: [1, 10], ops: ['+'] },
  { id: 'medium', label: '⭐ Orta (1-20)', range: [1, 20], ops: ['+', '-'] },
  { id: 'hard', label: '🔥 Zor (1-50)', range: [1, 50], ops: ['+', '-'] },
];

const MathGame = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [question, setQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameStarted, setGameStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastNum1Ref = useRef<number | null>(null);
  const lastNum2Ref = useRef<number | null>(null);

  const getDifficultyConfig = useCallback(() => {
    return DIFFICULTIES.find(d => d.id === difficulty)!;
  }, [difficulty]);

  const generateQuestion = useCallback(() => {
    const config = getDifficultyConfig();
    const [min, max] = config.range;
    const operation = config.ops[Math.floor(Math.random() * config.ops.length)];

    let num1 = getNextRandomIndex(max - min + 1, lastNum1Ref.current === null ? null : lastNum1Ref.current - min) + min;
    let num2 = getNextRandomIndex(max - min + 1, lastNum2Ref.current === null ? null : lastNum2Ref.current - min) + min;

    lastNum1Ref.current = num1;
    lastNum2Ref.current = num2;

    // Çıkarmada negatif sonuç olmasın
    if (operation === '-' && num2 > num1) {
      [num1, num2] = [num2, num1];
    }

    const answer = operation === '+' ? num1 + num2 : num1 - num2;

    // Seçenekler oluştur
    const wrongAnswers: number[] = [];
    while (wrongAnswers.length < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const wrong = answer + offset;
      if (wrong !== answer && wrong >= 0 && !wrongAnswers.includes(wrong)) {
        wrongAnswers.push(wrong);
      }
    }

    const allOptions = shuffleArray([answer, ...wrongAnswers]);

    setQuestion({ num1, num2, operation, answer });
    setOptions(allOptions);
    setShowResult(null);
    setTimeLeft(15);
  }, [getDifficultyConfig]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setStreak(0);
    setTotalQuestions(0);
    generateQuestion();
  };

  const handleAnswer = (selected: number) => {
    if (showResult || !question) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTotalQuestions(prev => prev + 1);

    if (selected === question.answer) {
      playSuccessSound();
      const bonus = Math.ceil(timeLeft / 3);
      setScore(prev => prev + 10 + bonus);
      setStreak(prev => prev + 1);
      setShowResult('correct');

      if (streak >= 2) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }
    } else {
      playErrorSound();
      setStreak(0);
      setShowResult('wrong');
    }

    setTimeout(() => {
      generateQuestion();
    }, 1500);
  };

  // Timer
  useEffect(() => {
    if (!gameStarted || showResult) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Süre doldu
          playErrorSound();
          setStreak(0);
          setShowResult('wrong');
          setTotalQuestions(p => p + 1);
          setTimeout(() => generateQuestion(), 1500);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, showResult, generateQuestion]);

  if (!gameStarted) {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-4 pb-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-black text-foreground">🔢 Matematik</h2>
        <p className="text-muted-foreground font-semibold text-center">
          Toplama ve çıkarma işlemlerini çöz!
        </p>

        <div className="space-y-3 w-full max-w-sm">
          <p className="font-bold text-center text-foreground">Zorluk Seç:</p>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`w-full px-6 py-4 rounded-2xl font-bold text-lg transition-all ${difficulty === d.id
                ? 'bg-primary text-white scale-105'
                : 'bg-muted hover:bg-muted/80'
                }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <button
          onClick={startGame}
          className="px-12 py-5 bg-success text-white text-2xl font-black rounded-full shadow-lg btn-bouncy"
        >
          Başla! 🚀
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🔢 Matematik</h2>

      {/* Skor ve Timer */}
      <div className="flex flex-wrap justify-center gap-3">
        <span className="px-4 py-2 bg-primary/10 rounded-full font-black text-primary">
          Puan: {score}
        </span>
        <span className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-full font-black text-orange-500">
          🔥 Seri: {streak}
        </span>
        <span className={`px-4 py-2 rounded-full font-black ${timeLeft <= 5 ? 'bg-destructive text-white animate-pulse' : 'bg-muted text-muted-foreground'
          }`}>
          ⏱️ {timeLeft}s
        </span>
      </div>

      {question && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${question.num1}-${question.operation}-${question.num2}`}
            className="flex flex-col items-center gap-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            {/* Soru Area */}
            <div className="bg-card p-6 md:p-8 rounded-3xl shadow-playful border-2 border-primary/10">
              <div className="flex items-center gap-3 md:gap-4 text-4xl md:text-6xl font-black">
                <span className="text-primary">{question.num1}</span>
                <span className="text-foreground">{question.operation}</span>
                <span className="text-primary">{question.num2}</span>
                <span className="text-foreground">=</span>
                <span className="text-muted-foreground">?</span>
              </div>
            </div>

            {/* Seçenekler */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={showResult !== null}
                  className={`w-24 h-24 text-3xl font-black rounded-2xl shadow-playful transition-all ${showResult
                    ? option === question.answer
                      ? 'bg-success text-white scale-110'
                      : 'bg-muted'
                    : 'bg-card hover:scale-105 hover:bg-primary hover:text-white'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {showResult && (
              <motion.p
                className={`text-2xl font-black ${showResult === 'correct' ? 'text-success' : 'text-destructive'}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {showResult === 'correct' ? '🎉 Doğru!' : `😅 Cevap: ${question.answer}`}
              </motion.p>
            )}

            {/* Back button integrated with game */}
            <button
              onClick={() => setGameStarted(false)}
              className="px-4 py-2 bg-muted/80 backdrop-blur-sm text-muted-foreground rounded-full font-bold text-sm hover:scale-105 transition-transform"
            >
              ← Zorluk Değiştir
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default MathGame;
