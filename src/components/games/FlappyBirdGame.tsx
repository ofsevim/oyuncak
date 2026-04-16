'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playPopSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const GAME_WIDTH = 320;
const GAME_HEIGHT = 500;
const BIRD_SIZE = 36;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 1800;

interface Pipe {
    id: number;
    x: number;
    topHeight: number;
    passed: boolean;
}

const FlappyBirdGame: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'success'>('start');
    const [score, setScore] = useState(0);
    const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
    const [birdVelocity, setBirdVelocity] = useState(0);
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [highScore, setHighScore] = useState(() => getHighScore('flappybird'));
    const [birdRotation, setBirdRotation] = useState(0);
    const gameLoopRef = useRef<number | null>(null);
    const pipeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pipeIdRef = useRef(0);
    const birdYRef = useRef(GAME_HEIGHT / 2);
    const birdVelocityRef = useRef(0);
    const { clearAllTimeouts } = useSafeTimeouts();

    const startGame = useCallback(() => {
        setGamePhase('playing');
        setScore(0);
        setBirdY(GAME_HEIGHT / 2);
        setBirdVelocity(0);
        setPipes([]);
        setIsNewRecord(false);
        setBirdRotation(0);
        pipeIdRef.current = 0;
        birdYRef.current = GAME_HEIGHT / 2;
        birdVelocityRef.current = 0;
    }, []);

    const jump = useCallback(() => {
        if (gamePhase !== 'playing') return;
        playPopSound();
        birdVelocityRef.current = JUMP_FORCE;
        setBirdVelocity(JUMP_FORCE);
    }, [gamePhase]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                jump();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gamePhase, jump]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        gameLoopRef.current = window.setInterval(() => {
            birdVelocityRef.current += GRAVITY;
            birdYRef.current += birdVelocityRef.current;

            const rotation = Math.min(Math.max(birdVelocityRef.current * 3, -30), 90);
            setBirdRotation(rotation);
            setBirdY(birdYRef.current);
            setBirdVelocity(birdVelocityRef.current);

            // Check boundaries
            if (birdYRef.current < 0 || birdYRef.current + BIRD_SIZE > GAME_HEIGHT) {
                endGame();
                return;
            }

            setPipes(prev => {
                const updated = prev
                    .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
                    .filter(pipe => pipe.x + PIPE_WIDTH > 0);

                for (const pipe of updated) {
                    const birdLeft = 50;
                    const birdRight = birdLeft + BIRD_SIZE;
                    const birdTop = birdYRef.current;
                    const birdBottom = birdTop + BIRD_SIZE;

                    const pipeLeft = pipe.x;
                    const pipeRight = pipe.x + PIPE_WIDTH;

                    if (birdRight > pipeLeft && birdLeft < pipeRight) {
                        if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
                            endGame();
                            return updated;
                        }
                    }

                    if (!pipe.passed && pipe.x + PIPE_WIDTH < birdLeft) {
                        pipe.passed = true;
                        playSuccessSound();
                        setScore(prev => prev + 1);
                    }
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

        pipeTimerRef.current = setInterval(() => {
            const minHeight = 60;
            const maxHeight = GAME_HEIGHT - PIPE_GAP - minHeight;
            const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;

            setPipes(prev => [
                ...prev,
                { id: pipeIdRef.current++, x: GAME_WIDTH, topHeight, passed: false }
            ]);
        }, PIPE_INTERVAL);

        return () => {
            if (pipeTimerRef.current) clearInterval(pipeTimerRef.current);
        };
    }, [gamePhase]);

    const endGame = useCallback(() => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (pipeTimerRef.current) clearInterval(pipeTimerRef.current);

        setGamePhase('success');
        const isNew = saveHighScoreObj('flappybird', score);
        if (isNew) {
            setIsNewRecord(true);
            playNewRecordSound();
            fireConfetti();
        }
        setHighScore(getHighScore('flappybird'));
    }, [score]);

    useEffect(() => {
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (pipeTimerRef.current) clearInterval(pipeTimerRef.current);
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
                        <div className="text-6xl">🐦</div>
                        <h2 className="text-2xl font-black text-foreground">Flappy Bird</h2>
                        <p className="text-muted-foreground text-center">
                            Boşluk tuşuna veya ekrana tıkla, engellerden geç!
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
                        <div className="glass-card px-4 py-2 border border-yellow-500/20">
                            <span className="text-lg font-black text-yellow-400">⭐ {score}</span>
                        </div>

                        <div
                            className="relative overflow-hidden rounded-2xl cursor-pointer"
                            style={{
                                width: GAME_WIDTH,
                                height: GAME_HEIGHT,
                                background: 'linear-gradient(to bottom, #87CEEB, #98D8C8)',
                            }}
                            onClick={jump}
                            onTouchStart={(e) => { e.preventDefault(); jump(); }}
                        >
                            {/* Clouds */}
                            <div className="absolute text-4xl" style={{ top: 40, left: 30, opacity: 0.6 }}>☁️</div>
                            <div className="absolute text-3xl" style={{ top: 80, left: 180, opacity: 0.5 }}>☁️</div>
                            <div className="absolute text-4xl" style={{ top: 120, left: 80, opacity: 0.4 }}>☁️</div>

                            {/* Ground */}
                            <div
                                className="absolute bottom-0 left-0 w-full h-12"
                                style={{ background: 'linear-gradient(to bottom, #8B4513, #654321)' }}
                            />
                            <div
                                className="absolute bottom-10 left-0 w-full h-4"
                                style={{ background: '#228B22' }}
                            />

                            {/* Pipes */}
                            {pipes.map(pipe => (
                                <div key={pipe.id}>
                                    {/* Top pipe */}
                                    <div
                                        className="absolute rounded-b-lg"
                                        style={{
                                            left: pipe.x,
                                            top: 0,
                                            width: PIPE_WIDTH,
                                            height: pipe.topHeight,
                                            background: 'linear-gradient(to right, #228B22, #2E8B57, #228B22)',
                                            border: '3px solid #1a6b1a',
                                        }}
                                    >
                                        <div
                                            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded"
                                            style={{
                                                width: PIPE_WIDTH + 10,
                                                height: 20,
                                                background: 'linear-gradient(to right, #228B22, #2E8B57, #228B22)',
                                                border: '3px solid #1a6b1a',
                                            }}
                                        />
                                    </div>
                                    {/* Bottom pipe */}
                                    <div
                                        className="absolute rounded-t-lg"
                                        style={{
                                            left: pipe.x,
                                            top: pipe.topHeight + PIPE_GAP,
                                            width: PIPE_WIDTH,
                                            height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP,
                                            background: 'linear-gradient(to right, #228B22, #2E8B57, #228B22)',
                                            border: '3px solid #1a6b1a',
                                        }}
                                    >
                                        <div
                                            className="absolute top-0 left-1/2 -translate-x-1/2 rounded"
                                            style={{
                                                width: PIPE_WIDTH + 10,
                                                height: 20,
                                                background: 'linear-gradient(to right, #228B22, #2E8B57, #228B22)',
                                                border: '3px solid #1a6b1a',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Bird */}
                            <motion.div
                                className="absolute text-4xl"
                                style={{
                                    left: 50,
                                    top: birdY,
                                    width: BIRD_SIZE,
                                    height: BIRD_SIZE,
                                    transform: `rotate(${birdRotation}deg)`,
                                }}
                                transition={{ duration: 0.05 }}
                            >
                                🐦
                            </motion.div>
                        </div>

                        <p className="text-xs text-muted-foreground">Ekrana tıkla veya boşluk tuşuna bas</p>
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
                            😵
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
                        <Leaderboard gameId="flappybird" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlappyBirdGame;