/**
 * Öne çıkan içerikler — modern gaming teması
 */

import type { FeaturedGameRouteId } from "@/constants/gameIds";

export type FeaturedItem = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  cta: string;
  tab: "games" | "draw" | "story";
  gameId?: FeaturedGameRouteId;
  badges: string[];
};

export const FEATURED: FeaturedItem[] = [
  {
    id: "f1-balloons",
    title: "Balon Patlat",
    subtitle: "Refleks + renk odaklanma",
    emoji: "🎈",
    gradient: "from-cyan-500/20 via-blue-500/10 to-purple-500/15",
    cta: "Hemen Oyna",
    tab: "games",
    gameId: "balloon",
    badges: ["Aksiyon", "Refleks", "Eğlenceli"],
  },
  {
    id: "f2-tetris",
    title: "Tetris",
    subtitle: "Klasik blok yerleştirme oyunu",
    emoji: "🧱",
    gradient: "from-violet-500/20 via-indigo-500/10 to-blue-500/15",
    cta: "Başla",
    tab: "games",
    gameId: "tetris",
    badges: ["Klasik", "Strateji", "Zeka"],
  },
  {
    id: "f3-coloring",
    title: "Çizim Atölyesi",
    subtitle: "Serbest çiz, sticker ekle, galeri oluştur",
    emoji: "🎨",
    gradient: "from-pink-500/20 via-rose-500/10 to-amber-500/15",
    cta: "Atölyeye Git",
    tab: "draw",
    badges: ["Yaratıcılık", "Sanat", "Rahatlatıcı"],
  },
  {
    id: "f4-stories",
    title: "Hikaye Kitaplığı",
    subtitle: "Sayfa sayfa interaktif okuma",
    emoji: "📚",
    gradient: "from-emerald-500/20 via-teal-500/10 to-cyan-500/15",
    cta: "Hikaye Seç",
    tab: "story",
    badges: ["Yeni", "İnteraktif", "Eğitici"],
  },
];
