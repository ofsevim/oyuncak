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
                    // Unique sway parameters for each balloon
                    const swayAmount = Math.random() * 15 + 5; // 5-20% sway
                    const swayDuration = Math.random() * 2 + 2; // 2-4 seconds per sway cycle
                    const rotateAmount = Math.random() * 10 + 5; // 5-15 degrees rotation

                    return (
                        <motion.div
                            key={balloon.id}
                            className="absolute cursor-pointer z-10"
                            initial={{ y: '-25%', x: `${balloon.x}%` }}
                            animate={{
                                y: '125%',
                                // Each balloon has unique swaying pattern
                                x: [
                                    `${balloon.x}%`,
                                    `${balloon.x - swayAmount}%`,
                                    `${balloon.x + swayAmount}%`,
                                    `${balloon.x}%`
                                ],
                                rotate: [-rotateAmount, rotateAmount, -rotateAmount],
                            }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{
                                y: { duration: balloon.duration, delay: balloon.delay, ease: "linear" },
                                x: { duration: swayDuration, delay: balloon.delay, repeat: Infinity, ease: "easeInOut" },
                                rotate: { duration: swayDuration * 1.2, repeat: Infinity, ease: "easeInOut" },
                                scale: { duration: 0.15 }
                            }}
                            style={{ left: 0 }}
                        >
                            <button
                                onClick={() => handlePop(balloon)}
                                className="relative group active:scale-95 transition-transform"
                            >
                                {/* Balloon Body */}
                                <div
                                    className="w-16 h-20 md:w-20 md:h-24 rounded-[45%_45%_50%_50%/40%_40%_60%_60%] relative shadow-lg"
                                    style={{ backgroundColor: balloon.color.value }}
                                >
                                    {/* Shine effect */}
                                    <div className="absolute top-3 left-4 w-4 h-7 bg-white/40 rounded-full rotate-12 blur-[1px]" />

                                    {/* Knot */}
                                    <div
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 rounded-full"
                                        style={{ backgroundColor: balloon.color.value, filter: 'brightness(0.9)' }}
                                    />
                                </div>
                                {/* Balloon String */}
                                <div className="w-0.5 h-16 bg-gray-400/40 mx-auto rounded-full" />
                            </button>
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
