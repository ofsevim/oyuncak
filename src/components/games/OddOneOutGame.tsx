'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound, playLevelUpSound } from '@/utils/soundEffects';
import { smartShuffle, shuffleArray } from '@/utils/shuffle';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';

const ROUNDS = [
  { items: [{ id: '1', emoji: '🐕' },{ id: '2', emoji: '🐈' },{ id: '3', emoji: '🐰' },{ id: '4', emoji: '🚗' }], oddOne: '4', hint: 'Hangisi hayvan değil?' },
  { items: [{ id: '1', emoji: '🍎' },{ id: '2', emoji: '🍌' },{ id: '3', emoji: '🏠' },{ id: '4', emoji: '🍇' }], oddOne: '3', hint: 'Hangisi meyve değil?' },
  { items: [{ id: '1', emoji: '✈️' },{ id: '2', emoji: '🚂' },{ id: '3', emoji: '🌸' },{ id: '4', emoji: '🚀' }], oddOne: '3', hint: 'Hangisi taşıt değil?' },
  { items: [{ id: '1', emoji: '🔴' },{ id: '2', emoji: '🔵' },{ id: '3', emoji: '🟢' },{ id: '4', emoji: '📐' }], oddOne: '4', hint: 'Hangisi renk değil?' },
  { items: [{ id: '1', emoji: '🦁' },{ id: '2', emoji: '🐯' },{ id: '3', emoji: '🦒' },{ id: '4', emoji: '🐳' }], oddOne: '4', hint: 'Hangisi karada yaşamaz?' },
  { items: [{ id: '1', emoji: '🥦' },{ id: '2', emoji: '🥕' },{ id: '3', emoji: '🍦' },{ id: '4', emoji: '🌽' }], oddOne: '3', hint: 'Hangisi sebze değil?' },
  { items: [{ id: '1', emoji: '🎸' },{ id: '2', emoji: '🎺' },{ id: '3', emoji: '🎻' },{ id: '4', emoji: '🔨' }], oddOne: '4', hint: 'Hangisi müzik aleti değil?' },
  { items: [{ id: '1', emoji: '☀️' },{ id: '2', emoji: '☁️' },{ id: '3', emoji: '🌧️' },{ id: '4', emoji: '🍔' }], oddOne: '4', hint: 'Hangisi hava durumu değil?' },
  { items: [{ id: '1', emoji: '⚽' },{ id: '2', emoji: '🏀' },{ id: '3', emoji: '🎾' },{ id: '4', emoji: '🧸' }], oddOne: '4', hint: 'Hangisi spor topu değil?' },
  { items: [{ id: '1', emoji: '🐙' },{ id: '2', emoji: '🦀' },{ id: '3', emoji: '🐠' },{ id: '4', emoji: '🦋' }], oddOne: '4', hint: 'Hangisi denizde yaşamaz?' },
  { items: [{ id: '1', emoji: '🍕' },{ id: '2', emoji: '🍔' },{ id: '3', emoji: '🌭' },{ id: '4', emoji: '👕' }], oddOne: '4', hint: 'Hangisi yemek değil?' },
  { items: [{ id: '1', emoji: '📚' },{ id: '2', emoji: '📖' },{ id: '3', emoji: '📝' },{ id: '4', emoji: '🍕' }], oddOne: '4', hint: 'Hangisi okul malzemesi değil?' },
  { items: [{ id: '1', emoji: '🌲' },{ id: '2', emoji: '🌳' },{ id: '3', emoji: '🌴' },{ id: '4', emoji: '🚲' }], oddOne: '4', hint: 'Hangisi ağaç değil?' },
  { items: [{ id: '1', emoji: '👕' },{ id: '2', emoji: '👖' },{ id: '3', emoji: '👗' },{ id: '4', emoji: '🍌' }], oddOne: '4', hint: 'Hangisi kıyafet değil?' },
  { items: [{ id: '1', emoji: '🌙' },{ id: '2', emoji: '⭐' },{ id: '3', emoji: '☀️' },{ id: '4', emoji: '🏠' }], oddOne: '4', hint: 'Hangisi gökyüzünde değil?' },
  { items: [{ id: '1', emoji: '🍓' },{ id: '2', emoji: '🍉' },{ id: '3', emoji: '🍊' },{ id: '4', emoji: '🥖' }], oddOne: '4', hint: 'Hangisi meyve değil?' },
  { items: [{ id: '1', emoji: '🐝' },{ id: '2', emoji: '🦋' },{ id: '3', emoji: '🐞' },{ id: '4', emoji: '🐘' }], oddOne: '4', hint: 'Hangisi böcek değil?' },
  { items: [{ id: '1', emoji: '🎨' },{ id: '2', emoji: '🖌️' },{ id: '3', emoji: '✏️' },{ id: '4', emoji: '⚽' }], oddOne: '4', hint: 'Hangisi çizim aracı değil?' },
  { items: [{ id: '1', emoji: '❄️' },{ id: '2', emoji: '☃️' },{ id: '3', emoji: '🌨️' },{ id: '4', emoji: '🔥' }], oddOne: '4', hint: 'Hangisi soğukla ilgili değil?' },
  { items: [{ id: '1', emoji: '🏖️' },{ id: '2', emoji: '🏝️' },{ id: '3', emoji: '⛱️' },{ id: '4', emoji: '⛷️' }], oddOne: '4', hint: 'Hangisi plajla ilgili değil?' },
];

// 6-item hard rounds
const HARD_ROUNDS = [
  { items: [{ id:'1',emoji:'🐕' },{ id:'2',emoji:'🐈' },{ id:'3',emoji:'🐰' },{ id:'4',emoji:'🐻' },{ id:'5',emoji:'🦊' },{ id:'6',emoji:'🚗' }], oddOne:'6', hint:'Hangisi hayvan değil?' },
  { items: [{ id:'1',emoji:'🍎' },{ id:'2',emoji:'🍌' },{ id:'3',emoji:'🍇' },{ id:'4',emoji:'🍊' },{ id:'5',emoji:'🍓' },{ id:'6',emoji:'🏠' }], oddOne:'6', hint:'Hangisi meyve değil?' },
  { items: [{ id:'1',emoji:'✈️' },{ id:'2',emoji:'🚂' },{ id:'3',emoji:'🚀' },{ id:'4',emoji:'🚗' },{ id:'5',emoji:'🚢' },{ id:'6',emoji:'🌸' }], oddOne:'6', hint:'Hangisi taşıt değil?' },
  { items: [{ id:'1',emoji:'⚽' },{ id:'2',emoji:'🏀' },{ id:'3',emoji:'🎾' },{ id:'4',emoji:'🏐' },{ id:'5',emoji:'🏈' },{ id:'6',emoji:'🧸' }], oddOne:'6', hint:'Hangisi top değil?' },
  { items: [{ id:'1',emoji:'🎸' },{ id:'2',emoji:'🎺' },{ id:'3',emoji:'🎻' },{ id:'4',emoji:'🥁' },{ id:'5',emoji:'🎹' },{ id:'6',emoji:'🔨' }], oddOne:'6', hint:'Hangisi müzik aleti değil?' },
];

const OddOneOutGame = () => {
  const [shuffledRounds, setShuffledRounds] = useState([...ROUNDS]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shake, setShake] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [roundItems, setRoundItems] = useState<{ id: string; emoji: string }[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [useTimer, setUseTimer] = useState(false);
  const [useHardMode, setUseHardMode] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setHighScore(getHighScore('oddoneout')); }, []);

  const clearAllTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };

  const initGame = useCallback(() => {
    clearAllTimeouts();
    if (timerRef.current) clearInterval(timerRef.current);
    const rounds = useHardMode ? smartShuffle([...ROUNDS, ...HARD_ROUNDS], 'hint') : smartShuffle(ROUNDS, 'hint');
    setShuffledRounds(rounds);
    setCurrentRoundIndex(0); setSelectedId(null); setIsCorrect(false);
    setGameComplete(false); setShowSuccess(false); setScore(0); setStreak(0); setHintUsed(false);
    if (rounds.length > 0) setRoundItems(shuffleArray(rounds[0].items));
    if (useTimer) setTimeLeft(15);
  }, [useHardMode, useTimer]);

  useEffect(() => { initGame(); }, [initGame]);
  useEffect(() => () => { timeoutsRef.current.forEach(clearTimeout); }, []);

  const round = shuffledRounds[currentRoundIndex];

  useEffect(() => { if (round) { setRoundItems(shuffleArray(round.items)); setHintUsed(false); } }, [currentRoundIndex, round]);

  // Timer
  useEffect(() => {
    if (!useTimer || !round || selectedId) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playErrorSound(); setStreak(0);
          if (currentRoundIndex < shuffledRounds.length - 1) {
            setCurrentRoundIndex(p => p + 1); setSelectedId(null); setIsCorrect(false);
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [useTimer, round, currentRoundIndex, shuffledRounds.length, selectedId]);

  const handleSelect = (itemId: string) => {
    if (selectedId) return;
    setSelectedId(itemId);
    if (itemId === round.oddOne) {
      setIsCorrect(true); playPopSound(); playSuccessSound();
      const newStreak = streak + 1;
      const bonus = useTimer ? Math.ceil(timeLeft / 3) : 0;
      const points = 10 + bonus + (newStreak >= 3 ? Math.min(newStreak, 5) : 0);
      setScore(p => p + points); setStreak(newStreak);
      if (newStreak % 5 === 0) playLevelUpSound();
      saveHighScoreObj('oddoneout', score + points);
      const t = setTimeout(() => {
        if (currentRoundIndex < shuffledRounds.length - 1) setShowSuccess(true);
        else { setGameComplete(true); setShowSuccess(true); }
      }, 500);
      timeoutsRef.current.push(t);
    } else {
      playErrorSound(); setShake(true); setStreak(0);
      const t = setTimeout(() => { setShake(false); setSelectedId(null); }, 600);
      timeoutsRef.current.push(t);
    }
  };

  const handleNextRound = () => {
    setShowSuccess(false);
    if (!gameComplete) { setCurrentRoundIndex(p => p + 1); setSelectedId(null); setIsCorrect(false); }
  };

  if (!round) return null;

  const gridCols = round.items.length <= 4 ? 2 : 3;

  return (
    <motion.div className="flex flex-col items-center gap-5 p-4 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl md:text-3xl font-black text-gradient">🔍 Farklı Olanı Bul</h2>

      <div className="flex flex-wrap justify-center gap-2">
        <div className="glass-card px-3 py-1.5 border border-primary/20 rounded-xl"><span className="text-sm font-black text-primary">⭐ {score}</span></div>
        <div className="glass-card px-3 py-1.5 rounded-xl"><span className="text-sm font-bold text-muted-foreground">{currentRoundIndex + 1}/{shuffledRounds.length}</span></div>
        {streak >= 3 && <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="glass-card px-3 py-1.5 border border-yellow-500/20 rounded-xl"><span className="text-sm font-black text-yellow-400">🔥 x{Math.min(streak, 5)}</span></motion.div>}
        {useTimer && <div className="glass-card px-3 py-1.5 rounded-xl"><span className={`text-sm font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>⏱️ {timeLeft}s</span></div>}
      </div>

      <p className="text-lg text-center font-semibold glass-card px-5 py-2 rounded-full border border-secondary/20 text-foreground">{round.hint}</p>

      <div className={`grid gap-3 ${shake ? 'animate-shake' : ''}`} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        {roundItems.map((item) => (
          <button key={item.id} onClick={() => handleSelect(item.id)} disabled={!!selectedId && isCorrect}
            className={`w-20 h-20 md:w-28 md:h-28 text-4xl md:text-5xl rounded-2xl transition-all touch-manipulation active:scale-95 ${
              selectedId === item.id ? (isCorrect ? 'bg-green-500/20 ring-4 ring-green-400 scale-105' : 'bg-red-500/20 ring-4 ring-red-400') : 'glass-card border border-white/10 hover:border-primary/30 hover:bg-white/5'
            }`} style={{ touchAction: 'manipulation' }}>
            {item.emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={() => { setUseTimer(p => !p); initGame(); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${useTimer ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'glass-card text-muted-foreground'}`}>
          ⏱️ Zamanlı
        </button>
        <button onClick={() => { setUseHardMode(p => !p); initGame(); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${useHardMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'glass-card text-muted-foreground'}`}>
          🔥 Zor Mod
        </button>
        <button onClick={initGame} className="px-3 py-1.5 glass-card text-muted-foreground rounded-lg font-bold text-xs">🔄 Yeniden</button>
      </div>

      <SuccessPopup isOpen={showSuccess} onClose={handleNextRound} message={gameComplete ? `Süpersin! ${score} puan!` : 'Doğru!'} />
    </motion.div>
  );
};

export default OddOneOutGame;
