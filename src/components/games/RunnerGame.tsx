'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

interface Obstacle {
    id: number;
    x: number;
    type: 'rock' | 'tree' | 'cactus';
    isMoving?: boolean;
    moveDirection?: number;
}

interface Collectible {
    id: number;
    x: number;
    y: number;
    type: 'star' | 'coin' | 'heart' | 'magnet';
}

interface Particle {
    id: number;
    x: number;
    y: number;
    type: 'dust' | 'sparkle' | 'impact';
    life: number;
}

const CHARACTERS = [
    { id: 'bunny', name: 'Tavşan', color: '#f8b4d9', earColor: '#f472b6' },
    { id: 'fox', name: 'Tilki', color: '#fb923c', earColor: '#ea580c' },
    { id: 'cat', name: 'Kedi', color: '#a78bfa', earColor: '#7c3aed' },
    { id: 'dog', name: 'Köpek', color: '#fbbf24', earColor: '#d97706' },
];

// 2D Karakter Sprite Bileşeni
const CharacterSprite = ({ character, isJumping, isRunning, isSuper, isInvincible, jumpProgress }: {
    character: typeof CHARACTERS[0];
    isJumping: boolean;
    isRunning: boolean;
    isSuper: boolean;
    isInvincible: boolean;
    jumpProgress: number; // 0-1 jump progress for spin
}) => {
    const [legFrame, setLegFrame] = useState(0);

    useEffect(() => {
        if (!isRunning || isJumping) return;
        const interval = setInterval(() => {
            setLegFrame(f => (f + 1) % 4);
        }, 100);
        return () => clearInterval(interval);
    }, [isRunning, isJumping]);

    return (
        <motion.div
            className="relative"
            style={{ width: 48, height: 56 }}
            animate={{
                filter: isSuper
                    ? 'drop-shadow(0 0 12px #ffd700) drop-shadow(0 0 24px #ffa500)'
                    : 'drop-shadow(2px 4px 3px rgba(0,0,0,0.3))',
                opacity: isInvincible ? [1, 0.4, 1] : 1,
                rotate: isJumping ? jumpProgress * 360 : 0, // Spin animation
            }}
            transition={{
                opacity: { repeat: isInvincible ? Infinity : 0, duration: 0.15 },
                rotate: { duration: 0.6, ease: 'easeOut' }
            }}
        >
            {/* Gövde */}
            <div
                className="absolute rounded-full"
                style={{
                    width: 36,
                    height: 40,
                    left: 6,
                    top: 8,
                    background: `linear-gradient(135deg, ${character.color} 0%, ${character.earColor} 100%)`,
                    boxShadow: `inset -4px -4px 8px rgba(0,0,0,0.2), inset 4px 4px 8px rgba(255,255,255,0.3)`,
                }}
            />

            {/* Kulaklar */}
            {character.id === 'bunny' && (
                <>
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: 10,
                            height: 24,
                            left: 10,
                            top: -10,
                            background: `linear-gradient(180deg, ${character.color} 0%, ${character.earColor} 100%)`,
                            transform: 'rotate(-15deg)',
                        }}
                    />
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: 10,
                            height: 24,
                            right: 10,
                            top: -10,
                            background: `linear-gradient(180deg, ${character.color} 0%, ${character.earColor} 100%)`,
                            transform: 'rotate(15deg)',
                        }}
                    />
                </>
            )}
            {character.id === 'fox' && (
                <>
                    <div
                        className="absolute"
                        style={{
                            width: 0,
                            height: 0,
                            left: 6,
                            top: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: `16px solid ${character.earColor}`,
                            transform: 'rotate(-10deg)',
                        }}
                    />
                    <div
                        className="absolute"
                        style={{
                            width: 0,
                            height: 0,
                            right: 6,
                            top: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: `16px solid ${character.earColor}`,
                            transform: 'rotate(10deg)',
                        }}
                    />
                </>
            )}
            {character.id === 'cat' && (
                <>
                    <div
                        className="absolute"
                        style={{
                            width: 0,
                            height: 0,
                            left: 8,
                            top: 2,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: `12px solid ${character.earColor}`,
                            transform: 'rotate(-20deg)',
                        }}
                    />
                    <div
                        className="absolute"
                        style={{
                            width: 0,
                            height: 0,
                            right: 8,
                            top: 2,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: `12px solid ${character.earColor}`,
                            transform: 'rotate(20deg)',
                        }}
                    />
                </>
            )}
            {character.id === 'dog' && (
                <>
                    <div
                        className="absolute rounded-b-full"
                        style={{
                            width: 14,
                            height: 16,
                            left: 2,
                            top: 6,
                            background: character.earColor,
                            transform: 'rotate(-30deg)',
                        }}
                    />
                    <div
                        className="absolute rounded-b-full"
                        style={{
                            width: 14,
                            height: 16,
                            right: 2,
                            top: 6,
                            background: character.earColor,
                            transform: 'rotate(30deg)',
                        }}
                    />
                </>
            )}

            {/* Gözler */}
            <div className="absolute flex gap-2" style={{ left: 12, top: 18 }}>
                <div className="w-3 h-4 bg-white rounded-full relative">
                    <div className="w-1.5 h-2 bg-gray-800 rounded-full absolute right-0.5 top-1" />
                </div>
                <div className="w-3 h-4 bg-white rounded-full relative">
                    <div className="w-1.5 h-2 bg-gray-800 rounded-full absolute right-0.5 top-1" />
                </div>
            </div>

            {/* Burun */}
            <div
                className="absolute w-2 h-1.5 bg-gray-800 rounded-full"
                style={{ left: 22, top: 28 }}
            />

            {/* Bacaklar - Koşma animasyonu */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: 8,
                    height: 14,
                    left: 12,
                    bottom: -6,
                    background: character.earColor,
                }}
                animate={isJumping ? { rotate: -45 } : {
                    rotate: [15, -15, 15, -15][legFrame],
                    y: [0, -2, 0, -2][legFrame]
                }}
            />
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: 8,
                    height: 14,
                    right: 12,
                    bottom: -6,
                    background: character.earColor,
                }}
                animate={isJumping ? { rotate: 45 } : {
                    rotate: [-15, 15, -15, 15][legFrame],
                    y: [-2, 0, -2, 0][legFrame]
                }}
            />

            {/* Süper güç efekti */}
            {isSuper && (
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
                    }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                />
            )}
        </motion.div>
    );
};

// 2D Engel Bileşenleri
const ObstacleSprite = ({ type, isSuper }: { type: 'rock' | 'tree' | 'cactus'; isSuper: boolean }) => {
    if (type === 'rock') {
        return (
            <div className="relative" style={{ width: 40, height: 32, opacity: isSuper ? 0.5 : 1 }}>
                <div
                    className="absolute bottom-0 rounded-t-xl"
                    style={{
                        width: 40,
                        height: 28,
                        background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 50%, #4b5563 100%)',
                        boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.3), inset 4px 4px 8px rgba(255,255,255,0.2), 4px 4px 8px rgba(0,0,0,0.3)',
                    }}
                />
                <div
                    className="absolute rounded-full"
                    style={{
                        width: 12,
                        height: 10,
                        left: 4,
                        top: 8,
                        background: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                    }}
                />
            </div>
        );
    }

    if (type === 'cactus') {
        return (
            <div className="relative" style={{ width: 32, height: 48, opacity: isSuper ? 0.5 : 1 }}>
                {/* Ana gövde */}
                <div
                    className="absolute bottom-0 rounded-t-lg"
                    style={{
                        width: 14,
                        height: 44,
                        left: 9,
                        background: 'linear-gradient(90deg, #15803d 0%, #22c55e 50%, #15803d 100%)',
                        boxShadow: '3px 3px 6px rgba(0,0,0,0.3)',
                    }}
                />
                {/* Sol kol */}
                <div
                    className="absolute rounded-t-lg"
                    style={{
                        width: 10,
                        height: 20,
                        left: 0,
                        top: 12,
                        background: 'linear-gradient(90deg, #15803d 0%, #22c55e 100%)',
                        borderRadius: '8px 8px 0 8px',
                    }}
                />
                <div
                    className="absolute rounded-lg"
                    style={{
                        width: 10,
                        height: 10,
                        left: 0,
                        top: 4,
                        background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                    }}
                />
                {/* Sağ kol */}
                <div
                    className="absolute rounded-t-lg"
                    style={{
                        width: 10,
                        height: 16,
                        right: 0,
                        top: 18,
                        background: 'linear-gradient(90deg, #22c55e 0%, #15803d 100%)',
                        borderRadius: '8px 8px 8px 0',
                    }}
                />
                <div
                    className="absolute rounded-lg"
                    style={{
                        width: 10,
                        height: 10,
                        right: 0,
                        top: 10,
                        background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                    }}
                />
                {/* Dikenler */}
                {[8, 20, 32].map((y, i) => (
                    <div
                        key={i}
                        className="absolute"
                        style={{
                            width: 4,
                            height: 1,
                            left: 5,
                            top: y,
                            background: '#14532d',
                        }}
                    />
                ))}
            </div>
        );
    }

    // Ağaç
    return (
        <div className="relative" style={{ width: 36, height: 52, opacity: isSuper ? 0.5 : 1 }}>
            {/* Gövde */}
            <div
                className="absolute bottom-0"
                style={{
                    width: 10,
                    height: 20,
                    left: 13,
                    background: 'linear-gradient(90deg, #78350f 0%, #a16207 50%, #78350f 100%)',
                    boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
            />
            {/* Yapraklar */}
            <div
                className="absolute rounded-full"
                style={{
                    width: 36,
                    height: 36,
                    left: 0,
                    top: 0,
                    background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #22c55e 40%, #15803d 100%)',
                    boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.2), 3px 3px 6px rgba(0,0,0,0.3)',
                }}
            />
        </div>
    );
};

// Toplanabilir Sprite
const CollectibleSprite = ({ type }: { type: 'star' | 'coin' | 'heart' | 'magnet' }) => {
    if (type === 'star') {
        return (
            <motion.div
                className="relative"
                style={{ width: 28, height: 28 }}
                animate={{
                    scale: [1, 1.15, 1],
                    filter: ['drop-shadow(0 0 4px #ffd700)', 'drop-shadow(0 0 12px #ffa500)', 'drop-shadow(0 0 4px #ffd700)']
                }}
                transition={{ repeat: Infinity, duration: 0.8 }}
            >
                <svg viewBox="0 0 24 24" fill="url(#starGrad)" className="w-full h-full">
                    <defs>
                        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="50%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                    </defs>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            </motion.div>
        );
    }

    if (type === 'coin') {
        return (
            <motion.div
                className="relative"
                style={{
                    width: 24,
                    height: 24,
                    background: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 50%, #d97706 100%)',
                    borderRadius: '50%',
                    boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.5), 2px 2px 4px rgba(0,0,0,0.3)',
                }}
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
                <div
                    className="absolute inset-1 rounded-full flex items-center justify-center font-bold text-amber-800 text-xs"
                    style={{ border: '2px solid #d97706' }}
                >
                    ₺
                </div>
            </motion.div>
        );
    }

    if (type === 'magnet') {
        return (
            <motion.div
                className="relative flex items-center justify-center"
                style={{ width: 28, height: 28 }}
                animate={{
                    scale: [1, 1.1, 1],
                    filter: ['drop-shadow(0 0 6px #ef4444)', 'drop-shadow(0 0 12px #dc2626)', 'drop-shadow(0 0 6px #ef4444)']
                }}
                transition={{ repeat: Infinity, duration: 0.5 }}
            >
                <span className="text-2xl">🧲</span>
            </motion.div>
        );
    }

    // Heart
    return (
        <motion.div
            className="relative"
            style={{ width: 26, height: 24 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
        >
            <svg viewBox="0 0 24 24" fill="url(#heartGrad)" className="w-full h-full drop-shadow-lg">
                <defs>
                    <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="50%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                </defs>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        </motion.div>
    );
};

// Parçacık Bileşeni
const ParticleEffect = ({ particle }: { particle: Particle }) => {
    if (particle.type === 'dust') {
        return (
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: 8,
                    height: 8,
                    left: particle.x,
                    bottom: particle.y,
                    background: 'rgba(139, 119, 101, 0.6)',
                }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.5, opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
            />
        );
    }

    if (particle.type === 'sparkle') {
        return (
            <motion.div
                className="absolute"
                style={{
                    width: 10,
                    height: 10,
                    left: particle.x,
                    bottom: particle.y,
                }}
                initial={{ scale: 0, opacity: 1, rotate: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0], rotate: 180 }}
                transition={{ duration: 0.5 }}
            >
                ✨
            </motion.div>
        );
    }

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: 12,
                height: 12,
                left: particle.x,
                bottom: particle.y,
                background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 2, 0], opacity: [1, 0.5, 0] }}
            transition={{ duration: 0.3 }}
        />
    );
};

const RunnerGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
    const [character, setCharacter] = useState(CHARACTERS[0]);
    const [isJumping, setIsJumping] = useState(false);
    const [isDucking, setIsDucking] = useState(false);
    const [isSuper, setIsSuper] = useState(false);
    const [hasMagnet, setHasMagnet] = useState(false);
    const [jumpProgress, setJumpProgress] = useState(0);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [collectibles, setCollectibles] = useState<Collectible[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [score, setScore] = useState(0);
    const [distance, setDistance] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [speed, setSpeed] = useState(5);
    const [lives, setLives] = useState(3);
    const [isInvincible, setIsInvincible] = useState(false);
    const [groundOffset, setGroundOffset] = useState(0);
    const [cloudOffset, setCloudOffset] = useState(0);

    const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const obstacleIdRef = useRef(0);
    const collectibleIdRef = useRef(0);
    const particleIdRef = useRef(0);
    const playerY = useRef(0);
    const superTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const magnetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastObstacleTimeRef = useRef(0);
    const speedRef = useRef(5);
    const dustIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const jumpStartTimeRef = useRef(0);

    const addParticle = useCallback((x: number, y: number, type: Particle['type']) => {
        setParticles(prev => [...prev, {
            id: particleIdRef.current++,
            x, y, type, life: 100
        }]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => p.id !== particleIdRef.current - 1));
        }, 500);
    }, []);

    const jump = useCallback(() => {
        if (isJumping || isDucking || gameState !== 'playing') return;
        playPopSound();
        setIsJumping(true);
        setJumpProgress(0);
        jumpStartTimeRef.current = Date.now();
        playerY.current = 1;
        addParticle(60, 48, 'dust');

        // Animate jump progress for spin
        const jumpDuration = 600;
        const animateJump = () => {
            const elapsed = Date.now() - jumpStartTimeRef.current;
            const progress = Math.min(elapsed / jumpDuration, 1);
            setJumpProgress(progress);

            if (progress < 1) {
                requestAnimationFrame(animateJump);
            } else {
                setIsJumping(false);
                setJumpProgress(0);
                playerY.current = 0;
                addParticle(60, 48, 'dust');
            }
        };
        requestAnimationFrame(animateJump);
    }, [isJumping, isDucking, gameState, addParticle]);

    const duck = useCallback(() => {
        if (isJumping || isDucking || gameState !== 'playing') return;
        setIsDucking(true);
        setTimeout(() => setIsDucking(false), 400);
    }, [isJumping, isDucking, gameState]);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setDistance(0);
        setSpeed(5);
        speedRef.current = 5;
        lastObstacleTimeRef.current = 0;
        setObstacles([]);
        setCollectibles([]);
        setParticles([]);
        setIsJumping(false);
        setIsDucking(false);
        setIsSuper(false);
        setHasMagnet(false);
        setJumpProgress(0);
        setLives(3);
        setIsInvincible(false);
        setGroundOffset(0);
        setCloudOffset(0);
    };

    const endGame = useCallback(() => {
        playErrorSound();
        setGameState('gameover');
        setIsSuper(false);
        setHasMagnet(false);
        if (score > highScore) {
            setHighScore(score);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
        if (dustIntervalRef.current) {
            clearInterval(dustIntervalRef.current);
        }
    }, [score, highScore]);

    // Speed ref'i güncelle
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    // Koşarken toz parçacıkları
    useEffect(() => {
        if (gameState !== 'playing') return;

        dustIntervalRef.current = setInterval(() => {
            if (!isJumping) {
                addParticle(50 + Math.random() * 20, 45 + Math.random() * 10, 'dust');
            }
        }, 200);

        return () => {
            if (dustIntervalRef.current) clearInterval(dustIntervalRef.current);
        };
    }, [gameState, isJumping, addParticle]);

    // Game loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const minObstacleGap = 1500;

        gameLoopRef.current = setInterval(() => {
            const now = Date.now();
            const currentSpeed = speedRef.current;

            // Parallax zemin hareketi
            setGroundOffset(prev => (prev - currentSpeed * 2) % 100);
            setCloudOffset(prev => (prev - currentSpeed * 0.3) % 200);

            // Engel spawn - bazıları hareketli
            if (now - lastObstacleTimeRef.current > minObstacleGap && Math.random() < 0.03) {
                const types: ('rock' | 'cactus' | 'tree')[] = ['rock', 'cactus', 'tree'];
                const isMoving = Math.random() < 0.3; // %30 ihtimalle hareketli engel
                setObstacles(prev => [...prev, {
                    id: obstacleIdRef.current++,
                    x: 100,
                    type: types[Math.floor(Math.random() * types.length)],
                    isMoving,
                    moveDirection: isMoving ? (Math.random() > 0.5 ? 1 : -1) : 0,
                }]);
                lastObstacleTimeRef.current = now;
            }

            // Collectible spawn - mıknatıs dahil
            if (Math.random() < 0.015) {
                const rand = Math.random();
                let type: 'star' | 'coin' | 'heart' | 'magnet';
                if (rand < 0.05) {
                    type = 'magnet'; // %5 ihtimalle mıknatıs
                } else if (rand < 0.35) {
                    type = 'star';
                } else if (rand < 0.75) {
                    type = 'coin';
                } else {
                    type = 'heart';
                }
                setCollectibles(prev => [...prev, {
                    id: collectibleIdRef.current++,
                    x: 100,
                    y: Math.random() > 0.5 ? 0 : 1,
                    type,
                }]);
            }

            // Hareket - hareketli engeller yukarı aşağı hareket eder
            setObstacles(prev => prev
                .map(o => ({
                    ...o,
                    x: o.x - currentSpeed,
                    // Hareketli engeller için sinüsoidal hareket (görsel efekt)
                }))
                .filter(o => o.x > -10)
            );

            // Collectibles hareketi + mıknatıs çekme efekti
            setCollectibles(prev => prev
                .map(c => {
                    let newX = c.x - currentSpeed;

                    // Mıknatıs aktifse yıldızları çek
                    if (hasMagnet && c.type === 'star') {
                        const attractSpeed = 3;
                        if (c.x > 15) {
                            newX = c.x - currentSpeed - attractSpeed;
                        }
                    }

                    return { ...c, x: newX };
                })
                .filter(c => c.x > -10)
            );

            // Skor ve mesafe
            setScore(prev => prev + 1);
            setDistance(prev => prev + currentSpeed);

            // Puana göre kademeli hız artışı
            setSpeed(prev => {
                // Her 500 puanda belirgin hız artışı
                const baseSpeed = 5;
                const scoreBonus = Math.floor(score / 500) * 0.5;
                const targetSpeed = Math.min(baseSpeed + scoreBonus + 0.001, 15);
                return Math.min(prev + 0.001, targetSpeed);
            });
        }, 50);

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameState, hasMagnet, score]);

    // Çarpışma kontrolü
    useEffect(() => {
        if (gameState !== 'playing') return;

        // Engel çarpışması
        for (const obstacle of obstacles) {
            if (obstacle.x > 5 && obstacle.x < 22) {
                if (!isJumping && !isSuper && !isInvincible) {
                    if (lives <= 1) {
                        setLives(0);
                        addParticle(60, 60, 'impact');
                        endGame();
                    } else {
                        playErrorSound();
                        setLives(prev => prev - 1);
                        setIsInvincible(true);
                        addParticle(60, 60, 'impact');
                        setObstacles(prev => prev.filter(o => o.id !== obstacle.id));
                        setTimeout(() => setIsInvincible(false), 1500);
                    }
                    return;
                }
            }
        }

        // Collectible toplama
        setCollectibles(prev => {
            const remaining: Collectible[] = [];
            for (const c of prev) {
                if (c.x > 5 && c.x < 20) {
                    const canCollect = c.y === 1 ? isJumping : !isJumping;
                    if (canCollect) {
                        playSuccessSound();
                        addParticle(c.x * 5, c.y === 1 ? 100 : 60, 'sparkle');

                        if (c.type === 'star') {
                            setIsSuper(true);
                            if (superTimeoutRef.current) clearTimeout(superTimeoutRef.current);
                            superTimeoutRef.current = setTimeout(() => setIsSuper(false), 5000);
                        }

                        if (c.type === 'heart') {
                            setLives(l => Math.min(l + 1, 5));
                        }

                        if (c.type === 'magnet') {
                            setHasMagnet(true);
                            if (magnetTimeoutRef.current) clearTimeout(magnetTimeoutRef.current);
                            magnetTimeoutRef.current = setTimeout(() => setHasMagnet(false), 10000);
                        }

                        setScore(s => s + (c.type === 'star' ? 100 : c.type === 'coin' ? 25 : c.type === 'magnet' ? 50 : 50));
                        continue;
                    }
                }
                remaining.push(c);
            }
            return remaining;
        });
    }, [obstacles, collectibles, isJumping, isSuper, isInvincible, lives, gameState, endGame, addParticle]);

    // Klavye kontrolü
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                jump();
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                duck();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump, duck]);

    if (gameState === 'menu') {
        return (
            <motion.div
                className="flex flex-col items-center gap-6 p-4 pb-32"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Başlık */}
                <div className="relative">
                    <motion.h2
                        className="text-4xl font-black bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        🏃 Koşucu
                    </motion.h2>
                    <motion.div
                        className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-500/20 rounded-xl blur-xl -z-10"
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    />
                </div>

                <p className="text-muted-foreground font-semibold text-center">
                    Engelleri atla, yıldızları topla!
                </p>

                {/* Karakter seçimi */}
                <div className="space-y-3">
                    <p className="font-bold text-center text-foreground">Karakter Seç:</p>
                    <div className="flex gap-4">
                        {CHARACTERS.map((char) => (
                            <motion.button
                                key={char.id}
                                onClick={() => { playPopSound(); setCharacter(char); }}
                                className={`p-4 rounded-2xl transition-all relative ${character.id === char.id
                                    ? 'scale-110 ring-4 ring-primary/50'
                                    : 'hover:scale-105'
                                    }`}
                                style={{
                                    background: character.id === char.id
                                        ? `linear-gradient(135deg, ${char.color}40, ${char.earColor}40)`
                                        : 'var(--muted)',
                                }}
                                whileHover={{ y: -4 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <CharacterSprite
                                    character={char}
                                    isJumping={false}
                                    isRunning={false}
                                    isSuper={false}
                                    isInvincible={false}
                                    jumpProgress={0}
                                />
                                <p className="text-xs font-bold mt-2 text-center">{char.name}</p>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {highScore > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full">
                        <span className="text-2xl">🏆</span>
                        <span className="font-black text-amber-600 dark:text-amber-400">
                            En Yüksek: {highScore}
                        </span>
                    </div>
                )}

                <motion.button
                    onClick={startGame}
                    className="px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-black rounded-full shadow-lg relative overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                        animate={{ x: [-200, 200] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    />
                    <span className="relative">Başla! 🚀</span>
                </motion.button>

                <div className="text-center text-sm text-muted-foreground space-y-1">
                    <p>⬆️ veya SPACE: Zıpla</p>
                    <p>📱 Mobil: Ekrana dokun = Zıpla</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="flex flex-col items-center gap-4 p-4 pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* UI Bar */}
            <div className="flex gap-3 items-center">
                {/* Can göstergesi */}
                <div className="flex gap-0.5 items-center bg-card/90 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-border/50">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="relative"
                            animate={{
                                scale: i < lives ? [1, 1.1, 1] : 0.8,
                                opacity: i < lives ? 1 : 0.2
                            }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill={i < lives ? '#ef4444' : '#9ca3af'}>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </motion.div>
                    ))}
                </div>

                {/* Skor */}
                <motion.div
                    className="px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur rounded-xl font-black text-primary shadow-lg border border-primary/20"
                    animate={{ scale: score % 100 === 0 && score > 0 ? [1, 1.1, 1] : 1 }}
                >
                    ⭐ {score}
                </motion.div>

                {/* Mesafe */}
                <div className="px-4 py-2 bg-card/90 backdrop-blur rounded-xl font-bold text-muted-foreground shadow-lg border border-border/50">
                    📏 {Math.floor(distance / 10)}m
                </div>

                {/* Rekor */}
                <div className="px-3 py-2 bg-amber-500/20 backdrop-blur rounded-xl font-bold text-amber-600 dark:text-amber-400 shadow-lg">
                    🏆 {highScore}
                </div>

                {/* Mıknatıs Aktif Göstergesi */}
                {hasMagnet && (
                    <motion.div
                        className="px-3 py-2 bg-red-500/30 backdrop-blur rounded-xl font-bold text-red-600 dark:text-red-400 shadow-lg"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                        🧲 Aktif!
                    </motion.div>
                )}

                {/* Hız Göstergesi */}
                <div className="px-3 py-2 bg-blue-500/20 backdrop-blur rounded-xl font-bold text-blue-600 dark:text-blue-400 shadow-lg">
                    🚀 {speed.toFixed(1)}x
                </div>
            </div>

            {/* Oyun alanı */}
            <div
                className="relative w-full max-w-2xl h-56 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20"
                onClick={jump}
                onContextMenu={(e) => { e.preventDefault(); duck(); }}
                style={{
                    background: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 40%, #0ea5e9 100%)',
                }}
            >
                {/* Güneş */}
                <motion.div
                    className="absolute w-16 h-16 rounded-full"
                    style={{
                        top: 16,
                        right: 24,
                        background: 'radial-gradient(circle, #fef08a 0%, #fbbf24 50%, #f59e0b 100%)',
                        boxShadow: '0 0 40px 10px rgba(251, 191, 36, 0.4)',
                    }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                />

                {/* Bulutlar - Parallax */}
                {[0, 80, 160].map((offset, i) => (
                    <motion.div
                        key={i}
                        className="absolute"
                        style={{
                            top: 20 + i * 15,
                            left: `${((cloudOffset + offset) % 150) - 20}%`,
                        }}
                    >
                        <div className="flex">
                            <div className="w-12 h-6 bg-white/90 rounded-full" />
                            <div className="w-8 h-5 bg-white/90 rounded-full -ml-4 mt-1" />
                            <div className="w-10 h-6 bg-white/90 rounded-full -ml-3" />
                        </div>
                    </motion.div>
                ))}

                {/* Uzak dağlar - Parallax */}
                <div
                    className="absolute bottom-12 left-0 right-0 h-24"
                    style={{ transform: `translateX(${cloudOffset * 0.5}px)` }}
                >
                    <svg viewBox="0 0 400 60" className="w-full h-full" preserveAspectRatio="none">
                        <path
                            d="M0,60 L0,40 L30,25 L60,35 L90,20 L120,30 L150,15 L180,28 L210,22 L240,32 L270,18 L300,25 L330,30 L360,22 L400,35 L400,60 Z"
                            fill="rgba(148, 163, 184, 0.5)"
                        />
                        <path
                            d="M0,60 L0,45 L40,30 L80,38 L120,28 L160,35 L200,25 L240,32 L280,28 L320,35 L360,30 L400,40 L400,60 Z"
                            fill="rgba(100, 116, 139, 0.5)"
                        />
                    </svg>
                </div>

                {/* Zemin - Parallax hareket */}
                <div className="absolute bottom-0 left-0 right-0 h-14">
                    {/* Toprak katmanı */}
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-amber-600 to-amber-800"
                    />

                    {/* Çim katmanı */}
                    <div
                        className="absolute top-0 left-0 right-0 h-4"
                        style={{
                            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                        }}
                    />

                    {/* Çim detayları */}
                    <div
                        className="absolute top-0 left-0 h-6 flex"
                        style={{
                            transform: `translateX(${groundOffset}px)`,
                            width: '200%',
                        }}
                    >
                        {Array.from({ length: 60 }).map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1 bg-green-400"
                                style={{
                                    height: 8 + Math.random() * 8,
                                    marginLeft: 6 + Math.random() * 4,
                                    borderRadius: '0 0 2px 2px',
                                    transformOrigin: 'bottom',
                                }}
                                animate={{
                                    rotate: [0, 5, -5, 0],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 0.8 + Math.random() * 0.4,
                                    delay: Math.random() * 0.5,
                                }}
                            />
                        ))}
                    </div>

                    {/* Toprak detayları */}
                    <div
                        className="absolute bottom-1 left-0 h-2 flex gap-8"
                        style={{
                            transform: `translateX(${groundOffset * 1.5}px)`,
                            width: '200%',
                        }}
                    >
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={i}
                                className="w-3 h-2 rounded-full bg-amber-900/30"
                            />
                        ))}
                    </div>
                </div>

                {/* Süper Güç Yazısı */}
                <AnimatePresence>
                    {isSuper && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.5 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 px-6 py-2 rounded-full font-black text-sm shadow-lg border-2 border-white"
                        >
                            <motion.span
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 0.3 }}
                            >
                                🌟 SÜPER GÜÇ! 🌟
                            </motion.span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Karakter */}
                <motion.div
                    className="absolute left-8 z-20"
                    animate={{
                        bottom: isJumping ? 110 : 52,
                    }}
                    transition={{
                        bottom: { type: 'spring', stiffness: 400, damping: 25 },
                    }}
                >
                    <CharacterSprite
                        character={character}
                        isJumping={isJumping}
                        isRunning={gameState === 'playing'}
                        isSuper={isSuper}
                        isInvincible={isInvincible}
                        jumpProgress={jumpProgress}
                    />
                </motion.div>

                {/* Engeller */}
                {obstacles.map((obstacle) => (
                    <motion.div
                        key={obstacle.id}
                        className="absolute z-10"
                        style={{
                            left: `${obstacle.x}%`,
                            bottom: 52,
                        }}
                        initial={{ x: 20 }}
                        animate={{ x: 0 }}
                    >
                        <ObstacleSprite type={obstacle.type} isSuper={isSuper} />
                    </motion.div>
                ))}

                {/* Toplanabilirler */}
                {collectibles.map((c) => (
                    <motion.div
                        key={c.id}
                        className="absolute z-10"
                        style={{
                            left: `${c.x}%`,
                            bottom: c.y === 1 ? 110 : 56,
                        }}
                    >
                        <CollectibleSprite type={c.type} />
                    </motion.div>
                ))}

                {/* Parçacıklar */}
                <AnimatePresence>
                    {particles.map((p) => (
                        <ParticleEffect key={p.id} particle={p} />
                    ))}
                </AnimatePresence>

                {/* Game Over overlay */}
                {gameState === 'gameover' && (
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.p
                            className="text-5xl font-black text-white drop-shadow-lg"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                        >
                            Game Over!
                        </motion.p>
                        <p className="text-2xl font-bold text-white">Skor: {score}</p>
                        <p className="text-lg text-white/80">Mesafe: {Math.floor(distance / 10)}m</p>
                        {score === highScore && score > 0 && (
                            <motion.p
                                className="text-xl font-bold text-yellow-400"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                            >
                                🏆 Yeni Rekor! 🏆
                            </motion.p>
                        )}

                        {/* Game Over butonları - oyun alanı içinde */}
                        <div className="flex gap-3 mt-4">
                            <motion.button
                                onClick={startGame}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-black text-lg shadow-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                🔄 Tekrar
                            </motion.button>
                            <motion.button
                                onClick={() => setGameState('menu')}
                                className="px-6 py-3 bg-white/20 text-white rounded-full font-bold backdrop-blur"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                ← Menü
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* Mobil kontroller - Oyun alanı içinde */}
                {gameState === 'playing' && (
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); jump(); }}
                        className="absolute bottom-3 right-3 z-30 w-16 h-16 bg-white/30 backdrop-blur-sm text-white rounded-full font-black text-2xl shadow-xl flex items-center justify-center border-2 border-white/50"
                        whileTap={{ scale: 0.85, backgroundColor: 'rgba(255,255,255,0.5)' }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        ⬆️
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

export default RunnerGame;
