'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

interface Obstacle {
  id: number;
  x: number;
  type: 'rock' | 'cactus';
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

// Oyun sabitleri
const GAME_CONFIG = {
  INITIAL_SPEED: 4,
  MAX_SPEED: 12,
  SPEED_INCREMENT: 0.003,
  JUMP_DURATION: 280,
  JUMP_HEIGHT: 130,
  GROUND_Y: 48,
  PLAYER_X: 8,
  HITBOX_START: 5,
  HITBOX_END: 18,
  MIN_OBSTACLE_GAP: 1800,
  OBSTACLE_SPAWN_CHANCE: 0.025,
  COLLECTIBLE_SPAWN_CHANCE: 0.008, // Daha az kalp ve yıldız (Zorluk arttı)
  INITIAL_LIVES: 3,
  MAX_LIVES: 5,
  SHIELD_DURATION: 3000,
  FRENZY_DURATION: 5000,
};

const RunnerGame = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [character, setCharacter] = useState(CHARACTERS[0]);
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(GAME_CONFIG.INITIAL_SPEED);
  const [lives, setLives] = useState(GAME_CONFIG.INITIAL_LIVES);
  const [hasShield, setHasShield] = useState(false);
  const [isFrenzy, setIsFrenzy] = useState(false);
  const [lastObstacleX, setLastObstacleX] = useState(0);

  // Refs for game loop
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastObstacleTimeRef = useRef<number>(0);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const isJumpingRef = useRef(false);
  const speedRef = useRef(GAME_CONFIG.INITIAL_SPEED);
  const scoreRef = useRef(0);
  const livesRef = useRef(GAME_CONFIG.INITIAL_LIVES);
  const hasShieldRef = useRef(false);
  const isFrenzyRef = useRef(false);

  // Sync refs with state
  useEffect(() => { isJumpingRef.current = isJumping; }, [isJumping]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { hasShieldRef.current = hasShield; }, [hasShield]);
  useEffect(() => { isFrenzyRef.current = isFrenzy; }, [isFrenzy]);

  // Zıplama fonksiyonu
  const jump = useCallback(() => {
    if (isJumpingRef.current || gameState !== 'playing') return;
    playPopSound();
    setIsJumping(true);
    isJumpingRef.current = true;

    setTimeout(() => {
      setIsJumping(false);
      isJumpingRef.current = false;
    }, GAME_CONFIG.JUMP_DURATION);
  }, [gameState]);

  // Oyunu başlat
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setSpeed(GAME_CONFIG.INITIAL_SPEED);
    setObstacles([]);
    setCollectibles([]);
    setIsJumping(false);
    setLives(GAME_CONFIG.INITIAL_LIVES);
    setHasShield(false);
    setIsFrenzy(false);
    scoreRef.current = 0;
    speedRef.current = GAME_CONFIG.INITIAL_SPEED;
    isJumpingRef.current = false;
    livesRef.current = GAME_CONFIG.INITIAL_LIVES;
    hasShieldRef.current = false;
    isFrenzyRef.current = false;
    lastTimeRef.current = 0;
    lastObstacleTimeRef.current = 0;
    obstacleIdRef.current = 0;
    collectibleIdRef.current = 0;
  }, []);

  // Can kaybet
  const loseLife = useCallback(() => {
    if (hasShieldRef.current || isFrenzyRef.current) return; // Kalkan veya Frenzy varsa hasar almaz

    playErrorSound();
    setLives(prev => {
      const newLives = prev - 1;
      livesRef.current = newLives;

      if (newLives <= 0) {
        // Oyun bitti
        setGameState('gameover');
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else {
        // Geçici koruma
        setHasShield(true);
        hasShieldRef.current = true;
        setTimeout(() => {
          setHasShield(false);
          hasShieldRef.current = false;
        }, GAME_CONFIG.SHIELD_DURATION);
      }

      return newLives;
    });
  }, [highScore]);

  // Ana oyun döngüsü
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const updateInterval = 50;
      const updates = Math.floor(deltaTime / updateInterval) || 1;

      for (let i = 0; i < updates; i++) {
        // Engel spawn
        if (currentTime - lastObstacleTimeRef.current > GAME_CONFIG.MIN_OBSTACLE_GAP) {
          if (Math.random() < GAME_CONFIG.OBSTACLE_SPAWN_CHANCE) {
            const types: ('rock' | 'cactus')[] = ['rock', 'cactus'];
            setObstacles(prev => [...prev, {
              id: obstacleIdRef.current++,
              x: 100,
              type: types[Math.floor(Math.random() * types.length)],
            }]);
            lastObstacleTimeRef.current = currentTime;
          }
        }

        // Collectible spawn
        if (Math.random() < GAME_CONFIG.COLLECTIBLE_SPAWN_CHANCE) {
          const types: ('star' | 'coin' | 'heart')[] = ['star', 'coin', 'heart'];
          setCollectibles(prev => [...prev, {
            id: collectibleIdRef.current++,
            x: 100,
            y: Math.random() > 0.5 ? 0 : 1,
            type: types[Math.floor(Math.random() * types.length)],
          }]);
        }

        // Hız hesapla
        const currentSpeed = speedRef.current;

        // Hareket ve çarpışma kontrolü
        setObstacles(prev => {
          const updated = prev
            .map(o => ({ ...o, x: o.x - currentSpeed * 0.3 }))
            .filter(o => o.x > -10);

          // Çarpışma kontrolü
          for (const obstacle of updated) {
            if (obstacle.x > GAME_CONFIG.HITBOX_START && obstacle.x < GAME_CONFIG.HITBOX_END) {
              if (!isJumpingRef.current) {
                if (isFrenzyRef.current) {
                  // Frenzy modunda engel yok edilir ve puan verilir
                  playSuccessSound();
                  setScore(s => s + 100);
                  return updated.filter(o => o.id !== obstacle.id);
                } else {
                  loseLife();
                  return updated.filter(o => o.id !== obstacle.id);
                }
              }
            }
          }

          return updated;
        });

        // Collectibles hareket ve toplama
        setCollectibles(prev => {
          const remaining: Collectible[] = [];

          for (const c of prev) {
            const newX = c.x - currentSpeed * 0.3;

            if (newX < -10) continue;

            // Toplama kontrolü
            if (newX > GAME_CONFIG.HITBOX_START && newX < GAME_CONFIG.HITBOX_END) {
              const canCollect = c.y === 1 ? isJumpingRef.current : !isJumpingRef.current;
              if (canCollect) {
                playSuccessSound();

                if (c.type === 'heart') {
                  // Kalp: Can ekle
                  setLives(l => {
                    const newLives = Math.min(l + 1, GAME_CONFIG.MAX_LIVES);
                    livesRef.current = newLives;
                    return newLives;
                  });
                } else if (c.type === 'star') {
                  // Yıldız: Süper Mod (5 saniye)
                  setIsFrenzy(true);
                  isFrenzyRef.current = true;
                  setScore(s => s + 50);
                  setTimeout(() => {
                    setIsFrenzy(false);
                    isFrenzyRef.current = false;
                  }, GAME_CONFIG.FRENZY_DURATION);
                } else {
                  // Coin: Puan
                  setScore(s => s + 25);
                }
                continue;
              }
            }

            remaining.push({ ...c, x: newX });
          }

          return remaining;
        });

        // Skor artışı
        setScore(s => s + 1);

        // Hız artışı
        setSpeed(s => Math.min(s + GAME_CONFIG.SPEED_INCREMENT, GAME_CONFIG.MAX_SPEED));
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, loseLife]);

  // Klavye kontrolü
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') jump();
        else if (gameState === 'menu' || gameState === 'gameover') startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, startGame, gameState]);

  // Menü ekranı
  if (gameState === 'menu') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-4 pb-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-black text-foreground">🏃 Koşucu</h2>
        <p className="text-muted-foreground font-semibold text-center">
          Engelleri atla, güçleri topla!
        </p>

        {/* Power-up açıklamaları */}
        <div className="bg-card/50 p-4 rounded-2xl space-y-3 text-sm">
          <p className="flex items-center gap-2"><span className="text-xl">❤️</span> <span className="font-bold">Kalp:</span> +1 Can</p>
          <p className="flex items-center gap-2">
            <span className="w-6 h-6 bg-yellow-400 shadow-sm" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <span className="font-bold">Yıldız:</span> Süper Mod (5 saniye ölümsüzlük + bonus puan)
          </p>
          <p className="flex items-center gap-2">
            <span className="w-5 h-5 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full border-2 border-yellow-700 flex items-center justify-center text-xs font-black text-yellow-800">$</span>
            <span className="font-bold">Coin:</span> +25 Puan
          </p>
        </div>

        {/* Karakter seçimi */}
        <div className="flex gap-3">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => { playPopSound(); setCharacter(c); }}
              className={`p-4 rounded-2xl text-4xl transition-all ${character.id === c.id
                ? 'bg-primary scale-110 shadow-lg'
                : 'bg-muted hover:scale-105'
                }`}
            >
              {c.emoji}
            </button>
          ))}
        </div>

        <button
          onClick={startGame}
          className="px-10 py-4 bg-primary text-white text-xl font-black rounded-full shadow-lg btn-bouncy"
        >
          🚀 BAŞLA!
        </button>

        {highScore > 0 && (
          <p className="text-muted-foreground font-bold">
            🏆 En Yüksek Skor: <span className="text-primary">{highScore}</span>
          </p>
        )}
      </motion.div>
    );
  }

  // Oyun bitti ekranı
  if (gameState === 'gameover') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-4 pb-32"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span className="text-7xl">😵</span>
        <h2 className="text-3xl font-black text-foreground">Oyun Bitti!</h2>

        <div className="bg-primary/10 border-2 border-primary/30 p-6 rounded-2xl shadow-playful text-center space-y-2">
          <p className="text-2xl font-black text-primary">Skor: {score}</p>
          {score >= highScore && score > 0 && (
            <p className="text-success font-bold">🎉 Yeni Rekor!</p>
          )}
        </div>

        <button
          onClick={startGame}
          className="px-10 py-4 bg-primary text-white text-xl font-black rounded-full shadow-lg btn-bouncy"
        >
          🔄 Tekrar Oyna
        </button>

        <button
          onClick={() => setGameState('menu')}
          className="px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold"
        >
          Ana Menü
        </button>
      </motion.div>
    );
  }

  // Oyun ekranı
  return (
    <motion.div
      className="flex flex-col items-center gap-4 p-4 pb-32"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Skor ve Canlar */}
      <div className="flex items-center gap-4">
        <span className="px-4 py-2 bg-primary text-white rounded-full font-black">
          ⭐ {score}
        </span>

        {/* Can göstergesi */}
        <div className="flex gap-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-full">
          {Array.from({ length: GAME_CONFIG.MAX_LIVES }).map((_, i) => (
            <span
              key={i}
              className={`text-xl transition-all ${i < lives ? 'opacity-100' : 'opacity-20'}`}
            >
              ❤️
            </span>
          ))}
        </div>

        {/* Frenzy göstergesi */}
        {isFrenzy && (
          <span className="px-3 py-2 bg-yellow-400 text-yellow-900 rounded-full font-bold text-sm animate-pulse">
            ✨ SÜPER MOD!
          </span>
        )}
      </div>

      {/* Oyun alanı */}
      <div
        className={`relative w-full max-w-lg h-48 bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800 rounded-3xl overflow-hidden shadow-playful cursor-pointer select-none ${hasShield || isFrenzy ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
      >
        {/* Zemin */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-green-500 to-green-400" />

        {/* Karakter */}
        <motion.div
          className="absolute left-8 flex items-center justify-center pointer-events-none"
          animate={{
            bottom: isJumping ? GAME_CONFIG.JUMP_HEIGHT : GAME_CONFIG.GROUND_Y,
            filter: isFrenzy ? [
              'hue-rotate(0deg) brightness(1.2)',
              'hue-rotate(360deg) brightness(1.5)',
              'hue-rotate(0deg) brightness(1.2)'
            ] : 'none'
          }}
          transition={{
            bottom: { type: 'spring', stiffness: 500, damping: 25 },
            filter: { duration: 1, repeat: Infinity, ease: "linear" }
          }}
        >
          {/* Karakter Emojisi */}
          <span className={`text-5xl relative z-10 ${isFrenzy ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : ''}`}>
            {character.emoji}
          </span>

          {/* Havalı Enerji Kalkanı (Aura) */}
          {(hasShield || isFrenzy) && (
            <motion.div
              className={`absolute w-20 h-20 rounded-full border-4 backdrop-blur-[1px] ${isFrenzy
                ? 'border-yellow-400 bg-yellow-300/30'
                : 'border-blue-400/50 bg-blue-300/20'
                }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
                rotate: 360
              }}
              transition={{
                duration: isFrenzy ? 0.5 : 1,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className={`absolute inset-0 rounded-full ${isFrenzy
                ? 'shadow-[0_0_30px_rgba(234,179,8,0.8)]'
                : 'shadow-[0_0_20px_rgba(59,130,246,0.6)]'
                }`} />
              <div className={`absolute inset-2 rounded-full border-2 border-dashed animate-spin-slow ${isFrenzy ? 'border-yellow-200/60' : 'border-blue-200/40'
                }`} />

              {isFrenzy && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xl"
                  >
                    ✨
                  </motion.span>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Engeller */}
        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${obstacle.x}%`,
              bottom: GAME_CONFIG.GROUND_Y,
            }}
          >
            {obstacle.type === 'rock' ? (
              <div className="w-10 h-8 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full shadow-lg border-2 border-gray-700" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-4 h-10 bg-gradient-to-b from-green-400 to-green-600 rounded-t-full shadow-lg border-2 border-green-700" />
                <div className="w-3 h-2 bg-green-700 rounded-b" />
              </div>
            )}
          </div>
        ))}

        {/* Toplanabilirler */}
        {collectibles.map((collectible) => (
          <motion.div
            key={collectible.id}
            className="absolute"
            style={{
              left: `${collectible.x}%`,
              bottom: collectible.y === 1 ? GAME_CONFIG.JUMP_HEIGHT : GAME_CONFIG.GROUND_Y,
            }}
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {collectible.type === 'star' ? (
              // Yıldız - sarı yıldız
              <div className="w-8 h-8 bg-yellow-400 shadow-lg" style={{
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              }} />
            ) : collectible.type === 'coin' ? (
              // Coin - altın para
              <div className="w-7 h-7 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full shadow-lg border-2 border-yellow-700 flex items-center justify-center">
                <span className="text-yellow-800 font-black text-xs">$</span>
              </div>
            ) : (
              // Kalp - kırmızı kalp
              <div className="text-3xl">❤️</div>
            )}
          </motion.div>
        ))}

        {/* Tıklama ipucu */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 font-bold">
          Zıplamak için tıkla!
        </div>
      </div>

      <button
        onClick={() => setGameState('menu')}
        className="px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold"
      >
        ⏸️ Durdur
      </button>
    </motion.div>
  );
};

export default RunnerGame;
