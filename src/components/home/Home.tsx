import { motion } from "framer-motion";
import { BookOpen, Gamepad2, Pencil, Sparkles, Trophy, Zap, ChevronRight, Star } from "lucide-react";
import { FEATURED } from "@/data/featured";

type Props = {
  onGoDraw: () => void;
  onGoGames: () => void;
  onGoStories: () => void;
  onGoFeaturedGame?: (gameId: "balloons" | "shapes" | "oddone" | "memory" | "whack" | "counting" | "coloring") => void;
};

/**
 * Modern gaming landing page
 * - Koyu tema, neon aksanlar, glassmorphism
 * - Hero section, stats bar, featured grid
 */
export default function Home({ onGoDraw, onGoGames, onGoStories, onGoFeaturedGame }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 animate-fade-in">
      {/* Hero */}
      <motion.section
        className="relative overflow-hidden rounded-3xl glass-card neon-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-30" aria-hidden="true" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" aria-hidden="true" />

        <div className="relative p-8 md:p-14">
          <div className="flex flex-col items-center gap-8 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Zap className="h-3.5 w-3.5" /> Yeni Nesil Oyun Deneyimi
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight"
            >
              <span className="text-gradient">Oyna</span>,{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-pink-500">Çiz</span> ve{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary to-purple-400">Keşfet</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mx-auto max-w-xl text-base md:text-lg text-muted-foreground"
            >
              12+ oyun, serbest çizim ve interaktif hikayeler. Reklamsız, güvenli, hızlı.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <button
                onClick={onGoGames}
                className="btn-gaming inline-flex items-center justify-center gap-2 px-8 py-4 text-base"
                aria-label="Oyunlara git"
              >
                <Gamepad2 className="h-5 w-5" /> Oyunlara Başla
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={onGoDraw}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-8 py-4 text-base font-bold text-accent transition-all hover:bg-accent/20 hover:border-accent/50"
                aria-label="Çizime git"
              >
                <Pencil className="h-5 w-5" /> Çizmeye Başla
              </button>
              <button
                onClick={onGoStories}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-8 py-4 text-base font-bold text-secondary transition-all hover:bg-secondary/20 hover:border-secondary/50"
                aria-label="Hikayelere git"
              >
                <BookOpen className="h-5 w-5" /> Hikaye Oku
              </button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats bar */}
      <section className="mt-6 grid grid-cols-3 gap-3">
        {[
          { icon: Gamepad2, label: "Oyun", value: "12+", color: "text-primary" },
          { icon: Trophy, label: "Kategori", value: "6", color: "text-secondary" },
          { icon: Star, label: "Ücretsiz", value: "100%", color: "text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Featured section header */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-secondary" />
            <div>
              <h2 className="text-xl md:text-2xl font-black">Öne Çıkanlar</h2>
              <p className="text-xs text-muted-foreground">En keyifli içerikler</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">🎮 Oyun</span>
            <span className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-bold text-accent">🎨 Çizim</span>
            <span className="rounded-full border border-secondary/20 bg-secondary/5 px-3 py-1 text-xs font-bold text-secondary">📚 Hikaye</span>
          </div>
        </div>

        {/* Featured grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURED.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="game-card group p-5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-40`} aria-hidden="true" />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="grid place-items-center rounded-xl bg-white/5 p-3 border border-white/5 group-hover:border-primary/20 transition-colors">
                    <span className="text-3xl" aria-hidden="true">{item.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.badges.map((b) => (
                    <span key={b} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {b}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (item.tab === "games" && item.gameId && onGoFeaturedGame) return onGoFeaturedGame(item.gameId);
                    if (item.tab === "games") return onGoGames();
                    if (item.tab === "draw") return onGoDraw();
                    return onGoStories();
                  }}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-primary/10 border border-primary/20 px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary/20"
                  aria-label={`${item.title} aç`}
                >
                  {item.cta} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick access */}
      <section className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-accent to-primary" />
          <h2 className="text-xl font-black">Hızlı Erişim</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={onGoGames} className="game-card group p-5 text-left">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">Tüm Oyunlar</h3>
                <p className="text-xs text-muted-foreground">12+ eğlenceli oyun</p>
              </div>
            </div>
          </button>
          <button onClick={onGoDraw} className="game-card group p-5 text-left">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-accent/10 p-3 border border-accent/20 group-hover:bg-accent/20 transition-colors">
                <Pencil className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold">Serbest Çizim</h3>
                <p className="text-xs text-muted-foreground">Hayal gücünü kullan</p>
              </div>
            </div>
          </button>
          <button onClick={onGoStories} className="game-card group p-5 text-left">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-secondary/10 p-3 border border-secondary/20 group-hover:bg-secondary/20 transition-colors">
                <BookOpen className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-bold">Hikayeler</h3>
                <p className="text-xs text-muted-foreground">İnteraktif okuma</p>
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
