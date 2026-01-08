'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

interface Obstacle {
  id: number;
  x: number;
  type: 'rock' | 'bird' | 'cactus';
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'star' | 'coin' | 'heart';
}

const CHARACTERS = [
  { id: 'bunny', emoji: '🐰', name: 'Tavşan' },
  { id: 'fox', emoji: '🦊', name: 'Tilki' },
  { id: 'cat', emoji: '🐱', name: 'Kedi' },
  { id: 'dog', emoji: '🐶', name: 'Köpek' },
];

const OBSTACLE_EMOJIS = {
  rock: '🪨',
  bird: '🦅',
  cactus: '🌵',
};

const COLLECTIBLE_EMOJIS = {
  star: '⭐',
  coin: '🪙',
  heart: '❤️',
};

const RunnerGame = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [character, setCharacter] = useState(CHARACTERS[0]);
  const [isJumping, setIsJumping] = useState(false);
  const [isDucking, setIsDucking] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(5);

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const playerY = useRef(0);

  const jump = useCallback(() => {
    if (isJumping || isDucking || gameState !== 'playing') return;
    playPopSound();
    setIsJumping(true);
    playerY.current = 1;
    setTimeout(() => {
      setIsJumping(false);
      playerY.current = 0;
    }, 300); // Daha hızlı zıplama - 300ms
  }, [isJumping, isDucking, gameState]);

  const duck = useCallback(() => {
    if (isJumping || isDucking || gameState !== 'playing') return;
    setIsDucking(true);
    setTimeout(() => setIsDucking(false), 400);
  }, [isJumping, isDucking, gameState]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setSpeed(5);
    setObstacles([]);
    setCollectibles([]);
    setIsJumping(false);
    setIsDucking(false);
  };

  const endGame = useCallback(() => {
    playErrorSound();
    setGameState('gameover');
    if (score > highScore) {
      setHighScore(score);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  }, [score, highScore]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastObstacleTime = 0;
    const minObstacleGap = 1500; // En az 1.5 saniye arayla engel gelsin

    gameLoopRef.current = setInterval(() => {
      const now = Date.now();

      // Engel spawn - sadece yeterli boşluk varsa
      if (now - lastObstacleTime > minObstacleGap && Math.random() < 0.03) {
        // Sadece yer engelleri (zıplayarak geçilebilir)
        // Kuşlar artık yok - çocuklar için daha kolay
        const types: ('rock' | 'cactus')[] = ['rock', 'cactus'];
        setObstacles(prev => [...prev, {
          id: obstacleIdRef.current++,
          x: 100,
          type: types[Math.floor(Math.random() * types.length)],
        }]);
        lastObstacleTime = now;
      }

      // Collectible spawn - havada veya yerde
      if (Math.random() < 0.015) {
        const types: ('star' | 'coin' | 'heart')[] = ['star', 'coin', 'heart'];
        setCollectibles(prev => [...prev, {
          id: collectibleIdRef.current++,
          x: 100,
          y: Math.random() > 0.5 ? 0 : 1, // 0: yerde, 1: havada
          type: types[Math.floor(Math.random() * types.length)],
        }]);
      }

      // Hareket
      setObstacles(prev => prev
        .map(o => ({ ...o, x: o.x - speed }))
        .filter(o => o.x > -10)
      );

      setCollectibles(prev => prev
        .map(c => ({ ...c, x: c.x - speed }))
        .filter(c => c.x > -10)
      );

      // Skor
      setScore(prev => prev + 1);

      // Hız artışı (daha yavaş)
      setSpeed(prev => Math.min(prev + 0.0005, 10));
    }, 50);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, speed]);

  // Çarpışma kontrolü
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Engel çarpışması - sadece yer engelleri var, zıplayarak geç
    for (const obstacle of obstacles) {
      if (obstacle.x > 5 && obstacle.x < 20) {
        // Yer engeli - zıplayarak geçilir
        if (!isJumping) {
          endGame();
          return;
        }
      }
    }

    // Collectible toplama
    setCollectibles(prev => {
      const remaining: Collectible[] = [];
      for (const c of prev) {
        if (c.x > 5 && c.x < 20) {
          // Havadaki yıldızı zıplayarak, yerdekini yürüyerek topla
          const canCollect = c.y === 1 ? isJumping : !isJumping;
          if (canCollect) {
            playSuccessSound();
            setScore(s => s + (c.type === 'star' ? 50 : c.type === 'coin' ? 25 : 10));
            continue;
          }
        }
        remaining.push(c);
      }
      return remaining;
    });
  }, [obstacles, collectibles, isJumping, gameState, endGame]);

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
        <h2 className="text-3xl font-black text-foreground">🏃 Koşucu</h2>
        <p className="text-muted-foreground font-semibold text-center">
          Engelleri atla, yıldızları topla!
        </p>

        <div className="space-y-3">
          <p className="font-bold text-center text-foreground">Karakter Seç:</p>
          <div className="flex gap-3">
            {CHARACTERS.map((char) => (
              <button
                key={char.id}
                onClick={() => { playPopSound(); setCharacter(char); }}
                className={`p-4 rounded-2xl text-4xl transition-all ${character.id === char.id
                  ? 'bg-primary scale-110 ring-4 ring-primary/50'
                  : 'bg-muted hover:scale-105'
                  }`}
              >
                {char.emoji}
              </button>
            ))}
          </div>
        </div>

        {highScore > 0 && (
          <p className="text-lg font-bold text-muted-foreground">
            🏆 En Yüksek: {highScore}
          </p>
        )}

        <button
          onClick={startGame}
          className="px-12 py-5 bg-success text-white text-2xl font-black rounded-full shadow-lg btn-bouncy"
        >
          Başla! 🚀
        </button>

        <div className="text-center text-sm text-muted-foreground">
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
      <div className="flex gap-4">
        <span className="px-4 py-2 bg-primary/10 rounded-full font-black text-primary">
          Skor: {score}
        </span>
        <span className="px-4 py-2 bg-muted rounded-full font-black text-muted-foreground">
          🏆 {highScore}
        </span>
      </div>

      {/* Oyun alanı */}
      <div
        className="relative w-full max-w-lg h-48 bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800 rounded-3xl overflow-hidden shadow-playful"
        onClick={jump}
        onContextMenu={(e) => { e.preventDefault(); duck(); }}
      >
        {/* Zemin */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-green-500 to-green-400" />

        {/* Karakter */}
        <motion.div
          className="absolute left-8 text-5xl"
          animate={{
            bottom: isJumping ? 100 : 48,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {character.emoji}
        </motion.div>

        {/* Engeller */}
        {obstacles.map((obstacle) => (
          <motion.div
            key={obstacle.id}
            className="absolute text-4xl"
            style={{
              left: `${obstacle.x}%`,
              bottom: 48,
            }}
          >
            {OBSTACLE_EMOJIS[obstacle.type]}
          </motion.div>
        ))}

        {/* Toplanabilirler */}
        {collectibles.map((c) => (
          <motion.div
            key={c.id}
            className="absolute text-3xl"
            style={{
              left: `${c.x}%`,
              bottom: c.y === 1 ? 100 : 48,
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {COLLECTIBLE_EMOJIS[c.type]}
          </motion.div>
        ))}

        {/* Game Over overlay */}
        {gameState === 'gameover' && (
          <motion.div
            className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-4xl font-black text-white">Game Over!</p>
            <p className="text-2xl font-bold text-white">Skor: {score}</p>
            {score === highScore && score > 0 && (
              <p className="text-xl font-bold text-yellow-400">🏆 Yeni Rekor!</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Mobil kontroller */}
      <div className="flex gap-4">
        <button
          onClick={jump}
          className="px-12 py-5 bg-primary text-white rounded-full font-black text-2xl btn-bouncy shadow-lg"
        >
          ⬆️ Zıpla!
        </button>
      </div>

      {gameState === 'gameover' && (
        <div className="flex gap-4">
          <button
            onClick={startGame}
            className="px-8 py-4 bg-success text-white rounded-full font-black text-xl btn-bouncy"
          >
            🔄 Tekrar
          </button>
          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-4 bg-muted text-muted-foreground rounded-full font-bold"
          >
            ← Menü
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default RunnerGame;

