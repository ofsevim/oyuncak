'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

const PRAISE = ['Harf Avcısı! 🎈', 'Tam Kelime! 📝', 'Mükemmel! 💫', 'Aferin Sana! 🏆'];

const WORDS = [
    { w: 'ELMA', h: 'E_MA', c: 'L', emoji: '🍎' },
    { w: 'KEDİ', h: 'K_Dİ', c: 'E', emoji: '🐈' },
    { w: 'KÖPEK', h: 'KÖ_EK', c: 'P', emoji: '🐕' },
    { w: 'BALIK', h: 'BA_IK', c: 'L', emoji: '🐟' },
    { w: 'ARABA', h: 'A_ABA', c: 'R', emoji: '🚗' },
    { w: 'UÇAK', h: 'U_AK', c: 'Ç', emoji: '✈️' },
    { w: 'ÇİLEK', h: 'Çİ_EK', c: 'L', emoji: '🍓' },
    { w: 'MUZ', h: 'M_Z', c: 'U', emoji: '🍌' },
    { w: 'AĞAÇ', h: 'A_AÇ', c: 'Ğ', emoji: '🌳' },
    { w: 'ÇİÇEK', h: 'Çİ_EK', c: 'Ç', emoji: '🌸' },
    { w: 'YILLAN', h: 'YI_AN', c: 'L', emoji: '🐍' },
    { w: 'İNEK', h: 'İ_EK', c: 'N', emoji: '🐄' },
    { w: 'ÜZÜM', h: 'Ü_ÜM', c: 'Z', emoji: '🍇' },
    { w: 'OKUL', h: 'O_UL', c: 'K', emoji: '🏫' },
    { w: 'KİTAP', h: 'Kİ_AP', c: 'T', emoji: '📚' },
    { w: 'KALEM', h: 'KA_EM', c: 'L', emoji: '✏️' },
    { w: 'GÜNEŞ', h: 'GÜ_EŞ', c: 'N', emoji: '☀️' },
    { w: 'BULUT', h: 'B_LUT', c: 'U', emoji: '☁️' }
];

const ALL_LETTERS = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

interface BalloonData { id: string; letter: string; x: number; duration: number; delay: number; color: string; }
interface Sparkle { id: number; x: number; y: number; angle: number; color: string; }

const pill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

const WordCatchGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [roundLeft, setRoundLeft] = useState(15);
    const [useTimer, setUseTimer] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [useHardMode, setUseHardMode] = useState(false);

    const [currentWord, setCurrentWord] = useState<typeof WORDS[0] | null>(null);
    const [balloons, setBalloons] = useState<BalloonData[]>([]);
    const [isCorrect, setIsCorrect] = useState(false);
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

    useEffect(() => { setHighScore(getHighScore('wordcatch')); }, []);

    const clearAllTimeouts = useCallback(() => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; }, []);
    useEffect(() => () => { clearAllTimeouts(); if (timerRef.current) clearInterval(timerRef.current); }, [clearAllTimeouts]);

    const bgDots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100,
        size: 2 + Math.random() * 4, dur: 3 + Math.random() * 5, delay: Math.random() * 2,
        color: ['rgba(34,211,238,0.15)', 'rgba(232,121,249,0.15)', 'rgba(52,211,153,0.15)', 'rgba(251,191,36,0.15)'][i % 4],
    })), []);

    const addSparkles = useCallback((cx: number, cy: number) => {
        const colors = ['#22d3ee', '#e879f9', '#34d399', '#fbbf36'];
        const newS: Sparkle[] = Array.from({ length: 15 }, (_, i) => ({
            id: ++sparkleIdRef.current, x: cx, y: cy,
            angle: (Math.PI * 2 / 15) * i + (Math.random() - 0.5) * 0.4,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setSparkles(prev => [...prev, ...newS]);
        setTimeout(() => setSparkles(prev => prev.filter(s => !newS.find(n => n.id === s.id))), 900);
    }, []);

    const generateNewRound = useCallback(() => {
        const wordObj = WORDS[Math.floor(Math.random() * WORDS.length)];
        setCurrentWord(wordObj);

        // Create balloons
        const balloonCount = useHardMode ? 6 : 4;
        const wrongLetters = shuffleArray(ALL_LETTERS.filter(l => l !== wordObj.c)).slice(0, balloonCount - 1);
        const roundLetters = shuffleArray([wordObj.c, ...wrongLetters]);

        const balloonColors = ['from-cyan-400 to-blue-500', 'from-fuchsia-400 to-pink-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-red-500', 'from-indigo-400 to-purple-500'];

        const newBalloons: BalloonData[] = roundLetters.map((l, i) => ({
            id: `bal_${Date.now()}_${i}`,
            letter: l,
            x: 10 + Math.random() * 70, // 10% to 80% left
            duration: 4 + Math.random() * 3, // Fall speed
            delay: Math.random() * 0.5,
            color: balloonColors[i % balloonColors.length]
        }));

        setBalloons(newBalloons);
        setIsCorrect(false);
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
        if (!useTimer || gameState !== 'playing' || !currentWord || isCorrect) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    playErrorSound(); setStreak(0); setShakeId('word');

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
    }, [useTimer, useHardMode, currentWord, isCorrect, gameState, generateNewRound]);

    const finishGame = () => {
        setGameState('complete');
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#22d3ee', '#e879f9', '#34d399', '#fbbf36'] });
        const isNew = saveHighScoreObj('wordcatch', scoreRef.current);
        if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
        else playLevelUpSound();
    };

    const handleBalloonSelect = (letter: string, id: string, e: React.MouseEvent | React.TouchEvent) => {
        if (isCorrect || gameState !== 'playing' || !currentWord) return;

        if (letter === currentWord.c) {
            // CORRECT
            setIsCorrect(true);
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

            // pop the balloon
            setBalloons(prev => prev.filter(b => b.id !== id));

            setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
            setShowPraise(true);
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#34d399', '#fbbf36'] });

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
            setShakeId(id);
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
                    <motion.div className="text-7xl drop-shadow-lg"
                        animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>🎈</motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #22d3ee, #e879f9)' }}>Kelime Avı</h2>
                    <p className="text-muted-foreground text-sm text-center">Eksik harfi uçan balonlardan bul ve kelimeyi tamamla!</p>

                    {highScore > 0 && (
                        <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(34,211,238,0.25)' }}>
                            <span className="font-black text-cyan-400">🏆 Rekor: {highScore}</span>
                        </div>
                    )}

                    <div className="flex gap-3 flex-wrap justify-center">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setUseTimer(p => !p)}
                            className="px-5 py-3 touch-manipulation font-bold text-sm"
                            style={{ ...pill, background: useTimer ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)', border: useTimer ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                            ⏱️ Zamanlı {useTimer ? '✓' : ''}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setUseHardMode(p => !p)}
                            className="px-5 py-3 touch-manipulation font-bold text-sm"
                            style={{ ...pill, background: useHardMode ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: useHardMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                            🔥 Zor Mod {useHardMode ? '✓' : ''}
                        </motion.button>
                    </div>

                    <motion.button onClick={initGame} className="btn-gaming px-12 py-4 text-lg"
                        style={{ background: 'linear-gradient(135deg, #22d3ee, #c026d3)' }}
                        whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
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
                        📝
                    </motion.div>
                    <motion.h2 className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #22d3ee, #e879f9)' }}
                        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        Harf Ustası!
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
                        <p className="text-3xl font-black text-cyan-400">✨ {score} Puan</p>
                        {streak > 2 && <p className="text-sm font-bold text-yellow-400">🔥 En iyi seri: x{streak}</p>}
                    </motion.div>

                    <motion.div className="flex gap-3 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ background: 'linear-gradient(135deg, #22d3ee, #c026d3)' }}
                            onClick={initGame} className="btn-gaming px-8 py-3 text-base text-white">🔄 Tekrar Oyna</motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setGameState('menu')}
                            className="px-5 py-2.5 font-bold text-muted-foreground" style={pill}>← Menü</motion.button>
                    </motion.div>
                </motion.div>
            </>
        );
    }

    /* PLAYING */
    if (!currentWord) return null;

    return (
        <>
            {Background}
            <motion.div className="relative z-10 flex flex-col items-center gap-2 p-4 pb-32 max-w-2xl mx-auto game-field min-h-screen overflow-hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* HUD */}
                <motion.div className="flex flex-wrap justify-center gap-2 w-full z-50 mb-4"
                    initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-cyan-400">⭐ {score}</span></div>
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

                {/* Puzzled Word Container */}
                <div className="w-full flex flex-col items-center justify-center min-h-[140px] mt-2 mb-4 z-20">
                    <motion.div
                        className="text-6xl sm:text-7xl mb-4 drop-shadow-xl"
                        animate={{ scale: isCorrect ? [1, 1.2, 1] : 1, rotate: isCorrect ? [0, 10, -10, 0] : 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {currentWord.emoji}
                    </motion.div>

                    <motion.div
                        className="flex gap-2 sm:gap-4"
                        animate={{ x: shakeId === 'word' ? [-10, 10, -10, 10, 0] : 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {currentWord.h.split('').map((char, idx) => (
                            <div key={idx} className="w-12 h-14 sm:w-16 sm:h-20 flex items-center justify-center rounded-xl border-b-4 border-primary/50 text-4xl sm:text-5xl font-black bg-background/50 backdrop-blur-md shadow-lg"
                                style={{ color: char === '_' ? (isCorrect ? '#34d399' : 'transparent') : 'inherit' }}>
                                {char === '_' ? (isCorrect ? currentWord.c : '_') : char}
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Praise text */}
                <AnimatePresence>
                    {showPraise && (
                        <motion.div className="absolute inset-x-0 top-1/3 flex items-center justify-center pointer-events-none z-30"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.p className="text-3xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #6ee7b7, #3b82f6)' }}
                                initial={{ scale: 0, y: 20 }} animate={{ scale: [0, 1.4, 1.1], y: -20 }}
                                transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
                                {praiseText}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Balloons */}
                <div className="relative w-full h-[50vh] flex-1 overflow-hidden pointer-events-none z-10 border-t border-white/5 rounded-t-3xl bg-gradient-to-t from-white/5 to-transparent">
                    {balloons.map(b => (
                        <motion.button
                            key={b.id}
                            disabled={isCorrect}
                            onClick={(e) => handleBalloonSelect(b.letter, b.id, e)}
                            className="absolute pointer-events-auto flex items-center justify-center flex-col"
                            style={{ left: `${b.x}%`, width: '80px', bottom: '-100px' }}
                            initial={{ y: 0, x: 0, opacity: 0 }}
                            animate={{
                                y: [-100, -800],
                                x: [0, 20, -20, 10, -10],
                                opacity: 1
                            }}
                            transition={{
                                y: { duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'linear' },
                                x: { duration: 3, delay: b.delay, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <div
                                className={`w-16 h-20 rounded-[50%] flex items-center justify-center shadow-lg bg-gradient-to-br ${b.color} relative border-2 border-white/20`}
                                style={{
                                    boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.2), 0 10px 15px rgba(0,0,0,0.3)',
                                    animation: shakeId === b.id ? 'shake 0.4s ease-in-out' : 'none'
                                }}
                            >
                                {/* Balloon highlight */}
                                <div className="absolute top-2 left-3 w-4 h-6 rounded-full bg-white/40 rotate-[30deg]"></div>
                                <span className="text-3xl font-black text-white drop-shadow-md z-10">{b.letter}</span>
                                {/* Balloon knot */}
                                <div className="absolute -bottom-2 w-4 h-3 bg-white/30" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                            </div>
                            {/* String */}
                            <div className="w-[1px] h-16 bg-white/20 -mt-1 rounded-full drop-shadow"></div>
                        </motion.button>
                    ))}
                </div>

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

                {/* Bottom controls */}
                <motion.div className="flex gap-3 absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                        onClick={initGame} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={{ ...pill, background: 'rgba(0,0,0,0.5)' }}>
                        🔄 Yeniden
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                        onClick={() => setGameState('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={{ ...pill, background: 'rgba(0,0,0,0.5)' }}>
                        ← Çıkış
                    </motion.button>
                </motion.div>
            </motion.div>
        </>
    );
};

export default WordCatchGame;
