'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  playPopSound,
  playSuccessSound,
  playErrorSound,
  playComboSound,
  playNewRecordSound,
} from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

/* ═══════════════════ Sabitler ═══════════════════ */

interface ColorDef {
  name: string;
  value: string;
  glow: string;
}

const BALLOON_COLORS: ColorDef[] = [
  { name: 'Kırmızı', value: '#ef4444', glow: '#ef444480' },
  { name: 'Mavi', value: '#3b82f6', glow: '#3b82f680' },
  { name: 'Yeşil', value: '#22c55e', glow: '#22c55e80' },
  { name: 'Sarı', value: '#eab308', glow: '#eab30880' },
  { name: 'Turuncu', value: '#f97316', glow: '#f9731680' },
  { name: 'Mor', value: '#a855f7', glow: '#a855f780' },
  { name: 'Cyan', value: '#06b6d4', glow: '#06b6d480' },
];

type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  label: string;
  time: number;
  maxBalloons: number;
  spawnRate: number;
  speed: [number, number];
  popsPerRound: number;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '🌟 Kolay',
    time: 45,
    maxBalloons: 30,
    spawnRate: 1400,
    speed: [8, 11],
    popsPerRound: 8,
  },
  medium: {
    label: '⭐ Orta',
    time: 60,
    maxBalloons: 40,
    spawnRate: 1000,
    speed: [6, 9],
    popsPerRound: 10,
  },
  hard: {
    label: '🔥 Zor',
    time: 45,
    maxBalloons: 55,
    spawnRate: 600,
    speed: [4, 7],
    popsPerRound: 12,
  },
};

type SpecialType = 'freeze' | 'double' | 'bomb';

const SPECIAL_COLORS: Record<SpecialType, ColorDef> = {
  freeze: { name: 'Özel', value: '#67e8f9', glow: '#ffffff40' },
  double: { name: 'Özel', value: '#fbbf24', glow: '#ffffff40' },
  bomb: { name: 'Özel', value: '#1f2937', glow: '#ffffff40' },
};

interface Balloon {
  id: string;
  color: ColorDef;
  x: number;
  duration: number;
  delay: number;
  swayAmount: number;
  swayDuration: number;
  size: number;
  special?: SpecialType;
}

interface PopEffect {
  id: string;
  x: number;
  y: number;
  color: string;
  points: number;
}

type GamePhase = 'start' | 'playing' | 'ended';

/* ═══════════════════ Yardımcılar ═══════════════════ */

const hexId = (hex: string) => hex.replace('#', '');

const getGradId = (b: Balloon) =>
  b.special ? `bal-${b.special}` : `bal-${hexId(b.color.value)}`;

/* ═══════════════════ CSS Animasyonları ═══════════════════ */

const GAME_STYLES = `
  @keyframes balloon-sway {
    0%, 100% { transform: translateX(calc(var(--sway) * -1)); }
    50%      { transform: translateX(var(--sway)); }
  }

  .balloon-sway-animate {
    animation: balloon-sway var(--sway-duration) ease-in-out infinite;
    animation-play-state: var(--play-state, running);
  }
`;

/* ═══════════════════ Bileşen ═══════════════════ */

const BalloonPopGame = () => {
  /* ─── State ─── */
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [targetColor, setTargetColor] = useState<ColorDef>(BALLOON_COLORS[0]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gamePhase, setGamePhase] = useState<GamePhase>('start');
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isDouble, setIsDouble] = useState(false);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [roundPops, setRoundPops] = useState(0);

  /* ─── Ref'ler (callback'lerde güncel değer okuma) ─── */
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const balloonIdRef = useRef(0);
  const roundPopsRef = useRef(0);
  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  const isFrozenRef = useRef(false);
  const isDoubleRef = useRef(false);
  const targetColorRef = useRef<ColorDef>(BALLOON_COLORS[0]);
  const poppedRef = useRef<Set<string>>(new Set());
  const { safeTimeout: hookTimeout, safeInterval: hookInterval, clearAll: hookClearAll } = useSafeTimeouts();
  const containerRef = useRef<HTMLDivElement>(null);

  /* ─── Ref senkronizasyonu ─── */
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);
  useEffect(() => {
    isFrozenRef.current = isFrozen;
  }, [isFrozen]);
  useEffect(() => {
    isDoubleRef.current = isDouble;
  }, [isDouble]);
  useEffect(() => {
    targetColorRef.current = targetColor;
  }, [targetColor]);

  /* ─── İlk yükleme: rekor ─── */
  useEffect(() => {
    setHighScore(getHighScore('balloon-pop'));
  }, []);



  const config = useMemo(() => DIFFICULTIES[difficulty], [difficulty]);

  /* ═══════ Zamanlayıcı Yönetimi (game-phase-aware wrappers) ═══════ */

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    return hookTimeout(() => {
      if (gamePhaseRef.current !== 'playing') return;
      fn();
    }, ms);
  }, [hookTimeout]);

  const safeInterval = useCallback((fn: () => void, ms: number) => {
    return hookInterval(() => {
      if (gamePhaseRef.current !== 'playing') return;
      fn();
    }, ms);
  }, [hookInterval]);

  const clearAllTimers = useCallback(() => {
    hookClearAll();
  }, [hookClearAll]);

  /* ═══════ Balon Oluşturma ═══════ */

  const createBalloon = useCallback(
    (color: ColorDef, delay = 0): Balloon => {
      const [minSpd, maxSpd] = config.speed;
      const roll = Math.random();
      const special: SpecialType | undefined =
        roll < 0.06
          ? (['freeze', 'double', 'bomb'] as const)[
          Math.floor(Math.random() * 3)
          ]
          : undefined;

      return {
        id: `b-${balloonIdRef.current++}`,
        color: special ? SPECIAL_COLORS[special] : color,
        x: Math.random() * 85 + 5,
        duration: minSpd + Math.random() * (maxSpd - minSpd),
        delay,
        swayAmount: 3 + Math.random() * 5,
        swayDuration: 3 + Math.random() * 2,
        size: 0.8 + Math.random() * 0.4,
        special,
      };
    },
    [config.speed],
  );

  const generateBalloons = useCallback(
    (color: ColorDef) => {
      const total = 6;
      const result: Balloon[] = [];
      for (let i = 0; i < total; i++) {
        const isTarget = i < 3;
        const c = isTarget ? color : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        // İlk balonlar anında (0 delay) çıksın!
        result.push(createBalloon(c, 0));
      }
      return result;
    },
    [createBalloon],
  );

  /* ═══════ Oyun Akışı ═══════ */

  const startNewRound = useCallback(() => {
    const current = targetColorRef.current;
    const remaining = BALLOON_COLORS.filter(
      (c) => c.value !== current.value,
    );
    const nextColor =
      remaining[Math.floor(Math.random() * remaining.length)];

    setTargetColor(nextColor);
    roundPopsRef.current = 0;
    setRoundPops(0);

    setBalloons((prev) => {
      // Mevcut tüm balonları koru, sadece yenilerini ekle!
      // Böylece ekran "sıfırlanmış" gibi görünmez.
      const fresh = Array.from({ length: 6 }, () =>
        createBalloon(nextColor, Math.random() * 1.5),
      );
      return [...prev, ...fresh];
    });
    setRound((r) => r + 1);
  }, [createBalloon]);

  const startGame = useCallback(() => {
    clearAllTimers();
    poppedRef.current.clear();
    setPopEffects([]);

    scoreRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    balloonIdRef.current = 0;
    roundPopsRef.current = 0;

    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(DIFFICULTIES[difficulty].time);
    setRound(1);
    setRoundPops(0);
    setIsNewRecord(false);
    setIsFrozen(false);
    setIsDouble(false);

    const nextColor =
      BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    setTargetColor(nextColor);
    setBalloons(generateBalloons(nextColor));
    setGamePhase('playing');
  }, [generateBalloons, difficulty, clearAllTimers]);

  /* ═══════ Effect'ler ═══════ */

  /* Geri sayım */
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const id = safeInterval(() => {
      if (isFrozenRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGamePhase('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gamePhase, safeInterval]);

  /* Oyun sonu */
  useEffect(() => {
    if (gamePhase !== 'ended') return;
    clearAllTimers();
    confetti({ particleCount: 150, spread: 100 });

    const finalScore = scoreRef.current;
    const isNew = saveHighScoreObj('balloon-pop', finalScore);
    if (isNew) {
      setIsNewRecord(true);
      setHighScore(finalScore);
      playNewRecordSound();
    }
  }, [gamePhase, clearAllTimers]);

  /* Balon üretme — targetColorRef ile okuma, effect yeniden oluşmaz */
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const id = safeInterval(() => {
      if (isFrozenRef.current) return;
      setBalloons((prev) => {
        if (prev.length >= config.maxBalloons) return prev;
        // Bir kerede çıkan balon sayısını artırdık (2-4 arası)
        const count = 2 + Math.floor(Math.random() * 3);
        const currentTarget = targetColorRef.current;
        const newOnes: Balloon[] = [];
        for (let i = 0; i < count; i++) {
          const isTarget = Math.random() < 0.4;
          const color = isTarget
            ? currentTarget
            : BALLOON_COLORS[
            Math.floor(Math.random() * BALLOON_COLORS.length)
            ];
          newOnes.push(createBalloon(color, Math.random() * 0.3));
        }
        return [...prev, ...newOnes];
      });
    }, config.spawnRate);
    return () => clearInterval(id);
  }, [gamePhase, config.spawnRate, config.maxBalloons, createBalloon, safeInterval]);

  /* Bellek temizliği */
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const id = safeInterval(() => {
      setBalloons((prev) =>
        prev.length > config.maxBalloons * 1.5
          ? prev.slice(-config.maxBalloons)
          : prev,
      );
    }, 5000);
    return () => clearInterval(id);
  }, [gamePhase, config.maxBalloons, safeInterval]);

  /* ═══════ Patlatma ═══════ */

  const handlePop = useCallback(
    (balloon: Balloon, e: React.PointerEvent) => {
      if (gamePhaseRef.current !== 'playing') return;
      if (poppedRef.current.has(balloon.id)) return;
      poppedRef.current.add(balloon.id);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      const showEffect = (color: string, points: number) => {
        const effectId = `pop-${balloon.id}`;
        setPopEffects((prev) => [
          ...prev,
          { id: effectId, x: relX, y: relY, color, points },
        ]);
        // Oyun bitse de efekt temizlenir — bilinçli olarak safeTimeout değil
        setTimeout(
          () =>
            setPopEffects((prev) =>
              prev.filter((p) => p.id !== effectId),
            ),
          600,
        );
      };

      const removeBalloon = () =>
        setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));

      /* ── Özel balonlar ── */
      if (balloon.special === 'freeze') {
        playSuccessSound();
        setIsFrozen(true);
        removeBalloon();
        safeTimeout(() => setIsFrozen(false), 3000);
        showEffect('#67e8f9', 0);
        return;
      }
      if (balloon.special === 'double') {
        playSuccessSound();
        setIsDouble(true);
        removeBalloon();
        safeTimeout(() => setIsDouble(false), 5000);
        showEffect('#fbbf24', 0);
        return;
      }
      if (balloon.special === 'bomb') {
        playErrorSound();
        comboRef.current = 0;
        setCombo(0);
        scoreRef.current = Math.max(0, scoreRef.current - 5);
        setScore(scoreRef.current);
        removeBalloon();
        showEffect('#ef4444', -5);
        return;
      }

      /* ── Renk kontrolü (ref'ten oku → güncel hedef) ── */
      const currentTarget = targetColorRef.current;

      if (balloon.color.value === currentTarget.value) {
        comboRef.current += 1;
        const newCombo = comboRef.current;
        const multiplier = Math.min(newCombo, 5);
        const points = multiplier * (isDoubleRef.current ? 2 : 1);

        if (newCombo > 2) playComboSound(newCombo);
        else playPopSound();

        setCombo(newCombo);
        if (newCombo > bestComboRef.current) {
          bestComboRef.current = newCombo;
          setBestCombo(newCombo);
        }

        scoreRef.current += points;
        setScore(scoreRef.current);
        removeBalloon();
        showEffect(balloon.color.value, points);

        /* Tur geçişi — pop sayısına göre, puana değil */
        roundPopsRef.current += 1;
        setRoundPops(roundPopsRef.current);

        if (roundPopsRef.current >= config.popsPerRound) {
          playSuccessSound();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
          safeTimeout(startNewRound, 1000);
        }
      } else {
        /* Yanlış renk */
        playErrorSound();
        comboRef.current = 0;
        setCombo(0);
      }
    },
    [safeTimeout, startNewRound, config.popsPerRound],
  );

  /* ═══════════════════ RENDER ═══════════════════ */

  /* ── Başlangıç Ekranı ── */
  if (gamePhase === 'start') {
    return (
      <motion.div
        className="flex flex-col items-center justify-center gap-6 p-6 max-w-xl mx-auto min-h-[60vh]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="text-7xl"
          animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🎈
        </motion.div>

        <h2 className="text-3xl md:text-4xl font-black text-gradient">
          Balon Patlat!
        </h2>

        {highScore > 0 && (
          <div className="glass-card px-4 py-2 neon-border">
            <span className="font-black text-primary">
              🏆 Rekor: {highScore}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-muted-foreground text-center">
            Zorluk Seç:
          </p>
          {(
            Object.entries(DIFFICULTIES) as [Difficulty, DifficultyConfig][]
          ).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              className={`px-5 py-3 rounded-xl font-bold transition-all cursor-pointer ${difficulty === key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'glass-card text-muted-foreground hover:bg-white/5 active:bg-white/5'
                }`}
            >
              {val.label} ({val.time}s)
            </button>
          ))}
        </div>

        <div className="glass-card p-4 space-y-2 text-center text-sm neon-border">
          <p className="font-bold">🎯 Hedef renkteki balonları patlat</p>
          <p className="font-bold">⚡ Combo yap, çarpan kazan (max 5x)</p>
          <p className="text-muted-foreground">
            ❄️ Mavi = Dondur &nbsp;|&nbsp; 💛 Sarı = 2x Puan &nbsp;|&nbsp; 💣
            Siyah = Bomba!
          </p>
        </div>

        <Leaderboard gameId="balloon-pop" />

        <button
          onClick={startGame}
          className="btn-gaming px-10 py-4 text-lg cursor-pointer"
        >
          🚀 BAŞLA!
        </button>
      </motion.div>
    );
  }

  /* ── Bitiş Ekranı ── */
  if (gamePhase === 'ended') {
    return (
      <motion.div
        className="flex flex-col items-center justify-center gap-6 p-6 max-w-xl mx-auto min-h-[60vh]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span className="text-7xl">⏰</span>
        <h2 className="text-3xl font-black text-gradient">Süre Doldu!</h2>

        {isNewRecord && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-black text-lg animate-pulse"
          >
            🏆 YENİ REKOR!
          </motion.div>
        )}

        <div className="glass-card p-6 space-y-3 text-center neon-border">
          <p className="text-3xl font-black text-primary">🎈 {score} Puan</p>
          <p className="text-lg font-bold text-muted-foreground">
            🔄 {round} Tur &nbsp;|&nbsp; 🔥 En İyi Combo: {bestCombo}x
          </p>
          <p className="text-sm text-muted-foreground">
            🏆 Rekor: {highScore}
          </p>
        </div>

        <button
          onClick={startGame}
          className="btn-gaming px-10 py-4 text-lg cursor-pointer"
        >
          🔄 Tekrar Oyna
        </button>
      </motion.div>
    );
  }

  /* ══════════════════════════════════════
     OYUN EKRANI
     ══════════════════════════════════════ */
  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden neon-border touch-none select-none"
      style={{
        background:
          'linear-gradient(180deg, hsl(230 20% 12%) 0%, hsl(230 25% 8%) 100%)',
        height: 'clamp(380px, 65vh, 750px)',
      }}
    >
      <style>{GAME_STYLES}</style>
      {/* SVG Gradient Tanımları */}
      <svg
        width="0"
        height="0"
        className="absolute"
        aria-hidden="true"
      >
        <defs>
          {BALLOON_COLORS.map((c) => (
            <radialGradient
              key={c.value}
              id={`bal-${hexId(c.value)}`}
              cx="35%"
              cy="30%"
              r="65%"
            >
              <stop offset="0%" stopColor="white" stopOpacity={0.4} />
              <stop offset="40%" stopColor={c.value} stopOpacity={0.9} />
              <stop offset="100%" stopColor={c.value} stopOpacity={1} />
            </radialGradient>
          ))}
          {(
            Object.entries(SPECIAL_COLORS) as [SpecialType, ColorDef][]
          ).map(([key, c]) => (
            <radialGradient
              key={key}
              id={`bal-${key}`}
              cx="35%"
              cy="30%"
              r="65%"
            >
              <stop offset="0%" stopColor="white" stopOpacity={0.4} />
              <stop offset="40%" stopColor={c.value} stopOpacity={0.9} />
              <stop offset="100%" stopColor={c.value} stopOpacity={1} />
            </radialGradient>
          ))}
        </defs>
      </svg>

      {/* Freeze efekti */}
      {isFrozen && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-2xl border-4 border-cyan-400/50">
          <div className="absolute inset-0 bg-cyan-400/5" />
        </div>
      )}

      {/* Double efekti */}
      {isDouble && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-2xl border-4 border-yellow-400/50" />
      )}

      {/* Pop efektleri — Sadece bunlar motion.div */}
      <AnimatePresence>
        {popEffects.map((fx) => (
          <motion.div
            key={fx.id}
            className="absolute z-50 pointer-events-none"
            style={{ left: fx.x, top: fx.y }}
            initial={{ scale: 0 }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [1, 0.8, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="w-16 h-16 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                background: `radial-gradient(circle, ${fx.color}60, transparent)`,
              }}
            />
            {fx.points !== 0 && (
              <motion.span
                className="absolute -top-6 left-1/2 -translate-x-1/2 font-black text-lg whitespace-nowrap"
                style={{
                  color: fx.points > 0 ? '#4ade80' : '#ef4444',
                }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                {fx.points > 0 ? `+${fx.points}` : fx.points}
              </motion.span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Skor Arayüzü ── */}
      <div className="absolute top-2 left-0 right-0 z-20 flex flex-col items-center gap-1 pointer-events-none px-2">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="glass-card px-3 py-1 border border-primary/20">
            <span className="text-sm font-black text-primary">
              🎈 {score}
            </span>
          </div>

          <div className="glass-card px-3 py-1 border border-orange-500/20">
            <span
              className={`text-sm font-black ${timeLeft <= 10
                ? 'text-red-400 animate-pulse'
                : 'text-orange-400'
                }`}
            >
              ⏱️ {timeLeft}s
            </span>
          </div>

          <div className="glass-card px-3 py-1 border border-green-500/20">
            <span className="text-sm font-black text-green-400">
              ✅ {roundPops}/{config.popsPerRound}
            </span>
          </div>

          {combo > 1 && (
            <motion.div
              key={combo}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card px-3 py-1 border border-yellow-500/30"
            >
              <span className="text-sm font-black text-yellow-400">
                🔥 x{Math.min(combo, 5)}
              </span>
            </motion.div>
          )}
        </div>

        <motion.div
          key={targetColor.value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 glass-card px-4 py-1 border border-white/10"
        >
          <span className="text-sm font-black">{targetColor.name}</span>
          <div
            className="w-5 h-5 rounded-full"
            style={{
              backgroundColor: targetColor.value,
              boxShadow: `0 0 12px ${targetColor.glow}`,
            }}
          />
          <span className="text-sm font-black text-primary">PATLAT!</span>
        </motion.div>
      </div>

      <AnimatePresence>
        {balloons.map((balloon) => (
          <motion.div
            key={balloon.id}
            initial={{ y: 800, opacity: 0 }}
            animate={isFrozen ? {} : {
              y: -100,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              y: { duration: balloon.duration, delay: balloon.delay, ease: 'linear' },
              opacity: { times: [0, 0.1, 0.9, 1], duration: balloon.duration, delay: balloon.delay }
            }}
            onAnimationComplete={() => {
              setBalloons(prev => prev.filter(b => b.id !== balloon.id));
            }}
            className="absolute z-10"
            style={{
              pointerEvents: 'auto',
              left: `${balloon.x}%`,
            }}
          >
            <div
              className="balloon-sway-animate"
              style={
                {
                  '--sway': `${balloon.swayAmount}px`,
                  '--sway-duration': `${balloon.swayDuration}s`,
                  '--play-state': isFrozen ? 'paused' : 'running',
                } as React.CSSProperties
              }
            >
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handlePop(balloon, e);
                }}
                className="relative active:scale-95 transition-transform cursor-pointer block p-0 bg-transparent border-none outline-none"
                style={{
                  transform: `scale(${balloon.size})`,
                  touchAction: 'none',
                }}
                aria-label={`${balloon.special ?? balloon.color.name} balon`}
              >
                <svg
                  width="48"
                  height="64"
                  viewBox="0 0 48 64"
                  className="drop-shadow-lg"
                >
                  <ellipse cx="24" cy="26" rx="20" ry="24" fill={balloon.color.glow} opacity={0.5} />
                  <ellipse
                    cx="24" cy="26" rx="18" ry="22"
                    fill={`url(#${getGradId(balloon)})`}
                    stroke="rgba(255,255,255,0.2)" strokeWidth={0.5}
                  />
                  <ellipse
                    cx="17" cy="18" rx="4" ry="6"
                    fill="white" opacity={0.3}
                    transform="rotate(-20 17 18)"
                  />
                  {balloon.special === 'freeze' && (
                    <text x="24" y="30" textAnchor="middle" fontSize="14">❄️</text>
                  )}
                  {balloon.special === 'double' && (
                    <text x="24" y="32" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">2x</text>
                  )}
                  {balloon.special === 'bomb' && (
                    <text x="24" y="30" textAnchor="middle" fontSize="14">💣</text>
                  )}
                  <ellipse cx="24" cy="48" rx="3" ry="2" fill={balloon.color.value} opacity={0.8} />
                  <path d="M24 50 Q22 56 24 62" stroke="rgba(255,255,255,0.3)" strokeWidth={1} fill="none" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BalloonPopGame;