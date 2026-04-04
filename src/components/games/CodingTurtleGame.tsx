'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const PRAISE = ['Mantıklı! 🧠', 'Mükemmel Kod! 💻', 'Harika Algoritma! 🚀', 'Hedefe Ulaştın! 🎯', 'Aferin! 🏆'];

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const DIR_ICONS: Record<Direction, string> = { UP: '⬆️', DOWN: '⬇️', LEFT: '⬅️', RIGHT: '➡️' };
const DIR_VECTORS: Record<Direction, { dx: number, dy: number }> = {
    UP: { dx: 0, dy: -1 },
    DOWN: { dx: 0, dy: 1 },
    LEFT: { dx: -1, dy: 0 },
    RIGHT: { dx: 1, dy: 0 }
};

const GRID_W = 5;
const GRID_H = 5;
const MAX_COMMANDS = 15;
const LEVEL_GENERATION_ATTEMPTS = 120;

interface Point { x: number; y: number; }
interface Sparkle { id: number; x: number; y: number; angle: number; color: string; }

const pill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

const pointKey = ({ x, y }: Point) => `${x},${y}`;

const buildObstacleSet = (points: Point[]) => new Set(points.map(pointKey));

const getShortestPathLength = (start: Point, target: Point, blocked: Set<string>) => {
    const startKey = pointKey(start);
    const targetKey = pointKey(target);

    if (blocked.has(startKey) || blocked.has(targetKey)) {
        return null;
    }

    const visited = new Set([startKey]);
    const queue: Array<{ point: Point; distance: number }> = [{ point: start, distance: 0 }];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;

        if (current.point.x === target.x && current.point.y === target.y) {
            return current.distance;
        }

        for (const vector of Object.values(DIR_VECTORS)) {
            const next = { x: current.point.x + vector.dx, y: current.point.y + vector.dy };
            if (next.x < 0 || next.x >= GRID_W || next.y < 0 || next.y >= GRID_H) continue;

            const key = pointKey(next);
            if (blocked.has(key) || visited.has(key)) continue;

            visited.add(key);
            queue.push({ point: next, distance: current.distance + 1 });
        }
    }

    return null;
};

const sampleUniqueObstacles = (count: number, forbidden: Set<string>) => {
    const candidates: Point[] = [];
    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            const point = { x, y };
            if (!forbidden.has(pointKey(point))) {
                candidates.push(point);
            }
        }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = temp;
    }

    return candidates.slice(0, count);
};

const CodingTurtleGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'animating' | 'complete'>('menu');
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [roundLeft, setRoundLeft] = useState(10); // How many puzzles to solve

    const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 });
    const [targetPos, setTargetPos] = useState<Point>({ x: 4, y: 4 });
    const [obstacles, setObstacles] = useState<Point[]>([]);

    const [currentPos, setCurrentPos] = useState<Point>({ x: 0, y: 0 });
    const [commands, setCommands] = useState<Direction[]>([]);
    const [executingIndex, setExecutingIndex] = useState(-1);

    const [highScore, setHighScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const [praiseText, setPraiseText] = useState('');
    const [showPraise, setShowPraise] = useState(false);
    const [shakeGrid, setShakeGrid] = useState(false);

    const { safeTimeout, clearAll } = useSafeTimeouts();
    const sparkleIdRef = useRef(0);
    const scoreRef = useRef(0);

    useEffect(() => { setHighScore(getHighScore('codingturtle')); }, []);

    const bgDots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100,
        size: 2 + Math.random() * 4, dur: 3 + Math.random() * 5, delay: Math.random() * 2,
        color: ['rgba(34,197,94,0.15)', 'rgba(59,130,246,0.15)', 'rgba(234,179,8,0.15)', 'rgba(239,68,68,0.15)'][i % 4],
    })), []);

    const addSparkles = useCallback((cx: number, cy: number) => {
        const colors = ['#22c55e', '#3b82f6', '#eab308', '#ef4444'];
        const newS: Sparkle[] = Array.from({ length: 15 }, (_, i) => ({
            id: ++sparkleIdRef.current, x: cx, y: cy,
            angle: (Math.PI * 2 / 15) * i + (Math.random() - 0.5) * 0.4,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setSparkles(prev => [...prev, ...newS]);
        setTimeout(() => setSparkles(prev => prev.filter(s => !newS.find(n => n.id === s.id))), 900);
    }, []);

    const generateLevel = useCallback((lvl: number) => {
        const obsCount = Math.min(lvl, 6);

        for (let attempt = 0; attempt < LEVEL_GENERATION_ATTEMPTS; attempt++) {
            const sx = Math.floor(Math.random() * 2);
            const sy = Math.floor(Math.random() * 2);

            let tx = GRID_W - 1 - Math.floor(Math.random() * 2);
            let ty = GRID_H - 1 - Math.floor(Math.random() * 2);

            if (sx === tx && sy === ty) {
                tx = GRID_W - 1;
                ty = GRID_H - 1;
            }

            const start = { x: sx, y: sy };
            const target = { x: tx, y: ty };
            const forbidden = new Set([pointKey(start), pointKey(target)]);
            const obsList = sampleUniqueObstacles(obsCount, forbidden);
            const pathLength = getShortestPathLength(start, target, buildObstacleSet(obsList));

            if (pathLength !== null && pathLength <= MAX_COMMANDS) {
                setStartPos(start);
                setCurrentPos(start);
                setTargetPos(target);
                setObstacles(obsList);
                setCommands([]);
                setExecutingIndex(-1);
                return;
            }
        }

        const start = { x: 0, y: 0 };
        const target = { x: GRID_W - 1, y: GRID_H - 1 };
        const safePath = new Set<string>();

        for (let x = start.x; x <= target.x; x++) {
            safePath.add(pointKey({ x, y: start.y }));
        }
        for (let y = start.y; y <= target.y; y++) {
            safePath.add(pointKey({ x: target.x, y }));
        }

        const fallbackObstacles = sampleUniqueObstacles(obsCount, safePath);

        setStartPos(start);
        setCurrentPos(start);
        setTargetPos(target);
        setObstacles(fallbackObstacles);
        setCommands([]);
        setExecutingIndex(-1);
    }, []);

    const initGame = useCallback(() => {
        clearAll();
        setGameState('playing'); setScore(0); scoreRef.current = 0;
        setLevel(1); setRoundLeft(10); setSparkles([]);
        setIsNewRecord(false); setShowPraise(false);
        generateLevel(1);
    }, [clearAll, generateLevel]);

    const finishGame = useCallback(() => {
        setGameState('complete');
        fireConfetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#22c55e', '#3b82f6', '#eab308', '#ef4444'] });
        const isNew = saveHighScoreObj('codingturtle', scoreRef.current);
        if (isNew) { setIsNewRecord(true); setHighScore(scoreRef.current); playNewRecordSound(); }
        else playLevelUpSound();
    }, []);

    const addCommand = (dir: Direction) => {
        if (gameState !== 'playing') return;
        if (commands.length >= MAX_COMMANDS) return; // Limit moves
        playPopSound();
        setCommands(prev => [...prev, dir]);
    };

    const removeCommand = (index: number) => {
        if (gameState !== 'playing') return;
        playPopSound();
        setCommands(prev => prev.filter((_, i) => i !== index));
    };

    const resetRun = useCallback(() => {
        setGameState('playing');
        setCurrentPos(startPos);
        setExecutingIndex(-1);
    }, [startPos]);

    const executeCommands = useCallback(() => {
        if (commands.length === 0 || gameState !== 'playing') return;
        setGameState('animating');
        setExecutingIndex(0);
        setCurrentPos(startPos); // Always reset to start when running
    }, [commands, gameState, startPos]);

    // Command Execution Loop
    useEffect(() => {
        if (gameState !== 'animating') return;

        if (executingIndex >= commands.length) {
            // Finished execution, check win or lose
            if (currentPos.x === targetPos.x && currentPos.y === targetPos.y) {
                // Win!
                playSuccessSound();
                setPraiseText(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
                setShowPraise(true);
                fireConfetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#22c55e', '#eab308'] });

                const pts = 10 + Math.max(0, 15 - commands.length); // Bonus for fewer steps
                scoreRef.current += pts;
                setScore(scoreRef.current);

                safeTimeout(() => {
                    setShowPraise(false);
                    setRoundLeft(r => {
                        if (r <= 1) { finishGame(); return 0; }
                        const nextLvl = level + 1;
                        setLevel(nextLvl);
                        if (nextLvl % 3 === 0) playLevelUpSound();
                        generateLevel(nextLvl);
                        setGameState('playing');
                        return r - 1;
                    });
                }, 1500);
            } else {
                // Fail
                playErrorSound();
                setShakeGrid(true);
                safeTimeout(() => {
                    setShakeGrid(false);
                    resetRun();
                }, 800);
            }
            return;
        }

        safeTimeout(() => {
            const dir = commands[executingIndex];
            const vec = DIR_VECTORS[dir];
            const nextPos = { x: currentPos.x + vec.dx, y: currentPos.y + vec.dy };

            // Check bounds
            if (nextPos.x < 0 || nextPos.x >= GRID_W || nextPos.y < 0 || nextPos.y >= GRID_H) {
                playErrorSound();
                setShakeGrid(true);
                safeTimeout(() => { setShakeGrid(false); resetRun(); }, 800);
                return;
            }
            // Check obstacles
            if (obstacles.some(o => o.x === nextPos.x && o.y === nextPos.y)) {
                playErrorSound();
                setShakeGrid(true);
                safeTimeout(() => { setShakeGrid(false); resetRun(); }, 800);
                return;
            }

            playPopSound();
            setCurrentPos(nextPos);
            setExecutingIndex(executingIndex + 1);

        }, 400);
    }, [gameState, executingIndex, commands, currentPos, targetPos, level, obstacles, safeTimeout, finishGame, generateLevel, resetRun]);


    const Background = (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            {bgDots.map(d => (
                <motion.div key={d.id} className="absolute rounded-full"
                    style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size, background: d.color }}
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }} />
            ))}
        </div>
    );

    /* MENU */
    if (gameState === 'menu') {
        return (
            <>
                {Background}
                <motion.div className="relative z-10 flex flex-col items-center gap-6 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <motion.div className="text-7xl drop-shadow-lg"
                        animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>🐇</motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #10b981, #d946ef)' }}>Tavşan Kodlama</h2>
                    <p className="text-muted-foreground text-sm text-center">Komutları sıraya diz ve tavşanı havuca ulaştır! Taşlara çarpma!</p>

                    {highScore > 0 && (
                        <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(16,185,129,0.25)' }}>
                            <span className="font-black text-emerald-400">🏆 Rekor: {highScore}</span>
                        </div>
                    )}

                    <Leaderboard gameId="codingturtle" />

                    <motion.button onClick={initGame} className="btn-gaming px-12 py-4 text-lg mt-4"
                        style={{ background: 'linear-gradient(135deg, #10b981, #d946ef)' }}
                        whileHover={{ y: -2 }} whileTap={{ }}>
                        🚀 BAŞLA!
                    </motion.button>
                </motion.div>
            </>
        );
    }

    /* COMPLETE */
    if (gameState === 'complete') {
        return (
            <>
                {Background}
                <motion.div className="relative z-10 flex flex-col items-center gap-5 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <motion.div className="text-8xl drop-shadow-xl"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: [0, 1.3, 1], rotate: [0, 10, 0] }}
                        transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                        🥕
                    </motion.div>
                    <motion.h2 className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #10b981, #d946ef)' }}
                        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        Süper Programcı!
                    </motion.h2>

                    {isNewRecord && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
                            className="px-7 py-2.5 rounded-full font-black text-white"
                            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 4px 24px rgba(251,191,36,0.4)' }}>
                            🏆 YENİ REKOR!
                        </motion.div>
                    )}

                    <motion.div className="w-full max-w-xs p-6 space-y-3 text-center"
                        style={{ ...pill, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                        <p className="text-3xl font-black text-emerald-400">✨ {score} Puan</p>
                    </motion.div>

                    <motion.div className="flex gap-3 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <motion.button whileHover={{ }} whileTap={{ }}
                            style={{ background: 'linear-gradient(135deg, #10b981, #d946ef)' }}
                            onClick={initGame} className="btn-gaming px-8 py-3 text-base text-white">🔄 Tekrar Oyna</motion.button>
                        <motion.button whileHover={{ }} whileTap={{ }}
                            onClick={() => setGameState('menu')}
                            className="px-5 py-2.5 font-bold text-muted-foreground" style={pill}>← Menü</motion.button>
                    </motion.div>
                </motion.div>
            </>
        );
    }

    /* PLAYING OR ANIMATING */
    return (
        <>
            {Background}
            <motion.div className="relative z-10 flex flex-col items-center gap-2 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-2xl mx-auto game-field min-h-screen"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ touchAction: 'manipulation' }}>

                {/* HUD */}
                <motion.div className="flex flex-wrap justify-center gap-2 w-full z-50 mb-2"
                    initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-emerald-400">⭐ {score}</span></div>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-bold text-muted-foreground">Kalan: {roundLeft}</span></div>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-bold text-primary">Seviye: {level}</span></div>
                </motion.div>

                {/* Praise text */}
                <AnimatePresence>
                    {showPraise && (
                        <motion.div className="absolute inset-x-0 top-1/4 flex items-center justify-center pointer-events-none z-30"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.p className="text-3xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #6ee7b7, #3b82f6)' }}
                                initial={{ scale: 0, y: 20 }} animate={{ scale: [0, 1.4, 1.1], y: -20 }}
                                transition={{ type: 'spring', stiffness: 250, damping: 12 }}>
                                {praiseText}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grid Floor */}
                <div className="w-full flex justify-center mt-2 z-20">
                    <motion.div
                        className="grid bg-muted/20 p-2 rounded-xl backdrop-blur-sm border border-white/5 shadow-inner"
                        style={{ gridTemplateColumns: `repeat(${GRID_W}, minmax(0, 1fr))` }}
                        animate={{ x: shakeGrid ? [-10, 10, -10, 10, 0] : 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {Array.from({ length: GRID_H }).map((_, y) => (
                            Array.from({ length: GRID_W }).map((_, x) => {
                                const isTarget = targetPos.x === x && targetPos.y === y;
                                const isObstacle = obstacles.some(o => o.x === x && o.y === y);
                                const isCurrent = currentPos.x === x && currentPos.y === y;

                                return (
                                    <div key={`${x}-${y}`} className="w-12 h-12 sm:w-16 sm:h-16 border border-white/10 flex items-center justify-center relative bg-black/10">
                                        {isTarget && !isCurrent && <span className="text-2xl sm:text-3xl drop-shadow-md">🥕</span>}
                                        {isObstacle && <span className="text-2xl sm:text-3xl drop-shadow-md">🌳</span>}

                                        {isCurrent && (
                                            <motion.span
                                                className="text-3xl sm:text-4xl absolute z-10 drop-shadow-xl"
                                                layoutId="turtle"
                                                initial={false}
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            >
                                                🐇
                                            </motion.span>
                                        )}
                                    </div>
                                )
                            })
                        ))}
                    </motion.div>
                </div>

                {/* Queue Display */}
                <div className="w-full max-w-sm mt-4 p-3 min-h-[70px] flex items-center flex-wrap gap-2 rounded-xl border border-white/10 bg-black/20 backdrop-blur" style={pill}>
                    {commands.length === 0 && <span className="text-muted-foreground/50 text-sm font-bold mx-auto">Komut ekle...</span>}
                    {commands.map((cmd, i) => {
                        const isExecuting = gameState === 'animating' && executingIndex === i;
                        return (
                            <motion.button
                                key={`${cmd}-${i}`}
                                disabled={gameState === 'animating'}
                                onClick={() => removeCommand(i)}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1, y: isExecuting ? -5 : 0 }}
                                className={`w-8 h-8 rounded flex items-center justify-center text-sm border-b-2 ${isExecuting ? 'bg-emerald-500/80 border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/10 border-white/20'
                                    }`}
                            >
                                {DIR_ICONS[cmd]}
                            </motion.button>
                        )
                    })}
                </div>

                {/* Controls Layout */}
                <div className="flex flex-col items-center gap-2 mt-4 z-20">
                    <motion.button whileHover={{ }} whileTap={{ }} disabled={gameState === 'animating'}
                        onClick={() => addCommand('UP')} className="w-16 h-14 bg-white/10 border-b-4 border-white/20 rounded-xl flex items-center justify-center text-3xl pb-1 touch-manipulation disabled:opacity-50">⬆️</motion.button>
                    <div className="flex gap-2">
                        <motion.button whileHover={{ }} whileTap={{ }} disabled={gameState === 'animating'}
                            onClick={() => addCommand('LEFT')} className="w-16 h-14 bg-white/10 border-b-4 border-white/20 rounded-xl flex items-center justify-center text-3xl pb-1 touch-manipulation disabled:opacity-50">⬅️</motion.button>
                        <motion.button whileHover={{ }} whileTap={{ }} disabled={gameState === 'animating'}
                            onClick={() => addCommand('DOWN')} className="w-16 h-14 bg-white/10 border-b-4 border-white/20 rounded-xl flex items-center justify-center text-3xl pb-1 touch-manipulation disabled:opacity-50">⬇️</motion.button>
                        <motion.button whileHover={{ }} whileTap={{ }} disabled={gameState === 'animating'}
                            onClick={() => addCommand('RIGHT')} className="w-16 h-14 bg-white/10 border-b-4 border-white/20 rounded-xl flex items-center justify-center text-3xl pb-1 touch-manipulation disabled:opacity-50">➡️</motion.button>
                    </div>
                </div>

                <div className="flex gap-4 mt-6 z-20">
                    {gameState === 'playing' ? (
                        <motion.button
                            whileHover={{ }} whileTap={{ }}
                            onClick={executeCommands}
                            className="px-10 py-3 rounded-full font-black text-white shadow-lg disabled:opacity-50"
                            style={{ background: 'linear-gradient(to right, #10b981, #3b82f6)' }}
                        >
                            ▶️ ÇALIŞTIR
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ }} whileTap={{ }}
                            onClick={resetRun}
                            className="px-10 py-3 rounded-full font-black text-white shadow-lg"
                            style={{ background: 'linear-gradient(to right, #f59e0b, #ef4444)' }}
                        >
                            ⏹️ DURDUR / SIFIRLA
                        </motion.button>
                    )}

                </div>

                {/* Sparkles */}
                <AnimatePresence>
                    {sparkles.map(sp => (
                        <motion.div key={sp.id} className="absolute pointer-events-none z-40"
                            style={{ left: sp.x, top: sp.y }}
                            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                            animate={{ opacity: [1, 1, 0], scale: [0, 1.2, 0.3], x: Math.cos(sp.angle) * 70, y: Math.sin(sp.angle) * 70 - 15 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}>
                            <div style={{ width: 8, height: 8, background: sp.color, borderRadius: '50%', boxShadow: `0 0 10px ${sp.color}` }} />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Bottom Menu */}
                <motion.div className="flex gap-3 absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <motion.button whileHover={{ }} whileTap={{ }}
                        onClick={() => { setCommands([]); resetRun(); generateLevel(level); }} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={{ ...pill, background: 'rgba(0,0,0,0.5)' }}>
                        ↺ Yeni Bölüm
                    </motion.button>
                    <motion.button whileHover={{ }} whileTap={{ }}
                        onClick={() => setGameState('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={{ ...pill, background: 'rgba(0,0,0,0.5)' }}>
                        ← Çıkış
                    </motion.button>
                </motion.div>
            </motion.div>
        </>
    );
};

export default CodingTurtleGame;
