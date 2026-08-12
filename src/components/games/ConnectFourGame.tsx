import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { fireConfetti } from '@/utils/confettiUtil';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playDiscDropSound, playErrorSound, playNewRecordSound, playPopSound, playSuccessSound } from '@/utils/soundEffects';
import {
  describeConnectFourLine,
  findConnectFourResult,
  type ConnectFourCell as Cell,
  type ConnectFourCoordinate,
} from './connectFourLogic';

const GAME_ID = 'connect-four';
const ROWS = 6;
const COLUMNS = 7;

type Difficulty = 'easy' | 'normal' | 'hard';
type Phase = 'menu' | 'playing' | 'finished';

const createBoard = (): Cell[][] => Array.from({ length: ROWS }, () => Array<Cell>(COLUMNS).fill(0));

const availableColumns = (board: Cell[][]) =>
  Array.from({ length: COLUMNS }, (_, column) => column).filter((column) => board[0][column] === 0);

const dropDisc = (board: Cell[][], column: number, player: 1 | 2) => {
  const next = board.map((row) => [...row]);
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (next[row][column] === 0) {
      next[row][column] = player;
      return next;
    }
  }
  return null;
};

const chooseAiColumn = (board: Cell[][], difficulty: Difficulty) => {
  const choices = availableColumns(board);
  const randomChoice = () => choices[Math.floor(Math.random() * choices.length)];
  if (difficulty === 'easy') return randomChoice();

  for (const column of choices) {
    const next = dropDisc(board, column, 2);
    if (next && findConnectFourResult(next).winner === 2) return column;
  }
  for (const column of choices) {
    const next = dropDisc(board, column, 1);
    if (next && findConnectFourResult(next).winner === 1) return column;
  }

  if (difficulty === 'normal') {
    const central = choices.filter((column) => column >= 2 && column <= 4);
    return central.length ? central[Math.floor(Math.random() * central.length)] : randomChoice();
  }

  const priority = [3, 2, 4, 1, 5, 0, 6];
  return priority.find((column) => choices.includes(column)) ?? randomChoice();
};

const DIFFICULTIES: { id: Difficulty; label: string; detail: string }[] = [
  { id: 'easy', label: 'Kolay', detail: 'Rahat başlangıç' },
  { id: 'normal', label: 'Normal', detail: 'Hamlelerini takip eder' },
  { id: 'hard', label: 'Zor', detail: 'Merkezi iyi kullanır' },
];

export default function ConnectFourGame() {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [phase, setPhase] = useState<Phase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [message, setMessage] = useState('Sıra sende');
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore(GAME_ID));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [winningLine, setWinningLine] = useState<ConnectFourCoordinate[]>([]);
  const { safeTimeout, clearAllTimeouts } = useSafeTimeouts();
  const resultBannerRef = useRef<HTMLDivElement>(null);

  const difficultyBonus = useMemo(() => ({ easy: 0, normal: 150, hard: 300 })[difficulty], [difficulty]);

  const finishGame = useCallback((winner: Cell, moveCount: number, finalBoard: Cell[][]) => {
    setIsAiTurn(false);
    setPhase('finished');
    setWinningLine(findConnectFourResult(finalBoard).line);
    if (winner === 1) {
      const finalScore = Math.max(100, 900 - moveCount * 20) + difficultyBonus;
      const record = saveHighScoreObj(GAME_ID, finalScore);
      setScore(finalScore);
      setHighScore((current) => Math.max(current, finalScore));
      setIsNewRecord(record);
      setMessage('Dört taşı sıraladın!');
      fireConfetti();
      if (record) playNewRecordSound(); else playSuccessSound();
    } else if (winner === 2) {
      setScore(0);
      setMessage('Bilgisayar bu turu kazandı');
      playErrorSound();
    } else {
      setScore(100);
      setMessage('Tahta doldu, beraberlik!');
      saveHighScoreObj(GAME_ID, 100);
      playPopSound();
    }
  }, [difficultyBonus]);

  const playAiMove = useCallback((currentBoard: Cell[][], moveCount: number) => {
    const column = chooseAiColumn(currentBoard, difficulty);
    const next = dropDisc(currentBoard, column, 2);
    if (!next) return;
    const nextMoveCount = moveCount + 1;
    setBoard(next);
    setMoves(nextMoveCount);
    playDiscDropSound(2);
    const winner = findConnectFourResult(next).winner;
    if (winner || availableColumns(next).length === 0) {
      finishGame(winner, nextMoveCount, next);
      return;
    }
    setIsAiTurn(false);
    setMessage('Sıra sende');
  }, [difficulty, finishGame]);

  const handleColumn = (column: number) => {
    if (phase !== 'playing' || isAiTurn) return;
    const next = dropDisc(board, column, 1);
    if (!next) {
      playErrorSound();
      return;
    }
    const nextMoveCount = moves + 1;
    setBoard(next);
    setMoves(nextMoveCount);
    playDiscDropSound(1);
    const winner = findConnectFourResult(next).winner;
    if (winner || availableColumns(next).length === 0) {
      finishGame(winner, nextMoveCount, next);
      return;
    }
    setIsAiTurn(true);
    setMessage('Bilgisayar düşünüyor…');
    safeTimeout(() => playAiMove(next, nextMoveCount), 520);
  };

  const startGame = () => {
    clearAllTimeouts();
    setBoard(createBoard());
    setMoves(0);
    setScore(0);
    setIsNewRecord(false);
    setWinningLine([]);
    setIsAiTurn(false);
    setMessage('Sıra sende');
    setPhase('playing');
  };

  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);

  useEffect(() => {
    if (phase !== 'finished') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultBannerRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [phase]);

  const winningCellKeys = useMemo(
    () => new Set(winningLine.map((cell) => `${cell.row}-${cell.column}`)),
    [winningLine],
  );
  const winner = winningLine.length ? board[winningLine[0].row][winningLine[0].column] : 0;
  const winExplanation = describeConnectFourLine(winningLine, winner);

  return (
    <div className="mx-auto w-full max-w-2xl px-0 pb-20 text-foreground min-[360px]:px-3 sm:px-4">
      <section className="overflow-hidden rounded-none border border-white/10 bg-slate-950 p-2 shadow-2xl min-[360px]:rounded-3xl min-[360px]:p-3 sm:rounded-[2rem] sm:p-7">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Strateji oyunu</p>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Dört Sıra</h1>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Rekor</p>
            <p className="font-black text-amber-300">{highScore}</p>
          </div>
        </div>

        {phase === 'menu' ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center sm:p-7">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-4xl shadow-lg">🔴</div>
            <h2 className="text-xl font-black text-white">Bilgisayara karşı dört taşı birleştir</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">Taşlar aşağı düşer. Yatay, dikey veya çapraz ilk dörtlüyü sen oluştur.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((item) => (
                <button key={item.id} type="button" onClick={() => setDifficulty(item.id)} aria-pressed={difficulty === item.id} className={`min-h-16 rounded-2xl border p-2 transition ${difficulty === item.id ? 'border-rose-400 bg-rose-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 hidden text-[10px] text-slate-400 sm:block">{item.detail}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={startGame} className="mt-6 min-h-12 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 px-5 py-3 font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-95">Oyunu Başlat</button>
          </div>
        ) : (
          <>
            {phase === 'finished' ? (
              <motion.div
                ref={resultBannerRef}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-3 rounded-2xl border p-3 sm:mb-4 sm:p-4 ${winner === 1 ? 'border-emerald-400/40 bg-emerald-400/10' : winner === 2 ? 'border-amber-300/40 bg-amber-300/10' : 'border-sky-300/30 bg-sky-300/10'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${winner === 1 ? 'bg-emerald-400/20 text-emerald-300' : winner === 2 ? 'bg-amber-300/20 text-amber-300' : 'bg-sky-300/20 text-sky-300'}`}>
                    {winner === 1 ? <Trophy className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black text-white sm:text-lg">{message}</h2>
                    <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-200 sm:text-sm">{winExplanation}</p>
                    {winner === 1 && <p className="mt-1 text-xs font-black text-emerald-300">{score} puan {isNewRecord && '• Yeni rekor!'}</p>}
                  </div>
                  <button type="button" onClick={startGame} aria-label="Tekrar oyna" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 shadow-lg transition hover:scale-105 active:scale-95 sm:min-w-0 sm:gap-2 sm:px-4">
                    <RotateCcw className="h-4 w-4" /> <span className="hidden text-xs font-black sm:inline">Tekrar Oyna</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2 sm:mb-4 sm:min-h-12 sm:px-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Bot className={`h-5 w-5 ${isAiTurn ? 'animate-pulse text-amber-300' : 'text-slate-400'}`} />
                  {message}
                </div>
                <span className="text-xs font-bold text-slate-400">{moves} hamle</span>
              </div>
            )}

            <div className="-mx-2 w-[calc(100%+1rem)] rounded-none bg-gradient-to-b from-blue-500 to-blue-700 p-0.5 shadow-inner min-[360px]:mx-0 min-[360px]:w-auto min-[360px]:rounded-2xl min-[360px]:p-1.5 sm:rounded-[1.75rem] sm:p-3">
              <div className="relative grid grid-cols-7 gap-0.5 min-[360px]:gap-1 sm:gap-2">
                {Array.from({ length: COLUMNS }, (_, column) => (
                  <button key={column} type="button" onClick={() => handleColumn(column)} disabled={isAiTurn || phase !== 'playing' || board[0][column] !== 0} aria-label={`${column + 1}. sütuna taş bırak`} className="group grid min-w-0 touch-manipulation grid-rows-6 gap-0.5 rounded-lg p-0.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default min-[360px]:gap-1 min-[360px]:rounded-xl sm:gap-2">
                    {board.map((row, rowIndex) => {
                      const isWinningCell = winningCellKeys.has(`${rowIndex}-${column}`);
                      return (
                        <span key={`${rowIndex}-${column}`} className={`relative aspect-square w-full rounded-full bg-slate-900/90 p-[10%] shadow-inner transition ${isWinningCell ? 'z-20 ring-2 ring-white ring-offset-1 ring-offset-blue-600 sm:ring-4' : ''}`}>
                          <motion.span
                            key={row[column]}
                            initial={row[column] ? { scale: 0.25, y: -24 } : false}
                            animate={isWinningCell ? { scale: [1, 1.1, 1] } : { scale: 1, y: 0 }}
                            transition={isWinningCell ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : undefined}
                            className={`block h-full w-full rounded-full shadow-md ${row[column] === 1 ? 'bg-gradient-to-br from-rose-300 to-rose-600' : row[column] === 2 ? 'bg-gradient-to-br from-amber-200 to-amber-500' : 'bg-slate-800'}`}
                          />
                        </span>
                      );
                    })}
                  </button>
                ))}
                {winningLine.length === 4 && (
                  <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible" viewBox="0 0 7 6" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <filter id="connect-four-winner-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="0.12" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <motion.line
                      x1={winningLine[0].column + 0.5}
                      y1={winningLine[0].row + 0.5}
                      x2={winningLine[3].column + 0.5}
                      y2={winningLine[3].row + 0.5}
                      stroke={winner === 2 ? '#fff7c2' : '#d1fae5'}
                      strokeWidth="0.14"
                      strokeLinecap="round"
                      filter="url(#connect-four-winner-glow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                    {winningLine.map((cell) => (
                      <circle key={`${cell.row}-${cell.column}`} cx={cell.column + 0.5} cy={cell.row + 0.5} r="0.31" fill="none" stroke="white" strokeWidth="0.07" opacity="0.95" />
                    ))}
                  </svg>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-5 text-xs font-bold text-slate-300 sm:mt-4">
              <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-rose-500" /> Sen</span>
              <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-amber-400" /> Bilgisayar</span>
            </div>
          </>
        )}
      </section>
      <div className="mt-5"><Leaderboard gameId={GAME_ID} /></div>
    </div>
  );
}
