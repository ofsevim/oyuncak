'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playErrorSound, playLevelUpSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const BUTTONS = [
    { id: 0, color: '#ef4444', glow: 'rgba(239,68,68,0.6)', note: 'C', freq: 261.63, icon: '🍎' }, // Red
    { id: 1, color: '#3b82f6', glow: 'rgba(59,130,246,0.6)', note: 'E', freq: 329.63, icon: '🦋' }, // Blue
    { id: 2, color: '#eab308', glow: 'rgba(234,179,8,0.6)', note: 'G', freq: 392.00, icon: '⭐' }, // Yellow
    { id: 3, color: '#22c55e', glow: 'rgba(34,197,94,0.6)', note: 'C2', freq: 523.25, icon: '🐸' }, // Green
];

const pill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

const SimonSaysGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'showing' | 'playing' | 'complete'>('menu');
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerIndex, setPlayerIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [activeButton, setActiveButton] = useState<number | null>(null);
    const [wrongButton, setWrongButton] = useState<number | null>(null);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const { safeTimeout, clearAll } = useSafeTimeouts();

    useEffect(() => { setHighScore(getHighScore('simonsays')); }, []);

    const getAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        return audioCtxRef.current;
    }, []);

    const playNote = useCallback((freq: number) => {
        const ctx = getAudioContext();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, ctx.currentTime);
        osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
    }, [getAudioContext]);

    const bgDots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100,
        size: 2 + Math.random() * 4, dur: 3 + Math.random() * 5, delay: Math.random() * 2,
        color: ['rgba(239,68,68,0.1)', 'rgba(59,130,246,0.1)', 'rgba(234,179,8,0.1)', 'rgba(34,197,94,0.1)'][i % 4],
    })), []);

    const playSequence = useCallback(async (seq: number[]) => {
        setGameState('showing');
        setActiveButton(null);

        // Wait a bit before showing
        await new Promise(r => { safeTimeout(() => r(undefined), 800); });

        for (let i = 0; i < seq.length; i++) {
            const btnId = seq[i];
            const btn = BUTTONS[btnId];

            setActiveButton(btnId);
            playNote(btn.freq);

            await new Promise(r => { safeTimeout(() => r(undefined), 400); });

            setActiveButton(null);
            await new Promise(r => { safeTimeout(() => r(undefined), 200); });
        }

        setGameState('playing');
        setPlayerIndex(0);
    }, [playNote]);

    const nextRound = useCallback((currentSeq: number[]) => {
        const nextBtn = Math.floor(Math.random() * 4);
        const newSeq = [...currentSeq, nextBtn];
        setSequence(newSeq);
        playSequence(newSeq);
    }, [playSequence]);

    const initGame = useCallback(() => {
        clearAll();
        setScore(0);
        setIsNewRecord(false);
        nextRound([]);
    }, [clearAll, nextRound]);

    const finishGame = useCallback((finalScore: number) => {
        setGameState('complete');
        const isNew = saveHighScoreObj('simonsays', finalScore);
        if (isNew) {
            setIsNewRecord(true);
            setHighScore(finalScore);
            playNewRecordSound();
        } else {
            playLevelUpSound();
        }
    }, []);

    const handleButtonClick = (btnId: number) => {
        if (gameState !== 'playing') return;

        const btn = BUTTONS[btnId];
        playNote(btn.freq);
        setActiveButton(btnId);

        safeTimeout(() => setActiveButton(null), 200);

        if (btnId === sequence[playerIndex]) {
            // Correct
            const nextIndex = playerIndex + 1;
            if (nextIndex === sequence.length) {
                // Round finished
                setScore(prev => prev + sequence.length * 10);
                playSuccessSound();
                setGameState('showing'); // Prevent multiple clicks

                safeTimeout(() => {
                    nextRound(sequence);
                }, 1000);
            } else {
                setPlayerIndex(nextIndex);
            }
        } else {
            // Wrong - Show feedback first
            playErrorSound();
            setWrongButton(btnId);
            setGameState('showing'); // Block input

            const currentScore = score;
            safeTimeout(() => {
                setWrongButton(null);
                finishGame(currentScore);
            }, 600);
        }
    };

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
                    <motion.div className="text-7xl drop-shadow-lg grid grid-cols-2 gap-2"
                        animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                        <div className="w-12 h-12 rounded-full bg-red-500 shadow-lg"></div>
                        <div className="w-12 h-12 rounded-full bg-blue-500 shadow-lg"></div>
                        <div className="w-12 h-12 rounded-full bg-yellow-400 shadow-lg"></div>
                        <div className="w-12 h-12 rounded-full bg-green-500 shadow-lg"></div>
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #3b82f6, #10b981)' }}>Müzikal Hafıza</h2>
                    <p className="text-muted-foreground text-sm text-center">Renklerin ve seslerin sırasını ezberle, aynısını tekrarla!</p>

                    {highScore > 0 && (
                        <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(59,130,246,0.25)' }}>
                            <span className="font-black text-blue-400">🏆 Rekor: {highScore}</span>
                        </div>
                    )}

                    <Leaderboard gameId="simonsays" />

                    <motion.button onClick={initGame} className="btn-gaming px-12 py-4 text-lg mt-4"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)' }}
                        whileHover={{ y: -2 }} whileTap={{}}>
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
                        🧠
                    </motion.div>
                    <motion.h2 className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #f43f5e, #f97316)' }}
                        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        Oyun Bitti!
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
                        <p className="text-3xl font-black text-blue-400">✨ {score} Puan</p>
                        <p className="text-sm font-bold text-muted-foreground">Seviye: {sequence.length}</p>
                    </motion.div>

                    <motion.div className="flex gap-3 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                        <motion.button whileHover={{}} whileTap={{}}
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)' }}
                            onClick={initGame} className="btn-gaming px-8 py-3 text-base text-white">🔄 Tekrar Oyna</motion.button>
                        <motion.button whileHover={{}} whileTap={{}}
                            onClick={() => setGameState('menu')}
                            className="px-5 py-2.5 font-bold text-muted-foreground" style={pill}>← Menü</motion.button>
                    </motion.div>
                </motion.div>
            </>
        );
    }

    /* PLAYING OR SHOWING */
    return (
        <>
            {Background}
            <motion.div className="relative z-10 flex flex-col items-center gap-6 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-2xl mx-auto game-field min-h-screen"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* HUD */}
                <motion.div className="flex flex-wrap justify-center gap-2 w-full z-50 mb-2"
                    initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-blue-400">⭐ {score}</span></div>
                    <div className="px-4 py-2" style={pill}>
                        <span className="text-sm font-bold text-muted-foreground">
                            {gameState === 'showing' ? '👀 Dinle ve İzle' : '🎮 Sıra Sende'}
                        </span>
                    </div>
                    <div className="px-4 py-2" style={pill}><span className="text-sm font-bold text-emerald-400">Seviye: {sequence.length}</span></div>
                </motion.div>

                {/* Game Buttons */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-10 p-6 rounded-full" style={{ background: 'rgba(255,255,255,0.02)', border: '2px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)' }}>
                    {BUTTONS.map((btn, index) => {
                        const isActive = activeButton === index;
                        const isWrong = wrongButton === index;
                        return (
                            <motion.button
                                key={btn.id}
                                disabled={gameState !== 'playing'}
                                onMouseDown={() => handleButtonClick(btn.id)}
                                onTouchStart={() => handleButtonClick(btn.id)}
                                onTouchEnd={(e) => { e.preventDefault(); }}
                                animate={isWrong ? { x: [-10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl border-4 transition-colors flex items-center justify-center text-4xl sm:text-5xl"
                                style={{
                                    backgroundColor: isActive ? btn.color : isWrong ? '#ef4444' : `${btn.color}40`,
                                    borderColor: isActive ? '#fff' : isWrong ? '#ef4444' : btn.color,
                                    boxShadow: isActive ? `0 0 40px ${btn.glow}, inset 0 0 20px rgba(255,255,255,0.5)` : isWrong ? '0 0 30px rgba(239,68,68,0.8)' : `0 4px 15px rgba(0,0,0,0.3), inset 0 2px 5px rgba(255,255,255,0.1)`,
                                    filter: isActive ? 'brightness(1.5)' : isWrong ? 'brightness(1.2)' : 'brightness(0.9)',
                                    transform: isActive ? 'scale(0.95)' : 'scale(1)'
                                }}
                            >
                                {/* Optional: we can show icons when it glows */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                                            {btn.icon}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Bottom controls */}
                <motion.div className="flex gap-3 absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <motion.button whileHover={{}} whileTap={{}}
                        onClick={initGame} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={{ ...pill, background: 'rgba(0,0,0,0.5)' }}>
                        🔄 Yeniden
                    </motion.button>
                    <motion.button whileHover={{}} whileTap={{}}
                        onClick={() => setGameState('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={{ ...pill, background: 'rgba(0,0,0,0.5)' }}>
                        ← Çıkış
                    </motion.button>
                </motion.div>
            </motion.div>
        </>
    );
};

export default SimonSaysGame;
