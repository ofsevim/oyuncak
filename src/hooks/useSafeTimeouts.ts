import { useCallback, useEffect, useRef } from 'react';
import { createPausableTimers } from '@/utils/pausableTimers';
import { GAME_ACTIVITY_EVENT, isGamePaused } from '@/utils/gameActivity';

/** Game timers preserve their remaining duration during pauses and clean up on exit. */
export function useSafeTimeouts() {
  const ref = useRef<ReturnType<typeof createPausableTimers>>();
  if (!ref.current) { ref.current = createPausableTimers(); ref.current.setPaused(isGamePaused()); }
  const timers = ref.current;
  const safeTimeout = timers.timeout;
  const safeInterval = timers.interval;
  const clearSafeTimeout = timers.clear;
  const clearSafeInterval = clearSafeTimeout;
  const clearAllTimeouts = useCallback(() => timers.clearAll(false), [timers]);
  const clearAllIntervals = useCallback(() => timers.clearAll(true), [timers]);
  const clearAll = useCallback(() => timers.clearAll(), [timers]);
  useEffect(() => {
    const update = () => timers.setPaused(isGamePaused());
    window.addEventListener(GAME_ACTIVITY_EVENT, update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      window.removeEventListener(GAME_ACTIVITY_EVENT, update);
      document.removeEventListener('visibilitychange', update);
      timers.clearAll();
    };
  }, [timers]);
  return { safeTimeout, safeInterval, clearSafeTimeout, clearSafeInterval, clearAllTimeouts, clearAllIntervals, clearAll };
}
export default useSafeTimeouts;
