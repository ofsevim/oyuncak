import { useState, useCallback, useRef } from 'react';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { playNewRecordSound } from '@/utils/soundEffects';

/**
 * Centralized high score management hook
 * Handles loading, saving, and new record detection for any game
 */
export function useHighScore(gameId: string) {
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
      playNewRecordSound();
    }
    return isNew;
  }, [gameId]);

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
