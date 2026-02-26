/**
 * Öne çıkan içerikler — modern gaming teması
 */

export type FeaturedItem = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  cta: string;
  tab: "games" | "draw" | "story";
  gameId?: "balloons" | "shapes" | "oddone" | "memory" | "whack" | "counting" | "coloring";
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
    gameId: "balloons",
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
    badges: ["Klasik", "Strateji", "Zeka"],
  },
  {
    id: "f3-coloring",
    title: "Boyama Kitabı",
    subtitle: "Tıkla doldur, sanatını yarat",
    emoji: "🎨",
    gradient: "from-pink-500/20 via-rose-500/10 to-amber-500/15",
    cta: "Boyamaya Git",
    tab: "games",
    gameId: "coloring",
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
