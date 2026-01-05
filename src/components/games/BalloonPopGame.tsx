'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface Balloon {
    id: number;
    color: typeof BALLOON_COLORS[0];
    x: number;
    duration: number;
    delay: number;
}

const BalloonPopGame = () => {
    const [balloons, setBalloons] = useState<Balloon[]>([]);
    const [targetColor, setTargetColor] = useState(BALLOON_COLORS[0]);
    const [score, setScore] = useState(0);
    const [gameId, setGameId] = useState(0);

    const startNewRound = useCallback(() => {
        const nextColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        setTargetColor(nextColor);
        speak(`Hadi ${nextColor.name} renkli balonları bulup patlatalım!`);

        // Generate balloons from random positions across entire sky
        const initialBalloons: Balloon[] = Array.from({ length: 10 }).map((_, i) => ({
            id: Date.now() + i,
            color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
            x: Math.random() * 95, // 0-95% (full width)
            duration: Math.random() * 4 + 6,
            delay: Math.random() * 10, // Spread out over 10 seconds
        }));
        setBalloons(initialBalloons);
    }, []);

    useEffect(() => {
        startNewRound();
    }, [gameId, startNewRound]);

    const handlePop = (balloon: Balloon) => {
        if (balloon.color.value === targetColor.value) {
            playPopSound();
            setScore(prev => prev + 1);
            setBalloons(prev => prev.filter(b => b.id !== balloon.id));

            if (score > 0 && (score + 1) % 5 === 0) {
                confetti({ particleCount: 50, spread: 60 });
                playSuccessSound();
                setTimeout(startNewRound, 1500);
            }
        } else {
            playErrorSound();
        }
    };

    // Keep adding balloons if they run low
    useEffect(() => {
        if (balloons.length < 6) {
            const newBalloon: Balloon = {
                id: Date.now() + Math.random(),
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                x: Math.random() * 95,
                duration: Math.random() * 4 + 6,
                delay: 0,
            };
            setBalloons(prev => [...prev, newBalloon]);
        }
    }, [balloons]);

    return (
        <div className="relative w-full max-w-2xl mx-auto h-[75vh] bg-gradient-to-b from-sky-100 to-sky-50 rounded-[3rem] shadow-inner overflow-hidden border-8 border-white">
            {/* Score and Target UI */}
            <div className="absolute top-6 left-0 right-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm flex items-center gap-4 border-2 border-primary/20">
                    <span className="text-lg font-bold text-muted-foreground tracking-wide uppercase">Puan: {score}</span>
                </div>

                <motion.div
                    key={targetColor.name}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-4 bg-white px-8 py-3 rounded-3xl shadow-playful border-2 border-primary/5"
                >
                    <span className="text-2xl font-black text-foreground">{targetColor.name}</span>
                    <div
                        className="w-10 h-10 rounded-full shadow-inner ring-4 ring-offset-2 ring-white"
                        style={{ backgroundColor: targetColor.value }}
                    />
                    <span className="text-xl font-black text-foreground">BALONLARI PATLAT!</span>
                </motion.div>
            </div>

            {/* Game Area */}
            <AnimatePresence>
                {balloons.map((balloon) => {
                    const swayAmount = 20 + Math.random() * 20;
                    const swayDuration = 2 + Math.random() * 2;

                    return (
                        <motion.div
                            key={balloon.id}
                            className="absolute z-10"
                            style={{ left: `${balloon.x}%` }}
                            initial={{ top: '-120px' }}
                            animate={{ top: '110%' }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{
                                top: { duration: balloon.duration, delay: balloon.delay, ease: "linear" },
                                scale: { duration: 0.15 }
                            }}
                        >
                            {/* Swaying wrapper */}
                            <motion.div
                                animate={{ x: [-swayAmount, swayAmount, -swayAmount], rotate: [-8, 8, -8] }}
                                transition={{ duration: swayDuration, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <button
                                    onClick={() => handlePop(balloon)}
                                    className="relative group active:scale-90 transition-transform cursor-pointer"
                                >
                                    {/* Balloon Body */}
                                    <div
                                        className="w-14 h-18 md:w-16 md:h-20 rounded-[45%_45%_50%_50%/40%_40%_60%_60%] relative shadow-lg"
                                        style={{ backgroundColor: balloon.color.value }}
                                    >
                                        {/* Shine */}
                                        <div className="absolute top-2 left-3 w-3 h-5 bg-white/50 rounded-full rotate-12" />
                                        {/* Knot */}
                                        <div
                                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 rounded-full"
                                            style={{ backgroundColor: balloon.color.value, filter: 'brightness(0.85)' }}
                                        />
                                    </div>
                                    {/* String */}
                                    <div className="w-px h-12 bg-gray-400/50 mx-auto" />
                                </button>
                            </motion.div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Clouds BG decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute top-20 left-10 text-6xl">☁️</div>
                <div className="absolute top-40 right-20 text-5xl">☁️</div>
                <div className="absolute bottom-20 left-1/4 text-7xl">☁️</div>
            </div>
        </div>
    );
};

export default BalloonPopGame;
