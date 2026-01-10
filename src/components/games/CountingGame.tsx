'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';
import { getNextRandomIndex, getNextRandom, shuffleArray } from '@/utils/shuffle';

const ITEMS = ['🍎', '⭐️', '🚗', '🐱', '🍦', '🎈'];

const CountingGame = () => {
    const [count, setCount] = useState(1);
    const [emoji, setEmoji] = useState('🍎');
    const [options, setOptions] = useState<number[]>([]);
    const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCountRef = useRef<number | null>(null);
    const lastEmojiRef = useRef<string | null>(null);

    const setupRound = useCallback(() => {
        // 1 ile 10 arasında rastgele bir sayı seç
        const newCount = getNextRandomIndex(10, lastCountRef.current === null ? null : lastCountRef.current - 1) + 1;
        const newEmoji = getNextRandom(ITEMS, lastEmojiRef.current);

        lastCountRef.current = newCount;
        lastEmojiRef.current = newEmoji;

        setCount(newCount);
        setEmoji(newEmoji);

        // Doğru cevaba yakın şıklar üret (±3 aralığında)
        const ops = new Set<number>();
        ops.add(newCount);

        while (ops.size < 3) {
            const offset = Math.floor(Math.random() * 7) - 3; // -3 ile +3 arası
            const option = Math.max(1, Math.min(12, newCount + offset));
            if (option !== newCount) {
                ops.add(option);
            }
        }

        setOptions(shuffleArray(Array.from(ops)));
    }, []);

    useEffect(() => {
        setupRound();
        return () => {
            if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
        };
    }, [setupRound]);

    const handleGuess = (guess: number) => {
        if (guess === count) {
            playPopSound();
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            playSuccessSound();
            if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
            nextRoundTimeoutRef.current = setTimeout(setupRound, 2000);
        } else {
            playErrorSound();
        }
    };

    return (
        <motion.div
            className="flex flex-col items-center gap-8 p-4 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-foreground mb-2">Sayma Oyunu</h2>
                <p className="text-muted-foreground font-semibold">Ekranda kaç tane nesne görüyorsun?</p>
            </div>

            <div className="card-playful p-10 w-full flex flex-wrap justify-center items-center gap-6 min-h-[250px] bg-card/50 backdrop-blur-sm">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${count}-${emoji}`}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 justify-items-center"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                    >
                        {Array.from({ length: count }).map((_, i) => (
                            <motion.span
                                key={i}
                                className="text-6xl md:text-7xl drop-shadow-sm"
                                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20,
                                    delay: i * 0.05
                                }}
                            >
                                {emoji}
                            </motion.span>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex gap-4">
                {options.map((option) => (
                    <button
                        key={option}
                        onClick={() => handleGuess(option)}
                        className="w-20 h-20 bg-secondary text-secondary-foreground text-3xl font-black rounded-3xl shadow-playful hover:scale-110 active:scale-90 transition-all border-b-8 border-yellow-600"
                    >
                        {option}
                    </button>
                ))}
            </div>
        </motion.div>
    );
};

export default CountingGame;
