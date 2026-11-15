export interface ColorDef {
  name: string;
  value: string;
  glow: string;
}

export const BALLOON_COLORS: ColorDef[] = [
  { name: 'Kırmızı', value: '#ef4444', glow: '#ef444480' },
  { name: 'Mavi', value: '#3b82f6', glow: '#3b82f680' },
  { name: 'Yeşil', value: '#22c55e', glow: '#22c55e80' },
  { name: 'Sarı', value: '#eab308', glow: '#eab30880' },
  { name: 'Turuncu', value: '#f97316', glow: '#f9731680' },
  { name: 'Mor', value: '#a855f7', glow: '#a855f780' },
  { name: 'Cyan', value: '#06b6d4', glow: '#06b6d480' },
];

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  label: string;
  time: number;
  maxBalloons: number;
  spawnRate: number;
  speed: [number, number];
  popsPerRound: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '🌟 Kolay',
    time: 45,
    maxBalloons: 30,
    spawnRate: 1400,
    speed: [8, 11],
    popsPerRound: 8,
  },
  medium: {
    label: '⭐ Orta',
    time: 60,
    maxBalloons: 40,
    spawnRate: 1000,
    speed: [6, 9],
    popsPerRound: 10,
  },
  hard: {
    label: '🔥 Zor',
    time: 45,
    maxBalloons: 55,
    spawnRate: 600,
    speed: [4, 7],
    popsPerRound: 12,
  },
};

export type SpecialType = 'freeze' | 'double' | 'bomb';

export const SPECIAL_COLORS: Record<SpecialType, ColorDef> = {
  freeze: { name: 'Özel', value: '#67e8f9', glow: '#ffffff40' },
  double: { name: 'Özel', value: '#fbbf24', glow: '#ffffff40' },
  bomb: { name: 'Özel', value: '#1f2937', glow: '#ffffff40' },
};

export interface Balloon {
  id: string;
  color: ColorDef;
  x: number;
  duration: number;
  delay: number;
  swayAmount: number;
  swayDuration: number;
  size: number;
  special?: SpecialType;
}

export const hexId = (hex: string) => hex.replace('#', '');

export const getGradId = (b: Pick<Balloon, 'special' | 'color'>) =>
  b.special ? `bal-${b.special}` : `bal-${hexId(b.color.value)}`;

export const GAME_STYLES = `
  @keyframes balloon-rise {
    0% { transform: translateY(clamp(400px, 65vh + 80px, 830px)); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100px); opacity: 0; }
  }

  .balloon-rise-animate {
    animation: balloon-rise var(--rise-duration) var(--rise-delay) linear both;
    animation-play-state: var(--play-state, running);
    will-change: transform, opacity;
    contain: layout style;
    overflow: visible;
  }

  @keyframes balloon-sway {
    0%, 100% { transform: translateX(calc(var(--sway) * -1)); }
    50%      { transform: translateX(var(--sway)); }
  }

  .balloon-sway-animate {
    animation: balloon-sway var(--sway-duration) ease-in-out infinite;
    animation-play-state: var(--play-state, running);
    will-change: transform;
    contain: layout style;
    overflow: visible;
  }
`;
