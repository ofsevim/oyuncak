import { Play as GardenPlay, RotateCcw as GardenRestart } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  playSuccessSound,
  playErrorSound,
  playLevelUpSound,
  playNewRecordSound,
  playTickSound,
} from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';
import {
  MAX_LEVEL,
  carveLoops,
  generateMaze,
  levelConfig,
  pickCollectibles,
  planMazeMove,
  revealAround,
  farthestCell,
  type Maze,
  type MazeDirection,
  type MazePoint,
} from './mazeLogic';

type Phase = 'menu' | 'playing' | 'levelskip' | 'gameover';

const CELL = 26;
const STEP_COLORS = ['#fbbf24', '#f472b6', '#38bdf8'];

const pill: React.CSSProperties = {
  background: 'rgba(8,15,15,0.72)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
};

const DIRECTION_KEYS: Record<string, MazeDirection> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  s: 'DOWN',
  a: 'LEFT',
  d: 'RIGHT',
  W: 'UP',
  S: 'DOWN',
  A: 'LEFT',
  D: 'RIGHT',
};

interface LevelState {
  maze: Maze;
  start: MazePoint;
  exit: MazePoint;
  stars: MazePoint[];
  seconds: number;
}

function buildLevel(level: number, seed: number): LevelState {
  const config = levelConfig(level);
  const start = { x: 1, y: 1 };
  const base = generateMaze(config.cols, config.rows, seed);
  const maze = carveLoops(base, Math.min(2 + level, 7), seed + 991);
  const exit = farthestCell(maze, start);
  const stars = pickCollectibles(maze, start, exit, config.stars, seed + 17);
  return { maze, start, exit, stars, seconds: config.seconds };
}

const MazeEscapeGame = () => {
  const [phase, setPhase] = useState<Phase>('menu');
  const [level, setLevel] = useState(1);
  const [levelState, setLevelState] = useState<LevelState | null>(null);
  const [player, setPlayer] = useState<MazePoint>({ x: 1, y: 1 });
  const [collected, setCollected] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [boardScale, setBoardScale] = useState(1);

  const { safeTimeout, safeInterval, clearAll, clearSafeInterval } = useSafeTimeouts();

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const playerRef = useRef<MazePoint>({ x: 1, y: 1 });
  const levelRef2 = useRef<LevelState | null>(null);
  const collectedRef = useRef<Set<number>>(new Set());
  const timeLeftRef = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(1);

  useEffect(() => { setHighScore(getHighScore('maze')); }, []);
  useEffect(() => { levelRef2.current = levelState; }, [levelState]);

  /* Tahtayı ekrana sığdır */
  useEffect(() => {
    const updateScale = () => {
      const state = levelRef2.current;
      if (!state) return;
      const boardPx = state.maze.cols * CELL + 16;
      setBoardScale(Math.min(1, (window.innerWidth - 40) / boardPx));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [levelState]);

  const revealAt = useCallback((maze: Maze, point: MazePoint) => {
    setRevealed((current) => {
      const next = new Set(current);
      for (const index of revealAround(maze, point)) next.add(index);
      return [...next];
    });
  }, []);

  const loadLevel = useCallback((nextLevel: number) => {
    const state = buildLevel(nextLevel, seedRef.current * 1000 + nextLevel);
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    setLevelState(state);
    levelRef2.current = state;
    setPlayer(state.start);
    playerRef.current = state.start;
    setCollected([]);
    collectedRef.current = new Set();
    setRevealed(revealAround(state.maze, state.start));
    setTimeLeft(state.seconds);
    timeLeftRef.current = state.seconds;
    setHint(null);
    setPhase('playing');
  }, []);

  const startGame = useCallback(() => {
    clearAll();
    seedRef.current = Math.floor(Math.random() * 90_000) + 1_000;
    scoreRef.current = 0;
    setScore(0);
    setIsNewRecord(false);
    setWon(false);
    loadLevel(1);
  }, [clearAll, loadLevel]);

  const finishGame = useCallback((didWin: boolean) => {
    clearAll();
    setWon(didWin);
    setPhase('gameover');
    const finalScore = scoreRef.current;
    const isNew = saveHighScoreObj('maze', finalScore);
    if (isNew) {
      setIsNewRecord(true);
      setHighScore(finalScore);
      playNewRecordSound();
    }
    if (didWin) {
      fireConfetti({
        particleCount: 180,
        spread: 110,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f472b6', '#38bdf8', '#a7f3d0'],
      });
    }
  }, [clearAll]);

  /* ── Süre sayacı ── */
  useEffect(() => {
    if (phase !== 'playing' || !levelState) return;
    const id = safeInterval(() => {
      const remaining = timeLeftRef.current - 1;
      if (remaining <= 0) {
        timeLeftRef.current = 0;
        setTimeLeft(0);
        playErrorSound();
        finishGame(false);
        return;
      }
      timeLeftRef.current = remaining;
      setTimeLeft(remaining);
      if (remaining <= 5) playTickSound();
    }, 1000);
    return () => clearSafeInterval(id);
  }, [phase, levelState, safeInterval, clearSafeInterval, finishGame]);

  /* ── Hareket ── */
  const move = useCallback((direction: MazeDirection) => {
    const state = levelRef2.current;
    if (!state || phase !== 'playing') return;
    const step = planMazeMove(state.maze, playerRef.current, direction);
    if (step.blocked) {
      playTickSound();
      return;
    }

    playerRef.current = step.pos;
    setPlayer(step.pos);
    revealAt(state.maze, step.pos);

    const starIndex = state.stars.findIndex(
      (star) => star.x === step.pos.x && star.y === step.pos.y,
    );
    if (starIndex >= 0 && !collectedRef.current.has(starIndex)) {
      collectedRef.current.add(starIndex);
      setCollected([...collectedRef.current]);
      const points = 20 + levelRef.current * 5;
      scoreRef.current += points;
      setScore(scoreRef.current);
      playSuccessSound();
      setHint(
        collectedRef.current.size === state.stars.length
          ? 'Tüm yıldızlar toplandı! Şimdi çıkışa git 🏠'
          : null,
      );
    }

    const atExit = step.pos.x === state.exit.x && step.pos.y === state.exit.y;
    if (atExit) {
      if (collectedRef.current.size < state.stars.length) {
        playErrorSound();
        setShake(true);
        safeTimeout(() => setShake(false), 380);
        setHint('Önce tüm yıldızları topla! ⭐');
        return;
      }
      const bonus = timeLeftRef.current * 3 + levelRef.current * 10;
      scoreRef.current += bonus;
      setScore(scoreRef.current);
      playLevelUpSound();
      fireConfetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      if (levelRef.current >= MAX_LEVEL) finishGame(true);
      else setPhase('levelskip');
    }
  }, [phase, revealAt, safeTimeout, finishGame]);

  /* ── Klavye ── */
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const direction = DIRECTION_KEYS[event.key];
      if (!direction || phase !== 'playing') return;
      event.preventDefault();
      move(direction);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, move]);

  /* ── Dokunmatik kaydırma ── */
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onStart = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      const touch = event.touches?.[0];
      if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
    };
    const onEnd = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      const touch = event.changedTouches?.[0];
      const origin = touchStart.current;
      touchStart.current = null;
      if (!touch || !origin) return;
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
    };
    board.addEventListener('touchstart', onStart, { passive: false });
    board.addEventListener('touchend', onEnd, { passive: false });
    return () => {
      board.removeEventListener('touchstart', onStart);
      board.removeEventListener('touchend', onEnd);
    };
  }, [move]);

  /* ═══════════════════════════════════════════
     MENÜ
     ═══════════════════════════════════════════ */
  if (phase === 'menu') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="garden-legacy-decoration text-7xl"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(251,191,36,0.3))' }}
          animate={{ x: [0, 8, 0, -8, 0], rotate: [0, 4, 0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          🧭
        </motion.div>
        <h2 className="garden-entry-title text-4xl md:text-5xl font-black text-gradient">Labirent Kaçış</h2>
        <p className="text-sm text-muted-foreground text-center">
          Yıldızları topla, çıkış kapısına ulaş. Beş bölüm seni bekliyor!
        </p>
        {highScore > 0 && (
          <div className="garden-panel px-5 py-2.5" style={pill}>
            <span className="font-black text-primary">🏆 Rekor: {highScore}</span>
          </div>
        )}
        <div className="garden-panel p-4 text-center text-sm space-y-1 w-full max-w-xs" style={pill}>
          <p className="font-bold">🎮 Ok tuşları / WASD / Kaydır</p>
          <p className="text-muted-foreground text-xs">⭐ Yıldız = puan · 🏠 Çıkışa tüm yıldızlarla git</p>
        </div>
        <Leaderboard gameId="maze" />
        <motion.button
          onClick={startGame}
          className="garden-action-primary btn-gaming px-12 py-4 text-lg"
          whileHover={{ y: -2 }}
          whileTap={{}}
        >
          <GardenPlay size={16} aria-hidden="true" />
          BAŞLA!
        </motion.button>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════
     OYUN BİTTİ
     ═══════════════════════════════════════════ */
  if (phase === 'gameover') {
    const completedLevels = won ? MAX_LEVEL : Math.max(0, levelRef.current - 1);
    return (
      <motion.div
        className="flex flex-col items-center gap-5 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="garden-legacy-decoration text-8xl">{won ? '🏆' : '⏰'}</div>
        <h2 className="text-3xl md:text-4xl font-black text-gradient text-center">
          {won ? 'Labirentin Ustası!' : 'Süre Doldu'}
        </h2>
        {isNewRecord && (
          <div className="px-7 py-2.5 rounded-full font-black text-white" style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)' }}>
            🏆 YENİ REKOR!
          </div>
        )}
        <div className="garden-panel w-full max-w-xs p-6 space-y-2 text-center" style={pill}>
          <p className="text-3xl font-black text-primary">⭐ {score} Puan</p>
          <p className="text-sm text-muted-foreground">{completedLevels} bölüm tamamlandı</p>
          <p className="text-xs text-muted-foreground">🏆 Rekor: {highScore}</p>
        </div>
        <div className="flex gap-3">
          <motion.button onClick={startGame} className="garden-action-primary btn-gaming px-8 py-3" whileTap={{}}>
            <GardenRestart size={16} aria-hidden="true" /> Tekrar Oyna
          </motion.button>
          <motion.button
            onClick={() => { clearAll(); setPhase('menu'); }}
            className="garden-action-secondary px-5 py-2.5 font-bold text-muted-foreground"
            style={pill}
          >
            ← Menü
          </motion.button>
        </div>
      </motion.div>
    );
  }

  if (!levelState) return null;

  const { maze, exit, stars } = levelState;
  const boardPx = maze.cols * CELL;
  const allStars = collected.length >= stars.length;

  /* ── Bölüm geçildi ── */
  if (phase === 'levelskip') {
    return (
      <motion.div
        className="flex flex-col items-center gap-5 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="garden-legacy-decoration text-7xl">🎉</div>
        <h2 className="text-3xl font-black text-gradient">{level}. Bölüm Tamam!</h2>
        <p className="text-sm text-muted-foreground">Toplam puan: ⭐ {score}</p>
        <motion.button
          onClick={() => loadLevel(level + 1)}
          className="garden-action-primary btn-gaming px-10 py-3"
          whileTap={{}}
        >
          <GardenPlay size={16} aria-hidden="true" /> {level + 1}. Bölüm
        </motion.button>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════
     OYUN
     ═══════════════════════════════════════════ */
  return (
    <motion.div
      className="flex flex-col items-center gap-3 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: shake ? [0, -6, 6, -4, 4, 0] : 0 }}
      transition={shake ? { duration: 0.35 } : { duration: 0.4 }}
    >
      {/* ── Gösterge ── */}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <div className="garden-panel px-4 py-2" style={pill}>
          <span className="text-sm font-black text-primary">⭐ {score}</span>
        </div>
        <div className="garden-panel px-4 py-2" style={pill}>
          <span className="text-sm font-bold text-muted-foreground">🗺️ {level}/{MAX_LEVEL}</span>
        </div>
        <div className="garden-panel px-4 py-2" style={pill}>
          <span className={`text-sm font-black ${timeLeft <= 8 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span>
        </div>
        <div className="garden-panel px-4 py-2" style={pill}>
          <span className={`text-sm font-bold ${allStars ? 'text-yellow-400' : 'text-muted-foreground'}`}>⭐ {collected.length}/{stars.length}</span>
        </div>
      </div>

      {/* ── Tahta ── */}
      <div className="relative" style={{ width: (boardPx + 16) * boardScale, height: (boardPx + 16) * boardScale, overflow: 'hidden' }}>
        {/* ── İpucu — tahta içinde katman olarak çizilir, sayfa düzenini kaydırmaz ── */}
        <AnimatePresence>
          {hint && (
            <div className="absolute inset-x-0 top-2 z-30 flex justify-center pointer-events-none">
              <motion.p
                key={hint}
                initial={{ opacity: 0, y: -8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.92 }}
                className="whitespace-nowrap text-xs font-bold px-3 py-1 rounded-full bg-slate-950/85 border border-yellow-400/40 text-yellow-300 shadow-lg text-center"
                role="status"
              >
                {hint}
              </motion.p>
            </div>
          )}
        </AnimatePresence>
        <div
          ref={boardRef}
          role="application"
          aria-label="Labirent tahtası"
          className="relative touch-none"
          style={{
            width: boardPx + 16,
            height: boardPx + 16,
            padding: 8,
            borderRadius: 20,
            transform: `scale(${boardScale})`,
            transformOrigin: 'top left',
            background: 'linear-gradient(160deg, hsl(244 26% 14%), hsl(244 26% 9%))',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div
            className="relative"
            style={{
              width: boardPx,
              height: boardPx,
              display: 'grid',
              gridTemplateColumns: `repeat(${maze.cols}, ${CELL}px)`,
              gridTemplateRows: `repeat(${maze.rows}, ${CELL}px)`,
            }}
          >
            {maze.cells.map((cell, index) => {
              const x = index % maze.cols;
              const y = Math.floor(index / maze.cols);
              const wall = cell === 1;
              const seen = revealed.includes(index);
              const starIndex = stars.findIndex((star) => star.x === x && star.y === y);
              const hasStar = starIndex >= 0 && !collected.includes(starIndex) && !wall;
              const isExit = exit.x === x && exit.y === y;
              const isPlayer = player.x === x && player.y === y;

              return (
                <div
                  key={index}
                  className="relative flex items-center justify-center"
                  style={{
                    background: wall
                      ? 'linear-gradient(150deg, hsl(258 32% 30%), hsl(258 34% 22%))'
                      : seen
                        ? 'hsl(248 28% 17%)'
                        : 'hsl(248 30% 13%)',
                    boxShadow: wall ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                    borderRadius: wall ? 5 : 3,
                    opacity: seen || isExit ? 1 : 0.72,
                  }}
                >
                  {hasStar && (
                    <motion.span
                      className="text-xs select-none"
                      animate={{ scale: [1, 1.22, 1], opacity: [0.85, 1, 0.85] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                      aria-hidden="true"
                    >
                      ⭐
                    </motion.span>
                  )}
                  {isExit && !wall && (
                    <span className="text-sm select-none" aria-hidden="true">🏠</span>
                  )}
                  {isPlayer && (
                    <motion.span
                      className="absolute text-base select-none z-10"
                      initial={{ scale: 0.6 }}
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                      style={{ filter: `drop-shadow(0 0 6px ${STEP_COLORS[level % STEP_COLORS.length]})` }}
                      aria-hidden="true"
                    >
                      🐭
                    </motion.span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── D-pad ── */}
      <div className="touch-controls-grid grid grid-cols-3 gap-3 w-56 mt-2" role="group" aria-label="Labirent kontrolleri">
        <div />
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => move('UP')}
          className="garden-action-secondary flex items-center justify-center text-2xl touch-manipulation p-3"
          style={{ ...pill, borderRadius: 16 }}
          aria-label="Yukarı git"
        >↑</motion.button>
        <div />
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => move('LEFT')}
          className="garden-action-secondary flex items-center justify-center text-2xl touch-manipulation p-3"
          style={{ ...pill, borderRadius: 16 }}
          aria-label="Sola git"
        >←</motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => move('DOWN')}
          className="garden-action-secondary flex items-center justify-center text-2xl touch-manipulation p-3"
          style={{ ...pill, borderRadius: 16 }}
          aria-label="Aşağı git"
        >↓</motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => move('RIGHT')}
          className="garden-action-secondary flex items-center justify-center text-2xl touch-manipulation p-3"
          style={{ ...pill, borderRadius: 16 }}
          aria-label="Sağa git"
        >→</motion.button>
      </div>

      <div className="flex gap-3 mt-1">
        <motion.button
          whileTap={{}}
          onClick={startGame}
          className="garden-action-secondary px-5 py-2.5 font-bold text-muted-foreground touch-manipulation"
          style={pill}
        >
          🔄 Yeniden
        </motion.button>
        <motion.button
          whileTap={{}}
          onClick={() => { clearAll(); setPhase('menu'); }}
          className="garden-action-secondary px-5 py-2.5 font-bold text-muted-foreground touch-manipulation"
          style={pill}
        >
          ← Menü
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MazeEscapeGame;
