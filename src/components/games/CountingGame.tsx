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
        // 1 ile 10 arasında rastgele bir sayı seç (eskiden 1-5 idi)
        const newCount = Math.floor(Math.random() * 10) + 1;
        const newEmoji = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        setCount(newCount);
        setEmoji(newEmoji);

        // Doğru cevaba yakın şıklar üret (±3 aralığında)
        const ops = new Set<number>();
        ops.add(newCount);
        
        while (ops.size < 3) {
            // Doğru cevabın çevresinden sayılar seç, ama 1-12 aralığında kalsın
            const offset = Math.floor(Math.random() * 7) - 3; // -3 ile +3 arası
            const option = Math.max(1, Math.min(12, newCount + offset));
            if (option !== newCount) {
                ops.add(option);
            }
        }

        // Eğer hala 3 seçenek yoksa (nadiren olur), 1'den başlayarak doldur
        if (ops.size < 3) {
            for (let i = 1; i <= 12 && ops.size < 3; i++) {
                if (i !== newCount) ops.add(i);
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

            <div className="card-playful p-10 w-full flex flex-wrap justify-center items-center gap-6 min-h-[250px] bg-white/50 backdrop-blur-sm">
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
