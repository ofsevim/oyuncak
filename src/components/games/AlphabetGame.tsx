'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';
import { getNextRandom, shuffleArray } from '@/utils/shuffle';

const ALPHABET = [
  { letter: 'A', word: 'Arı', emoji: '🐝', color: 'bg-red-400' },
  { letter: 'B', word: 'Balon', emoji: '🎈', color: 'bg-blue-400' },
  { letter: 'C', word: 'Ceylan', emoji: '🦌', color: 'bg-amber-400' },
  { letter: 'Ç', word: 'Çiçek', emoji: '🌸', color: 'bg-pink-400' },
  { letter: 'D', word: 'Deniz', emoji: '🌊', color: 'bg-cyan-400' },
  { letter: 'E', word: 'Elma', emoji: '🍎', color: 'bg-red-500' },
  { letter: 'F', word: 'Fil', emoji: '🐘', color: 'bg-gray-400' },
  { letter: 'G', word: 'Güneş', emoji: '☀️', color: 'bg-yellow-400' },
  { letter: 'H', word: 'Havuç', emoji: '🥕', color: 'bg-orange-400' },
  { letter: 'I', word: 'Irmak', emoji: '🏞️', color: 'bg-teal-400' },
  { letter: 'İ', word: 'İnek', emoji: '🐄', color: 'bg-amber-300' },
  { letter: 'J', word: 'Jilet', emoji: '🪒', color: 'bg-slate-400' },
  { letter: 'K', word: 'Kedi', emoji: '🐱', color: 'bg-orange-300' },
  { letter: 'L', word: 'Lale', emoji: '🌷', color: 'bg-red-300' },
  { letter: 'M', word: 'Muz', emoji: '🍌', color: 'bg-yellow-300' },
  { letter: 'N', word: 'Nar', emoji: '🍎', color: 'bg-rose-400' },
  { letter: 'O', word: 'Okul', emoji: '🏫', color: 'bg-indigo-400' },
  { letter: 'Ö', word: 'Ördek', emoji: '🦆', color: 'bg-yellow-500' },
  { letter: 'P', word: 'Portakal', emoji: '🍊', color: 'bg-orange-500' },
  { letter: 'R', word: 'Robot', emoji: '🤖', color: 'bg-zinc-400' },
  { letter: 'S', word: 'Sincap', emoji: '🐿️', color: 'bg-amber-500' },
  { letter: 'Ş', word: 'Şeker', emoji: '🍬', color: 'bg-pink-500' },
  { letter: 'T', word: 'Tavşan', emoji: '🐰', color: 'bg-gray-300' },
  { letter: 'U', word: 'Uçak', emoji: '✈️', color: 'bg-sky-400' },
  { letter: 'Ü', word: 'Üzüm', emoji: '🍇', color: 'bg-purple-400' },
  { letter: 'V', word: 'Vapur', emoji: '🚢', color: 'bg-blue-500' },
  { letter: 'Y', word: 'Yıldız', emoji: '⭐', color: 'bg-yellow-400' },
  { letter: 'Z', word: 'Zürafa', emoji: '🦒', color: 'bg-amber-400' },
];

type GameMode = 'explore' | 'quiz';

const AlphabetGame = () => {
  const [mode, setMode] = useState<GameMode>('explore');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizLetter, setQuizLetter] = useState<typeof ALPHABET[0] | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const lastLetterRef = useRef<typeof ALPHABET[0] | null>(null);

  const currentLetter = ALPHABET[currentIndex];

  const goNext = () => {
    playPopSound();
    setCurrentIndex((prev) => (prev + 1) % ALPHABET.length);
  };

  const goPrev = () => {
    playPopSound();
    setCurrentIndex((prev) => (prev - 1 + ALPHABET.length) % ALPHABET.length);
  };

  const generateQuiz = useCallback(() => {
    const correct = getNextRandom(ALPHABET, lastLetterRef.current);
    lastLetterRef.current = correct;

    // 3 yanlış seçenek
    const wrongOptions: string[] = [];
    while (wrongOptions.length < 3) {
      const randLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)].letter;
      if (randLetter !== correct.letter && !wrongOptions.includes(randLetter)) {
        wrongOptions.push(randLetter);
      }
    }

    // Karıştır
    const allOptions = shuffleArray([correct.letter, ...wrongOptions]);

    setQuizLetter(correct);
    setQuizOptions(allOptions);
    setShowResult(null);
  }, []);

  const handleQuizAnswer = (answer: string) => {
    if (showResult) return;

    setTotalQuestions(prev => prev + 1);

    if (answer === quizLetter?.letter) {
      playSuccessSound();
      setScore(prev => prev + 1);
      setShowResult('correct');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
      playErrorSound();
      setShowResult('wrong');
    }

    setTimeout(() => {
      generateQuiz();
    }, 1500);
  };

  const startQuiz = () => {
    setMode('quiz');
    setScore(0);
    setTotalQuestions(0);
    generateQuiz();
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🔤 Harf Öğren</h2>

      {/* Mod seçimi */}
      <div className="flex gap-2 bg-muted p-1 rounded-2xl">
        <button
          onClick={() => setMode('explore')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${mode === 'explore' ? 'bg-primary text-white' : 'hover:bg-card'
            }`}
        >
          📚 Keşfet
        </button>
        <button
          onClick={startQuiz}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${mode === 'quiz' ? 'bg-primary text-white' : 'hover:bg-card'
            }`}
        >
          🎯 Quiz
        </button>
      </div>

      {mode === 'explore' ? (
        /* Keşfet Modu */
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="flex flex-col items-center gap-6"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
          >
            <div className={`${currentLetter.color} w-48 h-48 md:w-64 md:h-64 rounded-[3rem] shadow-playful flex items-center justify-center`}>
              <span className="text-8xl md:text-9xl font-black text-white drop-shadow-lg">
                {currentLetter.letter}
              </span>
            </div>

            <div className="text-center space-y-2">
              <p className="text-6xl">{currentLetter.emoji}</p>
              <p className="text-3xl font-black text-foreground">{currentLetter.word}</p>
              <p className="text-xl text-muted-foreground font-semibold">
                "{currentLetter.letter}" harfi ile başlar
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={goPrev}
                className="px-8 py-4 bg-muted text-muted-foreground rounded-full font-black text-xl btn-bouncy"
              >
                ← Önceki
              </button>
              <button
                onClick={goNext}
                className="px-8 py-4 bg-primary text-white rounded-full font-black text-xl btn-bouncy"
              >
                Sonraki →
              </button>
            </div>

            {/* Harf listesi */}
            <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-w-full px-2">
              {ALPHABET.map((item, index) => (
                <button
                  key={item.letter}
                  onClick={() => { playPopSound(); setCurrentIndex(index); }}
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl font-bold transition-all text-sm md:text-base ${index === currentIndex
                    ? 'bg-primary text-white scale-110 shadow-md'
                    : 'bg-muted hover:bg-muted/80'
                    }`}
                >
                  {item.letter}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Quiz Modu */
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-4">
            <span className="px-4 py-2 bg-success text-white rounded-full font-black">
              ✓ {score}
            </span>
            <span className="px-4 py-2 bg-muted text-muted-foreground rounded-full font-black">
              Toplam: {totalQuestions}
            </span>
          </div>

          {quizLetter && (
            <AnimatePresence mode="wait">
              <motion.div
                key={quizLetter.letter}
                className="flex flex-col items-center gap-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <p className="text-xl font-bold text-muted-foreground">
                  Bu hangi harfle başlar?
                </p>

                <div className="text-center space-y-2">
                  <span className="text-8xl">{quizLetter.emoji}</span>
                  <p className="text-3xl font-black text-foreground">{quizLetter.word}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {quizOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleQuizAnswer(option)}
                      disabled={showResult !== null}
                      className={`w-24 h-24 text-4xl font-black rounded-2xl shadow-playful transition-all ${showResult
                        ? option === quizLetter.letter
                          ? 'bg-success text-white'
                          : showResult === 'wrong' && option === quizOptions.find(o => o !== quizLetter.letter)
                            ? 'bg-destructive text-white'
                            : 'bg-muted'
                        : 'bg-card hover:scale-105'
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
                    {showResult === 'correct' ? '🎉 Doğru!' : '😅 Tekrar dene!'}
                  </motion.p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default AlphabetGame;
