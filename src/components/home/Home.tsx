import { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { BookOpen, Gamepad2, Pencil, Zap, ChevronRight, Star, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { FEATURED } from "@/data/featured";

type Props = {
  onGoDraw: () => void;
  onGoGames: () => void;
  onGoStories: () => void;
  onGoFeaturedGame?: (gameId: "balloons" | "shapes" | "oddone" | "memory" | "whack" | "counting" | "coloring") => void;
};

/** Spotlight tracker for cards */
function useSpotlight(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [ref]);
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
};

export default function Home({ onGoDraw, onGoGames, onGoStories, onGoFeaturedGame }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useSpotlight(gridRef);

  // Parallax mouse for hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  const orbX = useTransform(springX, (v) => v * 0.02);
  const orbY = useTransform(springY, (v) => v * 0.02);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ─── HERO ─── */}
      <motion.section
        ref={heroRef}
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl border border-white/[0.06]"
        style={{ background: "hsl(var(--card) / 0.4)" }}
      >
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
        <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden="true" />

        {/* Floating orbs that follow mouse */}
        <motion.div
          className="absolute top-10 left-10 w-72 h-72 rounded-full opacity-[0.12] blur-3xl"
          style={{ background: "hsl(var(--primary))", x: orbX, y: orbY }}
          aria-hidden="true"
        />
        <motion.div
          className="absolute bottom-10 right-10 w-60 h-60 rounded-full opacity-[0.08] blur-3xl"
          style={{ background: "hsl(var(--secondary))", x: useTransform(orbX, (v) => -v), y: useTransform(orbY, (v) => -v) }}
          aria-hidden="true"
        />

        <div className="relative p-8 md:p-16">
          <div className="flex flex-col items-center gap-8 text-center">
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Yeni Nesil Oyun Deneyimi</span>
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95]"
            >
              <span className="text-gradient">Oyna</span>
              <span className="text-foreground/80">,</span>{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-pink-400 to-rose-400">Çiz</span>
              <br className="hidden sm:block" />
              <span className="text-foreground/80"> ve </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary via-violet-400 to-purple-300">Keşfet</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-lg text-base md:text-lg text-muted-foreground/80 leading-relaxed"
            >
              14+ oyun, serbest çizim ve interaktif hikayeler.
              <span className="text-foreground/60 font-medium"> Reklamsız. Güvenli. Hızlı.</span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeUp}
              className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <button
                onClick={onGoGames}
                className="btn-gaming inline-flex items-center justify-center gap-2.5 px-10 py-4 text-base rounded-2xl"
                aria-label="Oyunlara git"
              >
                <Gamepad2 className="h-5 w-5" /> Oyunlara Başla
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
              <button
                onClick={onGoDraw}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-accent/20 bg-accent/[0.06] px-8 py-4 text-base font-bold text-accent transition-all hover:bg-accent/[0.12] hover:border-accent/40 hover:shadow-[0_0_30px_hsl(320_90%_60%/0.15)]"
                aria-label="Çizime git"
              >
                <Pencil className="h-5 w-5" /> Çizmeye Başla
              </button>
              <button
                onClick={onGoStories}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/[0.06] px-8 py-4 text-base font-bold text-secondary transition-all hover:bg-secondary/[0.12] hover:border-secondary/40 hover:shadow-[0_0_30px_hsl(270_95%_65%/0.15)]"
                aria-label="Hikayelere git"
              >
                <BookOpen className="h-5 w-5" /> Hikaye Oku
              </button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ─── STATS ─── */}
      <motion.section variants={fadeUp} className="mt-6 grid grid-cols-3 gap-3">
        {[
          { icon: Gamepad2, label: "Oyun", value: "14+", color: "primary", glow: "hsl(185 100% 55% / 0.15)" },
          { icon: Trophy, label: "Kategori", value: "6", color: "secondary", glow: "hsl(270 95% 65% / 0.15)" },
          { icon: Star, label: "Ücretsiz", value: "100%", color: "accent", glow: "hsl(320 90% 60% / 0.15)" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2, scale: 1.02 }}
            className="glass-card p-4 flex items-center gap-3 group transition-shadow"
            style={{ "--hover-glow": stat.glow } as React.CSSProperties}
          >
            <div className={`text-${stat.color} p-2 rounded-xl bg-${stat.color}/10 group-hover:bg-${stat.color}/15 transition-colors`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* ─── FEATURED ─── */}
      <motion.section variants={fadeUp} className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-secondary" />
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Öne Çıkanlar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">En keyifli içerikler</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1 text-[11px] font-bold text-primary">🎮 Oyun</span>
            <span className="rounded-full border border-accent/15 bg-accent/[0.05] px-3 py-1 text-[11px] font-bold text-accent hidden sm:inline-flex">🎨 Çizim</span>
            <span className="rounded-full border border-secondary/15 bg-secondary/[0.05] px-3 py-1 text-[11px] font-bold text-secondary hidden sm:inline-flex">📚 Hikaye</span>
          </div>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURED.map((item, i) => (
            <motion.div
              key={item.id}
              variants={fadeUp}
              whileHover={{ scale: 1.01 }}
              className="game-card group p-6"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-50`} aria-hidden="true" />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="grid place-items-center rounded-2xl bg-white/[0.04] p-3.5 border border-white/[0.06] group-hover:border-primary/20 group-hover:bg-white/[0.06] transition-all duration-300">
                    <span className="text-3xl" aria-hidden="true">{item.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground/80">{item.subtitle}</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-primary/40 group-hover:text-primary/70 transition-colors" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.badges.map((b) => (
                    <span key={b} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
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
                  className="inline-flex items-center gap-2 self-start rounded-xl bg-primary/[0.08] border border-primary/15 px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary/[0.15] hover:border-primary/30 hover:shadow-[0_0_20px_hsl(185_100%_55%/0.1)] group/btn"
                  aria-label={`${item.title} aç`}
                >
                  {item.cta}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── QUICK ACCESS ─── */}
      <motion.section variants={fadeUp} className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-accent to-primary" />
          <h2 className="text-xl font-black tracking-tight">Hızlı Erişim</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { action: onGoGames, icon: Gamepad2, title: "Tüm Oyunlar", desc: "14+ eğlenceli oyun", color: "primary" },
            { action: onGoDraw, icon: Pencil, title: "Serbest Çizim", desc: "Hayal gücünü kullan", color: "accent" },
            { action: onGoStories, icon: BookOpen, title: "Hikayeler", desc: "İnteraktif okuma", color: "secondary" },
          ].map((item) => (
            <motion.button
              key={item.title}
              onClick={item.action}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="game-card group p-5 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-xl bg-${item.color}/10 p-3 border border-${item.color}/15 group-hover:bg-${item.color}/15 group-hover:border-${item.color}/25 group-hover:shadow-[0_0_20px_hsl(var(--${item.color})/0.1)] transition-all duration-300`}>
                  <item.icon className={`h-6 w-6 text-${item.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className={`h-4 w-4 text-${item.color}/40 group-hover:text-${item.color}/80 group-hover:translate-x-1 transition-all`} />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
