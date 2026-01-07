/**
 * "Popüler" yerine "Öne Çıkanlar / Önerilenler" datası.
 * Gerçek kullanıcı verisi olmadan iddialı metinlerden kaçınır.
 */

export type FeaturedItem = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** Tailwind class for gradient background */
  gradient: string;
  /** CTA button label */
  cta: string;
  /** Home sekmesinde hangi tab'a götürecek */
  tab: "games" | "draw" | "story";
  /** Oyunlara götürüyorsa, GamesMenu içindeki id */
  gameId?: "balloons" | "shapes" | "oddone" | "memory" | "whack" | "counting" | "coloring";
  badges: string[];
};

export const FEATURED: FeaturedItem[] = [
  {
    id: "f1-balloons",
    title: "Balon Patlat",
    subtitle: "Refleks + renk odaklanma",
    emoji: "🎈",
    gradient: "from-primary/20 via-secondary/10 to-accent/15",
    cta: "Hemen Oyna",
    tab: "games",
    gameId: "balloons",
    badges: ["Hızlı", "Renk", "Eğlenceli"],
  },
  {
    id: "f2-shapes",
    title: "Şekil Eşleştirme",
    subtitle: "Mobil dostu — tıkla eşleştir",
    emoji: "🔷",
    gradient: "from-accent/20 via-sky-500/10 to-purple-500/15",
    cta: "Başla",
    tab: "games",
    gameId: "shapes",
    badges: ["Kolay", "Görsel", "Odak"],
  },
  {
    id: "f3-coloring",
    title: "Boyama Kitabı",
    subtitle: "Taşmadan boya: tıkla doldur",
    emoji: "🎨",
    gradient: "from-pink-500/20 via-rose-500/10 to-amber-500/15",
    cta: "Boyamaya Git",
    tab: "games",
    gameId: "coloring",
    badges: ["Yaratıcılık", "Temiz", "Kolay"],
  },
  {
    id: "f4-stories",
    title: "Hikaye Kitaplığı",
    subtitle: "5 hikaye, sayfa sayfa okuma",
    emoji: "📚",
    gradient: "from-purple-500/20 via-indigo-500/10 to-sky-500/15",
    cta: "Hikaye Seç",
    tab: "story",
    badges: ["Yeni", "Sayfalı", "Kaldığın yerden"],
  },
];


