'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

// Puzzle resimleri
const PUZZLE_IMAGES = [
    { id: 'bunny', name: '🐰 Tavşan', src: '/coloring/bunny.png' },
    { id: 'elephant', name: '🐘 Fil', src: '/coloring/elephant.png' },
    { id: 'cat', name: '🐱 Kedi', src: '/coloring/cat.png' },
    { id: 'dog', name: '🐶 Köpek', src: '/coloring/dog.png' },
    { id: 'dinosaur', name: '🦕 Dinozor', src: '/coloring/dinosaur.png' },
    { id: 'unicorn', name: '🦄 Unicorn', src: '/coloring/unicorn.png' },
    { id: 'lion', name: '🦁 Aslan', src: '/coloring/lion.png' },
    { id: 'butterfly', name: '🦋 Kelebek', src: '/coloring/butterfly.png' },
];

// Zorluk seviyeleri
const DIFFICULTIES = [
    { level: 1, cols: 2, rows: 2, name: 'Çok Kolay', pieces: 4 },
    { level: 2, cols: 3, rows: 2, name: 'Kolay', pieces: 6 },
    { level: 3, cols: 3, rows: 3, name: 'Orta', pieces: 9 },
    { level: 4, cols: 4, rows: 3, name: 'Zor', pieces: 12 },
    { level: 5, cols: 4, rows: 4, name: 'Çok Zor', pieces: 16 },
];

interface PuzzlePiece {
    id: number;
    row: number;
    col: number;
    placed: boolean;
}

const PuzzleGame = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentImage, setCurrentImage] = useState(PUZZLE_IMAGES[0]);
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [placedPieces, setPlacedPieces] = useState<Set<number>>(new Set());
    const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
    const [completedLevels, setCompletedLevels] = useState(0);
    const puzzleRef = useRef<HTMLDivElement>(null);

    const [gridSize, setGridSize] = useState(300);

    const difficulty = DIFFICULTIES[currentLevel] || DIFFICULTIES[0];
    const pieceWidth = gridSize / difficulty.cols;
    const pieceHeight = gridSize / difficulty.rows;

    // Ekran boyutuna göre grid'i ayarla
    useEffect(() => {
        const updateSize = () => {
            const width = Math.min(window.innerWidth - 64, 300);
            setGridSize(width);
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Puzzle'ı başlat
    const startPuzzle = useCallback((level: number) => {
        const diff = DIFFICULTIES[level];
        const image = PUZZLE_IMAGES[level % PUZZLE_IMAGES.length];
        const totalPieces = diff.cols * diff.rows;

        // Parçaları oluştur ve karıştır
        const newPieces: PuzzlePiece[] = [];
        for (let i = 0; i < totalPieces; i++) {
            newPieces.push({
                id: i,
                row: Math.floor(i / diff.cols),
                col: i % diff.cols,
                placed: false,
            });
        }

        // Fisher-Yates karıştırma
        for (let i = newPieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newPieces[i], newPieces[j]] = [newPieces[j], newPieces[i]];
        }

        setPieces(newPieces);
        setPlacedPieces(new Set());
        setCurrentImage(image);
        setCurrentLevel(level);
        setDraggedPiece(null);
        setGameState('playing');
        playPopSound();
    }, []);

    // Parçayı sürüklemeye başla
    const handleDragStart = (pieceId: number) => {
        if (placedPieces.has(pieceId)) return;
        setDraggedPiece(pieceId);
        playPopSound();
    };

    // Parçayı bırak
    const handleDrop = (targetRow: number, targetCol: number) => {
        if (draggedPiece === null) return;

        const piece = pieces.find(p => p.id === draggedPiece);
        if (!piece) return;

        // Doğru pozisyon mu?
        if (piece.row === targetRow && piece.col === targetCol) {
            playSuccessSound();

            const newPlaced = new Set(placedPieces);
            newPlaced.add(draggedPiece);
            setPlacedPieces(newPlaced);

            // Tamamlandı mı?
            if (newPlaced.size === pieces.length) {
                setTimeout(() => {
                    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                    setGameState('complete');
                    setCompletedLevels(prev => Math.max(prev, currentLevel + 1));
                }, 300);
            }
        } else {
            playErrorSound();
        }

        setDraggedPiece(null);
    };

    // Touch olayları için
    const handleTouchEnd = (e: React.TouchEvent, targetRow: number, targetCol: number) => {
        e.preventDefault();
        handleDrop(targetRow, targetCol);
    };

    // Sonraki seviye
    const nextLevel = () => {
        if (currentLevel < DIFFICULTIES.length - 1) {
            startPuzzle(currentLevel + 1);
        } else {
            setGameState('menu');
        }
    };

    // Puzzle parça şekli (SVG clip-path benzeri border)
    const getPieceStyle = (row: number, col: number, isPlaced: boolean) => {
        const baseStyle: React.CSSProperties = {
            width: pieceWidth + 5,
            height: pieceHeight + 5,
            backgroundImage: `url(${currentImage.src})`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `-${col * pieceWidth}px -${row * pieceHeight}px`,
            borderRadius: '8px',
            boxShadow: isPlaced ? 'none' : '0 4px 12px rgba(0,0,0,0.3)',
            border: isPlaced ? 'none' : '2px solid rgba(255,255,255,0.8)',
        };
        return baseStyle;
    };

    // Menü ekranı
    if (gameState === 'menu') {
        return (
            <motion.div
                className="flex flex-col items-center gap-6 p-4 pb-32"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-3xl font-black text-foreground">🧩 Puzzle</h2>
                <p className="text-muted-foreground font-semibold text-center">
                    Parçaları sürükle, resmi tamamla!
                </p>

                <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
                    {DIFFICULTIES.map((diff, index) => {
                        const isUnlocked = index <= completedLevels;
                        const image = PUZZLE_IMAGES[index % PUZZLE_IMAGES.length];

                        return (
                            <button
                                key={diff.level}
                                onClick={() => isUnlocked && startPuzzle(index)}
                                disabled={!isUnlocked}
                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isUnlocked
                                    ? 'bg-primary/10 hover:bg-primary/20 hover:scale-105'
                                    : 'bg-muted opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <div
                                    className="w-12 h-12 rounded-lg bg-cover bg-center border-2 border-primary/30"
                                    style={{ backgroundImage: isUnlocked ? `url(${image.src})` : undefined }}
                                >
                                    {!isUnlocked && <span className="flex items-center justify-center h-full text-2xl">🔒</span>}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-foreground">Seviye {diff.level}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {diff.name} • {diff.pieces} parça
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        );
    }

    // Tamamlandı ekranı
    if (gameState === 'complete') {
        return (
            <motion.div
                className="flex flex-col items-center gap-6 p-4 pb-32"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div
                    className="w-64 h-64 rounded-2xl bg-cover bg-center shadow-playful border-4 border-success"
                    style={{ backgroundImage: `url(${currentImage.src})` }}
                />
                <h2 className="text-3xl font-black text-foreground">🎉 Tebrikler!</h2>
                <p className="text-muted-foreground font-bold">
                    {currentImage.name} tamamlandı!
                </p>

                <div className="flex gap-3">
                    {currentLevel < DIFFICULTIES.length - 1 ? (
                        <button
                            onClick={nextLevel}
                            className="px-8 py-4 bg-primary text-white text-xl font-black rounded-full shadow-lg btn-bouncy"
                        >
                            Sonraki Seviye →
                        </button>
                    ) : (
                        <button
                            onClick={() => setGameState('menu')}
                            className="px-8 py-4 bg-success text-white text-xl font-black rounded-full shadow-lg btn-bouncy"
                        >
                            🏆 Tamamlandı!
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setGameState('menu')}
                    className="px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold"
                >
                    Ana Menü
                </button>
            </motion.div>
        );
    }

    // Yerleştirilmemiş parçalar
    const unplacedPieces = pieces.filter(p => !placedPieces.has(p.id));

    // Oyun ekranı
    return (
        <motion.div
            className="flex flex-col items-center gap-4 p-4 pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-foreground">🧩 Seviye {currentLevel + 1}</h2>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-bold">
                    {placedPieces.size}/{pieces.length}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start w-full max-w-4xl justify-center">
                {/* Puzzle Alanı - Hedef */}
                <div
                    ref={puzzleRef}
                    className="relative bg-gray-200 dark:bg-gray-700 rounded-2xl shadow-playful overflow-hidden"
                    style={{ width: gridSize + 20, height: gridSize + 20, padding: 10 }}
                >
                    {/* Grid çizgileri ve hedef alanları */}
                    <div
                        className="grid gap-0 rounded-lg overflow-hidden"
                        style={{
                            gridTemplateColumns: `repeat(${difficulty.cols}, 1fr)`,
                            width: gridSize,
                            height: gridSize
                        }}
                    >
                        {Array.from({ length: difficulty.cols * difficulty.rows }).map((_, index) => {
                            const row = Math.floor(index / difficulty.cols);
                            const col = index % difficulty.cols;
                            const placedPiece = pieces.find(p => p.row === row && p.col === col && placedPieces.has(p.id));

                            return (
                                <div
                                    key={index}
                                    className={`relative transition-all ${draggedPiece !== null && !placedPiece
                                        ? 'bg-primary/30 hover:bg-primary/50 cursor-pointer'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    style={{
                                        width: pieceWidth,
                                        height: pieceHeight,
                                        border: '1px dashed rgba(0,0,0,0.2)',
                                    }}
                                    onClick={() => handleDrop(row, col)}
                                    onTouchEnd={(e) => handleTouchEnd(e, row, col)}
                                >
                                    {placedPiece && (
                                        <div
                                            style={{
                                                width: pieceWidth,
                                                height: pieceHeight,
                                                backgroundImage: `url(${currentImage.src})`,
                                                backgroundSize: `${300}px ${300}px`,
                                                backgroundPosition: `-${col * pieceWidth}px -${row * pieceHeight}px`,
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Referans mini resim */}
                    <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-lg bg-cover bg-center border-2 border-white shadow-lg"
                        style={{ backgroundImage: `url(${currentImage.src})` }}
                    />
                </div>

                {/* Parça Havuzu */}
                <div className="flex-1 max-sm">
                    <p className="text-sm font-bold text-muted-foreground mb-3 text-center lg:text-left">
                        📦 Parçalar - Sürükle ve bırak!
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start p-4 bg-card rounded-2xl shadow-sm min-h-[200px]">
                        {unplacedPieces.map((piece) => (
                            <motion.div
                                key={piece.id}
                                className={`cursor-grab active:cursor-grabbing rounded-lg overflow-hidden transition-all ${draggedPiece === piece.id
                                    ? 'scale-110 ring-4 ring-primary shadow-xl z-10'
                                    : 'hover:scale-105 hover:shadow-lg'
                                    }`}
                                style={getPieceStyle(piece.row, piece.col, false)}
                                draggable
                                onDragStart={() => handleDragStart(piece.id)}
                                onTouchStart={() => handleDragStart(piece.id)}
                                onClick={() => {
                                    if (draggedPiece === piece.id) {
                                        setDraggedPiece(null);
                                    } else {
                                        handleDragStart(piece.id);
                                    }
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            />
                        ))}

                        {unplacedPieces.length === 0 && (
                            <p className="text-center text-muted-foreground w-full">
                                Tüm parçalar yerleştirildi! 🎉
                            </p>
                        )}
                    </div>

                    {draggedPiece !== null && (
                        <p className="text-sm text-primary font-bold mt-4 text-center animate-pulse">
                            👆 Parça seçili - Puzzle&apos;da yerine tıkla!
                        </p>
                    )}
                </div>
            </div>

            <button
                onClick={() => setGameState('menu')}
                className="px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold mt-4"
            >
                ← Ana Menü
            </button>
        </motion.div>
    );
};

export default PuzzleGame;
