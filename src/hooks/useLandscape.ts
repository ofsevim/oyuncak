import { useEffect } from 'react';

/**
 * Bileşen mount olduğunda ekranı yatay moda kilitler,
 * unmount olduğunda kilidi serbest bırakır.
 * Screen Orientation API desteklenmeyen tarayıcılarda sessizce no-op.
 */
export function useLandscape() {
  useEffect(() => {
    let locked = false;

    const lock = async () => {
      try {
        const orientation = screen.orientation;
        if (orientation?.lock) {
          await orientation.lock('landscape');
          locked = true;
        }
      } catch {
        /* Tarayıcı desteklemiyorsa veya izin yoksa sessizce geç */
      }
    };

    lock();

    return () => {
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
