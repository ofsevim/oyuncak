'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '@/utils/voiceFeedback';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

const ITEMS = ['🍎', '⭐️', '🚗', '🐱', '🍦', '🎈'];

const CountingGame = () => {
    const [count, setCount] = useState(1);
    const [emoji, setEmoji] = useState('🍎');
    const [options, setOptions] = useState<number[]>([]);

    const setupRound = () => {
        const newCount = Math.floor(Math.random() * 5) + 1;
        const newEmoji = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        setCount(newCount);
        setEmoji(newEmoji);

        // Generate options close to the correct answer (within ±2 range)
        const ops = new Set<number>();
        ops.add(newCount);
        while (ops.size < 3) {
            // Generate numbers within ±2 of correct answer, but stay in 1-7 range
            const offset = Math.floor(Math.random() * 5) - 2; // -2 to +2
            const option = Math.max(1, Math.min(7, newCount + offset));
            if (option !== newCount) {
                ops.add(option);
            }
        }
        // If we couldn't get 3 unique options, add nearby numbers
        if (ops.size < 3) {
            for (let i = 1; i <= 7 && ops.size < 3; i++) {
                ops.add(i);
            }
        }
        setOptions(Array.from(ops).sort((a, b) => a - b));

        speak(`Burada kaç tane ${newEmoji} var? Hadi sayalım!`);
    };

    useEffect(() => {
        setupRound();
    }, []);

    const handleGuess = (guess: number) => {
        if (guess === count) {
            playPopSound();
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            playSuccessSound();
            setTimeout(setupRound, 2000);
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

            <div className="card-playful p-10 w-full flex flex-wrap justify-center items-center gap-6 min-h-[200px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${count}-${emoji}`}
                        className="flex flex-wrap justify-center gap-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                    >
                        {Array.from({ length: count }).map((_, i) => (
                            <motion.span
                                key={i}
                                className="text-7xl"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
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
