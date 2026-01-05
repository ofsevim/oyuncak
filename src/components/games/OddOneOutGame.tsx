'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { speakInstruction, speakSuccess, speakTryAgain } from '@/utils/voiceFeedback';

const ROUNDS = [
  { items: [{ id: '1', emoji: '🐕' }, { id: '2', emoji: '🐈' }, { id: '3', emoji: '🐰' }, { id: '4', emoji: '🚗' }], oddOne: '4', hint: 'Hangisi hayvan değil?' },
  { items: [{ id: '1', emoji: '🍎' }, { id: '2', emoji: '🍌' }, { id: '3', emoji: '🏠' }, { id: '4', emoji: '🍇' }], oddOne: '3', hint: 'Hangisi meyve değil?' },
  { items: [{ id: '1', emoji: '✈️' }, { id: '2', emoji: '🚂' }, { id: '3', emoji: '🌸' }, { id: '4', emoji: '🚀' }], oddOne: '3', hint: 'Hangisi taşıt değil?' },
];

const OddOneOutGame = () => {
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shake, setShake] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const round = ROUNDS[currentRound];
  useEffect(() => { speakInstruction(round.hint); }, [currentRound, round.hint]);

  const handleSelect = (itemId: string) => {
    if (selectedId) return;
    setSelectedId(itemId);
    if (itemId === round.oddOne) {
      setIsCorrect(true); speakSuccess();
      setTimeout(() => { if (currentRound < ROUNDS.length - 1) setShowSuccess(true); else { setGameComplete(true); setShowSuccess(true); } }, 500);
    } else {
      speakTryAgain(); setShake(true);
      setTimeout(() => { setShake(false); setSelectedId(null); }, 600);
    }
  };

  const handleNextRound = () => { setShowSuccess(false); if (!gameComplete) { setCurrentRound(p => p + 1); setSelectedId(null); setIsCorrect(false); } };
  const handleRestart = () => { setCurrentRound(0); setSelectedId(null); setIsCorrect(false); setGameComplete(false); setShowSuccess(false); };

  return (
    <motion.div className="flex flex-col items-center gap-6 p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">🔍 Farklı Olanı Bul</h2>
      <p className="text-xl text-muted-foreground text-center font-semibold bg-secondary/50 px-6 py-3 rounded-full">{round.hint}</p>
      <div className={`grid grid-cols-2 gap-4 ${shake ? 'animate-shake' : ''}`}>
        {round.items.map((item) => (
          <button key={item.id} onClick={() => handleSelect(item.id)} disabled={!!selectedId && isCorrect}
            className={`w-24 h-24 md:w-32 md:h-32 text-5xl rounded-3xl shadow-playful transition-all hover:scale-105 ${selectedId === item.id ? (isCorrect ? 'bg-success ring-4 ring-success' : 'bg-destructive') : 'bg-card hover:bg-muted'}`}>
            {item.emoji}
          </button>
        ))}
      </div>
      <button onClick={handleRestart} className="px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-bold btn-bouncy">Yeniden Başla</button>
      <SuccessPopup isOpen={showSuccess} onClose={handleNextRound} message={gameComplete ? 'Süpersin!' : 'Doğru!'} />
    </motion.div>
  );
};

export default OddOneOutGame;
