'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound, playComboSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';
import { getNextRandomIndex, getNextRandom, shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const ITEMS = ['🍎', '⭐', '🚗', '🐱', '🍦', '🎈', '🌸', '🐶', '🎸', '🦋', '🐸', '🍊', '🌻', '🐝', '🎀'];

const PRAISE = ['Aferin! 🌟', 'Harika! ⭐', 'Süper! 💫', 'Bravo! 🎯', 'Mükemmel! 🏆', 'Şahane! 🎉'];

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFS: Record<Difficulty, { label: string; emoji: string; range: [number, number]; options: number; timer: number; desc: string }> = {
  easy: { label: 'Kolay', emoji: '🌟', range: [1, 5], options: 3, timer: 0, desc: '1-5 arası, süresiz' },
  medium: { label: 'Orta', emoji: '⭐', range: [1, 10], options: 4, timer: 15, desc: '1-10 arası, 15 saniye' },
  hard: { label: 'Zor', emoji: '🔥', range: [1, 15], options: 5, timer: 10, desc: '1-15 arası, 10 saniye' },
};

/* Button pastel gradients for answer options */
const BTN_COLORS = [
  { bg: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', shadow: 'rgba(139,92,246,0.35)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #fbcfe8, #ec4899)', shadow: 'rgba(236,72,153,0.35)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #a7f3d0, #10b981)', shadow: 'rgba(16,185,129,0.35)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #fde68a, #f59e0b)', shadow: 'rgba(245,158,11,0.35)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #bfdbfe, #3b82f6)', shadow: 'rgba(59,130,246,0.35)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #fed7aa, #f97316)', shadow: 'rgba(249,115,22,0.35)', text: '#fff' },
];

interface ItemPos { id: number; x: number; y: number; rotation: number; delay: number; }
interface FloatingText { id: number; text: string; x: number; y: number; }

/* Glassmorphism pill */
const pill: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
const CountingGame = () => {
  const [count, setCount] = useState(1);
  const [emoji, setEmoji] = useState('🍎');
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [clickedItems, setClickedItems] = useState<Set<number>>(new Set());
  const [itemPositions, setItemPositions] = useState<ItemPos[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [shakeBtn, setShakeBtn] = useState<number | null>(null);
  const [correctHint, setCorrectHint] = useState(false);
  const [praiseText, setPraiseText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const nextRoundRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const floatTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastCountRef = useRef<number | null>(null);
  const lastEmojiRef = useRef<string | null>(null);
  const floatIdRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHighScore(getHighScore('counting')); }, []);

  const config = DIFFS[difficulty];

  /* ── Background scene (memoized) ── */
  const bgScene = useMemo(() => ({
    clouds: Array.from({ length: 5 }, (_, i) => ({
      id: i, x: 10 + Math.random() * 80, y: 5 + Math.random() * 25,
      size: 40 + Math.random() * 40, dur: 15 + Math.random() * 15, delay: i * 2,
    })),
    grassBlades: Array.from({ length: 12 }, (_, i) => ({
      id: i, x: 5 + (i / 12) * 90 + Math.random() * 5, dur: 2 + Math.random() * 2, delay: Math.random(),
    })),
  }), []);

  /* ── Generate non-overlapping positions for items ── */
  const generatePositions = useCallback((n: number): ItemPos[] => {
    const positions: ItemPos[] = [];
    const fieldW = 280;
    const fieldH = 200;
    const itemSize = 48;
    const padding = 10;

    for (let i = 0; i < n; i++) {
      let attempts = 0;
      let x: number, y: number;
      do {
        x = padding + Math.random() * (fieldW - itemSize - padding * 2);
        y = padding + Math.random() * (fieldH - itemSize - padding * 2);
        attempts++;
      } while (
        attempts < 50 &&
        positions.some(p => Math.abs(p.x - x) < itemSize && Math.abs(p.y - y) < itemSize)
      );
      positions.push({
        id: i, x, y,
        rotation: (Math.random() - 0.5) * 20,
        delay: i * 0.1,
      });
    }
    return positions;
  }, []);

  /* ── Setup round ── */
  const setupRound = useCallback(() => {
    const [min, max] = config.range;
    const newCount = getNextRandomIndex(max - min + 1, lastCountRef.current === null ? null : lastCountRef.current - min) + min;
    const newEmoji = getNextRandom(ITEMS, lastEmojiRef.current);
    lastCountRef.current = newCount;
    lastEmojiRef.current = newEmoji;
    setCount(newCount);
    setEmoji(newEmoji);
    setShowResult(null);
    setClickedItems(new Set());
    setShakeBtn(null);
    setCorrectHint(false);
    setPraiseText('');
    setShowCelebration(false);
    if (config.timer > 0) setTimeLeft(config.timer);

    setItemPositions(generatePositions(newCount));

    const ops = new Set<number>();
    ops.add(newCount);
    while (ops.size < config.options) {
      const offset = Math.floor(Math.random() * 7) - 3;
      const option = Math.max(1, Math.min(max + 2, newCount + offset));
      if (option !== newCount) ops.add(option);
    }
    setOptions(shuffleArray(Array.from(ops)));
  }, [config, generatePositions]);

  const startGame = () => {
    setGameState('playing');
    setScore(0); setStreak(0); setTotal(0);
    setupRound();
  };

  useEffect(() => {
    return () => {
      if (nextRoundRef.current) clearTimeout(nextRoundRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      floatTimersRef.current.forEach(clearTimeout);
      floatTimersRef.current = [];
    };
  }, []);

  /* ── Timer ── */
  useEffect(() => {
    if (gameState !== 'playing' || config.timer === 0 || showResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playErrorSound(); setStreak(0); setTotal(p => p + 1);
          setShowResult('wrong');
          if (nextRoundRef.current) clearTimeout(nextRoundRef.current);
          nextRoundRef.current = setTimeout(setupRound, 1800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, config.timer, showResult, setupRound]);

  /* ── Click on an item to count it ── */
  const handleItemClick = (itemId: number) => {
    if (showResult || clickedItems.has(itemId)) return;
    playPopSound();
    const newClicked = new Set(clickedItems);
    newClicked.add(itemId);
    setClickedItems(newClicked);

    // Floating number badge
    const pos = itemPositions.find(p => p.id === itemId);
    if (pos) {
      const id = ++floatIdRef.current;
      setFloatingTexts(prev => [...prev, { id, text: String(newClicked.size), x: pos.x + 20, y: pos.y }]);
      floatTimersRef.current.push(setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1200));
    }
  };

  /* ── Guess handler ── */
  const handleGuess = (guess: number) => {
    if (showResult) return;
    setTotal(p => p + 1);

    if (guess === count) {
      /* ── CORRECT ── */
      playSuccessSound();
      const newStreak = streak + 1;
      const bonus = newStreak >= 3 ? Math.min(newStreak, 5) * 3 : 0;
      const pts = 10 + bonus;
      setScore(prev => prev + pts);
      setStreak(newStreak);
      setShowResult('correct');
      setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      setShowCelebration(true);
      if (newStreak >= 3) playComboSound(newStreak);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a'] });
      if (newStreak % 5 === 0) playLevelUpSound();
      saveHighScoreObj('counting', score + pts);
      if (nextRoundRef.current) clearTimeout(nextRoundRef.current);
      nextRoundRef.current = setTimeout(setupRound, 2200);
    } else {
      /* ── WRONG ── */
      playErrorSound();
      setStreak(0);
      setShowResult('wrong');
      setShakeBtn(guess);
      setCorrectHint(true);
      setTimeout(() => setShakeBtn(null), 600);
      if (nextRoundRef.current) clearTimeout(nextRoundRef.current);
      nextRoundRef.current = setTimeout(setupRound, 2500);
    }
  };

  /* ═══════════════════════════════════════════
     MENU
     ═══════════════════════════════════════════ */
  if (gameState === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-6 p-5 pb-32 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div className="text-7xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(167,139,250,0.3))' }}
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}>🔢</motion.div>
        <h2 className="text-4xl md:text-5xl font-black text-gradient">Sayma Oyunu</h2>
        <p className="text-muted-foreground text-sm">Nesneleri say, doğru rakamı bul!</p>

        {highScore > 0 && (
          <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(167,139,250,0.25)' }}>
            <span className="font-black text-primary">🏆 Rekor: {highScore}</span>
          </div>
        )}

        <div className="w-full space-y-3 max-w-xs">
          <p className="text-xs font-bold text-muted-foreground text-center uppercase tracking-wider">Zorluk Seç</p>
          {(Object.entries(DIFFS) as [Difficulty, typeof DIFFS['easy']][]).map(([key, val], i) => (
            <motion.button key={key} onClick={() => setDifficulty(key)}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={{ }} whileTap={{ }}
              className="w-full p-4 text-left touch-manipulation transition-all"
              style={{
                ...pill,
                background: difficulty === key ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)',
                border: difficulty === key ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{val.emoji}</span>
                <div>
                  <p className="font-bold text-sm">{val.label}</p>
                  <p className="text-xs text-muted-foreground">{val.desc}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.button onClick={startGame} className="btn-gaming px-12 py-4 text-lg"
          whileHover={{ y: -2 }} whileTap={{ }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          🚀 BAŞLA!
        </motion.button>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════
     PLAYING
     ═══════════════════════════════════════════ */
  return (
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-32 max-w-2xl mx-auto relative overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* ── Garden background scene ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Sky gradient */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(147,197,253,0.08) 0%, rgba(196,181,253,0.05) 40%, rgba(167,243,208,0.04) 70%, transparent 100%)',
        }} />
        {/* Sun */}
        <motion.div className="absolute" style={{ right: '10%', top: '5%', width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.15), rgba(251,191,36,0.03))', boxShadow: '0 0 40px rgba(251,191,36,0.1)' }}
          animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} />
        {/* Floating clouds */}
        {bgScene.clouds.map(c => (
          <motion.div key={c.id} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.size, height: c.size * 0.5, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(2px)' }}
            animate={{ x: [0, 30, 0, -30, 0] }}
            transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
        {/* Ground / grass strip */}
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{
          background: 'linear-gradient(180deg, rgba(52,211,153,0.06) 0%, rgba(34,197,94,0.03) 100%)',
        }}>
          {bgScene.grassBlades.map(g => (
            <motion.div key={g.id} className="absolute bottom-0" style={{ left: `${g.x}%`, width: 3, height: 14, borderRadius: '2px 2px 0 0', background: 'rgba(52,211,153,0.15)', transformOrigin: 'bottom center' }}
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: g.dur, delay: g.delay, repeat: Infinity, ease: 'easeInOut' }} />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 w-full">
        {/* ── HUD ── */}
        <motion.div className="flex flex-wrap justify-center gap-2"
          initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-primary">⭐ {score}</span></div>
          {streak >= 3 && (
            <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: [0.5, 1.2, 1] }}
              className="px-4 py-2" style={{ ...pill, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(streak, 5)}</span>
            </motion.div>
          )}
          {config.timer > 0 && (
            <div className="px-4 py-2" style={pill}>
              <span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
            </div>
          )}
          <div className="px-4 py-2" style={pill}><span className="text-sm font-bold text-muted-foreground">✓ {total}</span></div>
        </motion.div>

        {/* ── Item Field ── */}
        <div ref={fieldRef} className="relative w-full overflow-hidden"
          style={{
            maxWidth: 400, height: 240,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>

          {/* Floating number badges */}
          <AnimatePresence>
            {floatingTexts.map(ft => (
              <motion.div key={ft.id}
                className="absolute z-30 pointer-events-none"
                style={{ left: ft.x, top: ft.y }}
                initial={{ opacity: 1, y: 0, scale: 0.3 }}
                animate={{ opacity: [1, 1, 0], y: -50, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', boxShadow: '0 2px 10px rgba(139,92,246,0.4)' }}>
                  {ft.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Celebration star overlay */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: [0, 1.5, 1.2], rotate: [0, 15, 0] }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.5))' }}>⭐</motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Items */}
          <AnimatePresence mode="wait">
            <motion.div key={`${count}-${emoji}`} className="absolute inset-0"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {itemPositions.map((pos) => {
                const isClicked = clickedItems.has(pos.id);
                return (
                  <motion.div key={pos.id}
                    className="absolute cursor-pointer touch-manipulation select-none"
                    style={{ left: pos.x, top: pos.y }}
                    initial={{ opacity: 0, scale: 0, rotate: pos.rotation - 20 }}
                    animate={{
                      opacity: 1,
                      scale: showCelebration && showResult === 'correct' ? [1, 1.15, 0.9, 1.1, 1] : isClicked ? 1.05 : 1,
                      rotate: showCelebration ? [pos.rotation, pos.rotation + 10, pos.rotation - 10, pos.rotation] : pos.rotation,
                      y: showCelebration ? [0, -8, 0] : 0,
                    }}
                    transition={{
                      delay: pos.delay,
                      duration: showCelebration ? 0.6 : 0.4,
                      type: showCelebration ? 'tween' : 'spring',
                      stiffness: 300, damping: 18,
                    }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleItemClick(pos.id)}>
                    <div className="relative">
                      <span className="text-4xl sm:text-5xl select-none"
                        style={{
                          filter: isClicked ? 'drop-shadow(0 0 8px rgba(167,139,250,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                          transition: 'filter 0.2s ease',
                        }}>
                        {emoji}
                      </span>
                      {/* Clicked indicator ring */}
                      {isClicked && (
                        <motion.div className="absolute -inset-1 rounded-full pointer-events-none"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          style={{ border: '2px solid rgba(167,139,250,0.4)', borderRadius: '50%' }} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Praise text ── */}
        <div className="relative h-8">
          <AnimatePresence>
            {praiseText && showResult === 'correct' && (
              <motion.p className="absolute left-1/2 -translate-x-1/2 text-2xl font-black text-gradient whitespace-nowrap"
                initial={{ scale: 0, y: 20 }} animate={{ scale: [0, 1.3, 1], y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
                {praiseText}
              </motion.p>
            )}
            {showResult === 'wrong' && (
              <motion.p className="absolute left-1/2 -translate-x-1/2 text-xl font-black text-red-400 whitespace-nowrap"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                😅 Cevap: {count}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Answer Buttons — 3D raised circles ── */}
        <motion.div className="flex gap-3 sm:gap-4 flex-wrap justify-center"
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          {options.map((option, i) => {
            const color = BTN_COLORS[i % BTN_COLORS.length];
            const isCorrectAnswer = option === count;
            const isShaking = shakeBtn === option;
            const isHinting = correctHint && isCorrectAnswer && showResult === 'wrong';
            const isCorrectRevealed = showResult === 'correct' && isCorrectAnswer;
            const isWrongRevealed = showResult !== null && !isCorrectAnswer;

            return (
              <motion.button key={option}
                onClick={() => handleGuess(option)}
                disabled={showResult !== null}
                className="relative touch-manipulation select-none"
                animate={{
                  x: isShaking ? [0, -8, 8, -6, 6, -3, 0] : 0,
                  rotate: isShaking ? [0, -3, 3, -2, 2, 0] : 0,
                  scale: isCorrectRevealed ? [1, 1.2, 1.1] : isHinting ? [1, 1.08, 1, 1.08, 1] : 1,
                }}
                transition={isShaking ? { duration: 0.5 } : isHinting ? { duration: 1.2, repeat: 2 } : { duration: 0.3 }}
                whileHover={showResult ? {} : { y: -4 }}
                whileTap={showResult ? {} : { }}>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-black"
                  style={{
                    background: isWrongRevealed ? 'rgba(255,255,255,0.05)' : color.bg,
                    boxShadow: isHinting
                      ? `0 0 24px ${color.shadow}, 0 6px 16px ${color.shadow}`
                      : isCorrectRevealed
                        ? `0 0 30px rgba(52,211,153,0.5), 0 6px 20px rgba(52,211,153,0.3)`
                        : isWrongRevealed
                          ? 'none'
                          : `0 6px 16px ${color.shadow}, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.1)`,
                    color: isWrongRevealed ? 'rgba(255,255,255,0.2)' : color.text,
                    border: isHinting
                      ? '3px solid rgba(52,211,153,0.6)'
                      : isCorrectRevealed
                        ? '3px solid rgba(52,211,153,0.5)'
                        : '2px solid rgba(255,255,255,0.15)',
                    transition: 'all 0.3s ease',
                    opacity: isWrongRevealed ? 0.4 : 1,
                  }}>
                  {option}
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Bottom ── */}
        <motion.button onClick={() => setGameState('menu')}
          whileHover={{ }} whileTap={{ }}
          className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation mt-2" style={pill}>
          ← Menü
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CountingGame;
