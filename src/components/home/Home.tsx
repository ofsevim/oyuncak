import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Gamepad2, Pencil, ArrowRight, ChevronRight } from "lucide-react";
import { FEATURED } from "@/data/featured";
import type { FeaturedGameRouteId } from "@/constants/gameIds";

type Props = {
  onGoDraw: () => void;
  onGoGames: () => void;
  onGoStories: () => void;
  onGoFeaturedGame?: (gameId: FeaturedGameRouteId) => void;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
};

const QUICK = [
  {
    action: "games" as const,
    emoji: "🎮",
    title: "Oyunlar",
    sub: "18 oyun",
    color: "hsl(258 88% 66% / 0.12)",
    border: "hsl(258 88% 66% / 0.2)",
    glow: "hsl(258 88% 66%)",
  },
  {
    action: "draw" as const,
    emoji: "🎨",
    title: "Çizim",
    sub: "Serbest",
    color: "hsl(338 80% 62% / 0.12)",
    border: "hsl(338 80% 62% / 0.2)",
    glow: "hsl(338 80% 62%)",
  },
  {
    action: "story" as const,
    emoji: "📚",
    title: "Hikayeler",
    sub: "20+ hikaye",
    color: "hsl(158 65% 48% / 0.12)",
    border: "hsl(158 65% 48% / 0.2)",
    glow: "hsl(158 65% 48%)",
  },
];

export default function Home({ onGoDraw, onGoGames, onGoStories, onGoFeaturedGame }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hour = time.getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const greetEmoji = hour < 12 ? "🌅" : hour < 18 ? "☀️" : "🌙";

  const actFn = (a: "games" | "draw" | "story") =>
    a === "games" ? onGoGames : a === "draw" ? onGoDraw : onGoStories;

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl px-4 pt-8 pb-36"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ── HERO ── */}
      <motion.section variants={fadeUp}>
        <div
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{
            background: `
              radial-gradient(ellipse at 0% 100%, hsl(258 88% 66% / 0.18) 0%, transparent 60%),
              radial-gradient(ellipse at 100% 0%, hsl(338 80% 62% / 0.14) 0%, transparent 55%),
              hsl(224 28% 8%)
            `,
            border: '1px solid hsl(220 20% 100% / 0.06)',
            boxShadow: '0 24px 80px hsl(258 88% 66% / 0.08), inset 0 1px 0 hsl(220 20% 100% / 0.05)',
          }}
        >
          {/* Ambient orbs */}
          <div
            className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background: 'hsl(258 88% 66% / 0.08)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none"
            style={{
              background: 'hsl(338 80% 62% / 0.07)',
              filter: 'blur(60px)',
            }}
          />

          <div className="relative flex flex-col gap-5">
            {/* Greeting chip */}
            <div className="flex items-center gap-2 w-fit">
              <span
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  background: 'hsl(var(--muted) / 0.6)',
                  border: '1px solid hsl(220 20% 100% / 0.06)',
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                <span>{greetEmoji}</span>
                <span>{greeting}! Eğlenceye hazır mısın?</span>
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] tracking-tight">
                <span
                  style={{
                    background: 'linear-gradient(135deg, hsl(258 88% 72%), hsl(338 80% 68%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Oyna
                </span>
                <span className="text-foreground/20 mx-2">&</span>
                <span
                  style={{
                    background: 'linear-gradient(135deg, hsl(38 95% 62%), hsl(158 65% 52%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Keşfet
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
                Eğlenceli oyunlar oyna, kendi resimlerini çiz ve harika masallara dal! Hepsi senin için ve tamamen ücretsiz.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-1">
              <motion.button
                onClick={onGoGames}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 4px 24px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.15)',
                }}
              >
                <Gamepad2 className="w-4 h-4" />
                Hemen Oyna
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={onGoDraw}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: 'hsl(220 20% 100% / 0.06)',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(220 20% 100% / 0.1)',
                }}
              >
                <Pencil className="w-4 h-4" />
                Resim Çiz
              </motion.button>
              <motion.button
                onClick={onGoStories}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: 'hsl(220 20% 100% / 0.06)',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(220 20% 100% / 0.1)',
                }}
              >
                <BookOpen className="w-4 h-4" />
                Masal Oku
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── QUICK ACCESS ── */}
      <motion.section variants={fadeUp} className="mt-6 grid grid-cols-3 gap-3">
        {QUICK.map((q) => (
          <motion.button
            key={q.title}
            onClick={actFn(q.action)}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300"
            style={{
              background: q.color,
              border: `1px solid ${q.border}`,
            }}
          >
            <span className="text-2xl md:text-3xl block mb-2">{q.emoji}</span>
            <p className="font-bold text-sm text-foreground">{q.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{q.sub}</p>
          </motion.button>
        ))}
      </motion.section>

      {/* ── FEATURED ── */}
      <motion.section variants={fadeUp} className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-label mb-1">Öne Çıkanlar</p>
            <h2 className="text-lg font-black tracking-tight text-foreground">En Popüler İçerikler</h2>
          </div>
          <button
            onClick={onGoGames}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Tümü <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURED.map((item) => (
            <motion.button
              key={item.id}
              variants={fadeUp}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (item.tab === "games" && item.gameId && onGoFeaturedGame) return onGoFeaturedGame(item.gameId);
                if (item.tab === "games") return onGoGames();
                if (item.tab === "draw") return onGoDraw();
                return onGoStories();
              }}
              className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 2px 8px hsl(224 28% 3% / 0.3)',
              }}
            >
              {/* Gradient bg */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-60 transition-opacity duration-300 group-hover:opacity-90`}
              />
              <div className="relative flex items-start gap-4">
                <span className="text-4xl md:text-5xl select-none">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {item.badges.map((b) => (
                      <span key={b} className="badge">{b}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-primary text-xs font-bold">
                    <span>{item.cta}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── CATEGORIES ── */}
      <motion.section variants={fadeUp} className="mt-10">
        <p className="section-label mb-4">Kategoriler</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: "⚡", title: "Aksiyon", desc: "Balon, Koşucu,\nKöstebek", color: "hsl(38 95% 58% / 0.1)", border: "hsl(38 95% 58% / 0.2)" },
            { emoji: "🧠", title: "Zeka", desc: "Hafıza, 2048,\nTetris", color: "hsl(258 88% 66% / 0.1)", border: "hsl(258 88% 66% / 0.2)" },
            { emoji: "🎨", title: "Yaratıcı", desc: "Boyama, Piyano,\nÇizim", color: "hsl(338 80% 62% / 0.1)", border: "hsl(338 80% 62% / 0.2)" },
            { emoji: "📖", title: "Öğren", desc: "Sayma, Matematik", color: "hsl(158 65% 48% / 0.1)", border: "hsl(158 65% 48% / 0.2)" },
          ].map((cat) => (
            <motion.button
              key={cat.title}
              onClick={onGoGames}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl p-4 text-left transition-all duration-300"
              style={{ background: cat.color, border: `1px solid ${cat.border}` }}
            >
              <span className="text-2xl block mb-2">{cat.emoji}</span>
              <p className="font-bold text-sm text-foreground">{cat.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed whitespace-pre">{cat.desc}</p>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── FOOTER ── */}
      <motion.div variants={fadeUp} className="mt-14 text-center">
        <p className="text-xs text-muted-foreground/40 font-medium tracking-wide">
          🛡️ Reklamsız · Güvenli · Tamamen Ücretsiz
        </p>
        <p className="text-xs text-muted-foreground/40 font-medium tracking-wide mt-2">
          Geliştirici <a href="https://omersevim.com.tr" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Osoft</a>
        </p>
      </motion.div>
    </motion.div>
  );
}
