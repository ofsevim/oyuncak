'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak, speakSuccess, speakTryAgain } from '@/utils/voiceFeedback';
import { playPopSound } from '@/utils/soundEffects';
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
        speak(`Hadi ${nextColor.name} renkli balonları bulup patlatlım!`);

        // Generate initial batch of balloons
        const initialBalloons: Balloon[] = Array.from({ length: 8 }).map((_, i) => ({
            id: Date.now() + i,
            color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
            x: Math.random() * 80 + 10, // 10% to 90%
            duration: Math.random() * 3 + 4, // 4-7 seconds
            delay: Math.random() * 5,
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
                speakSuccess();
                setTimeout(startNewRound, 1500);
            }
        } else {
            speakTryAgain();
        }
    };

    // Keep adding balloons if they run low
    useEffect(() => {
        if (balloons.length < 5) {
            const newBalloon: Balloon = {
                id: Date.now(),
                color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
                x: Math.random() * 80 + 10,
                duration: Math.random() * 3 + 4,
                delay: 0,
            };
            setBalloons(prev => [...prev, newBalloon]);
        }
    }, [balloons]);

    return (
        <div className="relative w-full max-w-2xl mx-auto h-[70vh] bg-sky-50 rounded-[3rem] shadow-inner overflow-hidden border-8 border-white">
            {/* Score and Target UI */}
            <div className="absolute top-6 left-0 right-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm flex items-center gap-4 border-2 border-primary/20">
                    <span className="text-lg font-bold text-muted-foreground tracking-wide">PUAN: {score}</span>
                </div>

                <motion.div
                    key={targetColor.name}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-white px-8 py-3 rounded-3xl shadow-playful"
                >
                    <span className="text-xl font-black text-foreground">{targetColor.name}</span>
                    <div
                        className="w-8 h-8 rounded-full shadow-inner animate-pulse"
                        style={{ backgroundColor: targetColor.value }}
                    />
                    <span className="text-xl font-black text-foreground">BALONLARI PATLAT!</span>
                </motion.div>
            </div>

            {/* Game Area */}
            <AnimatePresence>
                {balloons.map((balloon) => (
                    <motion.button
                        key={balloon.id}
                        onClick={() => handlePop(balloon)}
                        className="absolute cursor-pointer group"
                        initial={{ y: '110%', x: `${balloon.x}%` }}
                        animate={{ y: '-20%' }}
                        exit={{ scale: 2, opacity: 0 }}
                        transition={{
                            y: { duration: balloon.duration, delay: balloon.delay, ease: "linear" },
                            scale: { duration: 0.2 }
                        }}
                        onAnimationComplete={(definition) => {
                            // If it reaches the top (y: -20%), remove it
                            if (typeof definition === 'object' && 'y' in definition && definition.y === '-20%') {
                                setBalloons(prev => prev.filter(b => b.id !== balloon.id));
                            }
                        }}
                        style={{ left: 0 }}
                    >
                        <div className="relative group-active:scale-90 transition-transform">
                            {/* Balloon Body */}
                            <div
                                className="w-16 h-20 md:w-20 md:h-24 rounded-[50%_50%_50%_50%/40%_40%_60%_60%] relative shadow-lg"
                                style={{ backgroundColor: balloon.color.value }}
                            >
                                {/* Shine effect */}
                                <div className="absolute top-3 left-4 w-4 h-6 bg-white/30 rounded-full rotate-12" />
                            </div>
                            {/* Balloon String */}
                            <div className="w-1 h-12 bg-gray-400/30 mx-auto -mt-1 rounded-full" />
                        </div>
                    </motion.button>
                ))}
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
