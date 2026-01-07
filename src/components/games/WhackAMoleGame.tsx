'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import { speak } from '@/utils/voiceFeedback';

const GAME_TIME = 30;
const HOLES_COUNT = 9;
const MOLE_TYPES = [
    { emoji: '🐹', points: 1, name: 'Köstebek' },
    { emoji: '🐰', points: 2, name: 'Tavşan' },
    { emoji: '🦊', points: 5, name: 'Tilki' },
];

const WhackAMoleGame = () => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [activeHole, setActiveHole] = useState<number | null>(null);
    const [moleType, setMoleType] = useState(MOLE_TYPES[0]);
    const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start');
    const [showSuccess, setShowSuccess] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const moleRef = useRef<NodeJS.Timeout | null>(null);

    const spawnMole = useCallback(() => {
        if (gamePhase !== 'playing') return;

        // Mevcut timeoutları temizle
        if (moleRef.current) clearTimeout(moleRef.current);

        const randomHole = Math.floor(Math.random() * HOLES_COUNT);
        const randomType = MOLE_TYPES[Math.random() < 0.1 ? 2 : Math.random() < 0.3 ? 1 : 0];

        setActiveHole(randomHole);
        setMoleType(randomType);

        // Puan arttıkça hızlanan süre (min 600ms, max 1500ms)
        const duration = Math.max(600, 1500 - (score * 25));

        moleRef.current = setTimeout(() => {
            setActiveHole(null);
            // Köstebek kaçtığında yeni bir tane çıkar (oyun devam ediyorsa)
            const nextDelay = Math.random() * 400 + 200;
            moleRef.current = setTimeout(spawnMole, nextDelay);
        }, duration);
    }, [score, gamePhase]);

    // Oyun başladığında veya bittiğinde köstebek üretimini kontrol et
    useEffect(() => {
        if (gamePhase === 'playing') {
            const initialTimeout = setTimeout(spawnMole, 500);
            return () => {
                clearTimeout(initialTimeout);
                if (moleRef.current) clearTimeout(moleRef.current);
            };
        } else {
            setActiveHole(null);
            if (moleRef.current) clearTimeout(moleRef.current);
        }
    }, [gamePhase, spawnMole]);

    const startGame = useCallback(() => {
        setScore(0);
        setTimeLeft(GAME_TIME);
        setGamePhase('playing');
        setShowSuccess(false);
        speak('Hadi köstebekleri yakalayalım!');
    }, []);

    useEffect(() => {
        if (gamePhase === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setGamePhase('ended');
                        setShowSuccess(true);
                        if (timerRef.current) clearInterval(timerRef.current);
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

    const handleWhack = (index: number) => {
        if (index === activeHole && gamePhase === 'playing') {
            playPopSound();
            setScore(prev => prev + moleType.points);
            setActiveHole(null);
            
            if (moleRef.current) clearTimeout(moleRef.current);
            
            // Başarılı vuruştan sonra kısa bir ara verip yenisini çıkar
            const nextDelay = Math.random() * 200 + 100;
            moleRef.current = setTimeout(spawnMole, nextDelay);
        }
    };

    if (gamePhase === 'start') {
        return (
            <div className="flex flex-col items-center gap-8 p-8 text-center">
                <span className="text-8xl animate-bounce">🐹</span>
                <h2 className="text-4xl font-black text-foreground">Köstebek Yakala!</h2>
                <p className="text-xl text-muted-foreground font-semibold">
                    Deliklerden çıkan sevimli hayvanlara tıkla ve puanları topla!
                </p>
                <button
                    onClick={startGame}
                    className="px-12 py-5 bg-primary text-white text-2xl font-black rounded-full shadow-lg btn-bouncy"
                >
                    BAŞLA!
                </button>
            </div>
        );
    }

    return (
        <motion.div
            className="flex flex-col items-center gap-6 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex gap-4 items-center">
                <div className="bg-white px-6 py-2 rounded-full shadow-playful border-2 border-primary/20">
                    <span className="text-2xl font-black text-primary">Score: {score}</span>
                </div>
                <div className="bg-white px-6 py-2 rounded-full shadow-playful border-2 border-orange-200">
                    <span className="text-2xl font-black text-orange-500">⏱️ {timeLeft}s</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-6 bg-amber-900/20 rounded-[3rem] shadow-inner border-8 border-amber-900/10">
                {Array.from({ length: HOLES_COUNT }).map((_, i) => (
                    <div
                        key={i}
                        className="relative w-24 h-24 md:w-32 md:h-32 bg-amber-950 rounded-full overflow-hidden shadow-inner flex items-center justify-center"
                    >
                        <div className="absolute bottom-0 w-full h-1/2 bg-amber-900/40 rounded-full blur-sm" />
                        <AnimatePresence>
                            {activeHole === i && (
                                <motion.button
                                    initial={{ y: 100 }}
                                    animate={{ y: 0 }}
                                    exit={{ y: 100 }}
                                    onClick={() => handleWhack(i)}
                                    className="text-5xl md:text-7xl cursor-pointer z-10 select-none"
                                >
                                    {moleType.emoji}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            <button
                onClick={() => setGamePhase('start')}
                className="px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold btn-bouncy"
            >
                Vazgeç
            </button>

            <SuccessPopup
                isOpen={showSuccess}
                onClose={() => setGamePhase('start')}
                message={`${score} puan topladın! Harikasın!`}
            />
        </motion.div>
    );
};

export default WhackAMoleGame;
