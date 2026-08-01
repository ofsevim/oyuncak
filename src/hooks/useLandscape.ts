import { useEffect } from 'react';

/**
 * Bileşen mount olduğunda ekranı yatay moda kilitler,
 * unmount olduğunda kilidi serbest bırakır.
 * Screen Orientation API desteklenmeyen tarayıcılarda sessizce no-op.
 */
export function useLandscape() {
  useEffect(() => {
    let locked = false;
    let aborted = false;

    const lock = async () => {
      try {
        const orientation = screen.orientation;
        if (orientation?.lock) {
          await orientation.lock('landscape');
          if (aborted) {
            screen.orientation?.unlock?.();
          } else {
            locked = true;
          }
        }
      } catch {
        /* Tarayıcı desteklemiyorsa veya izin yoksa sessizce geç */
      }
    };

    lock();

    return () => {
      aborted = true;
      if (locked) {
        try {
          screen.orientation?.unlock?.();
        } catch {
          /* sessiz */
        }
      }
    };
  }, []);
}
