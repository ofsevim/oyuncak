'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playPopSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const GAME_WIDTH = 340;
const GAME_HEIGHT = 500;
const GRAVITY = 0.35;
const SPAWN_INTERVAL = 800;
const GAME_DURATION = 60;

interface Fruit {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: string;
    emoji: string;
    sliced: boolean;
    sliceY?: number;
}

interface SlashTrail {
    id: number;
    x: number;
    y: number;
}

const FRUITS = [
    { type: 'apple', emoji: '🍎', points: 1 },
    { type: 'orange', emoji: '🍊', points: 1 },
    { type: 'watermelon', emoji: '🍉', points: 2 },
    { type: 'grape', emoji: '🍇', points: 1 },
    { type: 'banana', emoji: '🍌', points: 1 },
    { type: 'strawberry', emoji: '🍓', points: 1 },
    { type: 'peach', emoji: '🍑', points: 1 },
    { type: 'pineapple', emoji: '🍍', points: 2 },
    { type: 'coconut', emoji: '🥥', points: 1 },
    { type: 'kiwi', emoji: '🥝', points: 1 },
];

const FruitNinjaGame: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'success'>('start');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [fruits, setFruits] = useState<Fruit[]>([]);
    const [slashes, setSlashes] = useState<SlashTrail[]>([]);
    const [combo, setCombo] = useState(0);
    const [comboText, setComboText] = useState('');
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [highScore, setHighScore] = useState(() => getHighScore('fruitninja'));
    const [lives, setLives] = useState(3);
    const [missedFruits, setMissedFruits] = useState(0);
    const gameLoopRef = useRef<number | null>(null);
    const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fruitIdRef = useRef(0);
    const slashIdRef = useRef(0);
    const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSlicingRef = useRef(false);
    const lastSliceRef = useRef({ x: 0, y: 0 });
    const { clearAllTimeouts, safeTimeout } = useSafeTimeouts();

    const startGame = useCallback(() => {
        setGamePhase('playing');
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setFruits([]);
        setSlashes([]);
        setCombo(0);
        setComboText('');
        setIsNewRecord(false);
        setLives(3);
        setMissedFruits(0);
        fruitIdRef.current = 0;
        slashIdRef.current = 0;
    }, []);

    const spawnFruit = useCallback(() => {
        const fruitData = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        const x = Math.random() * (GAME_WIDTH - 60) + 30;
        const vx = (Math.random() - 0.5) * 4;
        const vy = -(Math.random() * 4 + 8);

        setFruits(prev => [
            ...prev,
            {
                id: fruitIdRef.current++,
                x,
                y: GAME_HEIGHT + 30,
                vx,
                vy,
                type: fruitData.type,
                emoji: fruitData.emoji,
                sliced: false,
            }
        ]);
    }, []);

    const sliceFruit = useCallback((fruit: Fruit, clientX: number, clientY: number) => {
        if (fruit.sliced) return;

        playPopSound();
        const fruitData = FRUITS.find(f => f.type === fruit.type);
        const points = fruitData?.points || 1;

        setFruits(prev =>
            prev.map(f =>
                f.id === fruit.id ? { ...f, sliced: true, sliceY: f.y } : f
            )
        );

        setCombo(prev => {
            const newCombo = prev + 1;
            if (newCombo >= 5) {
                setComboText('🔥 SÜPER!');
                playSuccessSound();
            } else if (newCombo >= 3) {
                setComboText('⚡ COMBO!');
            }
            return newCombo;
        });

        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => {
            setCombo(0);
            setComboText('');
        }, 1000);

        setScore(prev => prev + points * (combo + 1));

        setSlashes(prev => [
            ...prev.slice(-5),
            { id: slashIdRef.current++, x: clientX, y: clientY }
        ]);

        safeTimeout(() => {
            setSlashes(prev => prev.filter(s => s.id !== slashIdRef.current - 6));
        }, 300);
    }, [combo, safeTimeout]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (gamePhase !== 'playing') return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isSlicingRef.current) {
            const dx = x - lastSliceRef.current.x;
            const dy = y - lastSliceRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                setFruits(prev => {
                    for (const fruit of prev) {
                        if (fruit.sliced) continue;
                        const fx = fruit.x;
                        const fy = fruit.y;
                        const fruitDist = Math.sqrt((fx - x) ** 2 + (fy - y) ** 2);
                        if (fruitDist < 40) {
                            sliceFruit(fruit, e.clientX - rect.left, e.clientY - rect.top);
                            break;
                        }
                    }
                    return prev;
                });
            }
        }

        lastSliceRef.current = { x, y };
        isSlicingRef.current = true;
    }, [gamePhase, sliceFruit]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        isSlicingRef.current = true;
        const rect = e.currentTarget.getBoundingClientRect();
        lastSliceRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    const handlePointerUp = useCallback(() => {
        isSlicingRef.current = false;
    }, []);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        gameLoopRef.current = window.setInterval(() => {
            setFruits(prev => {
                const updated: Fruit[] = [];
                for (const fruit of prev) {
                    const newY = fruit.y + fruit.vy;
                    const newX = fruit.x + fruit.vx;
                    const newVy = fruit.vy + GRAVITY;

                    if (newY > GAME_HEIGHT + 50) {
                        if (!fruit.sliced) {
                            setMissedFruits(m => {
                                const newMissed = m + 1;
                                if (newMissed % 3 === 0) {
                                    setLives(l => {
                                        if (l <= 1) {
                                            endGame();
                                            return 0;
                                        }
                                        return l - 1;
                                    });
                                }
                                return newMissed;
                            });
                        }
                        continue;
                    }

                    updated.push({
                        ...fruit,
                        x: newX,
                        y: newY,
                        vy: newVy,
                    });
                }
                return updated;
            });
        }, 1000 / 60);

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gamePhase]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        spawnTimerRef.current = setInterval(spawnFruit, SPAWN_INTERVAL);

        return () => {
            if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        };
    }, [gamePhase, spawnFruit]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gamePhase]);

    const endGame = useCallback(() => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        if (timerRef.current) clearInterval(timerRef.current);

        setGamePhase('success');
        const isNew = saveHighScoreObj('fruitninja', score);
        if (isNew) {
            setIsNewRecord(true);
            playNewRecordSound();
            fireConfetti();
        }
        setHighScore(getHighScore('fruitninja'));
    }, [score]);

    useEffect(() => {
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            clearAllTimeouts();
        };
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
                        <div className="text-6xl">🍉</div>
                        <h2 className="text-2xl font-black text-foreground">Meyve Ninja</h2>
                        <p className="text-muted-foreground text-center">
                            Meyveleri kes, kombo yap, yüksek skor kazan!
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
                        className="w-full flex flex-col items-center gap-4 py-4"
                    >
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="glass-card px-3 py-1 border border-yellow-500/20">
                                <span className="text-sm font-black text-yellow-400">⭐ {score}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-red-500/20">
                                <span className="text-sm font-black text-red-400">❤️ {lives}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-blue-500/20">
                                <span className={`text-sm font-black ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                                    ⏱️ {timeLeft}s
                                </span>
                            </div>
                        </div>

                        <div
                            className="relative overflow-hidden rounded-2xl cursor-crosshair touch-none"
                            style={{
                                width: GAME_WIDTH,
                                height: GAME_HEIGHT,
                                background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
                            }}
                            onPointerMove={handlePointerMove}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        >
                            {/* Background decorations */}
                            <div className="absolute inset-0 opacity-10">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-1 h-1 bg-white rounded-full"
                                        style={{
                                            left: Math.random() * 100 + '%',
                                            top: Math.random() * 100 + '%',
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Fruits */}
                            {fruits.map(fruit => (
                                <motion.div
                                    key={fruit.id}
                                    className="absolute flex items-center justify-center"
                                    style={{
                                        left: fruit.x - 25,
                                        top: fruit.sliced ? fruit.sliceY : fruit.y - 25,
                                        width: 50,
                                        height: 50,
                                        fontSize: '2rem',
                                    }}
                                    animate={
                                        fruit.sliced
                                            ? { opacity: [1, 0], scale: [1, 1.5], y: [0, 30] }
                                            : {}
                                    }
                                    transition={{ duration: 0.3 }}
                                >
                                    {fruit.sliced ? (
                                        <div className="flex gap-1">
                                            <span style={{ transform: 'rotate(-20deg)' }}>{fruit.emoji}</span>
                                            <span style={{ transform: 'rotate(20deg)' }}>{fruit.emoji}</span>
                                        </div>
                                    ) : (
                                        <span>{fruit.emoji}</span>
                                    )}
                                </motion.div>
                            ))}

                            {/* Slash trails */}
                            {slashes.map(slash => (
                                <motion.div
                                    key={slash.id}
                                    className="absolute w-8 h-8 rounded-full bg-white/30 pointer-events-none"
                                    style={{
                                        left: slash.x - 16,
                                        top: slash.y - 16,
                                    }}
                                    initial={{ scale: 1, opacity: 0.6 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                />
                            ))}

                            {/* Combo text */}
                            <AnimatePresence>
                                {comboText && (
                                    <motion.div
                                        className="absolute top-1/3 left-1/2 -translate-x-1/2 text-3xl font-black text-yellow-400 pointer-events-none"
                                        style={{ textShadow: '0 0 20px rgba(250,204,21,0.5)' }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
                                        exit={{ scale: 0, opacity: 0 }}
                                    >
                                        {comboText}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Combo counter */}
                            {combo > 1 && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card px-3 py-1 rounded-full">
                                    <span className="text-sm font-black text-orange-400">x{combo}</span>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">Meyveleri kesmek için parmağını kaydır</p>
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
                        <h2 className="text-2xl font-black text-foreground">Oyun Bitti!</h2>
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
                        <Leaderboard gameId="fruitninja" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FruitNinjaGame;