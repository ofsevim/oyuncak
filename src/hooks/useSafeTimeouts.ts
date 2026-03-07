import { useCallback, useEffect, useRef } from 'react';

/**
 * Safe timeout management hook
 * Prevents memory leaks by automatically cleaning up timeouts on unmount
 * Returns safe timeout/setInterval functions and auto-cleanup
 */
export function useSafeTimeouts() {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const safeInterval = useCallback((fn: () => void, ms: number) => {
    const id = setInterval(fn, ms);
    intervalsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const clearAllIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const clearAll = useCallback(() => {
    clearAllTimeouts();
    clearAllIntervals();
  }, [clearAllTimeouts, clearAllIntervals]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  return {
    safeTimeout,
    safeInterval,
    clearAllTimeouts,
    clearAllIntervals,
    clearAll,
  };
}

export default useSafeTimeouts;
