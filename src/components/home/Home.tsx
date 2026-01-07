import { motion } from "framer-motion";
import { BookOpen, Gamepad2, Pencil, Sparkles, ShieldCheck, Zap } from "lucide-react";

type Props = {
  onGoDraw: () => void;
  onGoGames: () => void;
  onGoStories: () => void;
};

/**
 * Ana ekran (WOW landing):
 * - Hızlı CTA'lar
 * - Güven veren kısa bloklar
 * - Çocuk dostu, modern vitrin
 */
export default function Home({ onGoDraw, onGoGames, onGoStories }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-32">
      {/* Hero */}
      <motion.section
        className="relative overflow-hidden rounded-[3rem] border-4 border-primary/10 bg-white/50 backdrop-blur-sm shadow-playful"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15" aria-hidden="true" />
        <div className="relative p-8 md:p-12">
          <div className="flex flex-col items-center gap-8 text-center">
            <motion.div
              className="relative"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="grid place-items-center rounded-[2.5rem] bg-white p-5 shadow-bounce border-8 border-white">
                <img src="/favicon.png" alt="Oyuncak" className="h-24 w-24 md:h-28 md:w-28 rounded-[1.75rem]" />
              </div>
              <Sparkles className="absolute -top-4 -right-4 h-12 w-12 text-secondary animate-pulse" aria-hidden="true" />
            </motion.div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-black text-primary">
                <Zap className="h-4 w-4" /> Yeni nesil çocuk deneyimi
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
                “İşte bu ya!” dedirten
                <span className="text-primary"> oyun</span>, <span className="text-accent">çizim</span> ve{" "}
                <span className="text-purple-600">hikaye</span> dünyası
              </h1>
              <p className="mx-auto max-w-2xl text-lg md:text-2xl font-semibold text-muted-foreground">
                Reklamsız, çocuk dostu, hızlı. Bir tıkla oyna, çiz, oku.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={onGoGames}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-secondary px-10 py-5 text-xl font-black text-secondary-foreground shadow-lg btn-bouncy border-b-8 border-yellow-600/20"
                aria-label="Oyunlara git"
              >
                <Gamepad2 className="h-6 w-6" /> Oyunlara Başla
              </button>
              <button
                onClick={onGoDraw}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-accent px-10 py-5 text-xl font-black text-accent-foreground shadow-lg btn-bouncy border-b-8 border-green-600/20"
                aria-label="Çizime git"
              >
                <Pencil className="h-6 w-6" /> Çizmeye Başla
              </button>
              <button
                onClick={onGoStories}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-purple-500 px-10 py-5 text-xl font-black text-white shadow-lg btn-bouncy border-b-8 border-purple-900/20"
                aria-label="Hikayelere git"
              >
                <BookOpen className="h-6 w-6" /> Hikaye Oku
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Highlights */}
      <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="card-playful p-6 border-4 border-primary/10">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-2xl bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-black text-foreground">Çocuk dostu</h3>
          </div>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Basit, güvenli ve anlaşılır etkileşimler. Mobil/tablet uyumlu.
          </p>
        </div>

        <div className="card-playful p-6 border-4 border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-2xl bg-secondary/20 p-3">
              <Zap className="h-6 w-6 text-secondary-foreground" />
            </div>
            <h3 className="text-lg font-black text-foreground">Hızlı açılır</h3>
          </div>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Ağır modüller ihtiyaç olunca yüklenir. İlk açılış daha akıcı.
          </p>
        </div>

        <div className="card-playful p-6 border-4 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-2xl bg-accent/15 p-3">
              <Sparkles className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-black text-foreground">Modern tasarım</h3>
          </div>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Mikro animasyonlar, net hiyerarşi ve “wow” hissi veren vitrin.
          </p>
        </div>
      </section>

      {/* Social proof-ish */}
      <section className="mt-8 card-playful p-6 border-4 border-primary/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-foreground">En sevilenler</h3>
            <p className="text-sm font-semibold text-muted-foreground">
              Oyunlar, boyama ve hikayeler tek yerde — her gün biraz daha iyi.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-black text-foreground shadow-sm">🎈 Refleks</span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-black text-foreground shadow-sm">🎨 Yaratıcılık</span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-black text-foreground shadow-sm">📚 Okuma</span>
          </div>
        </div>
      </section>
    </div>
  );
}


