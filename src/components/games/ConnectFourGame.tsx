import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { fireConfetti } from '@/utils/confettiUtil';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playDiscDropSound, playErrorSound, playNewRecordSound, playPopSound, playSuccessSound } from '@/utils/soundEffects';

const GAME_ID = 'connect-four';
const ROWS = 6;
const COLUMNS = 7;

type Cell = 0 | 1 | 2;
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

const findConnectFourWinner = (board: Cell[][]): Cell => {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const player = board[row][column];
      if (!player) continue;
      for (const [rowStep, columnStep] of directions) {
        let connected = true;
        for (let offset = 1; offset < 4; offset += 1) {
          if (board[row + rowStep * offset]?.[column + columnStep * offset] !== player) {
            connected = false;
            break;
          }
        }
        if (connected) return player;
      }
    }
  }
  return 0;
};

const chooseAiColumn = (board: Cell[][], difficulty: Difficulty) => {
  const choices = availableColumns(board);
  const randomChoice = () => choices[Math.floor(Math.random() * choices.length)];
  if (difficulty === 'easy') return randomChoice();

  for (const column of choices) {
    const next = dropDisc(board, column, 2);
    if (next && findConnectFourWinner(next) === 2) return column;
  }
  for (const column of choices) {
    const next = dropDisc(board, column, 1);
    if (next && findConnectFourWinner(next) === 1) return column;
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
  const { safeTimeout, clearAllTimeouts } = useSafeTimeouts();

  const difficultyBonus = useMemo(() => ({ easy: 0, normal: 150, hard: 300 })[difficulty], [difficulty]);

  const finishGame = useCallback((winner: Cell, moveCount: number) => {
    setIsAiTurn(false);
    setPhase('finished');
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
    const winner = findConnectFourWinner(next);
    if (winner || availableColumns(next).length === 0) {
      finishGame(winner, nextMoveCount);
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
    const winner = findConnectFourWinner(next);
    if (winner || availableColumns(next).length === 0) {
      finishGame(winner, nextMoveCount);
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
    setIsAiTurn(false);
    setMessage('Sıra sende');
    setPhase('playing');
  };

  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 text-foreground">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-4 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
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
            <div className="mb-4 flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Bot className={`h-5 w-5 ${isAiTurn ? 'animate-pulse text-amber-300' : 'text-slate-400'}`} />
                {message}
              </div>
              <span className="text-xs font-bold text-slate-400">{moves} hamle</span>
            </div>

            <div className="rounded-[1.75rem] bg-gradient-to-b from-blue-500 to-blue-700 p-2 shadow-inner sm:p-3">
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: COLUMNS }, (_, column) => (
                  <button key={column} type="button" onClick={() => handleColumn(column)} disabled={isAiTurn || phase !== 'playing' || board[0][column] !== 0} aria-label={`${column + 1}. sütuna taş bırak`} className="group grid min-w-0 grid-rows-6 gap-1 rounded-xl p-0.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default sm:gap-2">
                    {board.map((row, rowIndex) => (
                      <span key={`${rowIndex}-${column}`} className="aspect-square w-full rounded-full bg-slate-900/90 p-[10%] shadow-inner">
                        <motion.span key={row[column]} initial={row[column] ? { scale: 0.25, y: -24 } : false} animate={{ scale: 1, y: 0 }} className={`block h-full w-full rounded-full shadow-md ${row[column] === 1 ? 'bg-gradient-to-br from-rose-300 to-rose-600' : row[column] === 2 ? 'bg-gradient-to-br from-amber-200 to-amber-500' : 'bg-slate-800'}`} />
                      </span>
                    ))}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-5 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-rose-500" /> Sen</span>
              <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-amber-400" /> Bilgisayar</span>
            </div>

            {phase === 'finished' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
                {score > 100 ? <Trophy className="mx-auto h-9 w-9 text-amber-300" /> : <Sparkles className="mx-auto h-9 w-9 text-sky-300" />}
                <h2 className="mt-2 text-xl font-black text-white">{message}</h2>
                <p className="mt-1 font-bold text-amber-300">{score} puan {isNewRecord && '• Yeni rekor!'}</p>
                <button type="button" onClick={startGame} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-5 py-2.5 font-black text-slate-900 transition hover:scale-105 active:scale-95"><RotateCcw className="h-4 w-4" /> Tekrar Oyna</button>
              </motion.div>
            )}
          </>
        )}
      </section>
      <div className="mt-5"><Leaderboard gameId={GAME_ID} /></div>
    </div>
  );
}
