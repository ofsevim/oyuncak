'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessSound, playPopSound, playLevelUpSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

const GRID_SIZE = 8;
const TOTAL_WORDS = 5;

const WORD_LISTS = [
    { words: ['ELMA', 'ARMUT', 'KARPUZ', 'PORTAKAL', 'ÇİLEK'], theme: 'Meyveler', emoji: '🍎' },
    { words: ['KEDİ', 'KÖPEK', 'KUŞ', 'BALIK', 'FİL'], theme: 'Hayvanlar', emoji: '🐱' },
    { words: ['KIRMIZI', 'MAVİ', 'YEŞİL', 'SARI', 'MOR'], theme: 'Renkler', emoji: '🎨' },
    { words: ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA'], theme: 'Günler', emoji: '📅' },
    { words: ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS'], theme: 'Aylar', emoji: '📆' },
];

const DIRECTIONS = [
    [0, 1],   // sağ
    [1, 0],   // aşağı
    [1, 1],   // sağ alt çapraz
];

interface Cell {
    letter: string;
    row: number;
    col: number;
    isSelected: boolean;
    isFound: boolean;
    wordIndex: number | null;
}

interface WordPlacement {
    word: string;
    startRow: number;
    startCol: number;
    direction: [number, number];
    found: boolean;
}

const WordSearchGame: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'success'>('start');
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [words, setWords] = useState<WordPlacement[]>([]);
    const [currentWordList, setCurrentWordList] = useState(WORD_LISTS[0]);
    const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);
    const [timeLeft, setTimeLeft] = useState(120);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [highScore, setHighScore] = useState(() => getHighScore('wordsearch'));
    const [isSelecting, setIsSelecting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { clearAllTimeouts } = useSafeTimeouts();

    const placeWords = useCallback((wordList: typeof WORD_LISTS[0]) => {
        const newGrid: Cell[][] = Array(GRID_SIZE).fill(null).map((_, row) =>
            Array(GRID_SIZE).fill(null).map((_, col) => ({
                letter: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                row,
                col,
                isSelected: false,
                isFound: false,
                wordIndex: null,
            }))
        );

        const placements: WordPlacement[] = [];

        wordList.words.forEach((word, wordIdx) => {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                const startRow = Math.floor(Math.random() * GRID_SIZE);
                const startCol = Math.floor(Math.random() * GRID_SIZE);

                let canPlace = true;
                for (let i = 0; i < word.length; i++) {
                    const r = startRow + dir[0] * i;
                    const c = startCol + dir[1] * i;
                    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                        canPlace = false;
                        break;
                    }
                    if (newGrid[r][c].wordIndex !== null && newGrid[r][c].wordIndex !== wordIdx) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
                    for (let i = 0; i < word.length; i++) {
                        const r = startRow + dir[0] * i;
                        const c = startCol + dir[1] * i;
                        newGrid[r][c].letter = word[i];
                        newGrid[r][c].wordIndex = wordIdx;
                    }
                    placements.push({ word, startRow, startCol, direction: dir, found: false });
                    placed = true;
                }
                attempts++;
            }
        });

        setGrid(newGrid);
        setWords(placements);
    }, []);

    const startGame = useCallback(() => {
        const randomList = WORD_LISTS[Math.floor(Math.random() * WORD_LISTS.length)];
        setCurrentWordList(randomList);
        placeWords(randomList);
        setGamePhase('playing');
        setScore(0);
        setRound(1);
        setTimeLeft(120);
        setIsNewRecord(false);
        setSelectedCells([]);
    }, [placeWords]);

    const handleCellPointerDown = useCallback((row: number, col: number) => {
        if (gamePhase !== 'playing') return;
        setIsSelecting(true);
        setSelectedCells([{ row, col }]);
    }, [gamePhase]);

    const handleCellPointerEnter = useCallback((row: number, col: number) => {
        if (!isSelecting || gamePhase !== 'playing') return;
        setSelectedCells(prev => {
            const exists = prev.some(c => c.row === row && c.col === col);
            if (exists) return prev;
            return [...prev, { row, col }];
        });
    }, [isSelecting, gamePhase]);

    const handlePointerUp = useCallback(() => {
        if (!isSelecting || gamePhase !== 'playing') return;
        setIsSelecting(false);

        const selectedWord = selectedCells.map(c => grid[c.row][c.col].letter).join('');
        const reversedWord = selectedWord.split('').reverse().join('');

        const matchedWord = words.find(w =>
            (!w.found && (w.word === selectedWord || w.word === reversedWord))
        );

        if (matchedWord) {
            playSuccessSound();
            const wordScore = matchedWord.word.length * 10;
            setScore(prev => prev + wordScore);

            setGrid(prev => prev.map(row => row.map(cell => {
                const isSelected = selectedCells.some(s => s.row === cell.row && s.col === cell.col);
                if (isSelected) {
                    return { ...cell, isFound: true };
                }
                return cell;
            })));

            setWords(prev => prev.map(w => w.word === matchedWord.word ? { ...w, found: true } : w));

            const allFound = words.every(w => w.found || w.word === matchedWord.word);
            if (allFound) {
                playLevelUpSound();
                const roundBonus = 50;
                setScore(prev => prev + roundBonus);
                setGamePhase('success');

                const finalScore = score + wordScore + roundBonus;
                const isNew = saveHighScoreObj('wordsearch', finalScore);
                if (isNew) {
                    setIsNewRecord(true);
                    playNewRecordSound();
                    fireConfetti();
                }
                setHighScore(getHighScore('wordsearch'));
            }
        }

        setSelectedCells([]);
    }, [isSelecting, gamePhase, selectedCells, grid, words, score]);

    useEffect(() => {
        if (gamePhase === 'playing' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setGamePhase('success');
                        const isNew = saveHighScoreObj('wordsearch', score);
                        if (isNew) {
                            setIsNewRecord(true);
                            playNewRecordSound();
                            fireConfetti();
                        }
                        setHighScore(getHighScore('wordsearch'));
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

    const foundCount = words.filter(w => w.found).length;

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
                        <div className="text-6xl">🔍</div>
                        <h2 className="text-2xl font-black text-foreground">Kelime Avı</h2>
                        <p className="text-muted-foreground text-center">
                            Gizli kelimeleri bul ve işaretle!
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
                            <div className="glass-card px-3 py-1 border border-blue-500/20">
                                <span className="text-sm font-black text-blue-400">🔍 {currentWordList.emoji} {currentWordList.theme}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-yellow-500/20">
                                <span className="text-sm font-black text-yellow-400">⭐ {score}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-green-500/20">
                                <span className="text-sm font-black text-green-400">✅ {foundCount}/{words.length}</span>
                            </div>
                            <div className="glass-card px-3 py-1 border border-orange-500/20">
                                <span className={`text-sm font-black ${timeLeft <= 30 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                                    ⏱️ {timeLeft}s
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center">
                            {words.map((w, i) => (
                                <span
                                    key={i}
                                    className={`text-xs font-bold px-2 py-1 rounded-full ${w.found ? 'bg-green-500/20 text-green-400 line-through' : 'bg-muted text-muted-foreground'}`}
                                >
                                    {w.word}
                                </span>
                            ))}
                        </div>

                        <div
                            className="grid gap-1 p-2 rounded-xl bg-background/50"
                            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        >
                            {grid.map((row, rowIdx) =>
                                row.map((cell, colIdx) => {
                                    const isSelected = selectedCells.some(c => c.row === rowIdx && c.col === colIdx);
                                    return (
                                        <motion.button
                                            key={`${rowIdx}-${colIdx}`}
                                            onPointerDown={() => handleCellPointerDown(rowIdx, colIdx)}
                                            onPointerEnter={() => handleCellPointerEnter(rowIdx, colIdx)}
                                            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg font-bold text-sm md:text-base flex items-center justify-center transition-all ${cell.isFound
                                                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                                : isSelected
                                                    ? 'bg-primary/30 text-primary border border-primary/50 scale-110'
                                                    : 'bg-muted/50 text-foreground border border-border hover:bg-muted'
                                                }`}
                                            style={{ touchAction: 'none' }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            {cell.letter}
                                        </motion.button>
                                    );
                                })
                            )}
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
                        <h2 className="text-2xl font-black text-foreground">
                            {timeLeft > 0 ? 'Tebrikler!' : 'Süre Doldu!'}
                        </h2>
                        <div className="glass-card p-6 rounded-2xl text-center space-y-3">
                            <p className="text-sm text-muted-foreground">Skorun</p>
                            <p className="text-4xl font-black text-primary">{score}</p>
                            {isNewRecord && (
                                <motion.p
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-yellow-400 font-bold"
                                >
                                    🏆 Yeni Rekor!
                                </motion.p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={startGame}
                                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-transform"
                            >
                                Tekrar Oyna
                            </button>
                            <button
                                onClick={() => setGamePhase('start')}
                                className="px-6 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:scale-105 transition-transform"
                            >
                                Menü
                            </button>
                        </div>
                        <Leaderboard gameId="wordsearch" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WordSearchGame;