import { useMemo } from 'react';

const FloatingBubbles = () => {
  const bubbles = useMemo(() => {
    const colors = [
      'hsl(200 85% 65% / 0.3)',  // primary blue
      'hsl(45 95% 70% / 0.3)',   // secondary yellow
      'hsl(160 60% 65% / 0.3)',  // accent green
      'hsl(350 80% 70% / 0.3)',  // coral pink
      'hsl(280 60% 70% / 0.3)',  // lavender
    ];
    
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 60 + 30,
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.left}%`,
            top: `${bubble.top}%`,
            backgroundColor: bubble.color,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingBubbles;
