import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Gamepad2, Pencil, ChevronRight, ArrowRight } from "lucide-react";
import { FEATURED } from "@/data/featured";

type Props = {
  onGoDraw: () => void;
  onGoGames: () => void;
  onGoStories: () => void;
  onGoFeaturedGame?: (gameId: "balloons" | "shapes" | "oddone" | "memory" | "whack" | "counting" | "coloring") => void;
};

const EMOJIS = ["🎮", "🎨", "🧩", "🎈", "🎹", "🐍", "🏃", "🧱", "🎯", "🔢", "🐹", "🃏", "🦄", "📚"];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 22 } },
};

export default function Home({ onGoDraw, onGoGames, onGoStories, onGoFeaturedGame }: Props) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const hour = time.getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const greetEmoji = hour < 12 ? "🌅" : hour < 18 ? "☀️" : "🌙";

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl px-4 pt-6 pb-32"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ─── HERO ─── */}
      <motion.section variants={fadeUp} className="relative overflow-hidden rounded-[2rem] p-8 md:p-12 lg:p-16">
        {/* Warm gradient background */}
        <div className="absolute inset-0 rounded-[2rem]" style={{
          background: `linear-gradient(135deg, 
            hsl(270 60% 18%) 0%, 
            hsl(230 40% 12%) 30%, 
            hsl(200 50% 14%) 60%, 
            hsl(320 40% 15%) 100%)`,
        }} />
        {/* Soft blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: 'hsl(270 80% 60%)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: 'hsl(185 80% 55%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'hsl(320 70% 55%)' }} />

        {/* Floating emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {EMOJIS.slice(0, 8).map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute text-2xl md:text-3xl select-none"
              style={{
                left: `${10 + (i * 12) % 85}%`,
                top: `${8 + (i * 17) % 75}%`,
                opacity: 0.12,
              }}
              animate={{
                y: [0, -12, 0, 8, 0],
                rotate: [0, 5, -5, 3, 0],
                scale: [1, 1.05, 0.95, 1.02, 1],
              }}
              transition={{
                duration: 6 + i * 0.8,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>

        <div className="relative flex flex-col items-center gap-6 text-center">
          {/* Greeting */}
          <motion.p variants={fadeUp} className="text-sm md:text-base text-white/50 font-medium">
            {greetEmoji} {greeting}! Bugün ne oynayalım?
          </motion.p>

          {/* Title */}
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
            <span className="inline-block" style={{
              background: 'linear-gradient(135deg, #67e8f9, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Oyna</span>
            <span className="text-white/30">, </span>
            <span className="inline-block" style={{
              background: 'linear-gradient(135deg, #fb923c, #f472b6, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Çiz</span>
            <span className="text-white/30"> & </span>
            <span className="inline-block" style={{
              background: 'linear-gradient(135deg, #4ade80, #22d3ee, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Keşfet</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto max-w-md text-sm md:text-base text-white/40 leading-relaxed">
            14+ eğlenceli oyun, serbest çizim ve interaktif hikayeler — hepsi ücretsiz ve reklamsız 🎉
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button onClick={onGoGames}
              className="group flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-sm transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, hsl(185 80% 50%), hsl(270 70% 55%))',
                boxShadow: '0 8px 32px hsl(185 80% 50% / 0.3)',
              }}>
              <Gamepad2 className="h-5 w-5" />
              <span>Oyunlara Başla</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={onGoDraw}
              className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-sm border border-white/10 bg-white/[0.04] text-white/80 transition-all hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1">
              <Pencil className="h-4 w-4" /> Çizmeye Başla
            </button>
            <button onClick={onGoStories}
              className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-sm border border-white/10 bg-white/[0.04] text-white/80 transition-all hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1">
              <BookOpen className="h-4 w-4" /> Hikaye Oku
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── QUICK ACTIONS ─── */}
      <motion.section variants={fadeUp} className="mt-6 grid grid-cols-3 gap-3">
        {[
          { action: onGoGames, emoji: "🎮", title: "Oyunlar", count: "14+", bg: "from-cyan-500/15 to-blue-600/10", border: "border-cyan-500/15 hover:border-cyan-400/30" },
          { action: onGoDraw, emoji: "🎨", title: "Çizim", count: "Serbest", bg: "from-pink-500/15 to-rose-600/10", border: "border-pink-500/15 hover:border-pink-400/30" },
          { action: onGoStories, emoji: "📚", title: "Hikayeler", count: "Yeni", bg: "from-emerald-500/15 to-teal-600/10", border: "border-emerald-500/15 hover:border-emerald-400/30" },
        ].map((item) => (
          <motion.button
            key={item.title}
            onClick={item.action}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`relative overflow-hidden rounded-2xl border ${item.border} p-4 text-left transition-all duration-300 group`}
            style={{ background: 'hsl(var(--card) / 0.5)' }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-50`} />
            <div className="relative">
              <span className="text-2xl md:text-3xl">{item.emoji}</span>
              <p className="font-bold text-sm mt-2">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.count}</p>
            </div>
          </motion.button>
        ))}
      </motion.section>

      {/* ─── FEATURED GAMES ─── */}
      <motion.section variants={fadeUp} className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xl">🔥</span>
          <div>
            <h2 className="text-lg md:text-xl font-black tracking-tight">Öne Çıkanlar</h2>
            <p className="text-xs text-muted-foreground">En popüler içerikler</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURED.map((item) => (
            <motion.button
              key={item.id}
              variants={fadeUp}
              onHoverStart={() => setHoveredCard(item.id)}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (item.tab === "games" && item.gameId && onGoFeaturedGame) return onGoFeaturedGame(item.gameId);
                if (item.tab === "games") return onGoGames();
                if (item.tab === "draw") return onGoDraw();
                return onGoStories();
              }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 text-left transition-all duration-300 group"
              style={{ background: 'hsl(var(--card) / 0.5)' }}
            >
              {/* Gradient bg */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} transition-opacity duration-300 ${hoveredCard === item.id ? 'opacity-80' : 'opacity-40'}`} />

              <div className="relative flex items-start gap-4">
                {/* Emoji with glow */}
                <div className="relative">
                  <motion.span
                    className="text-4xl md:text-5xl block"
                    animate={hoveredCard === item.id ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {item.emoji}
                  </motion.span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {item.badges.map((b) => (
                      <span key={b} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {b}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-1.5 mt-3 text-primary text-xs font-bold">
                    <span>{item.cta}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ─── GAME CATEGORIES ─── */}
      <motion.section variants={fadeUp} className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xl">🎯</span>
          <h2 className="text-lg md:text-xl font-black tracking-tight">Kategoriler</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: "⚡", title: "Aksiyon", desc: "Balon, Koşucu, Köstebek", color: "from-orange-500/20 to-red-500/10", border: "hover:border-orange-400/30" },
            { emoji: "🧠", title: "Zeka", desc: "Hafıza, Puzzle, 2048", color: "from-violet-500/20 to-purple-500/10", border: "hover:border-violet-400/30" },
            { emoji: "🎨", title: "Yaratıcı", desc: "Boyama, Piyano, Çizim", color: "from-pink-500/20 to-rose-500/10", border: "hover:border-pink-400/30" },
            { emoji: "📖", title: "Öğren", desc: "Harf, Sayma, Matematik", color: "from-emerald-500/20 to-teal-500/10", border: "hover:border-emerald-400/30" },
          ].map((cat) => (
            <motion.button
              key={cat.title}
              onClick={onGoGames}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-2xl border border-white/[0.06] ${cat.border} p-4 text-left transition-all duration-300`}
              style={{ background: 'hsl(var(--card) / 0.5)' }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-50`} />
              <div className="relative">
                <span className="text-2xl">{cat.emoji}</span>
                <p className="font-bold text-sm mt-2">{cat.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{cat.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ─── FOOTER NOTE ─── */}
      <motion.div variants={fadeUp} className="mt-12 text-center">
        <p className="text-xs text-muted-foreground/50">
          🛡️ Reklamsız • Güvenli • Tamamen Ücretsiz
        </p>
      </motion.div>
    </motion.div>
  );
}
