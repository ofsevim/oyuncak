'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playPopSound, playLevelUpSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const COLORS = [
    { name: 'Kırmızı', hex: '#ef4444', emoji: '🔴' },
    { name: 'Mavi', hex: '#3b82f6', emoji: '🔵' },
    { name: 'Yeşil', hex: '#22c55e', emoji: '🟢' },
    { name: 'Sarı', hex: '#eab308', emoji: '🟡' },
    { name: 'Mor', hex: '#a855f7', emoji: '🟣' },
    { name: 'Turuncu', hex: '#f97316', emoji: '🟠' },
    { name: 'Pembe', hex: '#ec4899', emoji: '🩷' },
    { name: 'Kahverengi', hex: '#a16207', emoji: '🟤' },
];

const ColorMatchGame: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'success'>('start');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [highScore, setHighScore] = useState(() => getHighScore('colormatch'));
    const [currentColor, setCurrentColor] = useState(COLORS[0]);
    const [options, setOptions] = useState<typeof COLORS>([]);
    const [streak, setStreak] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { clearAllTimeouts, safeTimeout } = useSafeTimeouts();

    const generateQuestion = useCallback(() => {
        const correctColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setCurrentColor(correctColor);

        const wrongColors = COLORS.filter(c => c.hex !== correctColor.hex);
        const shuffledWrong = wrongColors.sort(() => Math.random() - 0.5).slice(0, 3);
        const allOptions = [...shuffledWrong, correctColor].sort(() => Math.random() - 0.5);
        setOptions(allOptions);
    }, []);

    const startGame = useCallback(() => {
        setGamePhase('playing');
        setScore(0);
        setStreak(0);
        setTimeLeft(60);
        setIsNewRecord(false);
        setFeedback(null);
        generateQuestion();
    }, [generateQuestion]);

    const handleAnswer = useCallback((selected: typeof COLORS[0]) => {
        if (gamePhase !== 'playing' || feedback) return;

        if (selected.hex === currentColor.hex) {
            playSuccessSound();
            const newStreak = streak + 1;
            const points = 10 + Math.floor(newStreak / 3) * 5;
            setScore(prev => prev + points);
            setStreak(newStreak);
            setFeedback('correct');
            safeTimeout(() => {
                setFeedback(null);
                generateQuestion();
            }, 400);
        } else {
            playPopSound();
            setStreak(0);
            setFeedback('wrong');
            safeTimeout(() => {
                setFeedback(null);
                generateQuestion();
            }, 600);
        }
    }, [gamePhase, feedback, currentColor, streak, generateQuestion, safeTimeout]);

    useEffect(() => {
        if (gamePhase === 'playing' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setGamePhase('success');
                        const isNew = saveHighScoreObj('colormatch', score);
                        if (isNew) {
                            setIsNewRecord(true);
                            playNewRecordSound();
                            fireConfetti();
                        }
                        setHighScore(getHighScore('colormatch'));
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gamePhase, timeLeft, score]);

    useEffect(() => {
        return () => clearAllTimeouts();
    }, [clearAllTimeouts]);

    return (
        <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4 select-none">
            <AnimatePresence mode="wait">
                {gamePhase === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center gap-6 py-8"
                    >
                        <div className="text-6xl">🎨</div>
                        <h2 className="text-2xl font-black text-foreground">Renk Eşleştirme</h2>
                        <p className="text-muted-foreground text-center">
                            Yazılan rengi bul, doğru renge tıkla!
                        </p>
                        <div className="glass-card p-4 rounded-xl text-center">
                            <p className="text-sm text-muted-foreground">En Yüksek Skor</p>
                            <p className="text-2xl font-black text-primary">{highScore}</p>
                        </div>
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:scale-105 transition-transform"
                        >
                            Başla
                        </button>
                    </motion.div>
                )}

                {gamePhase === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full flex flex-col items-center gap-6 py-4"
                    >
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="glass-card px-3 py-1 border border-yellow-500/20">
                                <span className="text-sm font-black text-yellow-400">⭐ {score}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-purple-500/20">
                                <span className="text-sm font-black text-purple-400">🔥 {streak}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-orange-500/20">
                                <span className={`text-sm font-black ${timeLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                                    ⏱️ {timeLeft}s
                                </span>
                            </div>
                        </div>

                        <motion.div
                            className="glass-card p-6 rounded-2xl text-center"
                            animate={feedback === 'correct' ? { scale: [1, 1.1, 1], borderColor: '#22c55e' } : feedback === 'wrong' ? { x: [-8, 8, -8, 8, 0], borderColor: '#ef4444' } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            <p className="text-3xl font-black mb-2" style={{ color: currentColor.hex }}>
                                {currentColor.name}
                            </p>
                            <p className="text-sm text-muted-foreground">Bu rengi bul!</p>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            {options.map((color, i) => (
                                <motion.button
                                    key={`${color.hex}-${i}`}
                                    onClick={() => handleAnswer(color)}
                                    className="p-6 rounded-2xl font-bold text-lg text-white transition-all"
                                    style={{
                                        background: color.hex,
                                        boxShadow: `0 4px 20px ${color.hex}40`,
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    {color.emoji}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {gamePhase === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-6 py-8"
                    >
                        <motion.div
                            className="text-7xl"
                            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5 }}
                        >
                            🎉
                        </motion.div>
                        <h2 className="text-2xl font-black text-foreground">Tebrikler!</h2>
                        <div className="glass-card p-6 rounded-2xl text-center space-y-3">
                            <p className="text-sm text-muted-foreground">Skorun</p>
                            <p className="text-4xl font-black text-primary">{score}</p>
                            {isNewRecord && (
                                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-yellow-400 font-bold">
                                    🏆 Yeni Rekor!
                                </motion.p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={startGame} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-transform">
                                Tekrar Oyna
                            </button>
                            <button onClick={() => setGamePhase('start')} className="px-6 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:scale-105 transition-transform">
                                Menü
                            </button>
                        </div>
                        <Leaderboard gameId="colormatch" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ColorMatchGame;