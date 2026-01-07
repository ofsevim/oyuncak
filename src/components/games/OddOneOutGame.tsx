'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { speakInstruction } from '@/utils/voiceFeedback';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';

const ROUNDS = [
  { items: [{ id: '1', emoji: '🐕' }, { id: '2', emoji: '🐈' }, { id: '3', emoji: '🐰' }, { id: '4', emoji: '🚗' }], oddOne: '4', hint: 'Hangisi hayvan değil?' },
  { items: [{ id: '1', emoji: '🍎' }, { id: '2', emoji: '🍌' }, { id: '3', emoji: '🏠' }, { id: '4', emoji: '🍇' }], oddOne: '3', hint: 'Hangisi meyve değil?' },
  { items: [{ id: '1', emoji: '✈️' }, { id: '2', emoji: '🚂' }, { id: '3', emoji: '🌸' }, { id: '4', emoji: '🚀' }], oddOne: '3', hint: 'Hangisi taşıt değil?' },
  { items: [{ id: '1', emoji: '🔴' }, { id: '2', emoji: '🔵' }, { id: '3', emoji: '🟢' }, { id: '4', emoji: '📐' }], oddOne: '4', hint: 'Hangisi renk değil?' },
  { items: [{ id: '1', emoji: '🦁' }, { id: '2', emoji: '🐯' }, { id: '3', emoji: '🦒' }, { id: '4', emoji: '🐳' }], oddOne: '4', hint: 'Hangisi karada yaşamaz?' },
  { items: [{ id: '1', emoji: '🥦' }, { id: '2', emoji: '🥕' }, { id: '3', emoji: '🍦' }, { id: '4', emoji: '🌽' }], oddOne: '3', hint: 'Hangisi sebze değil?' },
  { items: [{ id: '1', emoji: '🎸' }, { id: '2', emoji: '🎺' }, { id: '3', emoji: '🎻' }, { id: '4', emoji: '🔨' }], oddOne: '4', hint: 'Hangisi müzik aleti değil?' },
  { items: [{ id: '1', emoji: '☀️' }, { id: '2', emoji: '☁️' }, { id: '3', emoji: '🌧️' }, { id: '4', emoji: '🍔' }], oddOne: '4', hint: 'Hangisi hava durumu değil?' },
  { items: [{ id: '1', emoji: '⚽' }, { id: '2', emoji: '🏀' }, { id: '3', emoji: '🎾' }, { id: '4', emoji: '🧸' }], oddOne: '4', hint: 'Hangisi spor topu değil?' },
  { items: [{ id: '1', emoji: '🐙' }, { id: '2', emoji: '🦀' }, { id: '3', emoji: '🐠' }, { id: '4', emoji: '🦋' }], oddOne: '4', hint: 'Hangisi denizde yaşamaz?' },
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

  // Fisher-Yates shuffle helper
  const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const initGame = () => {
    const newShuffledRounds = shuffle(ROUNDS);
    setShuffledRounds(newShuffledRounds);
    setCurrentRoundIndex(0);
    setSelectedId(null);
    setIsCorrect(false);
    setGameComplete(false);
    setShowSuccess(false);
    // İlk raundu ayarla
    setRoundItems(shuffle(newShuffledRounds[0].items));
  };

  useEffect(() => {
    initGame();
  }, []);

  const round = shuffledRounds[currentRoundIndex];
  
  useEffect(() => { 
    if (round) {
      speakInstruction(round.hint);
      setRoundItems(shuffle(round.items));
    }
  }, [currentRoundIndex, round]);

  const handleSelect = (itemId: string) => {
    if (selectedId) return;
    setSelectedId(itemId);
    if (itemId === round.oddOne) {
      setIsCorrect(true); playPopSound(); playSuccessSound();
      setTimeout(() => { 
        if (currentRoundIndex < shuffledRounds.length - 1) setShowSuccess(true); 
        else { setGameComplete(true); setShowSuccess(true); } 
      }, 500);
    } else {
      playErrorSound(); setShake(true);
      setTimeout(() => { setShake(false); setSelectedId(null); }, 600);
    }
  };

  const handleNextRound = () => { 
    setShowSuccess(false); 
    if (!gameComplete) { 
      setCurrentRoundIndex(p => p + 1); 
      setSelectedId(null); 
      setIsCorrect(false); 
    } 
  };
  
  const handleRestart = () => initGame();

  if (!round) return null;

  return (
    <motion.div className="flex flex-col items-center gap-6 p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">🔍 Farklı Olanı Bul</h2>
      <p className="text-xl text-muted-foreground text-center font-semibold bg-secondary/50 px-6 py-3 rounded-full">{round.hint}</p>
      <div className={`grid grid-cols-2 gap-4 ${shake ? 'animate-shake' : ''}`}>
        {roundItems.map((item) => (
          <button key={item.id} onClick={() => handleSelect(item.id)} disabled={!!selectedId && isCorrect}
            className={`w-24 h-24 md:w-32 md:h-32 text-5xl rounded-3xl shadow-playful transition-all hover:scale-105 ${selectedId === item.id ? (isCorrect ? 'bg-success ring-4 ring-success' : 'bg-destructive') : 'bg-card hover:bg-muted'}`}>
            {item.emoji}
          </button>
        ))}
      </div>
      <div className="text-sm font-bold text-muted-foreground">
        Soru: {currentRoundIndex + 1} / {shuffledRounds.length}
      </div>
      <button onClick={handleRestart} className="px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-bold btn-bouncy">Yeniden Başla</button>
      <SuccessPopup isOpen={showSuccess} onClose={handleNextRound} message={gameComplete ? 'Süpersin!' : 'Doğru!'} />
    </motion.div>
  );
};

export default OddOneOutGame;
