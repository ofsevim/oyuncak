import { useMemo, useState, useEffect } from 'react';

/**
 * Premium ambient background
 * - Animated gradient orbs
 * - Floating micro-particles with glow
 * - Subtle noise texture overlay
 * - Respects prefers-reduced-motion
 */
const FloatingBubbles = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const particles = useMemo(() => {
    const colors = [
      'hsl(185 100% 55%)',   // cyan
      'hsl(270 95% 65%)',    // purple
      'hsl(320 90% 60%)',    // magenta
      'hsl(150 90% 50%)',    // green
      'hsl(25 100% 55%)',    // orange
    ];

    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1.5,
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 10,
      duration: 14 + Math.random() * 12,
      blur: Math.random() * 15 + 8,
      opacity: 0.15 + Math.random() * 0.2,
    }));
  }, []);

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, hsl(185 100% 55%), transparent 70%)' }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Large ambient orbs */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, hsl(185 100% 55%), transparent 70%)',
          animation: 'orb-float 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle, hsl(270 95% 65%), transparent 70%)',
          animation: 'orb-float 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute -bottom-20 left-1/3 w-[450px] h-[450px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, hsl(320 90% 60%), transparent 70%)',
          animation: 'orb-float 22s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />
      <div
        className="absolute top-2/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle, hsl(150 90% 50%), transparent 70%)',
          animation: 'orb-float 18s ease-in-out infinite reverse',
          animationDelay: '-5s',
        }}
      />

      {/* Floating micro-particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            backgroundColor: p.color,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: `0 0 ${p.blur}px ${p.color.replace(')', ' / 0.4)')}`,
            filter: `blur(${p.size > 3 ? 1 : 0}px)`,
          }}
        />
      ))}

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default FloatingBubbles;
