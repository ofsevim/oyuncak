import confetti from 'canvas-confetti';

/**
 * Mobil cihazlarda parçacık sayısını otomatik azaltır.
 * Masaüstü: tam sayı, mobil: %40'a düşer.
 * `window.matchMedia('(prefers-reduced-motion)')` varsa tamamen atlar.
 */
const isMobile = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || navigator.maxTouchPoints > 1);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type ConfettiOptions = Parameters<typeof confetti>[0];

export function fireConfetti(opts: ConfettiOptions = {}) {
  if (prefersReducedMotion()) return;

  const mobile = isMobile();
  const rawCount = opts.particleCount ?? 50;

  // Mobilde %40'a indir, min 15 parçacık
  const particleCount = mobile ? Math.max(15, Math.round(rawCount * 0.4)) : rawCount;

  confetti({
    ...opts,
    particleCount,
    // Mobilde parçacıklar daha hızlı solar → daha az GPU yükü
    ticks: mobile ? 150 : (opts.ticks ?? 200),
    scalar: mobile ? 0.85 : (opts.scalar ?? 1),
  });
}
