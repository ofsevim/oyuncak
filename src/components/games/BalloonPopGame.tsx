'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

const BALLOON_COLORS = [
    { name: 'Kırmızı', value: '#ef4444', glow: '#ef444480' },
    { name: 'Mavi', value: '#3b82f6', glow: '#3b82f680' },
    { name: 'Yeşil', value: '#22c55e', glow: '#22c55e80' },
    { name: 'Sarı', value: '#eab308', glow: '#eab30880' },
    { name: 'Turuncu', value: '#f97316', glow: '#f9731680' },
    { name: 'Mor', value: '#a855f7', glow: '#a855f780' },
    { name: 'Cyan', value: '#06b6d4', glow: '#06b6d480' },
];

const GAME_TIME = 60;
const MAX_BALLOONS = 30;
const INITIAL_BALLOONS = 5;

interface Balloon {
    id: string;
    color: typeof BALLOON_COLORS[0];
    x: number;
    duration: number;
    delay: number;
    swayAmount: number;
    swayDuration: number;
    size: number;
}

type GamePhase = 'start' | 'playing' | 'ended';

const BalloonPopGame = () => {
    const [balloons, setBalloons] = useState<Balloon[]>([]);
    const [targetColor, setTargetColor] = useState(BALLOON_COLORS[0]);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [gamePhase, setGamePhase] = useState<GamePhase>('start');
    const [round, setRound] = useState(1);
    const [popEffects, setPopEffects] = useState<{ id: string; x: number; y: number; color: string }[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const balloonSpawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const createBalloon = useCallback((color: typeof BALLOON_COLORS[0], delay: number = 0): Balloon => {
        return {
            id: Math.random().toString(36).substr(2, 9) + Date.now(),
            color,
            x: Math.random() * 85 + 5,
            duration: Math.random() * 2 + 7,
            delay,
            swayAmount: 3 + Math.random() * 5,
            swayDuration: 3 + Math.random() * 2,
            size: 0.8 + Math.random() * 0.4,
        };
    }, []);

    const generateBalloons = useCallback((color: typeof BALLOON_COLORS[0]) => {
        const newBalloons: Balloon[] = [];
        const targetCount = Math.floor(INITIAL_BALLOONS * 0.4);
        for (let i = 0; i < targetCount; i++) {
            newBalloons.push(createBalloon(color, Math.random() * 8));
        }
        for (let i = targetCount; i < INITIAL_BALLOONS; i++) {
            const randomColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
            newBalloons.push(createBalloon(randomColor, Math.random() * 3));
        }
        return newBalloons;
    }, [createBalloon]);

    const startGame = useCallback(() => {
        setScore(0);
        setCombo(0);
        setTimeLeft(GAME_TIME);
        setRound(1);
        setGamePhase('playing');
        const nextColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        setTargetColor(nextColor);
        setBalloons(generateBalloons(nextColor));
    }, [generateBalloons]);

    const startNewRound = useCallback(() => {
        const remainingColors = BALLOON_COLORS.filter(c => c.value !== targetColor.value);
        const nextColor = remainingColors[Math.floor(Math.random() * remainingColors.length)];
        setTargetColor(nextColor);
        setBalloons(prev => {
            const currentBalloons = prev.slice(-10);
            const newBalloons = [];
            for (let i = 0; i < 5; i++) {
                newBalloons.push(createBalloon(nextColor, Math.random() * 5));
            }
            return [...currentBalloons, ...newBalloons];
        });
        setRound(r => r + 1);
    }, [targetColor, createBalloon]);

    useEffect(() => {
        return () => {
            if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (gamePhase === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setGamePhase('ended');
                        confetti({ particleCount: 150, spread: 100 });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gamePhase]);

    useEffect(() => {
        if (gamePhase === 'playing') {
            balloonSpawnRef.current = setInterval(() => {
                setBalloons(prev => {
                    if (prev.length >= MAX_BALLOONS) return prev;
                    const newBalloons: Balloon[] = [];
                    const spawnCount = 1 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < spawnCount; i++) {
                        const isTargetColor = Math.random() < 0.4;
                        const color = isTargetColor ? targetColor : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
                        newBalloons.push(createBalloon(color, Math.random() * 0.3));
                    }
                    return [...prev, ...newBalloons];
                });
            }, 1200);
        }
        return () => { if (balloonSpawnRef.current) clearInterval(balloonSpawnRef.current); };
    }, [gamePhase, targetColor, createBalloon]);

    useEffect(() => {
        if (gamePhase === 'playing') {
            const cleanupInterval = setInterval(() => {
                setBalloons(prev => {
                    if (prev.length > MAX_BALLOONS * 1.5) return prev.slice(-MAX_BALLOONS);
                    return prev;
                });
            }, 5000);
            return () => clearInterval(cleanupInterval);
        }
    }, [gamePhase]);

    const handlePop = (balloon: Balloon, e: React.MouseEvent) => {
        if (gamePhase !== 'playing') return;

        if (balloon.color.value === targetColor.value) {
            playPopSound();
            // Pop efekti
            setPopEffects(prev => [...prev, {
                id: balloon.id,
                x: e.clientX,
                y: e.clientY,
                color: balloon.color.value,
            }]);
            setTimeout(() => setPopEffects(prev => prev.filter(p => p.id !== balloon.id)), 600);

            setBalloons(prev => prev.filter(b => b.id !== balloon.id));
            setCombo(prev => prev + 1);

            setScore(prev => {
                const comboMultiplier = Math.min(combo + 1, 5);
                const newScore = prev + comboMultiplier;
                if (newScore > 0 && newScore % 15 === 0) {
                    playSuccessSound();
                    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
                    nextRoundTimeoutRef.current = setTimeout(startNewRound, 1000);
                }
                return newScore;
            });
        } else {
            playErrorSound();
            setCombo(0);
        }
    };

    // START SCREEN
    if (gamePhase === 'start') {
        return (
            <motion.div
                className="flex flex-col items-center justify-center gap-8 p-8 max-w-xl mx-auto min-h-[60vh]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-center space-y-4">
                    <motion.div
                        className="text-8xl"
                        animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        🎈
                    </motion.div>
                    <h2 className="text-4xl font-black text-gradient">Balon Patlat!</h2>
                    <p className="text-lg text-muted-foreground">
                        Hedef renkteki balonları yakala ve patlat!
                    </p>
                </div>

                <div className="glass-card p-6 space-y-3 text-center neon-border">
                    <p className="text-base font-bold">🎯 1 dakikada en çok balonu patlat</p>
                    <p className="text-base font-bold">⚡ Combo yap, çarpan kazan</p>
                    <p className="text-sm text-muted-foreground">🎈 Balonlar sürekli yağıyor!</p>
                </div>

                <button onClick={startGame} className="btn-gaming px-12 py-5 text-xl">
                    🚀 BAŞLA!
                </button>
            </motion.div>
        );
    }

    // END SCREEN
    if (gamePhase === 'ended') {
        return (
            <motion.div
                className="flex flex-col items-center justify-center gap-8 p-8 max-w-xl mx-auto min-h-[60vh]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-center space-y-4">
                    <span className="text-8xl">⏰</span>
                    <h2 className="text-4xl font-black text-gradient">Süre Doldu!</h2>
                </div>

                <div className="glass-card p-8 space-y-4 text-center neon-border">
                    <p className="text-3xl font-black text-primary">🎈 {score} Puan!</p>
                    <p className="text-xl font-bold text-muted-foreground">🔄 {round} Tur Oynadın</p>
                    <p className="text-lg font-bold text-green-400">Harika performans!</p>
                </div>

                <button onClick={startGame} className="btn-gaming px-12 py-5 text-xl">
                    🔄 Tekrar Oyna
                </button>
            </motion.div>
        );
    }

    // PLAYING SCREEN
    return (
        <div className="relative w-full max-w-2xl mx-auto h-[65vh] md:h-[75vh] rounded-2xl overflow-hidden neon-border"
            style={{
                background: 'linear-gradient(180deg, hsl(230 20% 12%) 0%, hsl(230 25% 8%) 100%)',
            }}
        >
            {/* Pop effects */}
            <AnimatePresence>
                {popEffects.map(effect => (
                    <motion.div
                        key={effect.id}
                        className="fixed z-50 pointer-events-none"
                        style={{ left: effect.x, top: effect.y }}
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.5, 0], opacity: [1, 0.8, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="w-16 h-16 rounded-full -translate-x-1/2 -translate-y-1/2"
                            style={{ background: `radial-gradient(circle, ${effect.color}60, transparent)` }} />
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Score UI */}
            <div className="absolute top-2 md:top-4 left-0 right-0 z-20 flex flex-col items-center gap-1 md:gap-2 pointer-events-none px-2">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="glass-card px-3 md:px-5 py-1 md:py-2 border border-primary/20">
                        <span className="text-sm md:text-lg font-black text-primary">🎈 {score}</span>
                    </div>
                    <div className="glass-card px-3 md:px-5 py-1 md:py-2 border border-orange-500/20">
                        <span className={`text-sm md:text-lg font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                            ⏱️ {timeLeft}s
                        </span>
                    </div>
                    {combo > 1 && (
                        <motion.div
                            key={combo}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass-card px-3 py-1 border border-yellow-500/30"
                        >
                            <span className="text-sm font-black text-yellow-400">🔥 x{Math.min(combo, 5)}</span>
                        </motion.div>
                    )}
                </div>

                <motion.div
                    key={targetColor.name}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2 md:gap-3 glass-card px-4 md:px-6 py-1 md:py-2 border border-white/10"
                >
                    <span className="text-sm md:text-xl font-black">{targetColor.name}</span>
                    <div
                        className="w-5 h-5 md:w-8 md:h-8 rounded-full"
                        style={{
                            backgroundColor: targetColor.value,
                            boxShadow: `0 0 15px ${targetColor.glow}, inset 0 -2px 4px rgba(0,0,0,0.3)`,
                        }}
                    />
                    <span className="text-sm md:text-lg font-black text-primary">PATLAT!</span>
                </motion.div>
            </div>

            {/* Balloons */}
            <AnimatePresence>
                {balloons.map((balloon) => (
                    <motion.div
                        key={balloon.id}
                        className="absolute z-10"
                        style={{ left: `${balloon.x}%` }}
                        initial={{ top: '105%' }}
                        animate={{ top: '-80px' }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{
                            top: { duration: balloon.duration, delay: balloon.delay, ease: "linear" },
                            scale: { duration: 0.12 }
                        }}
                        onAnimationComplete={() => {
                            setBalloons(prev => prev.filter(b => b.id !== balloon.id));
                        }}
                    >
                        <motion.div
                            animate={{
                                x: [-balloon.swayAmount, balloon.swayAmount, -balloon.swayAmount],
                                rotate: [-3, 3, -3]
                            }}
                            transition={{ duration: balloon.swayDuration, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <button
                                onClick={(e) => handlePop(balloon, e)}
                                className="relative group active:scale-90 transition-transform cursor-pointer"
                                style={{ transform: `scale(${balloon.size})` }}
                            >
                                {/* Balon gövdesi - SVG ile gerçekçi */}
                                <svg width="48" height="64" viewBox="0 0 48 64" className="drop-shadow-lg">
                                    <defs>
                                        <radialGradient id={`grad-${balloon.id}`} cx="35%" cy="30%" r="65%">
                                            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                            <stop offset="40%" stopColor={balloon.color.value} stopOpacity="0.9" />
                                            <stop offset="100%" stopColor={balloon.color.value} stopOpacity="1" />
                                        </radialGradient>
                                        <filter id={`glow-${balloon.id}`}>
                                            <feGaussianBlur stdDeviation="3" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    {/* Glow */}
                                    <ellipse cx="24" cy="26" rx="20" ry="24"
                                        fill={balloon.color.glow}
                                        filter={`url(#glow-${balloon.id})`}
                                        opacity="0.5" />
                                    {/* Balon */}
                                    <ellipse cx="24" cy="26" rx="18" ry="22"
                                        fill={`url(#grad-${balloon.id})`}
                                        stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                                    {/* Parlama */}
                                    <ellipse cx="17" cy="18" rx="4" ry="6"
                                        fill="white" opacity="0.3" transform="rotate(-20 17 18)" />
                                    {/* İp bağlantı */}
                                    <ellipse cx="24" cy="48" rx="3" ry="2" fill={balloon.color.value} opacity="0.8" />
                                    {/* İp */}
                                    <path d="M24 50 Q22 56 24 62" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                                </svg>
                            </button>
                        </motion.div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Ambient particles */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-primary"
                        style={{ left: `${15 + i * 15}%`, top: `${20 + i * 10}%` }}
                        animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
                        transition={{ repeat: Infinity, duration: 2 + i * 0.5, delay: i * 0.3 }}
                    />
                ))}
            </div>
        </div>
    );
};

export default BalloonPopGame;
