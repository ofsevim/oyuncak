import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { fireConfetti } from '@/utils/confettiUtil';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playErrorSound, playNewRecordSound, playPopSound, playSuccessSound, playWordFoundSound } from '@/utils/soundEffects';

const GAME_ID = 'word-search';
const GRID_SIZE = 6;
const ALPHABET = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];

type Category = keyof typeof WORD_SETS;
type Coordinate = { row: number; column: number };
type Placement = { word: string; cells: Coordinate[] };

const WORD_SETS = {
  animals: { label: 'Hayvanlar', emoji: '🐾', words: ['KEDİ', 'KÖPEK', 'ASLAN', 'BALIK', 'TAVŞAN', 'ZEBRA'] },
  nature: { label: 'Doğa', emoji: '🌿', words: ['GÜNEŞ', 'BULUT', 'DENİZ', 'ÇİÇEK', 'ORMAN', 'YAĞMUR'] },
  school: { label: 'Okul', emoji: '🎒', words: ['KALEM', 'KİTAP', 'SİLGİ', 'ÇANTA', 'MASA', 'BOYA'] },
} as const;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
] as const;

const shuffle = <T,>(items: readonly T[]) => [...items].sort(() => Math.random() - 0.5);
const cellKey = ({ row, column }: Coordinate) => `${row}-${column}`;

const createWordSearchPuzzle = (words: readonly string[]) => {
  for (let puzzleAttempt = 0; puzzleAttempt < 80; puzzleAttempt += 1) {
    const grid = Array.from({ length: GRID_SIZE }, () => Array<string>(GRID_SIZE).fill(''));
    const placements: Placement[] = [];
    let completed = true;

    for (const word of shuffle(words).slice(0, 5)) {
      let placed = false;
      for (let attempt = 0; attempt < 180 && !placed; attempt += 1) {
        const [rowStep, columnStep] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const row = Math.floor(Math.random() * GRID_SIZE);
        const column = Math.floor(Math.random() * GRID_SIZE);
        const cells = Array.from({ length: word.length }, (_, index) => ({
          row: row + rowStep * index,
          column: column + columnStep * index,
        }));
        const fits = cells.every((cell, index) =>
          cell.row >= 0 && cell.row < GRID_SIZE && cell.column >= 0 && cell.column < GRID_SIZE
          && (!grid[cell.row][cell.column] || grid[cell.row][cell.column] === word[index]));
        if (!fits) continue;
        cells.forEach((cell, index) => { grid[cell.row][cell.column] = word[index]; });
        placements.push({ word, cells });
        placed = true;
      }
      if (!placed) {
        completed = false;
        break;
      }
    }

    if (completed && placements.length === 5) {
      grid.forEach((row) => row.forEach((letter, column) => {
        if (!letter) row[column] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }));
      return { grid, placements };
    }
  }
  throw new Error('Kelime bulmacası oluşturulamadı');
};

const lineBetween = (start: Coordinate, end: Coordinate) => {
  const rowDifference = end.row - start.row;
  const columnDifference = end.column - start.column;
  const distance = Math.max(Math.abs(rowDifference), Math.abs(columnDifference));
  if (distance === 0) return [start];
  const isStraight = rowDifference === 0 || columnDifference === 0 || Math.abs(rowDifference) === Math.abs(columnDifference);
  if (!isStraight) return [];
  const rowStep = Math.sign(rowDifference);
  const columnStep = Math.sign(columnDifference);
  return Array.from({ length: distance + 1 }, (_, index) => ({ row: start.row + rowStep * index, column: start.column + columnStep * index }));
};

export default function WordSearchGame() {
  const [category, setCategory] = useState<Category>('animals');
  const [phase, setPhase] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [puzzle, setPuzzle] = useState(() => createWordSearchPuzzle(WORD_SETS.animals.words));
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectionStart, setSelectionStart] = useState<Coordinate | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Coordinate | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore(GAME_ID));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const { safeInterval, clearSafeInterval, safeTimeout } = useSafeTimeouts();

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const timer = safeInterval(() => setElapsed((current) => current + 1), 1000);
    return () => clearSafeInterval(timer);
  }, [clearSafeInterval, phase, safeInterval]);

  const foundCellKeys = useMemo(() => new Set(
    puzzle.placements
      .filter((placement) => foundWords.includes(placement.word))
      .flatMap((placement) => placement.cells.map(cellKey)),
  ), [foundWords, puzzle.placements]);

  const selectedCellKeys = useMemo(() => new Set(
    selectionStart && selectionEnd ? lineBetween(selectionStart, selectionEnd).map(cellKey) : [],
  ), [selectionEnd, selectionStart]);

  const finish = (seconds: number) => {
    const finalScore = Math.max(250, 1200 - seconds * 8);
    const record = saveHighScoreObj(GAME_ID, finalScore);
    setScore(finalScore);
    setHighScore((current) => Math.max(current, finalScore));
    setIsNewRecord(record);
    setPhase('finished');
    fireConfetti();
    if (record) playNewRecordSound(); else playSuccessSound();
  };

  const chooseCell = (coordinate: Coordinate) => {
    if (phase !== 'playing') return;
    if (!selectionStart) {
      setSelectionStart(coordinate);
      setSelectionEnd(coordinate);
      playPopSound();
      return;
    }

    const cells = lineBetween(selectionStart, coordinate);
    const placement = puzzle.placements.find((candidate) => {
      if (foundWords.includes(candidate.word) || candidate.cells.length !== cells.length) return false;
      const forward = candidate.cells.every((cell, index) => cellKey(cell) === cellKey(cells[index]));
      const backward = candidate.cells.every((cell, index) => cellKey(cell) === cellKey(cells[cells.length - 1 - index]));
      return forward || backward;
    });

    if (!placement) {
      playErrorSound();
      setSelectionStart(coordinate);
      setSelectionEnd(coordinate);
      return;
    }

    const nextFound = [...foundWords, placement.word];
    setFoundWords(nextFound);
    setSelectionStart(null);
    setSelectionEnd(null);
    setHintWord(null);
    if (nextFound.length === puzzle.placements.length) finish(elapsed);
    else playWordFoundSound(placement.word.length);
  };

  const startGame = () => {
    setPuzzle(createWordSearchPuzzle(WORD_SETS[category].words));
    setFoundWords([]);
    setSelectionStart(null);
    setSelectionEnd(null);
    setElapsed(0);
    setScore(0);
    setIsNewRecord(false);
    setHintWord(null);
    setPhase('playing');
  };

  const showHint = () => {
    const remaining = puzzle.placements.filter((placement) => !foundWords.includes(placement.word));
    if (!remaining.length) return;
    const word = remaining[Math.floor(Math.random() * remaining.length)].word;
    setHintWord(word);
    playPopSound();
    safeTimeout(() => setHintWord(null), 1800);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 text-foreground">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100/60 bg-gradient-to-b from-emerald-50 to-cyan-50 p-4 shadow-xl sm:p-7 dark:border-emerald-400/10 dark:from-slate-950 dark:to-emerald-950/40">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">Türkçe • Dikkat</p>
            <h1 className="text-2xl font-black sm:text-3xl">Kelime Avı</h1>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2 text-right shadow-sm dark:bg-white/10">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rekor</p>
            <p className="font-black text-emerald-600 dark:text-emerald-300">{highScore}</p>
          </div>
        </div>

        {phase === 'menu' ? (
          <div className="rounded-3xl bg-white/80 p-5 text-center shadow-sm dark:bg-white/5 sm:p-7">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-4xl shadow-lg">🔎</div>
            <h2 className="text-xl font-black">Gizli Türkçe kelimeleri bul</h2>
            <p className="mt-2 text-sm text-muted-foreground">Bir kelimenin ilk ve son harfine dokun. Yatay, dikey ve çapraz kelimeleri tamamla.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {(Object.entries(WORD_SETS) as [Category, (typeof WORD_SETS)[Category]][]).map(([id, item]) => (
                <button key={id} type="button" onClick={() => setCategory(id)} aria-pressed={category === id} className={`min-h-16 rounded-2xl border p-2 font-bold transition ${category === id ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background/60 hover:bg-background'}`}>
                  <span className="block text-xl">{item.emoji}</span><span className="text-xs sm:text-sm">{item.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={startGame} className="mt-6 min-h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3 font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-95">Avı Başlat</button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm dark:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-cyan-500" /> {elapsed} sn</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-300">{foundWords.length}/{puzzle.placements.length} kelime</span>
              <button type="button" onClick={showHint} disabled={phase !== 'playing'} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50 dark:hover:bg-amber-400/10"><Lightbulb className="h-4 w-4" /> İpucu</button>
            </div>

            <div className="mx-auto grid w-full max-w-md grid-cols-6 gap-1.5 rounded-3xl bg-white/80 p-2 shadow-lg dark:bg-slate-950/60 sm:gap-2 sm:p-3">
              {puzzle.grid.map((row, rowIndex) => row.map((letter, columnIndex) => {
                const coordinate = { row: rowIndex, column: columnIndex };
                const key = cellKey(coordinate);
                const found = foundCellKeys.has(key);
                const selected = selectedCellKeys.has(key);
                const hinted = hintWord ? puzzle.placements.find((placement) => placement.word === hintWord)?.cells.some((cell) => cellKey(cell) === key) : false;
                return (
                  <motion.button key={key} type="button" whileTap={{ scale: 0.88 }} onClick={() => chooseCell(coordinate)} onPointerEnter={() => { if (selectionStart) setSelectionEnd(coordinate); }} aria-label={`${rowIndex + 1}. satır ${columnIndex + 1}. sütun, ${letter}`} className={`aspect-square min-h-11 rounded-xl text-base font-black shadow-sm transition sm:text-xl ${found ? 'bg-emerald-500 text-white' : hinted ? 'animate-pulse bg-amber-300 text-amber-950' : selected ? 'bg-cyan-400 text-white' : 'bg-white text-slate-700 hover:bg-cyan-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'}`}>
                    {letter}
                  </motion.button>
                );
              }))}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {puzzle.placements.map((placement) => {
                const found = foundWords.includes(placement.word);
                return <span key={placement.word} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${found ? 'bg-emerald-500 text-white line-through' : 'bg-white/80 text-slate-600 dark:bg-white/10 dark:text-slate-200'}`}>{found && <Check className="h-3 w-3" />}{placement.word}</span>;
              })}
            </div>

            <p className="mt-4 text-center text-xs font-medium text-muted-foreground">{selectionStart ? 'Şimdi kelimenin son harfine dokun.' : 'İlk harfe dokunarak seçime başla.'}</p>

            {phase === 'finished' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-3xl bg-white/80 p-5 text-center shadow-sm dark:bg-white/5">
                <Trophy className="mx-auto h-9 w-9 text-amber-500" />
                <h2 className="mt-2 text-xl font-black">Bütün kelimeleri buldun!</h2>
                <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-300">{score} puan {isNewRecord && '• Yeni rekor!'}</p>
                <button type="button" onClick={startGame} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 font-black text-white transition hover:scale-105 active:scale-95"><RotateCcw className="h-4 w-4" /> Yeni Bulmaca</button>
              </motion.div>
            )}
          </>
        )}
      </section>
      <div className="mt-5"><Leaderboard gameId={GAME_ID} /></div>
    </div>
  );
}
