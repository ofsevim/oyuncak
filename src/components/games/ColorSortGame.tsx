import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Trophy, Undo2 } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import { fireConfetti } from '@/utils/confettiUtil';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playErrorSound, playNewRecordSound, playPopSound, playPourSound, playSuccessSound } from '@/utils/soundEffects';

const GAME_ID = 'color-sort';
const CAPACITY = 4;
const COLORS = ['#fb7185', '#facc15', '#38bdf8', '#a78bfa', '#34d399', '#fb923c'] as const;
const COLOR_NAMES = ['Pembe', 'Sarı', 'Mavi', 'Mor', 'Yeşil', 'Turuncu'] as const;

type Difficulty = 'easy' | 'normal' | 'hard';
type Phase = 'menu' | 'playing' | 'finished';
type Tube = number[];

const SETTINGS: Record<Difficulty, { label: string; colors: number; scramble: number; bonus: number }> = {
  easy: { label: 'Kolay', colors: 4, scramble: 24, bonus: 0 },
  normal: { label: 'Normal', colors: 5, scramble: 38, bonus: 200 },
  hard: { label: 'Zor', colors: 6, scramble: 54, bonus: 400 },
};

const cloneTubes = (tubes: Tube[]) => tubes.map((tube) => [...tube]);

const isColorSortSolved = (tubes: Tube[]) => tubes.every((tube) =>
  tube.length === 0 || (tube.length === CAPACITY && tube.every((color) => color === tube[0])));

const topRunLength = (tube: Tube) => {
  if (!tube.length) return 0;
  const color = tube[tube.length - 1];
  let count = 1;
  while (count < tube.length && tube[tube.length - 1 - count] === color) count += 1;
  return count;
};

const pourColor = (tubes: Tube[], sourceIndex: number, targetIndex: number) => {
  if (sourceIndex === targetIndex) return null;
  const source = tubes[sourceIndex];
  const target = tubes[targetIndex];
  if (!source.length || target.length >= CAPACITY) return null;
  const color = source[source.length - 1];
  if (target.length && target[target.length - 1] !== color) return null;
  const amount = Math.min(topRunLength(source), CAPACITY - target.length);
  const next = cloneTubes(tubes);
  next[sourceIndex].splice(next[sourceIndex].length - amount, amount);
  next[targetIndex].push(...Array<number>(amount).fill(color));
  return next;
};

const createColorSortPuzzle = (colorCount: number, scrambleCount: number) => {
  const tubes: Tube[] = [
    ...Array.from({ length: colorCount }, (_, color) => Array<number>(CAPACITY).fill(color)),
    [],
    [],
  ];

  for (let step = 0; step < scrambleCount; step += 1) {
    const candidates: { source: number; target: number; amount: number }[] = [];
    tubes.forEach((source, sourceIndex) => {
      if (!source.length) return;
      const run = topRunLength(source);
      const allowedAmounts = Array.from({ length: Math.max(0, run - 1) }, (_, index) => index + 1);
      if (run === source.length) allowedAmounts.push(run);
      tubes.forEach((target, targetIndex) => {
        if (sourceIndex === targetIndex) return;
        allowedAmounts.forEach((amount) => {
          if (target.length + amount <= CAPACITY) candidates.push({ source: sourceIndex, target: targetIndex, amount });
        });
      });
    });
    if (!candidates.length) break;
    const move = candidates[Math.floor(Math.random() * candidates.length)];
    const color = tubes[move.source][tubes[move.source].length - 1];
    tubes[move.source].splice(tubes[move.source].length - move.amount, move.amount);
    tubes[move.target].push(...Array<number>(move.amount).fill(color));
  }

  if (isColorSortSolved(tubes)) return createColorSortPuzzle(colorCount, scrambleCount + 8);
  return tubes;
};

export default function ColorSortGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [phase, setPhase] = useState<Phase>('menu');
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [initialTubes, setInitialTubes] = useState<Tube[]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [history, setHistory] = useState<Tube[][]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore(GAME_ID));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const settings = SETTINGS[difficulty];
  const completedTubes = useMemo(() => tubes.filter((tube) =>
    tube.length === CAPACITY && tube.every((color) => color === tube[0])).length, [tubes]);

  const startGame = () => {
    const next = createColorSortPuzzle(settings.colors, settings.scramble);
    setTubes(next);
    setInitialTubes(cloneTubes(next));
    setHistory([]);
    setMoves(0);
    setScore(0);
    setSelectedTube(null);
    setIsNewRecord(false);
    setPhase('playing');
  };

  const resetGame = () => {
    setTubes(cloneTubes(initialTubes));
    setHistory([]);
    setMoves(0);
    setSelectedTube(null);
    setPhase('playing');
    playPopSound();
  };

  const finish = (moveCount: number) => {
    const finalScore = Math.max(300, 1500 - moveCount * 15) + settings.bonus;
    const record = saveHighScoreObj(GAME_ID, finalScore);
    setScore(finalScore);
    setHighScore((current) => Math.max(current, finalScore));
    setIsNewRecord(record);
    setPhase('finished');
    fireConfetti();
    if (record) playNewRecordSound(); else playSuccessSound();
  };

  const chooseTube = (index: number) => {
    if (phase !== 'playing') return;
    if (selectedTube === null) {
      if (!tubes[index].length) {
        playErrorSound();
        return;
      }
      setSelectedTube(index);
      playPopSound();
      return;
    }
    if (selectedTube === index) {
      setSelectedTube(null);
      return;
    }

    const next = pourColor(tubes, selectedTube, index);
    if (!next) {
      playErrorSound();
      setSelectedTube(tubes[index].length ? index : null);
      return;
    }
    const nextMoveCount = moves + 1;
    setHistory((current) => [...current, cloneTubes(tubes)]);
    setTubes(next);
    setMoves(nextMoveCount);
    setSelectedTube(null);
    playPourSound(tubes[selectedTube][tubes[selectedTube].length - 1] ?? index);
    if (isColorSortSolved(next)) finish(nextMoveCount);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous || phase !== 'playing') return;
    setTubes(cloneTubes(previous));
    setHistory((current) => current.slice(0, -1));
    setMoves((current) => Math.max(0, current - 1));
    setSelectedTube(null);
    playPopSound();
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 text-foreground">
      <section className="overflow-hidden rounded-[2rem] border border-violet-100/60 bg-gradient-to-b from-violet-50 via-fuchsia-50 to-rose-50 p-4 shadow-xl sm:p-7 dark:border-violet-400/10 dark:from-slate-950 dark:via-violet-950/50 dark:to-slate-950">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">Renk • Mantık</p>
            <h1 className="text-2xl font-black sm:text-3xl">Renk Sırala</h1>
          </div>
          <div className="rounded-2xl border border-violet-100/60 bg-white/70 px-3 py-2 text-right shadow-sm dark:border-white/10 dark:bg-white/10">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground dark:text-slate-400">Rekor</p>
            <p className="font-black text-violet-600 dark:text-violet-300">{highScore}</p>
          </div>
        </div>

        {phase === 'menu' ? (
          <div className="rounded-3xl border border-violet-100/60 bg-white/75 p-5 text-center shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-rose-400 text-4xl shadow-lg">🧪</div>
            <h2 className="text-xl font-black">Aynı renkleri aynı tüpte topla</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-slate-300">Önce alınacak tüpe, sonra dökülecek tüpe dokun. Yalnızca aynı rengin üstüne dökebilirsin.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {(Object.entries(SETTINGS) as [Difficulty, (typeof SETTINGS)[Difficulty]][]).map(([id, item]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDifficulty(id)}
                  aria-pressed={difficulty === id}
                  className={`min-h-16 rounded-2xl border p-2 transition ${
                    difficulty === id
                      ? 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-500/25'
                      : 'border-border bg-background/60 hover:bg-background dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="text-[10px] opacity-75">{item.colors} renk</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={startGame} className="mt-6 min-h-12 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-rose-500 px-5 py-3 font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-95">Bulmacayı Başlat</button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-violet-100/60 bg-white/70 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">{moves} hamle</span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-300">{completedTubes}/{settings.colors} tamamlandı</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!history.length || phase !== 'playing'}
                  aria-label="Son hamleyi geri al"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-violet-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetGame}
                  aria-label="Bulmacayı baştan başlat"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-rose-100 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={`mx-auto grid max-w-lg gap-x-2 sm:gap-x-3 gap-y-4 sm:gap-y-5 rounded-3xl border border-violet-100/60 bg-white/50 p-2.5 sm:p-4 shadow-inner dark:border-white/10 dark:bg-slate-950/40 ${tubes.length <= 6 ? 'grid-cols-3 sm:grid-cols-6' : tubes.length === 7 ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-4'}`}>
              {tubes.map((tube, tubeIndex) => {
                const completed = tube.length === CAPACITY && tube.every((color) => color === tube[0]);
                const displaySlots = [...Array<number | null>(CAPACITY - tube.length).fill(null), ...[...tube].reverse()];
                return (
                  <motion.button
                    key={tubeIndex}
                    type="button"
                    onClick={() => chooseTube(tubeIndex)}
                    whileTap={{ scale: 0.94 }}
                    animate={{ y: selectedTube === tubeIndex ? -10 : 0 }}
                    aria-label={`${tubeIndex + 1}. tüp: ${tube.length ? tube.slice().reverse().map((color) => COLOR_NAMES[color]).join(', ') : 'boş'}`}
                    className="group relative mx-auto flex h-40 w-full min-w-10 max-w-16 flex-col items-center pt-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    {/* Tüpün ağzı / cam dudak halkası (rim) */}
                    <div
                      className={`relative z-10 h-2.5 w-[calc(100%+6px)] rounded-full border-2 transition-all duration-200 shadow-sm ${
                        completed
                          ? 'border-emerald-400 bg-emerald-200/60 shadow-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-400/30'
                          : selectedTube === tubeIndex
                            ? 'border-violet-400 bg-violet-200/70 ring-2 ring-violet-400/50 shadow-violet-500/25 dark:border-violet-400 dark:bg-violet-400/30'
                            : 'border-white/80 bg-white/60 dark:border-white/30 dark:bg-white/20'
                      }`}
                    />

                    {/* Tüp gövdesi */}
                    <div
                      className={`relative -mt-1 flex h-36 w-full flex-col gap-1 overflow-hidden rounded-b-[1.75rem] rounded-t-sm border-4 border-t-0 p-1.5 pt-2.5 shadow-lg transition-all duration-200 ${
                        completed
                          ? 'border-emerald-400 bg-emerald-100/50 shadow-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-500/20 dark:shadow-[0_0_16px_rgba(52,211,153,0.3)]'
                          : selectedTube === tubeIndex
                            ? 'border-violet-500 bg-violet-100/70 shadow-violet-500/20 dark:border-violet-400 dark:bg-violet-500/25 dark:shadow-[0_0_16px_rgba(167,139,250,0.35)]'
                            : 'border-white/90 bg-white/40 dark:border-white/20 dark:bg-white/[0.05] dark:hover:border-white/30 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {/* Cam dikey yansıma parlaması */}
                      <span className="pointer-events-none absolute left-1 top-1 bottom-4 w-0.5 rounded-full bg-white/35 dark:bg-white/15" />

                      {displaySlots.map((color, slot) => {
                        if (color === null) {
                          return (
                            <span
                              key={`${slot}-empty`}
                              className="flex-1 rounded-full border border-transparent"
                            />
                          );
                        }
                        return (
                          <motion.span
                            key={`${slot}-${color}`}
                            initial={{ scale: 0.7 }}
                            animate={{ scale: 1 }}
                            className="relative flex-1 rounded-full border border-white/30 shadow-inner overflow-hidden"
                            style={{
                              background: COLORS[color],
                              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
                            }}
                          >
                            <span className="pointer-events-none absolute inset-x-1.5 top-0.5 h-1 rounded-full bg-white/40 blur-[0.5px]" />
                          </motion.span>
                        );
                      })}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-xs font-medium text-muted-foreground dark:text-slate-400">{selectedTube === null ? 'Taşımak istediğin tüpe dokun.' : 'Şimdi hedef tüpü seç.'}</p>

            {phase === 'finished' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-3xl border border-violet-100/60 bg-white/80 p-5 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
                <Trophy className="mx-auto h-9 w-9 text-amber-500" />
                <h2 className="mt-2 text-xl font-black">Renkler kusursuz sıralandı!</h2>
                <p className="mt-1 font-bold text-violet-600 dark:text-violet-300">{score} puan {isNewRecord && '• Yeni rekor!'}</p>
                <button type="button" onClick={startGame} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-violet-500 px-5 py-2.5 font-black text-white transition hover:scale-105 active:scale-95"><RotateCcw className="h-4 w-4" /> Yeni Bulmaca</button>
              </motion.div>
            )}
          </>
        )}
      </section>
      <div className="mt-5"><Leaderboard gameId={GAME_ID} /></div>
    </div>
  );
}
