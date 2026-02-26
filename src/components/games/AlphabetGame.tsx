'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';
import { shuffleArray } from '@/utils/shuffle';

const ALPHABET = [
  { letter: 'A', word: 'Arı', emoji: '🐝', examples: ['Araba 🚗', 'Ayı 🐻', 'Aslan 🦁'] },
  { letter: 'B', word: 'Balon', emoji: '🎈', examples: ['Balık 🐟', 'Bulut ☁️', 'Böcek 🐛'] },
  { letter: 'C', word: 'Ceylan', emoji: '🦌', examples: ['Cam 🪟', 'Ceviz 🥜'] },
  { letter: 'Ç', word: 'Çiçek', emoji: '🌸', examples: ['Çanta 🎒', 'Çilek 🍓'] },
  { letter: 'D', word: 'Deniz', emoji: '🌊', examples: ['Dağ ⛰️', 'Deve 🐫'] },
  { letter: 'E', word: 'Elma', emoji: '🍎', examples: ['Ev 🏠', 'Erik 🫐'] },
  { letter: 'F', word: 'Fil', emoji: '🐘', examples: ['Fare 🐭', 'Fener 🏮'] },
  { letter: 'G', word: 'Güneş', emoji: '☀️', examples: ['Gül 🌹', 'Gemi 🚢'] },
  { letter: 'H', word: 'Havuç', emoji: '🥕', examples: ['Horoz 🐓', 'Halı 🧶'] },
  { letter: 'I', word: 'Irmak', emoji: '🏞️', examples: ['Işık 💡'] },
  { letter: 'İ', word: 'İnek', emoji: '🐄', examples: ['İğne 🪡', 'İp 🧵'] },
  { letter: 'J', word: 'Jilet', emoji: '🪒', examples: ['Jöle 🍮'] },
  { letter: 'K', word: 'Kedi', emoji: '🐱', examples: ['Kuş 🐦', 'Kelebek 🦋', 'Köpek 🐶'] },
  { letter: 'L', word: 'Lale', emoji: '🌷', examples: ['Limon 🍋', 'Lamba 💡'] },
  { letter: 'M', word: 'Muz', emoji: '🍌', examples: ['Maymun 🐒', 'Masa 🪑'] },
  { letter: 'N', word: 'Nar', emoji: '🍎', examples: ['Nota 🎵', 'Nehir 🏞️'] },
  { letter: 'O', word: 'Okul', emoji: '🏫', examples: ['Orman 🌲', 'Ördek 🦆'] },
  { letter: 'Ö', word: 'Ördek', emoji: '🦆', examples: ['Öğretmen 👩‍🏫'] },
  { letter: 'P', word: 'Portakal', emoji: '🍊', examples: ['Panda 🐼', 'Pasta 🎂'] },
  { letter: 'R', word: 'Robot', emoji: '🤖', examples: ['Rakun 🦝', 'Renk 🎨'] },
  { letter: 'S', word: 'Sincap', emoji: '🐿️', examples: ['Su 💧', 'Saat ⏰'] },
  { letter: 'Ş', word: 'Şeker', emoji: '🍬', examples: ['Şemsiye ☂️', 'Şapka 🎩'] },
  { letter: 'T', word: 'Tavşan', emoji: '🐰', examples: ['Top ⚽', 'Tren 🚂'] },
  { letter: 'U', word: 'Uçak', emoji: '✈️', examples: ['Uzay 🚀', 'Uyku 😴'] },
  { letter: 'Ü', word: 'Üzüm', emoji: '🍇', examples: ['Ütü 🧹'] },
  { letter: 'V', word: 'Vapur', emoji: '🚢', examples: ['Vişne 🍒'] },
  { letter: 'Y', word: 'Yıldız', emoji: '⭐', examples: ['Yılan 🐍', 'Yağmur 🌧️'] },
  { letter: 'Z', word: 'Zürafa', emoji: '🦒', examples: ['Zeytin 🫒', 'Zil 🔔'] },
];

type GameMode = 'explore' | 'quiz' | 'write';

const AlphabetGame = () => {
  const [mode, setMode] = useState<GameMode>('explore');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizLetter, setQuizLetter] = useState<typeof ALPHABET[0] | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [learnedLetters, setLearnedLetters] = useState<Set<string>>(new Set());
  // Write mode
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{x: number; y: number} | null>(null);

  useEffect(() => { setHighScore(getHighScore('alphabet')); }, []);

  const currentLetter = ALPHABET[currentIndex];

  const speakLetter = useCallback((letter: typeof ALPHABET[0]) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`${letter.letter}. ${letter.word}`);
      u.lang = 'tr-TR'; u.rate = 0.8; u.pitch = 1.2;
      window.speechSynthesis.speak(u);
    }
  }, []);

  const goNext = () => {
    playPopSound();
    const next = (currentIndex + 1) % ALPHABET.length;
    setCurrentIndex(next);
    setLearnedLetters(prev => new Set(prev).add(ALPHABET[currentIndex].letter));
  };

  const goPrev = () => {
    playPopSound();
    setCurrentIndex((currentIndex - 1 + ALPHABET.length) % ALPHABET.length);
  };

  const generateQuiz = useCallback(() => {
    const correct = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const wrongOptions: string[] = [];
    while (wrongOptions.length < 3) {
      const r = ALPHABET[Math.floor(Math.random() * ALPHABET.length)].letter;
      if (r !== correct.letter && !wrongOptions.includes(r)) wrongOptions.push(r);
    }
    setQuizLetter(correct);
    setQuizOptions(shuffleArray([correct.letter, ...wrongOptions]));
    setShowResult(null);
  }, []);

  const handleQuizAnswer = (answer: string) => {
    if (showResult) return;
    setTotalQuestions(prev => prev + 1);
    if (answer === quizLetter?.letter) {
      const newCombo = combo + 1;
      const points = 10 + Math.min(newCombo, 5) * 5;
      setCombo(newCombo);
      setScore(prev => prev + points);
      if (newCombo > 2) playComboSound(newCombo); else playSuccessSound();
      setShowResult('correct');
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      const isNew = saveHighScoreObj('alphabet', score + points);
      if (isNew) { setHighScore(score + points); playNewRecordSound(); }
    } else {
      playErrorSound();
      setCombo(0);
      setShowResult('wrong');
    }
    setTimeout(generateQuiz, 1500);
  };

  const startQuiz = () => { setMode('quiz'); setScore(0); setCombo(0); setTotalQuestions(0); generateQuiz(); };

  // Write mode canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw guide letter
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = 'bold 180px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentLetter.letter, canvas.width / 2, canvas.height / 2);
  };

  useEffect(() => { if (mode === 'write') setTimeout(clearCanvas, 50); }, [mode, currentIndex]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const drawOnCanvas = (pos: {x: number; y: number}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPosRef.current = pos;
  };

  return (
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-3xl font-black text-gradient">🔤 Harf Öğren</h2>

      {/* Mode tabs */}
      <div className="flex gap-1 glass-card p-1 rounded-xl">
        {([
          { m: 'explore' as GameMode, label: '📚 Keşfet' },
          { m: 'quiz' as GameMode, label: '🎯 Quiz' },
          { m: 'write' as GameMode, label: '✏️ Yaz' },
        ]).map(t => (
          <button key={t.m} onClick={() => t.m === 'quiz' ? startQuiz() : setMode(t.m)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all touch-manipulation ${mode === t.m ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'explore' && (
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} className="flex flex-col items-center gap-4" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}>
            <motion.button onClick={() => speakLetter(currentLetter)} whileTap={{ scale: 0.95 }}
              className="w-40 h-40 md:w-52 md:h-52 rounded-3xl shadow-lg neon-border flex items-center justify-center touch-manipulation"
              style={{ background: `linear-gradient(135deg, hsl(${currentIndex * 13} 70% 50%), hsl(${currentIndex * 13 + 30} 70% 40%))` }}>
              <span className="text-7xl md:text-8xl font-black text-white drop-shadow-lg">{currentLetter.letter}</span>
            </motion.button>
            <div className="text-center space-y-1">
              <p className="text-5xl">{currentLetter.emoji}</p>
              <p className="text-2xl font-black">{currentLetter.word}</p>
              <p className="text-sm text-muted-foreground">"{currentLetter.letter}" harfi ile başlar</p>
              <button onClick={() => speakLetter(currentLetter)} className="text-xs text-primary font-bold touch-manipulation">🔊 Dinle</button>
            </div>
            {/* Examples */}
            <div className="flex flex-wrap gap-2 justify-center">
              {currentLetter.examples.map(ex => (
                <span key={ex} className="glass-card px-3 py-1 rounded-full text-xs font-bold">{ex}</span>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={goPrev} className="px-6 py-3 glass-card rounded-full font-black text-lg touch-manipulation">← Önceki</button>
              <button onClick={goNext} className="px-6 py-3 btn-gaming rounded-full font-black text-lg touch-manipulation">Sonraki →</button>
            </div>
            {/* Letter grid */}
            <div className="flex flex-wrap justify-center gap-1.5 max-w-full px-2">
              {ALPHABET.map((item, index) => (
                <button key={item.letter} onClick={() => { playPopSound(); setCurrentIndex(index); }}
                  className={`w-8 h-8 md:w-9 md:h-9 rounded-lg font-bold transition-all text-xs touch-manipulation ${index === currentIndex ? 'bg-primary text-primary-foreground scale-110 shadow-md' : learnedLetters.has(item.letter) ? 'bg-green-500/20 text-green-400' : 'glass-card'}`}>
                  {item.letter}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">✅ {learnedLetters.size}/{ALPHABET.length} harf öğrenildi</p>
          </motion.div>
        </AnimatePresence>
      )}

      {mode === 'quiz' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="glass-card px-3 py-1"><span className="text-sm font-black text-primary">⭐ {score}</span></div>
            {combo > 1 && <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1 border border-yellow-500/30"><span className="text-sm font-black text-yellow-400">🔥 x{combo}</span></motion.div>}
            <div className="glass-card px-3 py-1"><span className="text-sm font-bold text-muted-foreground">✓ {totalQuestions}</span></div>
            {highScore > 0 && <div className="glass-card px-3 py-1"><span className="text-sm font-bold text-muted-foreground">🏆 {highScore}</span></div>}
          </div>
          {quizLetter && (
            <AnimatePresence mode="wait">
              <motion.div key={quizLetter.letter} className="flex flex-col items-center gap-4" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <p className="text-lg font-bold text-muted-foreground">Bu hangi harfle başlar?</p>
                <div className="text-center space-y-2">
                  <span className="text-7xl">{quizLetter.emoji}</span>
                  <p className="text-2xl font-black">{quizLetter.word}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {quizOptions.map(option => (
                    <button key={option} onClick={() => handleQuizAnswer(option)} disabled={showResult !== null}
                      className={`w-20 h-20 md:w-24 md:h-24 text-3xl md:text-4xl font-black rounded-2xl transition-all touch-manipulation ${showResult ? option === quizLetter.letter ? 'bg-green-500 text-white scale-105' : 'glass-card opacity-50' : 'glass-card hover:scale-105 active:scale-95'}`}>
                      {option}
                    </button>
                  ))}
                </div>
                {showResult && (
                  <motion.p className={`text-xl font-black ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    {showResult === 'correct' ? '🎉 Doğru!' : `😅 Doğrusu: ${quizLetter.letter}`}
                  </motion.p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {mode === 'write' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground font-bold">"{currentLetter.letter}" harfini parmağınla yaz!</p>
          <div className="glass-card p-2 rounded-xl neon-border">
            <canvas ref={canvasRef} width={250} height={250}
              onMouseDown={(e) => { setIsDrawing(true); const p = getCanvasPos(e); if (p) lastPosRef.current = p; }}
              onMouseMove={(e) => { if (!isDrawing) return; const p = getCanvasPos(e); if (p) drawOnCanvas(p); }}
              onMouseUp={() => { setIsDrawing(false); lastPosRef.current = null; }}
              onTouchStart={(e) => { e.preventDefault(); setIsDrawing(true); const p = getCanvasPos(e); if (p) lastPosRef.current = p; }}
              onTouchMove={(e) => { e.preventDefault(); if (!isDrawing) return; const p = getCanvasPos(e); if (p) drawOnCanvas(p); }}
              onTouchEnd={() => { setIsDrawing(false); lastPosRef.current = null; }}
              className="rounded-lg" style={{ touchAction: 'none', width: 250, height: 250 }} />
          </div>
          <div className="flex gap-2">
            <button onClick={clearCanvas} className="px-4 py-2 glass-card rounded-xl font-bold text-sm touch-manipulation">🗑️ Temizle</button>
            <button onClick={() => { clearCanvas(); goNext(); }} className="px-4 py-2 btn-gaming rounded-xl font-bold text-sm touch-manipulation">Sonraki →</button>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 max-w-full px-2">
            {ALPHABET.map((item, index) => (
              <button key={item.letter} onClick={() => { playPopSound(); setCurrentIndex(index); }}
                className={`w-8 h-8 rounded-lg font-bold text-xs transition-all touch-manipulation ${index === currentIndex ? 'bg-primary text-primary-foreground scale-110' : 'glass-card'}`}>
                {item.letter}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AlphabetGame;
