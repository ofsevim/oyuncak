'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

// Hayvanlar ve ses frekansları (basit synth ile taklit)
const ANIMALS = [
  { id: 'cat', emoji: '🐱', name: 'Kedi', sound: 'miyav', freq: [400, 600], type: 'meow' },
  { id: 'dog', emoji: '🐶', name: 'Köpek', sound: 'hav hav', freq: [200, 150], type: 'bark' },
  { id: 'cow', emoji: '🐄', name: 'İnek', sound: 'möö', freq: [150, 120], type: 'moo' },
  { id: 'sheep', emoji: '🐑', name: 'Koyun', sound: 'meee', freq: [350, 400], type: 'baa' },
  { id: 'pig', emoji: '🐷', name: 'Domuz', sound: 'oink', freq: [250, 200], type: 'oink' },
  { id: 'duck', emoji: '🦆', name: 'Ördek', sound: 'vak vak', freq: [500, 450], type: 'quack' },
  { id: 'chicken', emoji: '🐔', name: 'Tavuk', sound: 'gıdak', freq: [600, 500], type: 'cluck' },
  { id: 'rooster', emoji: '🐓', name: 'Horoz', sound: 'ü-ürü-üüü', freq: [400, 600, 800], type: 'crow' },
  { id: 'horse', emoji: '🐴', name: 'At', sound: 'iiii', freq: [300, 400], type: 'neigh' },
  { id: 'lion', emoji: '🦁', name: 'Aslan', sound: 'kükreee', freq: [100, 80], type: 'roar' },
  { id: 'elephant', emoji: '🐘', name: 'Fil', sound: 'paaa', freq: [200, 300, 250], type: 'trumpet' },
  { id: 'frog', emoji: '🐸', name: 'Kurbağa', sound: 'vrak vrak', freq: [200, 250], type: 'ribbit' },
];

type GameMode = 'explore' | 'quiz';

const AnimalSoundsGame = () => {
  const [mode, setMode] = useState<GameMode>('explore');
  const [activeAnimal, setActiveAnimal] = useState<string | null>(null);
  const [quizAnimal, setQuizAnimal] = useState<typeof ANIMALS[0] | null>(null);
  const [quizOptions, setQuizOptions] = useState<typeof ANIMALS>([]);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playAnimalSound = useCallback((animal: typeof ANIMALS[0]) => {
    const ctx = getAudioContext();
    
    animal.freq.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Hayvan tipine göre farklı dalga formu
      switch (animal.type) {
        case 'meow':
        case 'baa':
          osc.type = 'sine';
          break;
        case 'bark':
        case 'roar':
          osc.type = 'sawtooth';
          break;
        case 'moo':
        case 'trumpet':
          osc.type = 'triangle';
          break;
        default:
          osc.type = 'square';
      }

      const startTime = ctx.currentTime + i * 0.15;
      osc.frequency.setValueAtTime(freq, startTime);
      
      if (animal.freq.length > 1) {
        osc.frequency.linearRampToValueAtTime(
          animal.freq[(i + 1) % animal.freq.length],
          startTime + 0.2
        );
      }

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }, [getAudioContext]);

  const handleAnimalClick = (animal: typeof ANIMALS[0]) => {
    playPopSound();
    setActiveAnimal(animal.id);
    setTimeout(() => {
      playAnimalSound(animal);
    }, 100);
    setTimeout(() => setActiveAnimal(null), 800);
  };

  const generateQuiz = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * ANIMALS.length);
    const correct = ANIMALS[randomIndex];
    
    // 3 yanlış seçenek
    const wrongOptions: typeof ANIMALS = [];
    while (wrongOptions.length < 3) {
      const randAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      if (randAnimal.id !== correct.id && !wrongOptions.find(a => a.id === randAnimal.id)) {
        wrongOptions.push(randAnimal);
      }
    }

    // Karıştır
    const allOptions = [correct, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setQuizAnimal(correct);
    setQuizOptions(allOptions);
    setShowResult(null);

    // Sesi çal
    setTimeout(() => {
      playAnimalSound(correct);
    }, 500);
  }, [playAnimalSound]);

  const handleQuizAnswer = (animal: typeof ANIMALS[0]) => {
    if (showResult) return;
    
    setTotalQuestions(prev => prev + 1);
    
    if (animal.id === quizAnimal?.id) {
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
    }, 2000);
  };

  const startQuiz = () => {
    setMode('quiz');
    setScore(0);
    setTotalQuestions(0);
    generateQuiz();
  };

  const replaySound = () => {
    if (quizAnimal) {
      playAnimalSound(quizAnimal);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-black text-foreground">🐾 Hayvan Sesleri</h2>

      {/* Mod seçimi */}
      <div className="flex gap-2 bg-muted p-1 rounded-2xl">
        <button
          onClick={() => setMode('explore')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            mode === 'explore' ? 'bg-primary text-white' : 'hover:bg-card'
          }`}
        >
          🔊 Dinle
        </button>
        <button
          onClick={startQuiz}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            mode === 'quiz' ? 'bg-primary text-white' : 'hover:bg-card'
          }`}
        >
          🎯 Tahmin Et
        </button>
      </div>

      {mode === 'explore' ? (
        /* Keşfet Modu */
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-w-lg">
          {ANIMALS.map((animal) => (
            <motion.button
              key={animal.id}
              onClick={() => handleAnimalClick(animal)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl shadow-playful transition-all ${
                activeAnimal === animal.id
                  ? 'bg-primary scale-110'
                  : 'bg-card hover:scale-105'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-5xl">{animal.emoji}</span>
              <span className={`text-sm font-bold ${
                activeAnimal === animal.id ? 'text-white' : 'text-foreground'
              }`}>
                {animal.name}
              </span>
              {activeAnimal === animal.id && (
                <motion.span
                  className="text-xs text-white/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {animal.sound}
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>
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

          {quizAnimal && (
            <AnimatePresence mode="wait">
              <motion.div
                key={quizAnimal.id}
                className="flex flex-col items-center gap-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <p className="text-xl font-bold text-muted-foreground">
                  Bu ses hangi hayvana ait?
                </p>

                <button
                  onClick={replaySound}
                  className="px-8 py-4 bg-primary text-white rounded-full font-black text-xl btn-bouncy"
                >
                  🔊 Tekrar Dinle
                </button>

                <div className="grid grid-cols-2 gap-4">
                  {quizOptions.map((animal) => (
                    <button
                      key={animal.id}
                      onClick={() => handleQuizAnswer(animal)}
                      disabled={showResult !== null}
                      className={`flex flex-col items-center gap-2 p-6 rounded-2xl shadow-playful transition-all ${
                        showResult
                          ? animal.id === quizAnimal.id
                            ? 'bg-success'
                            : 'bg-muted'
                          : 'bg-card hover:scale-105'
                      }`}
                    >
                      <span className="text-6xl">{animal.emoji}</span>
                      <span className={`font-bold ${
                        showResult && animal.id === quizAnimal.id ? 'text-white' : 'text-foreground'
                      }`}>
                        {animal.name}
                      </span>
                    </button>
                  ))}
                </div>

                {showResult && (
                  <motion.div
                    className="text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <p className={`text-2xl font-black ${showResult === 'correct' ? 'text-success' : 'text-destructive'}`}>
                      {showResult === 'correct' ? '🎉 Doğru!' : '😅 Yanlış!'}
                    </p>
                    <p className="text-lg text-muted-foreground">
                      {quizAnimal.name}: "{quizAnimal.sound}"
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default AnimalSoundsGame;

