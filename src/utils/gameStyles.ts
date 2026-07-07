import { useMemo } from 'react';

/** Glassmorphism pill — tüm oyunlarda ortak */
export const pill: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

/** Ortak pastel renk paleti */
const DOT_COLORS = [
  'rgba(167,139,250,0.12)',
  'rgba(244,114,182,0.1)',
  'rgba(52,211,153,0.1)',
  'rgba(251,191,36,0.1)',
  'rgba(96,165,250,0.12)',
];

export interface Dot {
  id: number;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
}

/** Animasyonlu arka plan noktaları */
export function useBackgroundDots(count = 30): Dot[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 3 + Math.random() * 4,
        dur: 4 + Math.random() * 6,
        delay: Math.random() * 3,
        color: DOT_COLORS[i % DOT_COLORS.length],
      })),
    [count],
  );
}
