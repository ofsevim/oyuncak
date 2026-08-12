export const MAKEUP_CATEGORIES = ['skin', 'eyes', 'blush', 'lips', 'hair', 'accessory'] as const;

export type MakeupCategory = typeof MAKEUP_CATEGORIES[number];

export type MakeupLook = Record<MakeupCategory, string | null>;

export interface MakeupOption {
  id: string;
  label: string;
  swatch: string;
  secondary?: string;
}

export interface MakeupTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  preferred: Record<MakeupCategory, string>;
}

export const EMPTY_MAKEUP_LOOK: MakeupLook = {
  skin: null,
  eyes: null,
  blush: null,
  lips: null,
  hair: null,
  accessory: null,
};

export const MAKEUP_OPTIONS: Record<MakeupCategory, readonly MakeupOption[]> = {
  skin: [
    { id: 'natural', label: 'Doğal', swatch: '#f7d6c2' },
    { id: 'glow', label: 'Işıltı', swatch: '#ffe6b7', secondary: '#fff8dd' },
    { id: 'peach', label: 'Şeftali', swatch: '#ffc2a6', secondary: '#ffe0ca' },
  ],
  eyes: [
    { id: 'rose', label: 'Gül', swatch: '#d66b91', secondary: '#ffd0df' },
    { id: 'ocean', label: 'Okyanus', swatch: '#4f8fda', secondary: '#8ee8ed' },
    { id: 'sunset', label: 'Gün Batımı', swatch: '#f97362', secondary: '#fbc15d' },
    { id: 'lilac', label: 'Leylak', swatch: '#9b70d8', secondary: '#e2c2ff' },
  ],
  blush: [
    { id: 'petal', label: 'Gül Yaprağı', swatch: '#ef8fa8' },
    { id: 'coral', label: 'Mercan', swatch: '#f27f6d' },
    { id: 'berry', label: 'Yaban Mersini', swatch: '#b95e86' },
    { id: 'apricot', label: 'Kayısı', swatch: '#ef9d72' },
  ],
  lips: [
    { id: 'gloss', label: 'Parlak Nude', swatch: '#c97b82', secondary: '#ffd4ce' },
    { id: 'cherry', label: 'Kiraz', swatch: '#bd3153', secondary: '#f5738c' },
    { id: 'plum', label: 'Mürdüm', swatch: '#743657', secondary: '#b76b8c' },
    { id: 'coral', label: 'Mercan', swatch: '#e76f61', secondary: '#ff9a83' },
  ],
  hair: [
    { id: 'midnight', label: 'Gece Dalgası', swatch: '#25213a', secondary: '#5b4f7e' },
    { id: 'cocoa', label: 'Kakao Bob', swatch: '#5a332c', secondary: '#a9654c' },
    { id: 'honey', label: 'Bal At Kuyruğu', swatch: '#b7772d', secondary: '#f0be63' },
    { id: 'rose', label: 'Gül Bukle', swatch: '#963f69', secondary: '#e48aae' },
  ],
  accessory: [
    { id: 'stars', label: 'Yıldızlar', swatch: '#f8d65c', secondary: '#fff5ad' },
    { id: 'pearls', label: 'İnciler', swatch: '#f5efff', secondary: '#cbb9e7' },
    { id: 'flower', label: 'Çiçek', swatch: '#f08ca7', secondary: '#ffd1dc' },
    { id: 'gold', label: 'Altın Taç', swatch: '#e8b94f', secondary: '#fff1a8' },
  ],
};

export const MAKEUP_THEMES: readonly MakeupTheme[] = [
  {
    id: 'blossom',
    name: 'Bahar Işıltısı',
    emoji: '🌸',
    description: 'Yumuşak pembe tonlar ve sıcak bir görünüm hazırla.',
    preferred: { skin: 'natural', eyes: 'rose', blush: 'petal', lips: 'gloss', hair: 'honey', accessory: 'flower' },
  },
  {
    id: 'moonlight',
    name: 'Gece Daveti',
    emoji: '🌙',
    description: 'Soğuk tonları ışıltılı detaylarla tamamla.',
    preferred: { skin: 'glow', eyes: 'ocean', blush: 'berry', lips: 'plum', hair: 'midnight', accessory: 'stars' },
  },
  {
    id: 'sunset',
    name: 'Gün Batımı',
    emoji: '🌅',
    description: 'Şeftali, mercan ve altın tonlarını bir araya getir.',
    preferred: { skin: 'peach', eyes: 'sunset', blush: 'apricot', lips: 'coral', hair: 'cocoa', accessory: 'gold' },
  },
];

export const countCompletedMakeupSteps = (look: MakeupLook) =>
  MAKEUP_CATEGORIES.filter((category) => look[category] !== null).length;

export const scoreMakeupLook = (look: MakeupLook, theme: MakeupTheme) => {
  const completed = countCompletedMakeupSteps(look);
  const matches = MAKEUP_CATEGORIES.filter(
    (category) => look[category] === theme.preferred[category],
  ).length;
  return Math.min(100, completed * 8 + matches * 8 + (completed === MAKEUP_CATEGORIES.length ? 4 : 0));
};

export const getMakeupStarCount = (score: number) => score >= 85 ? 3 : score >= 60 ? 2 : 1;
