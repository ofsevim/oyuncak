'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

const PRAISE = ['Mantıklı! ⚖️', 'Doğru Seçim! 🎯', 'Çok İyi! 🌟', 'Kusursuz! 💫', 'Aferin! 🏆'];

const ITEMS = [
    // Seviye 3 (Çok Büyük/Ağır)
    { emoji: '🐘', label: 'Fil', weight: 5000, size: 5000, level: 3 },
    { emoji: '🐳', label: 'Balina', weight: 150000, size: 100000, level: 3 },
    { emoji: '☀️', label: 'Güneş', weight: 9999999, size: 9999999, level: 3 }, // Dağ yerine Güneş
    { emoji: '🏠', label: 'Ev', weight: 500000, size: 800000, level: 3 },     // Bina yerine Ev
    { emoji: '🌍', label: 'Dünya', weight: 99999999, size: 99999999, level: 3 },

    // Seviye 2 (Orta Büyük/Ağır)
    { emoji: '🚗', label: 'Araba', weight: 1500, size: 300, level: 2 },
    { emoji: '🐎', label: 'At', weight: 700, size: 200, level: 2 },            // İnek yerine At (daha yaygın ikon)
    { emoji: '📺', label: 'Televizyon', weight: 30, size: 50, level: 2 },      // Koltuk yerine Televizyon
    { emoji: '🐻', label: 'Ayı', weight: 400, size: 180, level: 2 },

    // Seviye 1 (Hafif/Küçük)
    { emoji: '🐜', label: 'Karınca', weight: 0.1, size: 0.1, level: 1 },
    { emoji: '🐁', label: 'Fare', weight: 1, size: 1, level: 1 },
    { emoji: '🍓', label: 'Çilek', weight: 0.5, size: 2, level: 1 },
    { emoji: '✏️', label: 'Kalem', weight: 0.5, size: 4, level: 1 },
    { emoji: '⚽', label: 'Top', weight: 0.4, size: 3, level: 1 },             // Bozuk para yerine Top
];

type PropertyType = 'weight' | 'size';

const pill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

interface RoundData {
    itemA: typeof ITEMS[0];
    itemB: typeof ITEMS[0];
    prop: PropertyType;
    question: string;
    biggerIndex: number; // 0 for A, 1 for B
}
interface Sparkle { id: number; x: number; y: number; angle: number; color: string; }

const ComparisonGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [roundLeft, setRoundLeft] = useState(15);
    const [useTimer, setUseTimer] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);

    const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [shakeIndex, setShakeIndex] = useState<number | null>(null);

    const [highScore, setHighScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const [praiseText, setPraiseText] = useState('');
    const [showPraise, setShowPraise] = useState(false);

    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sparkleIdRef = useRef(0);
    const scoreRef = useRef(0);

    useEffect(() => { setHighScore(getHighScore('comparison')); }, []);

    const clearAllTimeouts = useCallback(() => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; }, []);
    useEffect(() => () => { clearAllTimeouts(); if (timerRef.current) clearInterval(timerRef.current); }, [clearAllTimeouts]);

    const bgDots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100,
        size: 2 + Math.random() * 4, dur: 3 + Math.random() * 5, delay: Math.random() * 2,
        color: ['rgba(251,146,60,0.15)', 'rgba(56,189,248,0.15)', 'rgba(167,139,250,0.15)', 'rgba(52,211,153,0.15)'][i % 4],
    })), []);

    const addSparkles = useCallback((cx: number, cy: number) => {
        const colors = ['#fb923c', '#38bdf8', '#a78bfa', '#34d399'];
        const newS: Sparkle[] = Array.from({ length: 15 }, (_, i) => ({
            id: ++sparkleIdRef.current, x: cx, y: cy,
            angle: (Math.PI * 2 / 15) * i + (Math.random() - 0.5) * 0.4,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setSparkles(prev => [...prev, ...newS]);
        setTimeout(() => setSparkles(prev => prev.filter(s => !newS.find(n => n.id === s.id))), 900);
    }, []);

    const generateNewRound = useCallback(() => {
        let prop: PropertyType = Math.random() > 0.5 ? 'weight' : 'size';

        let a: typeof ITEMS[0], b: typeof ITEMS[0];
        let attempts = 0;
        do {
            // Pick two different levels to ensure a huge difference, no ambiguity
            let levelA = Math.floor(Math.random() * 3) + 1;
            let levelB = Math.floor(Math.random() * 3) + 1;
            while (levelA === levelB) {
                levelB = Math.floor(Math.random() * 3) + 1;
            }

            const itemsA = ITEMS.filter(i => i.level === levelA);
            const itemsB = ITEMS.filter(i => i.level === levelB);

            a = itemsA[Math.floor(Math.random() * itemsA.length)];
            b = itemsB[Math.floor(Math.random() * itemsB.length)];
            attempts++;
        } while (a[prop] === b[prop] && attempts < 10);

        // Randomize layout (A left, B right OR vice versa)
        if (Math.random() > 0.5) {
            const temp = a; a = b; b = temp;
        }

        const biggerIndex = a[prop] > b[prop] ? 0 : 1;
        const question = prop === 'weight' ? 'Hangisi daha AĞIR?' : 'Hangisi daha BÜYÜK?';

        setCurrentRound({
            itemA: a,
            itemB: b,
            prop,
            question,
            biggerIndex
        });

        setIsCorrect(false);
        setSelectedIndex(null);
        setShakeIndex(null);
        setShowPraise(false);

        if (useTimer) setTimeLeft(10);
    }, [useTimer]);

    const initGame = useCallback(() => {
        clearAllTimeouts();
        if (timerRef.current) clearInterval(timerRef.current);

        setGameState('playing'); setScore(0); scoreRef.current = 0;
        setStreak(0); setBestStreak(0); setRoundLeft(15); setSparkles([]);
        setIsNewRecord(false); setShowPraise(false);

        generateNewRound();
    }, [clearAllTimeouts, generateNewRound]);

    const finishGame = useCallback(() => {
        setGameState('complete');
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#fb923c', '#38bdf8', '#a78bfa', '#34d399'] });
        const isNew = saveHighScoreObj('comparison', scoreRef.current);
        if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
        else playLevelUpSound();
    }, []);

    useEffect(() => {
        if (!useTimer || gameState !== 'playing' || !currentRound || isCorrect) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    playErrorSound(); setStreak(0);
                    setShakeIndex(currentRound.biggerIndex === 0 ? 1 : 0); // Shake the wrong one
                    const ts = setTimeout(() => setShakeIndex(null), 500);
                    timeoutsRef.current.push(ts);

                    setRoundLeft(r => {
                        if (r <= 1) { finishGame(); return 0; }
                        const t = setTimeout(() => { generateNewRound(); }, 800);
                        timeoutsRef.current.push(t);
                        return r - 1;
                    });

                    return 10;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [useTimer, currentRound, isCorrect, gameState, generateNewRound, finishGame]);

    const handleSelect = useCallback((index: number, e: React.MouseEvent | React.TouchEvent) => {
        if (isCorrect || gameState !== 'playing' || !currentRound) return;

        if (index === currentRound.biggerIndex) {
            // CORRECT
            setIsCorrect(true); setSelectedIndex(index);
            playPopSound(); playSuccessSound();

            const newStreak = streak + 1;
            setStreak(newStreak);
            setBestStreak(prev => Math.max(prev, newStreak));

            const bonus = useTimer ? Math.ceil(timeLeft / 2) : 0;
            const pts = 10 + bonus + (newStreak >= 3 ? Math.min(newStreak, 5) * 2 : 0);
            scoreRef.current += pts; setScore(scoreRef.current);
            if (newStreak >= 3) playComboSound(newStreak);
            if (newStreak % 5 === 0) playLevelUpSound();

            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const parentRect = (e.target as HTMLElement).closest('.game-field')?.getBoundingClientRect();
            if (parentRect) {
                addSparkles(rect.left - parentRect.left + rect.width / 2, rect.top - parentRect.top + rect.height / 2);
            }

            setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
            setShowPraise(true);
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#38bdf8', '#fb923c'] });

            const t = setTimeout(() => {
                setRoundLeft(r => {
                    if (r <= 1) { finishGame(); return 0; }
                    generateNewRound();
                    return r - 1;
                });
            }, 1200);
            timeoutsRef.current.push(t);
        } else {
            // WRONG
            playErrorSound(); setStreak(0);
            setShakeIndex(index);
            const t = setTimeout(() => setShakeIndex(null), 500);
            timeoutsRef.current.push(t);
        }
    }, [isCorrect, gameState, currentRound, streak, useTimer, timeLeft, finishGame, generateNewRound, addSparkles]);

    const Background = (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            {bgDots.map(d => (
                <motion.div key={d.id} className="absolute rounded-full"
                    style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size, background: d.color }}
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }} />
            ))}
        </div>
    );

    /* MENU */
    if (gameState === 'menu') {
        return (
            <>
                {Background}
                <motion.div className="relative z-10 flex flex-col items-center gap-6 p-5 pb-32 max-w-lg mx-auto"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <motion.div className="text-7xl drop-shadow-lg flex gap-4 items-center"
                        animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                        <span>🐘</span>
                        <span className="text-4xl text-white/50">⚖️</span>
                        <span>🐁</span>
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #fb923c, #8b5cf6)' }}>Karşılaştırma</h2>
                    <p className="text-muted-foreground text-sm text-center">Hangisi daha büyük veya ağır? Karar ver ve seç!</p>

                    {highScore > 0 && (
                        <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(251,146,60,0.25)' }}>
                            <span className="font-black text-orange-400">🏆 Rekor: {highScore}</span>
                        </div>
                    )}

                    <div className="flex gap-3 flex-wrap justify-center">
                        <motion.button whileHover={{}} whileTap={{}}
                            onClick={() => setUseTimer(p => !p)}
                            className="px-5 py-3 touch-manipulation font-bold text-sm"
                            style={{ ...pill, background: useTimer ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)', border: useTimer ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                            ⏱️ Zamanlı {useTimer ? '✓' : ''}
                        </motion.button>
                    </div>

                    <motion.button onClick={initGame} className="btn-gaming px-12 py-4 text-lg"
                        style={{ background: 'linear-gradient(135deg, #fb923c, #8b5cf6)' }}
                        whileHover={{ y: -2 }} whileTap={{}}>
                        🚀 BAŞLA!
                    </motion.button>
                </motion.div>
            </>
        );
    }

    /* COMPLETE */
    if (gameState === 'complete') {
        return (
            <>
                {Background}
                <motion.div className="relative z-10 flex flex-col items-center gap-5 p-5 pb-32 max-w-lg mx-auto"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <motion.div className="text-8xl drop-shadow-xl"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: [0, 1.3, 1], rotate: [0, 10, 0] }}
                        transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                        ⚖️
                    </motion.div>
                    <motion.h2 className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #fb923c, #8b5cf6)' }}
                        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        Harika Kıyaslama!
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
                        <p className="text-3xl font-black text-orange-400">✨ {score} Puan</p>
                        {bestStreak > 2 && <p className="text-sm font-bold text-yellow-400">🔥 En iyi seri: x{bestStreak}</p>}
                    </motion.div>

                    <motion.div className="flex gap-3 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <motion.button whileHover={{}} whileTap={{}}
                            style={{ background: 'linear-gradient(135deg, #fb923c, #8b5cf6)' }}
                            onClick={initGame} className="btn-gaming px-8 py-3 text-base text-white">🔄 Tekrar Oyna</motion.button>
                        <motion.button whileHover={{}} whileTap={{}}
                            onClick={() => setGameState('menu')}
                            className="px-5 py-2.5 font-bold text-muted-foreground" style={pill}>← Menü</motion.button>
                    </motion.div>
                </motion.div>
            </>
        );
    }

    /* PLAYING */
    if (!currentRound) return null;

    return (
        <>
            {Background}
            <motion.div className="relative z-10 flex flex-col items-center gap-6 p-4 pb-32 max-w-2xl mx-auto game-field min-h-screen"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* HUD */}
                <motion.div className="flex flex-wrap justify-center gap-2"
                    initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-orange-400">⭐ {score}</span></div>
                    <div className="px-4 py-2" style={pill}>
                        <span className="text-sm font-bold text-muted-foreground">Kalan: {roundLeft}</span>
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
                            <span className={`text-sm font-black ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
                        </div>
                    )}
                </motion.div>

                {/* Question text */}
                <motion.div
                    className="w-full text-center mt-4 mb-2 z-20"
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    key={currentRound.question}
                >
                    <h3 className="text-3xl sm:text-4xl font-black text-white drop-shadow-md bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-sm border border-white/20 inline-block">
                        {currentRound.question}
                    </h3>
                </motion.div>

                {/* Praise text */}
                <AnimatePresence>
                    {showPraise && (
                        <motion.div className="absolute inset-x-0 top-1/3 flex items-center justify-center pointer-events-none z-30"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.p className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #fb923c, #fcd34d)' }}
                                initial={{ scale: 0, y: 20 }} animate={{ scale: [0, 1.4, 1.1], y: -20 }}
                                transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
                                {praiseText}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Options */}
                <div className="w-full flex justify-center gap-4 sm:gap-8 mt-2 items-stretch z-20">
                    {[currentRound.itemA, currentRound.itemB].map((item, idx) => {
                        const isTarget = isCorrect && selectedIndex === idx;
                        const wrongShake = shakeIndex === idx;
                        const isWinnerGimmick = isTarget; // if the layout shrinks the loser
                        const isLoserGimmick = isCorrect && !isTarget;

                        return (
                            <motion.button
                                key={`${item.label}-${idx}`}
                                disabled={isCorrect}
                                onClick={(e) => handleSelect(idx, e)}
                                initial={{ y: 0, opacity: 0, scale: 0.95 }}
                                animate={{
                                    y: 0,
                                    opacity: isLoserGimmick ? 0.3 : 1,
                                    scale: isWinnerGimmick ? 1.08 : isLoserGimmick ? 0.9 : 1,
                                    x: wrongShake ? [-10, 10, -10, 10, 0] : 0,
                                }}
                                transition={{
                                    delay: isCorrect ? 0 : idx * 0.05,
                                    type: 'spring', stiffness: wrongShake ? 600 : 350, damping: 25
                                }}
                                whileHover={{ y: -3 }}
                                whileTap={{}}
                                className="flex-1 flex flex-col items-center justify-center rounded-[24px] border-[2.5px] transition-all relative overflow-hidden aspect-square max-w-[160px]"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(10px)',
                                    borderColor: isTarget ? 'rgba(52,211,153,0.9)' : wrongShake ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.1)',
                                    boxShadow: isTarget ? '0 0 30px rgba(52,211,153,0.5)' : wrongShake ? '0 0 20px rgba(239,68,68,0.5)' : '0 8px 25px rgba(0,0,0,0.15)',
                                }}
                            >
                                {/* Active glow inside target option */}
                                {isTarget && (
                                    <motion.div
                                        layoutId="correctGlowComp"
                                        className="absolute inset-0 bg-emerald-400/20"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    />
                                )}
                                <span className="text-[60px] sm:text-[80px] drop-shadow-lg z-10">
                                    {item.emoji}
                                </span>


                            </motion.button>
                        );
                    })}
                </div>

                {/* Bottom controls */}
                <motion.div className="flex gap-3 mt-10 z-20"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <motion.button whileHover={{}} whileTap={{}}
                        onClick={initGame} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>
                        🔄 Yeniden
                    </motion.button>
                    <motion.button whileHover={{}} whileTap={{}}
                        onClick={() => setGameState('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>
                        ← Çıkış
                    </motion.button>
                </motion.div>

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
            </motion.div>
        </>
    );
};

export default ComparisonGame;
