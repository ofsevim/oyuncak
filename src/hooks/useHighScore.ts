import { useState, useCallback, useRef } from 'react';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playNewRecordSound } from '@/utils/soundEffects';

/**
 * Centralized high score management hook
 * Handles loading, saving, and new record detection for any game.
 *
 * @param gameId  Skor anahtarı (örn. 'counting')
 * @param options.playSound  Yeni rekorda rekor sesi çalınsın mı (varsayılan: true).
 *   Bazı oyunlar rekor anını kendi ses akışında yönettiği için false geçebilir.
 */
export function useHighScore(gameId: string, options: { playSound?: boolean } = {}) {
  const { playSound = true } = options;
  const [highScore, setHighScore] = useState(() => getHighScore(gameId));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const scoreRef = useRef(0);

  const resetRecord = useCallback(() => {
    setIsNewRecord(false);
    scoreRef.current = 0;
  }, []);

  const checkAndSave = useCallback((score: number): boolean => {
    scoreRef.current = score;
    const isNew = saveHighScoreObj(gameId, score);
    if (isNew) {
      setIsNewRecord(true);
      setHighScore(score);
      if (playSound) playNewRecordSound();
    }
    return isNew;
  }, [gameId, playSound]);

  const refreshHighScore = useCallback(() => {
    setHighScore(getHighScore(gameId));
  }, [gameId]);

  return {
    highScore,
    isNewRecord,
    scoreRef,
    checkAndSave,
    resetRecord,
    refreshHighScore,
  };
}

export default useHighScore;
