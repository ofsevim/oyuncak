'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

// Oyun Ayarları
const COLS = 10;
const ROWS = 16;
const INITIAL_DROP_TIME = 800;
const MIN_DROP_TIME = 100;

// Blok Şekilleri
const TETROMINOS = {
    I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-400', shadow: 'shadow-cyan-500/50' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-500', shadow: 'shadow-blue-600/50' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-400', shadow: 'shadow-orange-500/50' },
    O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400', shadow: 'shadow-yellow-500/50' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-400', shadow: 'shadow-green-500/50' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-500', shadow: 'shadow-purple-600/50' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-500', shadow: 'shadow-red-600/50' },
};

type TetrominoKey = keyof typeof TETROMINOS;

const TetrisGame = () => {
    const [grid, setGrid] = useState<(string | null)[][]>(
        Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    );
    const [activePiece, setActivePiece] = useState<{
        pos: { x: number; y: number };
        type: TetrominoKey;
        shape: number[][];
    } | null>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [linesClearedTotal, setLinesClearedTotal] = useState(0);
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
    const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

    // Rastgele yeni parça oluştur
    const spawnPiece = useCallback(() => {
        const keys = Object.keys(TETROMINOS) as TetrominoKey[];
        const type = keys[Math.floor(Math.random() * keys.length)];
        const piece = {
            pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
            type,
            shape: TETROMINOS[type].shape,
        };

        // Çarpışma kontrolü (Oyun Bitti?)
        if (checkCollision(piece.pos.x, piece.pos.y, piece.shape)) {
            setGameState('gameover');
            return;
        }

        setActivePiece(piece);
    }, []);

    // Çarpışma Kontrolü
    const checkCollision = (x: number, y: number, shape: number[][], currentGrid = grid) => {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const newX = x + c;
                    const newY = y + r;

                    // Duvarlar ve zemin kontrolü
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }

                    // Grid doluluk kontrolü
                    if (newY >= 0 && currentGrid[newY][newX] !== null) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Parçayı Yerleştir ve Satır Kontrolü Yap
    const lockPiece = useCallback(() => {
        if (!activePiece) return;

        let isGameOver = false;
        const newGrid = grid.map(row => [...row]);

        activePiece.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell !== 0) {
                    const y = activePiece.pos.y + r;
                    const x = activePiece.pos.x + c;

                    if (y < 0) {
                        // Eğer parça hâlâ ekranın dışındayken yerleşmek zorunda kaldıysa oyun biter
                        isGameOver = true;
                    } else if (y < ROWS) {
                        newGrid[y][x] = activePiece.type;
                    }
                }
            });
        });

        if (isGameOver) {
            setGameState('gameover');
            playErrorSound();
            return;
        }

        // Satırları temizle
        let clearedLines = 0;
        const filteredGrid = newGrid.filter(row => {
            const isFull = row.every(cell => cell !== null);
            if (isFull) clearedLines++;
            return !isFull;
        });

        while (filteredGrid.length < ROWS) {
            filteredGrid.unshift(Array(COLS).fill(null));
        }

        if (clearedLines > 0) {
            setScore(prev => prev + clearedLines * 100 * level);
            setLinesClearedTotal(prev => {
                const newTotal = prev + clearedLines;
                const newLevel = Math.floor(newTotal / 10) + 1;
                if (newLevel > level) {
                    setLevel(newLevel);
                    setDropTime(Math.max(MIN_DROP_TIME, INITIAL_DROP_TIME * Math.pow(0.85, newLevel - 1)));
                }
                return newTotal;
            });
            playSuccessSound();
            if (clearedLines === 4) {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
            }
        } else {
            playPopSound();
        }

        setGrid(filteredGrid);

        // Yeni parça spawn etmeden önce grid'in en üst satırını kontrol et (opsiyonel ama güvenli)
        const nextKeys = Object.keys(TETROMINOS) as TetrominoKey[];
        const nextType = nextKeys[Math.floor(Math.random() * nextKeys.length)];
        const nextPiece = {
            pos: { x: Math.floor(COLS / 2) - 1, y: -1 }, // Bir tık yukarıdan başla
            type: nextType,
            shape: TETROMINOS[nextType].shape,
        };

        if (checkCollision(nextPiece.pos.x, 0, nextPiece.shape, filteredGrid)) {
            setGameState('gameover');
            playErrorSound();
        } else {
            setActivePiece(nextPiece);
        }
    }, [activePiece, grid, level]);

    // Parçayı Hareket Ettir
    const movePiece = (dx: number, dy: number) => {
        if (!activePiece || gameState !== 'playing') return;
        if (!checkCollision(activePiece.pos.x + dx, activePiece.pos.y + dy, activePiece.shape)) {
            setActivePiece(prev => prev ? { ...prev, pos: { x: prev.pos.x + dx, y: prev.pos.y + dy } } : null);
        } else if (dy > 0) {
            lockPiece();
        }
    };

    // Parçayı Döndür
    const rotatePiece = () => {
        if (!activePiece || gameState !== 'playing') return;
        const rotated = activePiece.shape[0].map((_, i) =>
            activePiece.shape.map(row => row[i]).reverse()
        );
        if (!checkCollision(activePiece.pos.x, activePiece.pos.y, rotated)) {
            setActivePiece(prev => prev ? { ...prev, shape: rotated } : null);
            playPopSound();
        }
    };

    // Oyun Döngüsü
    useEffect(() => {
        if (gameState === 'playing') {
            gameLoopRef.current = setInterval(() => {
                movePiece(0, 1);
            }, dropTime);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameState, dropTime, activePiece]);

    // Klavye Kontrolü
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'ArrowLeft') movePiece(-1, 0);
            if (e.key === 'ArrowRight') movePiece(1, 0);
            if (e.key === 'ArrowDown') movePiece(0, 1);
            if (e.key === 'ArrowUp') rotatePiece();
            if (e.key === ' ') {
                if (!activePiece) return;
                while (!checkCollision(activePiece.pos.x, activePiece.pos.y + 1, activePiece.shape)) {
                    activePiece.pos.y += 1;
                }
                lockPiece();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [activePiece, gameState, movePiece, lockPiece, rotatePiece]);

    const startGame = () => {
        setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
        setScore(0);
        setLevel(1);
        setLinesClearedTotal(0);
        setDropTime(INITIAL_DROP_TIME);
        setGameState('playing');
        spawnPiece();
    };

    return (
        <div className="flex flex-col items-center gap-6 p-4">
            <div className="flex justify-between w-full max-w-[320px] items-center bg-white/50 backdrop-blur-sm p-4 rounded-3xl shadow-sm">
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Puan</span>
                        <span className="text-2xl font-black text-primary">{score}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-6">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Seviye</span>
                        <span className="text-2xl font-black text-indigo-500">{level}</span>
                    </div>
                </div>
                <div className="text-3xl">🧱</div>
            </div>

            <div className="relative bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-playful border-4 border-white">
                {/* Grid Alanı */}
                <div
                    className="grid gap-[1px] bg-slate-200 rounded-lg overflow-hidden relative"
                    style={{
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                        width: 280,
                        height: 448
                    }}
                >
                    {grid.map((row, y) =>
                        row.map((cell, x) => (
                            <div
                                key={`${x}-${y}`}
                                className={`w-full h-full transition-colors duration-200 ${cell ? `${TETROMINOS[cell as TetrominoKey].color} border-2 border-white/20 rounded-[2px]` : 'bg-white/40'
                                    }`}
                            />
                        ))
                    )}

                    {/* Aktif Parça */}
                    {activePiece && activePiece.shape.map((row, r) =>
                        row.map((cell, c) => {
                            if (cell === 0) return null;
                            const x = activePiece.pos.x + c;
                            const y = activePiece.pos.y + r;
                            if (y < 0) return null;
                            return (
                                <div
                                    key={`active-${r}-${c}`}
                                    className={`absolute ${TETROMINOS[activePiece.type].color} border-2 border-white/30 rounded-[3px] shadow-sm`}
                                    style={{
                                        width: 'calc(100% / 10)',
                                        height: 'calc(100% / 16)',
                                        left: `${x * 10}%`,
                                        top: `${y * 6.25}%`,
                                    }}
                                />
                            );
                        })
                    )}

                    {/* Menü / Oyun Bitti Overlay */}
                    <AnimatePresence>
                        {gameState !== 'playing' && (
                            <motion.div
                                className="absolute inset-0 z-20 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {gameState === 'menu' ? (
                                    <>
                                        <h2 className="text-4xl font-black text-primary mb-2 italic">TETRİS</h2>
                                        <p className="text-muted-foreground font-bold mb-8">Blokları yerleştir, satırları tamamla!</p>
                                        <button
                                            onClick={startGame}
                                            className="w-full py-4 bg-primary text-white rounded-full font-black text-xl shadow-lg btn-bouncy"
                                        >
                                            OYUNA BAŞLA
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-6xl mb-4">😵</div>
                                        <h2 className="text-3xl font-black text-destructive mb-2">OYUN BİTTİ!</h2>
                                        <p className="text-muted-foreground font-bold mb-6">Puanın: <span className="text-primary text-xl">{score}</span></p>
                                        <button
                                            onClick={startGame}
                                            className="w-full py-4 bg-primary text-white rounded-full font-black text-xl shadow-lg btn-bouncy"
                                        >
                                            TEKRAR DENE
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Kontroller (Mobil için) */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[320px]">
                <div />
                <button
                    onClick={rotatePiece}
                    className="p-5 bg-white rounded-2xl shadow-md active:scale-90 transition-transform flex items-center justify-center text-2xl border-b-4 border-slate-200"
                >
                    🔄
                </button>
                <div />

                <button
                    onClick={() => movePiece(-1, 0)}
                    className="p-5 bg-white rounded-2xl shadow-md active:scale-90 transition-transform flex items-center justify-center text-2xl border-b-4 border-slate-200"
                >
                    ⬅️
                </button>
                <button
                    onClick={() => movePiece(0, 1)}
                    className="p-5 bg-white rounded-2xl shadow-md active:scale-90 transition-transform flex items-center justify-center text-2xl border-b-4 border-slate-200"
                >
                    ⬇️
                </button>
                <button
                    onClick={() => movePiece(1, 0)}
                    className="p-5 bg-white rounded-2xl shadow-md active:scale-90 transition-transform flex items-center justify-center text-2xl border-b-4 border-slate-200"
                >
                    ➡️
                </button>
            </div>
        </div>
    );
};

export default TetrisGame;
