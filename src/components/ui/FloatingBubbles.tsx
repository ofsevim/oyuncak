import { useMemo } from 'react';

/**
 * Gaming particle background
 * - Neon renkli küçük parçacıklar
 * - Koyu arka plan üzerinde hafif glow efekti
 */
const FloatingBubbles = () => {
  const particles = useMemo(() => {
    const colors = [
      'hsl(185 100% 55% / 0.15)',  // neon cyan
      'hsl(270 95% 65% / 0.12)',   // neon purple
      'hsl(320 90% 60% / 0.10)',   // neon magenta
      'hsl(150 90% 50% / 0.10)',   // neon green
      'hsl(25 100% 55% / 0.08)',   // neon orange
    ];

    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 8,
      blur: Math.random() * 20 + 10,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Ambient glow spots */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, hsl(185 100% 55% / 0.15), transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, hsl(270 95% 65% / 0.12), transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(320 90% 60% / 0.1), transparent 70%)' }} />

      {/* Floating particles */}
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
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.blur}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingBubbles;
