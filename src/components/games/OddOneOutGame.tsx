'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

import { CATEGORIES } from '@/data/categories';

const QUESTION_TEMPLATES = [
  { hint: 'Hangisi hayvan değil?', category: 'animals' },
  { hint: 'Hangisi araç değil?', category: 'vehicles' },
  { hint: 'Hangisi meyve değil?', category: 'fruits' },
  { hint: 'Hangisi renk değil?', category: 'colors' },
  { hint: 'Hangisi sebze değil?', category: 'vegetables' },
  { hint: 'Hangisi müzik aleti değil?', category: 'instruments' },
  { hint: 'Hangisi hava durumu ile ilgili değil?', category: 'weather' },
  { hint: 'Hangisi spor aleti/topu değil?', category: 'sports' },
  { hint: 'Hangisi deniz canlısı değil?', category: 'seaCreatures' },
  { hint: 'Hangisi tatlı/yemek değil?', category: 'food' },
  { hint: 'Hangisi okul veya çizim eşyası değil?', category: 'school' },
  { hint: 'Hangisi bitki değil?', category: 'trees' },
  { hint: 'Hangisi kıyafet değil?', category: 'clothes' },
  { hint: 'Hangisi gökyüzü/uzay ile ilgili değil?', category: 'sky' },
  { hint: 'Hangisi böcek değil?', category: 'insects' },
  { hint: 'Hangisi kışla/soğukla ilgili değil?', category: 'cold' },
  { hint: 'Hangisi plajda görülmez?', category: 'beach' },
  { hint: 'Hangisi meslek değil?', category: 'jobs' },
  { hint: 'Hangisi kahvaltıda yenmez?', category: 'breakfast' },
  { hint: 'Hangisi hayali bir karakter/canlı değil?', category: 'mythical' },
  { hint: 'Hangisi vücudumuzun bir parçası değil?', category: 'bodyParts' },
  { hint: 'Hangisi oyuncak değil?', category: 'toys' }
];

function generateDynamicRounds(isHardMode: boolean) {
  const templates = shuffleArray([...QUESTION_TEMPLATES]);
  const generatedRounds = [];

  // Sabit sayıda (örn. 15) soru oynatalım
  const roundCount = Math.min(15, templates.length);

  for (let i = 0; i < roundCount; i++) {
    const template = templates[i];
    const targetEmojis = CATEGORIES[template.category].items;
    const count = isHardMode ? 6 : 4;

    // Doğru kategoriye ait şıkları seç
    const validEmojis = shuffleArray([...targetEmojis]).slice(0, count - 1);

    // Yanlış şıkkı (istenen cevap) farklı bir kategoriden seç
    const allOtherEmojis = Object.entries(CATEGORIES)
      .filter(([key]) => key !== template.category)
      .flatMap(([, catData]) => catData.items)
      .filter(emoji => !targetEmojis.includes(emoji)); // Kazara aynı emojiyi seçmemek için

    const invalidEmoji = shuffleArray(allOtherEmojis)[0];

    // Tüm şıkları birleştirip karıştır
    const items = validEmojis.map((emoji, index) => ({ id: `valid_${index}`, emoji }));
    items.push({ id: 'odd_one', emoji: invalidEmoji });

    generatedRounds.push({
      items: shuffleArray(items),
      oddOne: 'odd_one',
      hint: template.hint
    });
  }
  return generatedRounds;
}

const PRAISE = ['Harika! 🌟', 'Süper! ⭐', 'Mükemmel! 💫', 'Bravo! 🎯', 'Aferin! 🏆', 'Şahane! 🎉'];

/* Card pastel backgrounds */
const CARD_BG = [
  'linear-gradient(135deg, rgba(196,181,253,0.15), rgba(167,139,250,0.08))',
  'linear-gradient(135deg, rgba(251,207,232,0.15), rgba(244,114,182,0.08))',
  'linear-gradient(135deg, rgba(167,243,208,0.15), rgba(52,211,153,0.08))',
  'linear-gradient(135deg, rgba(253,230,138,0.15), rgba(251,191,36,0.08))',
  'linear-gradient(135deg, rgba(191,219,254,0.15), rgba(96,165,250,0.08))',
  'linear-gradient(135deg, rgba(254,215,170,0.15), rgba(251,146,60,0.08))',
];

interface Sparkle { id: number; x: number; y: number; angle: number; color: string; }

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
const OddOneOutGame = () => {
  const [shuffledRounds, setShuffledRounds] = useState<{ items: { id: string, emoji: string }[], oddOne: string, hint: string }[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [fadedId, setFadedId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
  const [roundItems, setRoundItems] = useState<{ id: string; emoji: string }[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [useTimer, setUseTimer] = useState(false);
  const [useHardMode, setUseHardMode] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hintPulse, setHintPulse] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [praiseText, setPraiseText] = useState('');
  const [showPraise, setShowPraise] = useState(false);

  const { safeTimeout, safeInterval, clearAll, clearAllIntervals } = useSafeTimeouts();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sparkleIdRef = useRef(0);
  const scoreRef = useRef(0);
  // Synchronous mirror of timeLeft so the interval callback reads the latest value
  const timeLeftRef = useRef<number>(15);

  useEffect(() => { setHighScore(getHighScore('oddoneout')); }, []);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  /* Background dots (memoized) */
  const bgDots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 3 + Math.random() * 4, dur: 4 + Math.random() * 6, delay: Math.random() * 3,
    color: ['rgba(167,139,250,0.12)', 'rgba(244,114,182,0.1)', 'rgba(52,211,153,0.1)', 'rgba(251,191,36,0.1)', 'rgba(96,165,250,0.12)'][i % 5],
  })), []);

  /* ── Sparkle burst ── */
  const addSparkles = useCallback((cx: number, cy: number) => {
    const colors = ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a', '#bfdbfe', '#fed7aa'];
    const newS: Sparkle[] = Array.from({ length: 10 }, (_, i) => ({
      id: ++sparkleIdRef.current, x: cx, y: cy,
      angle: (Math.PI * 2 / 10) * i + (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setSparkles(prev => [...prev, ...newS]);
    safeTimeout(() => setSparkles(prev => prev.filter(s => !newS.find(n => n.id === s.id))), 900);
  }, [safeTimeout]);

  /* ── Init game ── */
  const initGame = useCallback(() => {
    clearAll();
    clearAllIntervals();
    const rounds = generateDynamicRounds(useHardMode);
    setShuffledRounds(rounds);
    setCurrentRoundIndex(0); setSelectedId(null); setIsCorrect(false);
    setShakeId(null); setFadedId(null);
    setGameState('playing'); setScore(0); scoreRef.current = 0;
    setStreak(0); setHintPulse(false); setSparkles([]);
    setIsNewRecord(false); setShowPraise(false);
    if (rounds.length > 0) setRoundItems(shuffleArray(rounds[0].items));
    if (useTimer) setTimeLeft(15);
  }, [useHardMode, useTimer, clearAll, clearAllIntervals]);

  const round = shuffledRounds[currentRoundIndex];

  useEffect(() => {
    if (round && gameState === 'playing') {
      setRoundItems(shuffleArray(round.items));
      setHintPulse(false); setSelectedId(null); setIsCorrect(false);
      setShakeId(null); setFadedId(null); setShowPraise(false);
    }
  }, [currentRoundIndex, round, gameState]);

  /* ── Auto hint pulse after 8s ── */
  useEffect(() => {
    if (gameState !== 'playing' || selectedId || !round) return;
    const t = safeTimeout(() => setHintPulse(true), 8000);
    return () => clearTimeout(t);
  }, [currentRoundIndex, gameState, selectedId, round, safeTimeout]);

  /* ── Timer — side effects stay outside the functional updater (React 18 Strict Mode safe) ── */
  useEffect(() => {
    if (!useTimer || gameState !== 'playing' || !round || selectedId) {
      return;
    }
    timeLeftRef.current = 15;
    setTimeLeft(15);
    const intervalId = safeInterval(() => {
      const tl = timeLeftRef.current;
      if (tl <= 1) {
        playErrorSound();
        setStreak(0);
        timeLeftRef.current = 15;
        setTimeLeft(15);
        if (currentRoundIndex >= shuffledRounds.length - 1) {
          // Last round expired — finish the game
          setGameState('complete');
          fireConfetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a', '#bfdbfe'] });
          const isNew = saveHighScoreObj('oddoneout', scoreRef.current);
          if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
          else playLevelUpSound();
        } else {
          setCurrentRoundIndex(p => p + 1);
        }
      } else {
        timeLeftRef.current = tl - 1;
        setTimeLeft(tl - 1);
      }
    }, 1000);
    timerRef.current = intervalId;
    return () => clearInterval(intervalId);
  }, [useTimer, round, currentRoundIndex, shuffledRounds.length, selectedId, gameState, safeInterval]);

  /* ── Handle selection ── */
  const handleSelect = (itemId: string, e: React.MouseEvent | React.TouchEvent) => {
    if (selectedId || gameState !== 'playing') return;

    if (itemId === round.oddOne) {
      /* ── CORRECT ── */
      setSelectedId(itemId); setIsCorrect(true);
      playPopSound(); playSuccessSound();
      const newStreak = streak + 1;
      const bonus = useTimer ? Math.ceil(timeLeft / 3) : 0;
      const pts = 10 + bonus + (newStreak >= 3 ? Math.min(newStreak, 5) * 2 : 0);
      scoreRef.current += pts; setScore(scoreRef.current); setStreak(newStreak);
      if (newStreak >= 3) playComboSound(newStreak);
      if (newStreak % 5 === 0) playLevelUpSound();

      // Sparkles at click position
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const parentRect = (e.target as HTMLElement).closest('.game-field')?.getBoundingClientRect();
      if (parentRect) {
        addSparkles(rect.left - parentRect.left + rect.width / 2, rect.top - parentRect.top + rect.height / 2);
      }

      setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      setShowPraise(true);
      fireConfetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a'] });

      safeTimeout(() => {
        if (currentRoundIndex < shuffledRounds.length - 1) {
          setCurrentRoundIndex(p => p + 1);
        } else {
          // Game complete
          setGameState('complete');
          fireConfetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a', '#bfdbfe'] });
          const isNew = saveHighScoreObj('oddoneout', scoreRef.current);
          if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
          else playLevelUpSound();
        }
      }, 1200);
    } else {
      /* ── WRONG ── */
      playErrorSound(); setStreak(0);
      setShakeId(itemId); setFadedId(itemId);
      // Hint: pulse the correct answer
      setHintPulse(true);
      safeTimeout(() => { setShakeId(null); setFadedId(null); }, 700);
    }
  };

  const progressPct = shuffledRounds.length > 0 ? ((currentRoundIndex + (isCorrect ? 1 : 0)) / shuffledRounds.length) * 100 : 0;

  /* ═══════════════════════════════════════════
     BACKGROUND
     ═══════════════════════════════════════════ */
  const Background = (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 25% 25%, rgba(167,139,250,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 60% 70% at 75% 75%, rgba(244,114,182,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 50% 50% at 50% 50%, rgba(52,211,153,0.03) 0%, transparent 70%)
        `,
      }} />
      {/* Pastel dot pattern */}
      {bgDots.map(d => (
        <motion.div key={d.id} className="absolute rounded-full"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size, background: d.color }}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
    </div>
  );

  /* ═══════════════════════════════════════════
     MENU
     ═══════════════════════════════════════════ */
  if (gameState === 'menu') {
    return (
      <>
        {Background}
        <motion.div className="relative z-10 flex flex-col items-center gap-6 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <motion.div className="text-7xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(244,114,182,0.3))' }}
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}>🔍</motion.div>
          <h2 className="text-4xl md:text-5xl font-black text-gradient">Farklı Olanı Bul</h2>
          <p className="text-muted-foreground text-sm">Gruba uymayan nesneyi bul!</p>

          {highScore > 0 && (
            <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(244,114,182,0.25)' }}>
              <span className="font-black text-primary">🏆 Rekor: {highScore}</span>
            </div>
          )}

          <div className="flex gap-3 flex-wrap justify-center">
            <motion.button whileHover={{ }} whileTap={{ }}
              onClick={() => setUseTimer(p => !p)}
              className="px-5 py-3 touch-manipulation font-bold text-sm"
              style={{ ...pill, background: useTimer ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)', border: useTimer ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
              ⏱️ Zamanlı {useTimer ? '✓' : ''}
            </motion.button>
            <motion.button whileHover={{ }} whileTap={{ }}
              onClick={() => setUseHardMode(p => !p)}
              className="px-5 py-3 touch-manipulation font-bold text-sm"
              style={{ ...pill, background: useHardMode ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: useHardMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
              🔥 Zor Mod {useHardMode ? '✓' : ''}
            </motion.button>
          </div>

          <Leaderboard gameId="oddoneout" />
          <motion.button onClick={initGame} className="btn-gaming px-12 py-4 text-lg"
            whileHover={{ y: -2 }} whileTap={{ }}>
            🚀 BAŞLA!
          </motion.button>
        </motion.div>
      </>
    );
  }

  /* ═══════════════════════════════════════════
     COMPLETE
     ═══════════════════════════════════════════ */
  if (gameState === 'complete') {
    return (
      <>
        {Background}
        <motion.div className="relative z-10 flex flex-col items-center gap-5 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
          <motion.div className="text-8xl"
            style={{ filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.4))' }}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1], rotate: [0, 10, 0] }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
            🏆
          </motion.div>
          <motion.h2 className="text-4xl font-black text-gradient"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}>
            Süper Dedektif!
          </motion.h2>

          {isNewRecord && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
              className="px-7 py-2.5 rounded-full font-black text-white"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 4px 24px rgba(251,191,36,0.4)' }}>
              🏆 YENİ REKOR!
            </motion.div>
          )}

          <motion.div className="w-full max-w-xs p-6 space-y-3 text-center"
            style={{ ...pill, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <p className="text-3xl font-black text-primary">🔍 {score} Puan</p>
            <p className="text-sm text-muted-foreground">{shuffledRounds.length} bölüm tamamlandı</p>
            {streak > 2 && <p className="text-sm font-bold text-yellow-400">🔥 En iyi seri: x{streak}</p>}
          </motion.div>

          <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <motion.button whileHover={{ }} whileTap={{ }}
              onClick={initGame} className="btn-gaming px-8 py-3 text-base">🔄 Tekrar Oyna</motion.button>
            <motion.button whileHover={{ }} whileTap={{ }}
              onClick={() => setGameState('menu')}
              className="px-5 py-2.5 font-bold text-muted-foreground" style={pill}>← Menü</motion.button>
          </motion.div>
        </motion.div>
      </>
    );
  }

  /* ═══════════════════════════════════════════
     PLAYING
     ═══════════════════════════════════════════ */
  if (!round) return null;
  const gridCols = round.items.length <= 4 ? 2 : 3;

  return (
    <>
      {Background}
      <motion.div className="relative z-10 flex flex-col items-center gap-4 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-2xl mx-auto"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ touchAction: 'manipulation' }}>

        {/* ── HUD ── */}
        <motion.div className="flex flex-wrap justify-center gap-2"
          initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-primary">⭐ {score}</span></div>
          <div className="px-4 py-2" style={pill}>
            <span className="text-sm font-bold text-muted-foreground">{currentRoundIndex + 1}/{shuffledRounds.length}</span>
          </div>
          <AnimatePresence>
            {streak >= 3 && (
              <motion.div key={`str-${streak}`} initial={{ scale: 0 }} animate={{ scale: [0.5, 1.2, 1] }} exit={{ scale: 0 }}
                className="px-4 py-2" style={{ ...pill, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(streak, 5)}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {useTimer && (
            <div className="px-4 py-2" style={pill}>
              <span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
            </div>
          )}
        </motion.div>

        {/* ── Progress Bar ── */}
        <motion.div className="w-full flex items-center gap-2.5" style={{ maxWidth: 420 }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15 }}>
          <div className="flex-1 h-3 overflow-hidden" style={{ borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <motion.div className="h-full" style={{ borderRadius: 20, background: 'linear-gradient(90deg, #c4b5fd, #f9a8d4, #a7f3d0)', boxShadow: '0 0 12px rgba(167,139,250,0.3)' }}
              animate={{ width: `${progressPct}%` }} transition={{ type: 'spring', stiffness: 150, damping: 20 }} />
          </div>
        </motion.div>

        {/* ── Hint question ── */}
        <motion.div className="px-6 py-3 text-center"
          style={{ ...pill, background: 'rgba(255,255,255,0.04)' }}
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          key={currentRoundIndex}>
          <p className="text-base sm:text-lg font-bold text-foreground">{round.hint}</p>
        </motion.div>

        {/* ── Card Grid ── */}
        <div className="game-field relative">
          {/* Sparkles */}
          <AnimatePresence>
            {sparkles.map(sp => (
              <motion.div key={sp.id} className="absolute pointer-events-none z-40"
                style={{ left: sp.x, top: sp.y }}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [1, 1, 0], scale: [0, 1.2, 0.3], x: Math.cos(sp.angle) * 70, y: Math.sin(sp.angle) * 70 - 15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}>
                <div style={{ width: 8, height: 8, background: sp.color, borderRadius: '50%', boxShadow: `0 0 10px ${sp.color}` }} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Praise text */}
          <AnimatePresence>
            {showPraise && (
              <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.p className="text-3xl font-black text-gradient"
                  initial={{ scale: 0, y: 20 }} animate={{ scale: [0, 1.4, 1.1], y: -20 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
                  {praiseText}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="grid gap-3 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            key={currentRoundIndex}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {roundItems.map((item, idx) => {
              const isOdd = item.id === round.oddOne;
              const isSelected = selectedId === item.id;
              const isShaking = shakeId === item.id;
              const isFaded = fadedId === item.id;
              const isPulsing = hintPulse && isOdd && !selectedId;
              const bg = CARD_BG[idx % CARD_BG.length];

              return (
                <motion.button key={item.id}
                  onClick={(e) => handleSelect(item.id, e)}
                  disabled={!!selectedId && isCorrect}
                  className="touch-manipulation select-none"
                  initial={{ opacity: 0, scale: 0.6, y: 15 }}
                  animate={{
                    opacity: isFaded ? 0.4 : 1,
                    scale: isSelected && isCorrect ? [1, 1.2, 0.95, 1.1, 1] : isPulsing ? [1, 1.06, 1] : 1,
                    y: isSelected && isCorrect ? [0, -12, 0, -6, 0] : 0,
                    x: isShaking ? [0, -10, 10, -8, 8, -4, 0] : 0,
                    rotate: isShaking ? [0, -3, 3, -2, 2, 0] : 0,
                  }}
                  transition={
                    isShaking ? { duration: 0.5 }
                      : isPulsing ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                        : { delay: 0.1 + idx * 0.06, duration: 0.4, type: 'spring', stiffness: 250, damping: 18 }
                  }
                  whileHover={!selectedId ? { y: -3 } : {}}
                  whileTap={!selectedId ? { } : {}}>
                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center text-4xl sm:text-5xl"
                    style={{
                      borderRadius: 20,
                      background: isSelected && isCorrect
                        ? 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))'
                        : bg,
                      border: isSelected && isCorrect
                        ? '2px solid rgba(52,211,153,0.5)'
                        : isPulsing
                          ? '2px solid rgba(167,139,250,0.4)'
                          : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: isSelected && isCorrect
                        ? '0 0 30px rgba(52,211,153,0.3), 0 8px 24px rgba(0,0,0,0.12)'
                        : isPulsing
                          ? '0 0 20px rgba(167,139,250,0.2), 0 6px 20px rgba(0,0,0,0.1)'
                          : '0 6px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
                      transition: 'border-color 0.3s, box-shadow 0.3s, background 0.3s',
                    }}>
                    <span className="select-none" style={{
                      filter: isSelected && isCorrect ? 'drop-shadow(0 0 8px rgba(52,211,153,0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    }}>{item.emoji}</span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* ── Bottom controls ── */}
        <motion.div className="flex gap-3 mt-2"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <motion.button whileHover={{ }} whileTap={{ }}
            onClick={initGame} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>
            🔄 Yeniden
          </motion.button>
          <motion.button whileHover={{ }} whileTap={{ }}
            onClick={() => setGameState('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>
            ← Menü
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
};

export default OddOneOutGame;
