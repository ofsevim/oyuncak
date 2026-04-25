import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  playComboSound,
  playErrorSound,
  playLevelUpSound,
  playNewRecordSound,
  playPopSound,
  playSuccessSound,
} from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const TOTAL_ROUNDS = 15;
const TIMER_SECONDS = 10;
const PRAISE = ['Mantıklı!', 'Doğru seçim!', 'Süper!', 'Kusursuz!', 'Harika!'];
const BACKGROUND_STYLE =
  'radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 36%), linear-gradient(180deg, #091120 0%, #0f172a 45%, #111827 100%)';

const ITEMS = [
  { emoji: '🐘', label: 'Fil', weight: 5000, size: 5000, level: 3 },
  { emoji: '🐳', label: 'Balina', weight: 150000, size: 100000, level: 3 },
  { emoji: '☀️', label: 'Güneş', weight: 9999999, size: 9999999, level: 3 },
  { emoji: '🏠', label: 'Ev', weight: 500000, size: 800000, level: 3 },
  { emoji: '🌍', label: 'Dünya', weight: 99999999, size: 99999999, level: 3 },
  { emoji: '🚗', label: 'Araba', weight: 1500, size: 300, level: 2 },
  { emoji: '🐎', label: 'At', weight: 700, size: 200, level: 2 },
  { emoji: '📺', label: 'TV', weight: 30, size: 50, level: 2 },
  { emoji: '🐻', label: 'Ayı', weight: 400, size: 180, level: 2 },
  { emoji: '🐜', label: 'Karınca', weight: 0.1, size: 0.1, level: 1 },
  { emoji: '🐁', label: 'Fare', weight: 1, size: 1, level: 1 },
  { emoji: '🍓', label: 'Çilek', weight: 0.5, size: 2, level: 1 },
  { emoji: '✏️', label: 'Kalem', weight: 0.5, size: 4, level: 1 },
  { emoji: '⚽', label: 'Top', weight: 0.4, size: 3, level: 1 },
] as const;

type PropertyType = 'weight' | 'size';
type ItemData = (typeof ITEMS)[number];

const PROPERTY_META: Record<PropertyType, { question: string; badge: string; hint: string; accent: string; glow: string }> = {
  weight: {
    question: 'Hangisi daha AĞIR?',
    badge: 'AĞIRLIK',
    hint: 'Daha ağır olanı seç ve seri bonusu topla.',
    accent: '#fb923c',
    glow: 'linear-gradient(135deg, rgba(251,146,60,0.22), rgba(239,68,68,0.12))',
  },
  size: {
    question: 'Hangisi daha BÜYÜK?',
    badge: 'BOYUT',
    hint: 'İki nesneyi hızla kıyasla ve büyük olanı bul.',
    accent: '#38bdf8',
    glow: 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(168,85,247,0.12))',
  },
};

const ITEM_STYLES: Record<string, { accent: string; glow: string; badge: string }> = {
  Fil: { accent: '#f59e0b', glow: 'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.28), transparent 66%)', badge: 'Guclu' },
  Balina: { accent: '#3b82f6', glow: 'radial-gradient(circle at 50% 30%, rgba(59,130,246,0.28), transparent 66%)', badge: 'Dev' },
  Güneş: { accent: '#facc15', glow: 'radial-gradient(circle at 50% 30%, rgba(250,204,21,0.32), transparent 68%)', badge: 'Parlak' },
  Ev: { accent: '#fb7185', glow: 'radial-gradient(circle at 50% 30%, rgba(251,113,133,0.28), transparent 66%)', badge: 'Genis' },
  Dünya: { accent: '#22c55e', glow: 'radial-gradient(circle at 50% 30%, rgba(34,197,94,0.28), transparent 66%)', badge: 'Dev' },
  Araba: { accent: '#f97316', glow: 'radial-gradient(circle at 50% 30%, rgba(249,115,22,0.28), transparent 66%)', badge: 'Hizli' },
  At: { accent: '#eab308', glow: 'radial-gradient(circle at 50% 30%, rgba(234,179,8,0.28), transparent 66%)', badge: 'Cevik' },
  TV: { accent: '#a855f7', glow: 'radial-gradient(circle at 50% 30%, rgba(168,85,247,0.28), transparent 66%)', badge: 'Parlak' },
  Ayı: { accent: '#b45309', glow: 'radial-gradient(circle at 50% 30%, rgba(180,83,9,0.3), transparent 66%)', badge: 'İri' },
  Karınca: { accent: '#10b981', glow: 'radial-gradient(circle at 50% 30%, rgba(16,185,129,0.24), transparent 66%)', badge: 'Minik' },
  Fare: { accent: '#9ca3af', glow: 'radial-gradient(circle at 50% 30%, rgba(156,163,175,0.26), transparent 66%)', badge: 'Hafif' },
  Çilek: { accent: '#f43f5e', glow: 'radial-gradient(circle at 50% 30%, rgba(244,63,94,0.26), transparent 66%)', badge: 'Tatlı' },
  Kalem: { accent: '#0ea5e9', glow: 'radial-gradient(circle at 50% 30%, rgba(14,165,233,0.26), transparent 66%)', badge: 'Ince' },
  Top: { accent: '#ec4899', glow: 'radial-gradient(circle at 50% 30%, rgba(236,72,153,0.26), transparent 66%)', badge: 'Yuvarlak' },
};

const glassCard: React.CSSProperties = {
  background: 'rgba(8,15,30,0.5)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.18)',
};

interface RoundData {
  itemA: ItemData;
  itemB: ItemData;
  prop: PropertyType;
  biggerIndex: number;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

const getItemStyle = (item: ItemData) => ITEM_STYLES[item.label] ?? { accent: '#f8fafc', glow: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.24), transparent 66%)', badge: 'Sec' };

const ComparisonGame = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [roundLeft, setRoundLeft] = useState(TOTAL_ROUNDS);
  const [useTimer, setUseTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [praiseText, setPraiseText] = useState('');
  const [showPraise, setShowPraise] = useState(false);

  const { safeTimeout, safeInterval, clearAll, clearAllIntervals } = useSafeTimeouts();
  const scoreRef = useRef(0);
  const sparkleIdRef = useRef(0);

  useEffect(() => {
    setHighScore(getHighScore('comparison'));
  }, []);

  const bgDots = useMemo(() => Array.from({ length: 30 }, (_, index) => ({
    id: index,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 3 + Math.random() * 6,
    duration: 4 + Math.random() * 4,
    delay: Math.random() * 2,
    color: ['rgba(251,146,60,0.16)', 'rgba(56,189,248,0.14)', 'rgba(168,85,247,0.14)', 'rgba(52,211,153,0.12)'][index % 4],
  })), []);

  const addSparkles = useCallback((centerX: number, centerY: number) => {
    const colors = ['#fb923c', '#38bdf8', '#a78bfa', '#34d399'];
    const nextSparkles = Array.from({ length: 14 }, (_, index) => ({
      id: sparkleIdRef.current++,
      x: centerX,
      y: centerY,
      angle: ((Math.PI * 2) / 14) * index,
      color: colors[index % colors.length],
    }));
    setSparkles((prev) => [...prev, ...nextSparkles]);
    safeTimeout(() => setSparkles((prev) => prev.filter((sparkle) => !nextSparkles.some((candidate) => candidate.id === sparkle.id))), 850);
  }, [safeTimeout]);

  const generateNewRound = useCallback(() => {
    const prop: PropertyType = Math.random() > 0.5 ? 'weight' : 'size';
    let itemA: ItemData;
    let itemB: ItemData;
    do {
      const levelA = Math.floor(Math.random() * 3) + 1;
      let levelB = Math.floor(Math.random() * 3) + 1;
      while (levelA === levelB) levelB = Math.floor(Math.random() * 3) + 1;
      const poolA = ITEMS.filter((item) => item.level === levelA);
      const poolB = ITEMS.filter((item) => item.level === levelB);
      itemA = poolA[Math.floor(Math.random() * poolA.length)];
      itemB = poolB[Math.floor(Math.random() * poolB.length)];
    } while (itemA[prop] === itemB[prop]);
    if (Math.random() > 0.5) [itemA, itemB] = [itemB, itemA];
    setCurrentRound({ itemA, itemB, prop, biggerIndex: itemA[prop] > itemB[prop] ? 0 : 1 });
    setIsCorrect(false);
    setSelectedIndex(null);
    setShakeIndex(null);
    setShowPraise(false);
    if (useTimer) setTimeLeft(TIMER_SECONDS);
  }, [useTimer]);

  const initGame = useCallback(() => {
    clearAll();
    clearAllIntervals();
    setGameState('playing');
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setBestStreak(0);
    setRoundLeft(TOTAL_ROUNDS);
    setSparkles([]);
    setIsNewRecord(false);
    setTimeLeft(TIMER_SECONDS);
    generateNewRound();
  }, [clearAll, clearAllIntervals, generateNewRound]);

  const finishGame = useCallback(() => {
    setGameState('complete');
    fireConfetti({ particleCount: 180, spread: 100, origin: { y: 0.58 }, colors: ['#fb923c', '#38bdf8', '#a78bfa', '#34d399'] });
    const createdRecord = saveHighScoreObj('comparison', scoreRef.current);
    if (createdRecord) {
      setIsNewRecord(true);
      setHighScore(scoreRef.current);
      playNewRecordSound();
    } else {
      playLevelUpSound();
    }
  }, []);

  useEffect(() => {
    if (!useTimer || gameState !== 'playing' || !currentRound || isCorrect) return;
    const intervalId = safeInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playErrorSound();
          setStreak(0);
          setShakeIndex(currentRound.biggerIndex === 0 ? 1 : 0);
          safeTimeout(() => setShakeIndex(null), 500);
          setRoundLeft((remaining) => {
            if (remaining <= 1) {
              finishGame();
              return 0;
            }
            safeTimeout(generateNewRound, 700);
            return remaining - 1;
          });
          return TIMER_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [currentRound, finishGame, gameState, generateNewRound, isCorrect, safeInterval, safeTimeout, useTimer]);

  const handleSelect = useCallback((index: number, event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (isCorrect || gameState !== 'playing' || !currentRound) return;
    if (index !== currentRound.biggerIndex) {
      playErrorSound();
      setStreak(0);
      setShakeIndex(index);
      safeTimeout(() => setShakeIndex(null), 500);
      return;
    }

    setIsCorrect(true);
    setSelectedIndex(index);
    playPopSound();
    playSuccessSound();
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    setBestStreak((prev) => Math.max(prev, nextStreak));
    const bonus = useTimer ? Math.ceil(timeLeft / 2) : 0;
    const points = 10 + bonus + (nextStreak >= 3 ? Math.min(nextStreak, 5) * 2 : 0);
    scoreRef.current += points;
    setScore(scoreRef.current);
    if (nextStreak >= 3) playComboSound(nextStreak);
    if (nextStreak % 5 === 0) playLevelUpSound();

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const fieldRect = button.closest('.game-field')?.getBoundingClientRect();
    if (fieldRect) addSparkles(rect.left - fieldRect.left + rect.width / 2, rect.top - fieldRect.top + rect.height / 2);

    setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    setShowPraise(true);
    fireConfetti({ particleCount: 40, spread: 60, origin: { y: 0.72 }, colors: ['#38bdf8', '#fb923c'] });

    safeTimeout(() => {
      setRoundLeft((remaining) => {
        if (remaining <= 1) {
          finishGame();
          return 0;
        }
        generateNewRound();
        return remaining - 1;
      });
    }, 1100);
  }, [addSparkles, currentRound, finishGame, gameState, generateNewRound, isCorrect, safeTimeout, streak, timeLeft, useTimer]);

  const roundNumber = Math.max(1, TOTAL_ROUNDS - roundLeft + 1);
  const propertyMeta = currentRound ? PROPERTY_META[currentRound.prop] : PROPERTY_META.weight;

  const background = (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, background: BACKGROUND_STYLE }}>
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(251,146,60,0.16)' }} />
      {bgDots.map((dot) => (
        <motion.div key={dot.id} className="absolute rounded-full" style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: dot.size, height: dot.size, background: dot.color }} animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.85, 1.2, 0.85] }} transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
    </div>
  );

  if (gameState === 'menu') {
    return (
      <>
        {background}
        <motion.div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] pt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-full rounded-[32px] border px-5 py-6 text-center" style={{ ...glassCard, background: 'linear-gradient(180deg, rgba(15,23,42,0.82), rgba(15,23,42,0.58))' }}>
            <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-full border px-4 py-2 text-sm font-black text-white/90" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-3xl">⚖️</span>
              <span>Hızlı Kıyaslama Arenası</span>
            </div>
            <h2 className="text-4xl font-black md:text-5xl" style={{ backgroundImage: 'linear-gradient(135deg, #fb923c, #38bdf8 45%, #a855f7)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Karşılaştırma
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/72 md:text-base">
              Bu oyunu daha sahneli kartlar, daha belirgin soru paneli ve daha güçlü bir karar anı hissiyle yeniledik.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { title: 'Büyük Fark', text: 'Seçenekler farklı seviyelerden gelir.', accent: '#fb923c' },
                { title: 'Seri Bonusu', text: 'Arka arkaya doğrular daha çok puan verir.', accent: '#facc15' },
                { title: 'Zaman Modu', text: 'İstersen ekstra tempo ekle.', accent: '#38bdf8' },
              ].map((feature) => (
                <div key={feature.title} className="rounded-[24px] border px-4 py-4 text-left" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', boxShadow: `0 12px 30px ${feature.accent}22` }}>
                  <div className="mb-2 h-1.5 w-12 rounded-full" style={{ background: feature.accent }} />
                  <p className="text-sm font-black text-white">{feature.title}</p>
                  <p className="mt-1 text-sm leading-5 text-white/65">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          {highScore > 0 && <div className="rounded-full px-5 py-2.5 text-sm font-black text-orange-300" style={{ ...glassCard, border: '1px solid rgba(251,146,60,0.24)' }}>🏆 Rekor: {highScore}</div>}

          <button onClick={() => setUseTimer((enabled) => !enabled)} className="w-full max-w-lg rounded-[28px] border p-4 text-left transition-transform active:scale-[0.99]" style={{ ...glassCard, background: useTimer ? 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(15,23,42,0.7))' : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(15,23,42,0.7))', borderColor: useTimer ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Mod</p>
                <p className="mt-1 text-xl font-black text-white">⏱️ Zamanlı Oyun</p>
                <p className="mt-1 text-sm leading-5 text-white/65">Her tur için {TIMER_SECONDS} saniye ver.</p>
              </div>
              <div className="flex h-12 w-20 items-center rounded-full p-1" style={{ background: useTimer ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.08)' }}>
                <motion.div className="h-10 w-10 rounded-full" animate={{ x: useTimer ? 32 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} style={{ background: useTimer ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' : 'linear-gradient(135deg, #e5e7eb, #9ca3af)' }} />
              </div>
            </div>
          </button>

          <Leaderboard gameId="comparison" />

          <motion.button onClick={initGame} className="rounded-full px-12 py-4 text-lg font-black text-white" style={{ background: 'linear-gradient(135deg, #fb923c, #a855f7)', boxShadow: '0 20px 44px rgba(168,85,247,0.24)' }} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            🚀 BAŞLA
          </motion.button>
        </motion.div>
      </>
    );
  }

  if (gameState === 'complete') {
    return (
      <>
        {background}
        <motion.div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] pt-8 text-center" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="rounded-full border px-5 py-3 text-white" style={{ ...glassCard, background: 'linear-gradient(135deg, rgba(251,146,60,0.22), rgba(168,85,247,0.18))' }}>⚖️ Tur Tamamlandı</div>
          <h2 className="text-4xl font-black md:text-5xl" style={{ backgroundImage: 'linear-gradient(135deg, #fb923c, #facc15 45%, #38bdf8)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Harika Kıyaslama!</h2>
          {isNewRecord && <div className="rounded-full px-6 py-2 font-black text-white" style={{ background: 'linear-gradient(135deg, #facc15, #f97316)', boxShadow: '0 18px 36px rgba(250,204,21,0.25)' }}>🏆 Yeni Rekor</div>}
          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
            {[
              { label: 'Puan', value: `${score}`, accent: '#fb923c' },
              { label: 'En İyi Seri', value: `x${bestStreak}`, accent: '#facc15' },
              { label: 'Mod', value: useTimer ? 'Zamanlı' : 'Serbest', accent: '#38bdf8' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[26px] border px-4 py-5" style={{ ...glassCard, boxShadow: `0 16px 36px ${stat.accent}22` }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <motion.button onClick={initGame} className="rounded-full px-8 py-3 font-black text-white" style={{ background: 'linear-gradient(135deg, #fb923c, #a855f7)', boxShadow: '0 18px 36px rgba(168,85,247,0.22)' }} whileTap={{ scale: 0.98 }}>
              🔄 Tekrar Oyna
            </motion.button>
            <button onClick={() => setGameState('menu')} className="rounded-full px-6 py-3 font-bold text-white/80" style={glassCard}>← Menü</button>
          </div>
        </motion.div>
      </>
    );
  }

  if (!currentRound) return null;

  return (
    <>
      {background}
      <motion.div className="game-field relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center gap-3 px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,8rem))] pt-3 sm:gap-5 sm:px-4 sm:pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] sm:pt-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ touchAction: 'manipulation' }}>
        <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {[
            { label: 'Puan', value: `${score}`, tone: 'text-orange-300' },
            { label: 'Tur', value: `${roundNumber}/${TOTAL_ROUNDS}`, tone: 'text-white' },
            { label: 'Seri', value: `x${Math.max(streak, 0)}`, tone: streak >= 3 ? 'text-yellow-300' : 'text-white' },
            { label: 'Süre', value: useTimer ? `${timeLeft}s` : '--', tone: timeLeft <= 3 && useTimer ? 'text-red-400' : 'text-cyan-300' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[18px] px-3 py-2.5 sm:rounded-[22px] sm:px-4 sm:py-3" style={glassCard}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
              <p className={`mt-1 text-xl font-black sm:text-2xl ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <motion.div className="w-full rounded-[24px] border px-4 py-4 text-center sm:rounded-[30px] sm:px-5 sm:py-5" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} style={{ ...glassCard, background: propertyMeta.glow, borderColor: `${propertyMeta.accent}55` }}>
          <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/85 sm:mb-3 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.06)', borderColor: `${propertyMeta.accent}55` }}>
            <span>⚖️</span>
            <span>{propertyMeta.badge}</span>
          </div>
          <h3 className="text-[2rem] font-black leading-tight text-white sm:text-3xl md:text-4xl">{propertyMeta.question}</h3>
          <p className="mx-auto mt-1.5 max-w-2xl text-xs leading-5 text-white/68 sm:mt-2 sm:text-sm sm:leading-6 md:text-base">{propertyMeta.hint}</p>
        </motion.div>

        <div className="relative flex w-full justify-center">
          <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-8">
            {[currentRound.itemA, currentRound.itemB].map((item, index) => {
              const style = getItemStyle(item);
              const isTarget = isCorrect && selectedIndex === index;
              const isDimmed = isCorrect && selectedIndex !== index;
              const isShaking = shakeIndex === index;

              return (
                <motion.button
                  key={`${item.label}-${index}`}
                  type="button"
                  disabled={isCorrect}
                  onClick={(event) => handleSelect(index, event)}
                  className="relative aspect-[0.72] w-full overflow-hidden rounded-[24px] border text-left disabled:cursor-default sm:aspect-[0.86] sm:rounded-[30px]"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: isDimmed ? 0.42 : 1, y: 0, scale: isTarget ? 1.04 : isDimmed ? 0.95 : 1, x: isShaking ? [-10, 10, -8, 8, 0] : 0 }}
                  transition={{ delay: index * 0.06, type: 'spring', stiffness: isShaking ? 650 : 320, damping: 24 }}
                  whileHover={isCorrect ? undefined : { y: -4 }}
                  whileTap={isCorrect ? undefined : { scale: 0.98 }}
                  style={{
                    ...glassCard,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(17,24,39,0.82))',
                    borderColor: isTarget ? 'rgba(52,211,153,0.8)' : isShaking ? 'rgba(239,68,68,0.78)' : 'rgba(255,255,255,0.08)',
                    boxShadow: isTarget ? '0 0 0 1px rgba(52,211,153,0.3), 0 24px 54px rgba(16,185,129,0.22)' : isShaking ? '0 20px 44px rgba(239,68,68,0.18)' : `0 24px 48px ${style.accent}22`,
                  }}
                >
                  <div className="absolute inset-0 opacity-90" style={{ background: style.glow }} />
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2 sm:inset-x-5 sm:top-5">
                    <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/85 sm:px-3 sm:text-[11px] sm:tracking-[0.15em]" style={{ background: `${style.accent}22`, borderColor: `${style.accent}66` }}>{style.badge}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/60 sm:px-3 sm:text-[11px] sm:tracking-[0.15em]">{index === 0 ? 'Sol' : 'Sag'}</span>
                  </div>
                  {isTarget && <motion.div layoutId="comparison-correct-glow" className="absolute inset-0 bg-emerald-400/12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
                  <div className="relative z-10 flex h-full flex-col justify-between px-3 pb-3 pt-11 sm:px-5 sm:pb-5 sm:pt-16">
                    <div className="relative flex flex-1 items-center justify-center">
                      <div className="absolute h-24 w-24 rounded-full blur-3xl sm:h-40 sm:w-40" style={{ background: `${style.accent}22` }} />
                      <motion.span className="relative text-[52px] drop-shadow-[0_12px_30px_rgba(15,23,42,0.35)] sm:text-[96px]" animate={isTarget ? { scale: [1, 1.12, 1] } : undefined} transition={{ duration: 0.45 }}>
                        {item.emoji}
                      </motion.span>
                    </div>
                    <div className="rounded-[20px] border px-3 py-3 sm:rounded-[24px] sm:px-4 sm:py-4" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <p className="text-lg font-black text-white sm:text-2xl">{item.label}</p>
                      <p className="mt-1 text-xs leading-4 text-white/62 sm:text-sm sm:leading-5">{currentRound.prop === 'weight' ? 'Daha agir olabilir mi?' : 'Daha buyuk olabilir mi?'}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xl font-black text-white sm:flex" style={{ ...glassCard, background: propertyMeta.glow, borderColor: `${propertyMeta.accent}55` }}>
            VS
          </div>
        </div>

        <AnimatePresence>
          {showPraise && (
            <motion.div className="pointer-events-none absolute inset-x-0 top-[30%] z-30 flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.p className="rounded-full border px-5 py-3 text-2xl font-black text-white md:text-3xl" style={{ ...glassCard, background: 'linear-gradient(135deg, rgba(251,146,60,0.22), rgba(250,204,21,0.2))' }} initial={{ scale: 0.8, y: 14 }} animate={{ scale: [0.9, 1.08, 1], y: -12 }} transition={{ type: 'spring', stiffness: 240, damping: 16 }}>
                {praiseText}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-1 flex flex-wrap justify-center gap-3 sm:mt-2">
          <button onClick={initGame} className="rounded-full px-6 py-3 font-black text-white" style={glassCard}>🔄 Yeniden</button>
          <button onClick={() => setGameState('menu')} className="rounded-full px-6 py-3 font-bold text-white/78" style={glassCard}>← Cikis</button>
        </div>

        <AnimatePresence>
          {sparkles.map((sparkle) => (
            <motion.div key={sparkle.id} className="absolute pointer-events-none z-40" style={{ left: sparkle.x, top: sparkle.y }} initial={{ opacity: 1, scale: 0, x: 0, y: 0 }} animate={{ opacity: [1, 1, 0], scale: [0, 1.15, 0.35], x: Math.cos(sparkle.angle) * 74, y: Math.sin(sparkle.angle) * 74 - 16 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
              <div style={{ width: 9, height: 9, background: sparkle.color, borderRadius: '999px', boxShadow: `0 0 12px ${sparkle.color}` }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default ComparisonGame;
