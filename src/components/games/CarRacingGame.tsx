'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playPopSound, playLevelUpSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const LANE_COUNT = 3;
const ROAD_WIDTH = 300;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 80;
const INITIAL_SPEED = 4;
const SPEED_INCREMENT = 0.3;
const OBSTACLE_INTERVAL = 1500;

interface Obstacle {
    id: number;
    lane: number;
    y: number;
    type: 'car' | 'truck' | 'cone';
    color: string;
}

const OBSTACLE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
const OBSTACLE_TYPES: Array<'car' | 'truck' | 'cone'> = ['car', 'truck', 'cone'];

const CarRacingGame: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'success'>('start');
    const [score, setScore] = useState(0);
    const [distance, setDistance] = useState(0);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [playerLane, setPlayerLane] = useState(1);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [highScore, setHighScore] = useState(() => getHighScore('carracing'));
    const [roadOffset, setRoadOffset] = useState(0);
    const [lives, setLives] = useState(3);
    const [invincible, setInvincible] = useState(false);
    const gameLoopRef = useRef<number | null>(null);
    const obstacleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const obstacleIdRef = useRef(0);
    const { clearAllTimeouts, safeTimeout } = useSafeTimeouts();

    const laneWidth = ROAD_WIDTH / LANE_COUNT;
    const playerX = playerLane * laneWidth + (laneWidth - CAR_WIDTH) / 2;

    const startGame = useCallback(() => {
        setGamePhase('playing');
        setScore(0);
        setDistance(0);
        setSpeed(INITIAL_SPEED);
        setPlayerLane(1);
        setObstacles([]);
        setIsNewRecord(false);
        setRoadOffset(0);
        setLives(3);
        setInvincible(false);
        obstacleIdRef.current = 0;
    }, []);

    const handleCollision = useCallback(() => {
        if (invincible) return;
        playPopSound();
        setLives(prev => {
            if (prev <= 1) {
                setGamePhase('success');
                const finalScore = score + Math.floor(distance / 10);
                const isNew = saveHighScoreObj('carracing', finalScore);
                if (isNew) {
                    setIsNewRecord(true);
                    playNewRecordSound();
                    fireConfetti();
                }
                setHighScore(getHighScore('carracing'));
                return 0;
            }
            return prev - 1;
        });
        setInvincible(true);
        safeTimeout(() => setInvincible(false), 1500);
    }, [invincible, score, distance, safeTimeout]);

    const movePlayer = useCallback((direction: 'left' | 'right') => {
        if (gamePhase !== 'playing') return;
        setPlayerLane(prev => {
            if (direction === 'left' && prev > 0) return prev - 1;
            if (direction === 'right' && prev < LANE_COUNT - 1) return prev + 1;
            return prev;
        });
    }, [gamePhase]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer('left');
            if (e.key === 'ArrowRight' || e.key === 'd') movePlayer('right');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gamePhase, movePlayer]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        gameLoopRef.current = window.setInterval(() => {
            setRoadOffset(prev => (prev + speed) % 40);
            setDistance(prev => prev + speed);
            setSpeed(prev => Math.min(prev + SPEED_INCREMENT * 0.01, 12));

            setObstacles(prev => {
                const updated = prev
                    .map(obs => ({ ...obs, y: obs.y + speed }))
                    .filter(obs => obs.y < 600);

                const playerY = 400;
                const playerLeft = playerLane * laneWidth + (laneWidth - CAR_WIDTH) / 2;
                const playerRight = playerLeft + CAR_WIDTH;
                const playerTop = playerY;
                const playerBottom = playerY + CAR_HEIGHT;

                for (const obs of updated) {
                    const obsLeft = obs.lane * laneWidth + (laneWidth - OBSTACLE_WIDTH) / 2;
                    const obsRight = obsLeft + OBSTACLE_WIDTH;
                    const obsTop = obs.y;
                    const obsBottom = obs.y + OBSTACLE_HEIGHT;

                    if (
                        playerLeft < obsRight &&
                        playerRight > obsLeft &&
                        playerTop < obsBottom &&
                        playerBottom > obsTop
                    ) {
                        handleCollision();
                        return updated.filter(o => o.id !== obs.id);
                    }
                }

                return updated;
            });

            setScore(prev => prev + 1);
        }, 1000 / 60);

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gamePhase, speed, playerLane, handleCollision]);

    useEffect(() => {
        if (gamePhase !== 'playing') return;

        obstacleTimerRef.current = setInterval(() => {
            const lane = Math.floor(Math.random() * LANE_COUNT);
            const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
            const color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];

            setObstacles(prev => [
                ...prev,
                { id: obstacleIdRef.current++, lane, y: -OBSTACLE_HEIGHT, type, color }
            ]);
        }, OBSTACLE_INTERVAL);

        return () => {
            if (obstacleTimerRef.current) clearInterval(obstacleTimerRef.current);
        };
    }, [gamePhase]);

    useEffect(() => {
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (obstacleTimerRef.current) clearInterval(obstacleTimerRef.current);
            clearAllTimeouts();
        };
    }, [clearAllTimeouts]);

    const renderObstacle = (obs: Obstacle) => {
        const x = obs.lane * laneWidth + (laneWidth - OBSTACLE_WIDTH) / 2;
        const emojis: Record<string, string> = { car: '🚗', truck: '🚛', cone: '🔶' };
        return (
            <motion.div
                key={obs.id}
                className="absolute flex items-center justify-center text-3xl"
                style={{
                    left: x,
                    top: obs.y,
                    width: OBSTACLE_WIDTH,
                    height: OBSTACLE_HEIGHT,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {emojis[obs.type]}
            </motion.div>
        );
    };

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
                        <div className="text-6xl">🏎️</div>
                        <h2 className="text-2xl font-black text-foreground">Araba Yarışı</h2>
                        <p className="text-muted-foreground text-center">
                            Sol/Sağ ok tuşları ile şerit değiştir, engellerden kaç!
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
                                <span className="text-sm font-black text-yellow-400">⭐ {score + Math.floor(distance / 10)}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-red-500/20">
                                <span className="text-sm font-black text-red-400">❤️ {lives}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-blue-500/20">
                                <span className="text-sm font-black text-blue-400">🛣️ {Math.floor(distance / 10)}m</span>
                            </div>
                        </div>

                        <div
                            className="relative overflow-hidden rounded-2xl border-4 border-gray-700"
                            style={{
                                width: ROAD_WIDTH,
                                height: 500,
                                background: 'linear-gradient(to bottom, #374151, #1f2937)',
                            }}
                        >
                            {/* Road lines */}
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-1 bg-yellow-400"
                                    style={{
                                        left: laneWidth - 2,
                                        top: (i * 40 + roadOffset) % 540 - 40,
                                        height: 20,
                                    }}
                                />
                            ))}
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div
                                    key={`r${i}`}
                                    className="absolute w-1 bg-yellow-400"
                                    style={{
                                        left: laneWidth * 2 - 2,
                                        top: (i * 40 + roadOffset) % 540 - 40,
                                        height: 20,
                                    }}
                                />
                            ))}

                            {/* Road edges */}
                            <div className="absolute left-0 top-0 w-2 h-full bg-white/30" />
                            <div className="absolute right-0 top-0 w-2 h-full bg-white/30" />

                            {/* Obstacles */}
                            {obstacles.map(renderObstacle)}

                            {/* Player car */}
                            <motion.div
                                className="absolute flex items-center justify-center text-4xl"
                                style={{
                                    left: playerX,
                                    top: 400,
                                    width: CAR_WIDTH,
                                    height: CAR_HEIGHT,
                                }}
                                animate={{
                                    left: playerX,
                                    opacity: invincible ? [1, 0.3, 1] : 1,
                                }}
                                transition={{ duration: 0.1, opacity: { duration: 0.2, repeat: Infinity } }}
                            >
                                🏎️
                            </motion.div>
                        </div>

                        {/* Touch controls */}
                        <div className="flex gap-8 mt-2">
                            <button
                                onTouchStart={() => movePlayer('left')}
                                onClick={() => movePlayer('left')}
                                className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center text-3xl active:scale-90 transition-transform border border-border"
                            >
                                ◀️
                            </button>
                            <button
                                onTouchStart={() => movePlayer('right')}
                                onClick={() => movePlayer('right')}
                                className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center text-3xl active:scale-90 transition-transform border border-border"
                            >
                                ▶️
                            </button>
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
                            🏁
                        </motion.div>
                        <h2 className="text-2xl font-black text-foreground">Yarış Bitti!</h2>
                        <div className="glass-card p-6 rounded-2xl text-center space-y-3">
                            <p className="text-sm text-muted-foreground">Skorun</p>
                            <p className="text-4xl font-black text-primary">{score + Math.floor(distance / 10)}</p>
                            <p className="text-sm text-muted-foreground">Mesafe: {Math.floor(distance / 10)}m</p>
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
                        <Leaderboard gameId="carracing" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CarRacingGame;