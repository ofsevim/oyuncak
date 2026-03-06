'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';
import { CATEGORIES } from '@/data/categories';

const PRAISE = ['Çok İyi! 🌟', 'Tam İsabet! 🎯', 'Mükemmel! 💫', 'Harika Gözlem! 👀', 'Aferin! 🏆'];

interface Sparkle { id: number; x: number; y: number; angle: number; color: string; }

const pill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

type RoundDefinition = {
    targetEmoji: string;
    options: string[];
};

const ShapeMatchGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [roundLeft, setRoundLeft] = useState(15);
    const [useTimer, setUseTimer] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [useHardMode, setUseHardMode] = useState(false);

    const [currentRound, setCurrentRound] = useState<RoundDefinition | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [shakeId, setShakeId] = useState<string | null>(null);

    const [highScore, setHighScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const [praiseText, setPraiseText] = useState('');
    const [showPraise, setShowPraise] = useState(false);

    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sparkleIdRef = useRef(0);
    const scoreRef = useRef(0);

    useEffect(() => { setHighScore(getHighScore('shapematch')); }, []);

    const clearAllTimeouts = useCallback(() => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; }, []);
    useEffect(() => () => { clearAllTimeouts(); if (timerRef.current) clearInterval(timerRef.current); }, [clearAllTimeouts]);

    const bgDots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100,
        size: 2 + Math.random() * 4, dur: 3 + Math.random() * 5, delay: Math.random() * 2,
        color: ['rgba(251,113,133,0.15)', 'rgba(56,189,248,0.15)', 'rgba(250,204,21,0.15)', 'rgba(163,230,53,0.15)', 'rgba(167,139,250,0.15)'][i % 5],
    })), []);

    const addSparkles = useCallback((cx: number, cy: number) => {
        const colors = ['#fb7185', '#38bdf8', '#facc15', '#a3e635', '#a78bfa'];
        const newS: Sparkle[] = Array.from({ length: 15 }, (_, i) => ({
            id: ++sparkleIdRef.current, x: cx, y: cy,
            angle: (Math.PI * 2 / 15) * i + (Math.random() - 0.5) * 0.4,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setSparkles(prev => [...prev, ...newS]);
        setTimeout(() => setSparkles(prev => prev.filter(s => !newS.find(n => n.id === s.id))), 900);
    }, []);

    const generateNewRound = useCallback(() => {
        // Only use categories that have strong silhouettes (avoid abstract or text-heavy ones)
        const validKeys = ['animals', 'vehicles', 'fruits', 'seaCreatures', 'insects', 'clothes', 'toys', 'instruments'];

        // Choose a random category for the target
        const targetCatKey = validKeys[Math.floor(Math.random() * validKeys.length)];
        const targetCatItems = CATEGORIES[targetCatKey].items;
        const targetEmoji = targetCatItems[Math.floor(Math.random() * targetCatItems.length)];

        // Gather wrong options (to make it tricky, we can pick some from the same category, some from others)
        const allValidItems = validKeys.flatMap(k => CATEGORIES[k].items);
        let potentialWrongOptions = allValidItems.filter(e => e !== targetEmoji);

        const optionCount = useHardMode ? 4 : 3;
        const wrongOptions = shuffleArray(potentialWrongOptions).slice(0, optionCount - 1);

        const options = shuffleArray([targetEmoji, ...wrongOptions]);

        setCurrentRound({ targetEmoji, options });
        setIsCorrect(false);
        setSelectedOption(null);
        setShakeId(null);
        setShowPraise(false);

        if (useTimer) setTimeLeft(useHardMode ? 10 : 15);
    }, [useHardMode, useTimer]);

    const initGame = useCallback(() => {
        clearAllTimeouts();
        if (timerRef.current) clearInterval(timerRef.current);

        setGameState('playing'); setScore(0); scoreRef.current = 0;
        setStreak(0); setRoundLeft(15); setSparkles([]);
        setIsNewRecord(false); setShowPraise(false);

        generateNewRound();
    }, [clearAllTimeouts, generateNewRound]);

    useEffect(() => {
        if (!useTimer || gameState !== 'playing' || !currentRound || isCorrect) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    playErrorSound(); setStreak(0); setShakeId('target');

                    setRoundLeft(r => {
                        if (r <= 1) { finishGame(); return 0; }
                        return r - 1;
                    });

                    const t = setTimeout(() => { generateNewRound(); }, 800);
                    timeoutsRef.current.push(t);
                    return useHardMode ? 10 : 15;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [useTimer, useHardMode, currentRound, isCorrect, gameState, generateNewRound]);

    const finishGame = () => {
        setGameState('complete');
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#fb7185', '#38bdf8', '#facc15', '#a3e635'] });
        const isNew = saveHighScoreObj('shapematch', scoreRef.current);
        if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
        else playLevelUpSound();
    };

    const handleOptionSelect = (emoji: string, e: React.MouseEvent | React.TouchEvent) => {
        if (isCorrect || gameState !== 'playing' || !currentRound) return;

        if (emoji === currentRound.targetEmoji) {
            // CORRECT
            setIsCorrect(true); setSelectedOption(emoji);
            playPopSound(); playSuccessSound();

            const newStreak = streak + 1;
            const bonus = useTimer ? Math.ceil(timeLeft / 2) : 0;
            const pts = 10 + bonus + (newStreak >= 3 ? Math.min(newStreak, 5) * 2 : 0);
            scoreRef.current += pts; setScore(scoreRef.current); setStreak(newStreak);
            if (newStreak >= 3) playComboSound(newStreak);
            if (newStreak % 5 === 0) playLevelUpSound();

            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const parentRect = (e.target as HTMLElement).closest('.game-field')?.getBoundingClientRect();
            if (parentRect) {
                addSparkles(rect.left - parentRect.left + rect.width / 2, rect.top - parentRect.top + rect.height / 2);
            }

            setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
            setShowPraise(true);
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#38bdf8', '#facc15'] });

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
            setShakeId(`opt_${emoji}`);
            const t = setTimeout(() => setShakeId(null), 500);
            timeoutsRef.current.push(t);
        }
    };

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
                    <motion.div className="relative w-32 h-32 flex items-center justify-center -mt-4 mb-2">
                        {/* Silhouette and target styling */}
                        <motion.div
                            className="text-7xl absolute left-2 top-2"
                            style={{ filter: 'brightness(0) blur(2px)', opacity: 0.6 }}
                        >🐶</motion.div>
                        <motion.div
                            className="text-7xl absolute z-10"
                            animate={{ x: [0, 8, 0], y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        >🐶</motion.div>
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #fb7185, #8b5cf6)' }}>Gölgeyi Bul</h2>
                    <p className="text-muted-foreground text-sm text-center">Yukarıdaki siyah gölgenin gerçek sahibini aşağıdaki renkli şekillerden bul!</p>

                    {highScore > 0 && (
                        <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(251,113,133,0.25)' }}>
                            <span className="font-black text-pink-400">🏆 Rekor: {highScore}</span>
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

                    <motion.button onClick={initGame} className="btn-gaming px-12 py-4 text-lg"
                        style={{ background: 'linear-gradient(135deg, #fb7185, #d946ef)' }}
                        whileHover={{ y: -2 }} whileTap={{ }}>
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
                        🧩
                    </motion.div>
                    <motion.h2 className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #fb7185, #8b5cf6)' }}
                        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        Harika Eşleştirici!
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
                        <p className="text-3xl font-black text-pink-400">✨ {score} Puan</p>
                        {streak > 2 && <p className="text-sm font-bold text-yellow-400">🔥 En iyi seri: x{streak}</p>}
                    </motion.div>

                    <motion.div className="flex gap-3 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <motion.button whileHover={{ }} whileTap={{ }}
                            style={{ background: 'linear-gradient(135deg, #fb7185, #d946ef)' }}
                            onClick={initGame} className="btn-gaming px-8 py-3 text-base text-white">🔄 Tekrar Oyna</motion.button>
                        <motion.button whileHover={{ }} whileTap={{ }}
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
            <motion.div className="relative z-10 flex flex-col items-center gap-6 p-4 pb-32 max-w-2xl mx-auto game-field"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* HUD */}
                <motion.div className="flex flex-wrap justify-center gap-2"
                    initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-pink-400">⭐ {score}</span></div>
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
                            <span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
                        </div>
                    )}
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

                {/* Praise text */}
                <AnimatePresence>
                    {showPraise && (
                        <motion.div className="absolute inset-x-0 top-32 flex items-center justify-center pointer-events-none z-30"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.p className="text-3xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #6ee7b7, #3b82f6)' }}
                                initial={{ scale: 0, y: 20 }} animate={{ scale: [0, 1.4, 1.1], y: -20 }}
                                transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
                                {praiseText}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* The Target Shadow Silhouette */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[180px] mt-4 relative w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentRound.targetEmoji}
                            initial={{
                                opacity: 0, scale: 0.5, y: -20,
                                filter: isCorrect ? 'brightness(1) drop-shadow(0 0 30px rgba(52,211,153,0.8))' : 'brightness(0) drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                            }}
                            animate={{
                                opacity: 1, scale: 1, y: 0,
                                x: shakeId === 'target' ? [-10, 10, -10, 10, 0] : 0,
                                filter: isCorrect ? 'brightness(1) drop-shadow(0 0 30px rgba(52,211,153,0.8))' : 'brightness(0) drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                            }}
                            exit={{
                                opacity: 0, scale: 0.5, y: -20,
                                filter: isCorrect ? 'brightness(1) drop-shadow(0 0 30px rgba(52,211,153,0.8))' : 'brightness(0) drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                            }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className="text-9xl sm:text-[140px] select-none z-20"
                        >
                            {currentRound.targetEmoji}
                        </motion.div>
                    </AnimatePresence>

                    {!isCorrect && (
                        <motion.p
                            className="absolute bottom-[-10px] z-10 font-bold text-muted-foreground/80 tracking-widest uppercase text-xs"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        >
                            Bu gölge kime ait?
                        </motion.p>
                    )}
                </div>

                {/* Puzzled Options */}
                <div className="w-full flex flex-wrap justify-center gap-3 sm:gap-6 mt-8">
                    {currentRound.options.map((opt, idx) => {
                        const isTarget = isCorrect && selectedOption === opt;
                        const wrongShake = shakeId === `opt_${opt}`;

                        return (
                            <motion.button
                                key={opt}
                                disabled={isCorrect}
                                onClick={(e) => handleOptionSelect(opt, e)}
                                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                                animate={{
                                    y: 0, opacity: 1, scale: 1,
                                    x: wrongShake ? [-10, 10, -10, 10, 0] : 0,
                                }}
                                transition={{
                                    delay: isCorrect ? 0 : idx * 0.1,
                                    type: 'spring', stiffness: wrongShake ? 600 : 200, damping: wrongShake ? 10 : 20
                                }}
                                whileHover={{ y: -5 }}
                                whileTap={{ }}
                                className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center rounded-2xl md:rounded-3xl border-2 transition-all relative overflow-hidden"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    backdropFilter: 'blur(10px)',
                                    borderColor: isTarget ? 'rgba(52,211,153,0.9)' : wrongShake ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.1)',
                                    boxShadow: isTarget ? '0 0 30px rgba(52,211,153,0.5)' : wrongShake ? '0 0 20px rgba(239,68,68,0.5)' : '0 10px 30px rgba(0,0,0,0.1)',
                                }}
                            >
                                {/* Active glow inside target option */}
                                {isTarget && (
                                    <motion.div
                                        layoutId="correctGlow"
                                        className="absolute inset-0 bg-emerald-400/20"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    />
                                )}
                                <span className={`text-5xl sm:text-6xl drop-shadow-lg z-10 ${isCorrect && !isTarget ? 'opacity-30 grayscale' : ''}`}>
                                    {opt}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Bottom controls */}
                <motion.div className="flex gap-3 mt-4"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <motion.button whileHover={{ }} whileTap={{ }}
                        onClick={initGame} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>
                        🔄 Yeniden
                    </motion.button>
                    <motion.button whileHover={{ }} whileTap={{ }}
                        onClick={() => setGameState('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>
                        ← Çıkış
                    </motion.button>
                </motion.div>
            </motion.div>
        </>
    );
};

export default ShapeMatchGame;
