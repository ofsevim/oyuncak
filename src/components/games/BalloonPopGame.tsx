'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '@/utils/voiceFeedback';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

const BALLOON_COLORS = [
    { name: 'Kırmızı', value: '#EF5350' },
    { name: 'Mavi', value: '#42A5F5' },
    { name: 'Yeşil', value: '#66BB6A' },
    { name: 'Sarı', value: '#FFEE58' },
    { name: 'Turuncu', value: '#FFA726' },
    { name: 'Mor', value: '#AB47BC' },
];

const GAME_TIME = 60; // 60 seconds per game
const TARGET_SCORE = 30; // Win at 30 points
const MAX_BALLOONS = 40; // Maximum concurrent balloons
const INITIAL_BALLOONS = 15; // Başlangıçta ekrandaki balon sayısı

interface Balloon {
    id: number;
    color: typeof BALLOON_COLORS[0];
    x: number;
    duration: number;
    delay: number;
    swayAmount: number; // Sway miktarı - sabit
    swayDuration: number; // Sway süresi - sabit
}

type GamePhase = 'start' | 'playing' | 'ended';

const BalloonPopGame = () => {
    const [balloons, setBalloons] = useState<Balloon[]>([]);
    const [targetColor, setTargetColor] = useState(BALLOON_COLORS[0]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [gamePhase, setGamePhase] = useState<GamePhase>('start');
    const [round, setRound] = useState(1);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const balloonSpawnRef = useRef<NodeJS.Timeout | null>(null);

    // Tek bir balon oluştur - sway değerleri burada sabitlenir
    const createBalloon = useCallback((color: typeof BALLOON_COLORS[0], delay: number = 0): Balloon => {
        return {
            id: Date.now() + Math.random() * 100000,
            color: color,
            x: Math.random() * 85 + 5, // 5% - 90% arası
            duration: Math.random() * 2 + 7, // 7-9 saniye
            delay: delay,
            swayAmount: 3 + Math.random() * 5, // 3-8px arası yumuşak sway
            swayDuration: 3 + Math.random() * 2, // 3-5 saniye sway süresi (daha yavaş)
        };
    }, []);

    const generateBalloons = useCallback((color: typeof BALLOON_COLORS[0]) => {
        const newBalloons: Balloon[] = [];

        // Hedef renkte balonlar (%40'ı hedef renk)
        const targetCount = Math.floor(INITIAL_BALLOONS * 0.4);
        for (let i = 0; i < targetCount; i++) {
            newBalloons.push(createBalloon(color, Math.random() * 8));
        }

        // Rastgele renkli balonlar
        for (let i = targetCount; i < INITIAL_BALLOONS; i++) {
            const randomColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
            newBalloons.push(createBalloon(randomColor, Math.random() * 10));
        }

        return newBalloons;
    }, [createBalloon]);

    const startGame = useCallback(() => {
        setScore(0);
        setTimeLeft(GAME_TIME);
        setRound(1);
        setGamePhase('playing');

        const nextColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        setTargetColor(nextColor);
        setBalloons(generateBalloons(nextColor));
        speak(`Oyun başlıyor! ${nextColor.name} balonları patlat!`);
    }, [generateBalloons]);

    const startNewRound = useCallback(() => {
        const nextColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        setTargetColor(nextColor);
        // Mevcut balonları temizle ve yeni balonlar ekle
        setBalloons(prev => {
            const newBalloons = generateBalloons(nextColor);
            return [...prev.slice(0, 50), ...newBalloons]; // Max 50 eski balon tut
        });
        setRound(r => r + 1);
        speak(`${nextColor.name} balonları patlat!`);
    }, [generateBalloons]);

    // Timer
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
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gamePhase]);

    // Sürekli balon ekleme sistemi
    useEffect(() => {
        if (gamePhase === 'playing') {
            balloonSpawnRef.current = setInterval(() => {
                setBalloons(prev => {
                    if (prev.length >= MAX_BALLOONS) return prev;

                    // Her interval'da 1-2 yeni balon ekle
                    const newBalloons: Balloon[] = [];
                    const spawnCount = 1 + Math.floor(Math.random() * 2); // 1-2 balon

                    for (let i = 0; i < spawnCount; i++) {
                        const isTargetColor = Math.random() < 0.4; // %40 hedef renk
                        const color = isTargetColor ? targetColor : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
                        newBalloons.push(createBalloon(color, Math.random() * 0.3));
                    }

                    return [...prev, ...newBalloons];
                });
            }, 500); // Her 500ms'de yeni balon ekle (daha yavaş)
        }

        return () => {
            if (balloonSpawnRef.current) clearInterval(balloonSpawnRef.current);
        };
    }, [gamePhase, targetColor, createBalloon]);

    // Ekrandan çıkan balonları temizle
    useEffect(() => {
        if (gamePhase === 'playing') {
            const cleanupInterval = setInterval(() => {
                setBalloons(prev => {
                    // Çok eski balonları kaldır (10 saniyeden fazla)
                    const now = Date.now();
                    return prev.filter(b => now - b.id < 15000);
                });
            }, 2000);

            return () => clearInterval(cleanupInterval);
        }
    }, [gamePhase]);

    // Check for target score win
    useEffect(() => {
        if (score >= TARGET_SCORE && gamePhase === 'playing') {
            setGamePhase('ended');
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
        }
    }, [score, gamePhase]);

    const handlePop = (balloon: Balloon) => {
        if (gamePhase !== 'playing') return;

        if (balloon.color.value === targetColor.value) {
            playPopSound();
            setScore(prev => prev + 1);
            setBalloons(prev => prev.filter(b => b.id !== balloon.id));

            // Every 15 correct pops, new round
            if ((score + 1) % 15 === 0 && score > 0) {
                playSuccessSound();
                confetti({ particleCount: 50, spread: 60 });
                setTimeout(startNewRound, 1000);
            }
        } else {
            playErrorSound();
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
                    <span className="text-8xl">🎈</span>
                    <h2 className="text-4xl font-black text-foreground">Balon Patlat!</h2>
                    <p className="text-xl text-muted-foreground font-semibold">
                        Söylenen renkteki balonları yakala ve patlat!
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-playful space-y-3 text-center">
                    <p className="text-lg font-bold text-foreground">🎯 Hedef: {TARGET_SCORE} balon patlat</p>
                    <p className="text-lg font-bold text-foreground">⏱️ Süre: {GAME_TIME} saniye</p>
                    <p className="text-sm text-muted-foreground">🎈 200+ balon yağmuru!</p>
                </div>

                <button
                    onClick={startGame}
                    className="px-12 py-5 bg-primary text-white text-2xl font-black rounded-full shadow-lg btn-bouncy hover:scale-105 transition-transform"
                >
                    🚀 BAŞLA!
                </button>
            </motion.div>
        );
    }

    // END SCREEN
    if (gamePhase === 'ended') {
        const won = score >= TARGET_SCORE;
        return (
            <motion.div
                className="flex flex-col items-center justify-center gap-8 p-8 max-w-xl mx-auto min-h-[60vh]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-center space-y-4">
                    <span className="text-8xl">{won ? '🏆' : '⏰'}</span>
                    <h2 className="text-4xl font-black text-foreground">
                        {won ? 'TEBRİKLER!' : 'Süre Doldu!'}
                    </h2>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-playful space-y-4 text-center">
                    <p className="text-3xl font-black text-primary">🎈 {score} Balon</p>
                    <p className="text-xl font-bold text-muted-foreground">🔄 {round} Tur Oynadın</p>
                    {won && <p className="text-lg font-bold text-success">Hedefi {timeLeft} saniye kala yakaladın!</p>}
                </div>

                <button
                    onClick={startGame}
                    className="px-12 py-5 bg-primary text-white text-2xl font-black rounded-full shadow-lg btn-bouncy hover:scale-105 transition-transform"
                >
                    🔄 Tekrar Oyna
                </button>
            </motion.div>
        );
    }

    // PLAYING SCREEN
    return (
        <div className="relative w-full max-w-2xl mx-auto h-[75vh] bg-gradient-to-b from-sky-100 to-sky-50 rounded-[3rem] shadow-inner overflow-hidden border-8 border-white">
            {/* Score and Target UI */}
            <div className="absolute top-4 left-0 right-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
                <div className="flex items-center gap-4">
                    <div className="bg-white/90 backdrop-blur-sm px-5 py-2 rounded-full shadow-sm border-2 border-primary/20">
                        <span className="text-lg font-black text-primary">🎈 {score}/{TARGET_SCORE}</span>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm px-5 py-2 rounded-full shadow-sm border-2 border-orange-200">
                        <span className={`text-lg font-black ${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-orange-500'}`}>
                            ⏱️ {timeLeft}s
                        </span>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground font-bold">
                        {balloons.length} 🎈
                    </div>
                </div>

                <motion.div
                    key={targetColor.name}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-white px-6 py-2 rounded-2xl shadow-playful border-2 border-primary/5"
                >
                    <span className="text-xl font-black text-foreground">{targetColor.name}</span>
                    <div
                        className="w-8 h-8 rounded-full shadow-inner ring-2 ring-offset-1 ring-white"
                        style={{ backgroundColor: targetColor.value }}
                    />
                    <span className="text-lg font-black text-foreground">PATLAT!</span>
                </motion.div>
            </div>

            {/* Game Area */}
            <AnimatePresence>
                {balloons.map((balloon) => (
                    <motion.div
                        key={balloon.id}
                        className="absolute z-10"
                        style={{ left: `${balloon.x}%` }}
                        initial={{ top: '-60px' }}
                        animate={{ top: '105%' }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{
                            top: { duration: balloon.duration, delay: balloon.delay, ease: "linear" },
                            scale: { duration: 0.12 }
                        }}
                    >
                        <motion.div
                            animate={{
                                x: [-balloon.swayAmount, balloon.swayAmount, -balloon.swayAmount],
                                rotate: [-2, 2, -2] // Daha az dönüş
                            }}
                            transition={{
                                duration: balloon.swayDuration,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <button
                                onClick={() => handlePop(balloon)}
                                className="relative group active:scale-90 transition-transform cursor-pointer"
                            >
                                <div
                                    className="w-10 h-14 md:w-12 md:h-16 rounded-[45%_45%_50%_50%/40%_40%_60%_60%] relative shadow-md"
                                    style={{ backgroundColor: balloon.color.value }}
                                >
                                    <div className="absolute top-1.5 left-1.5 w-1.5 h-3 bg-white/50 rounded-full rotate-12" />
                                    <div
                                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1 rounded-full"
                                        style={{ backgroundColor: balloon.color.value, filter: 'brightness(0.85)' }}
                                    />
                                </div>
                                <div className="w-px h-8 bg-gray-400/40 mx-auto" />
                            </button>
                        </motion.div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Clouds */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-24 left-8 text-5xl">☁️</div>
                <div className="absolute top-36 right-16 text-4xl">☁️</div>
                <div className="absolute bottom-24 left-1/3 text-6xl">☁️</div>
            </div>
        </div>
    );
};

export default BalloonPopGame;

