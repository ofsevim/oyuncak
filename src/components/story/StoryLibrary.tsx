import { useMemo, useState } from "react";
import { BookOpen, Shuffle } from "lucide-react";
import type { Story } from "@/data/stories";
import { STORIES, STORY_CATEGORIES } from "@/data/stories";
import { loadStoryProgress } from "./storyProgress";
import StoryReader from "./StoryReader";
import { motion, AnimatePresence } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 26 } },
};

export default function StoryLibrary() {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const activeStory = useMemo(
    () => STORIES.find((s) => s.id === activeStoryId) ?? null,
    [activeStoryId]
  );

  const filteredStories = useMemo(() => {
    if (activeCategory === "all") return STORIES;
    return STORIES.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of STORIES) {
      const p = loadStoryProgress(s.id);
      if (typeof p === "number" && p > 0) map.set(s.id, p);
    }
    return map;
  }, [activeStoryId]);

  const openRandom = () => {
    const pool = filteredStories.length > 0 ? filteredStories : STORIES;
    setActiveStoryId(pool[Math.floor(Math.random() * pool.length)].id);
  };

  if (activeStory) {
    const initialPageIndex = loadStoryProgress(activeStory.id) ?? 0;
    return (
      <StoryReader
        story={activeStory}
        initialPageIndex={initialPageIndex}
        onExit={() => setActiveStoryId(null)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-36 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col items-center gap-4 text-center pt-2">
        <div
          className="p-3 rounded-2xl"
          style={{ background: 'hsl(158 65% 48% / 0.12)', border: '1px solid hsl(158 65% 48% / 0.2)' }}
        >
          <BookOpen className="h-7 w-7" style={{ color: 'hsl(158 65% 48%)' }} />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Hikaye <span className="text-gradient">Kitaplığı</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            <span className="text-foreground font-bold">{STORIES.length}</span> hikaye seni bekliyor. Kapağı seç, sayfa sayfa oku.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {STORY_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: isActive ? 'hsl(158 65% 48%)' : 'hsl(var(--muted) / 0.5)',
                  color: isActive ? '#fff' : 'hsl(var(--muted-foreground))',
                  border: isActive ? '1px solid hsl(158 65% 48% / 0.5)' : '1px solid hsl(var(--border))',
                  boxShadow: isActive ? '0 4px 16px hsl(158 65% 48% / 0.25)' : 'none',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>

        {/* Random + count */}
        <div className="flex items-center gap-3">
          <button
            onClick={openRandom}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
            style={{
              background: 'hsl(var(--primary))',
              boxShadow: '0 4px 16px hsl(var(--primary) / 0.3)',
            }}
            aria-label="Rastgele bir hikaye aç"
          >
            <Shuffle className="h-4 w-4" /> Rastgele Hikaye
          </button>
          <span className="text-xs text-muted-foreground font-medium">
            {filteredStories.length} hikaye
          </span>
        </div>
      </div>

      {/* ── Story grid ── */}
      <motion.div
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {filteredStories.map((s) => {
            const savedPage = progressMap.get(s.id);
            const categoryData = STORY_CATEGORIES.find((c) => c.id === s.category);
            return (
              <motion.button
                key={s.id}
                variants={fadeUp}
                layout
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setActiveStoryId(s.id)}
                className="group relative overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 2px 8px hsl(224 28% 3% / 0.3)',
                }}
              >
                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${s.coverGradient} opacity-70 transition-opacity group-hover:opacity-100`}
                  aria-hidden="true"
                />

                <div className="relative p-5 flex flex-col gap-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="grid place-items-center rounded-2xl p-3"
                      style={{ background: 'hsl(220 20% 100% / 0.12)', backdropFilter: 'blur(8px)' }}
                    >
                      <span className="text-4xl" aria-hidden="true">{s.coverEmoji}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold text-foreground"
                        style={{ background: 'hsl(220 20% 100% / 0.15)', backdropFilter: 'blur(4px)' }}
                      >
                        {s.durationLabel}
                      </span>
                      {categoryData && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{ background: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' }}
                        >
                          {categoryData.emoji} {categoryData.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-foreground leading-snug">{s.title}</h3>
                    <p className="text-xs font-semibold text-muted-foreground">{s.tagline}</p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {s.pages.length} sayfa
                    </span>
                    {typeof savedPage === "number" ? (
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
                        style={{ background: 'hsl(158 65% 48%)', boxShadow: '0 2px 8px hsl(158 65% 48% / 0.4)' }}
                      >
                        Devam et: {savedPage + 1}. sayfa
                      </span>
                    ) : (
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-bold text-foreground"
                        style={{ background: 'hsl(220 20% 100% / 0.12)', backdropFilter: 'blur(4px)' }}
                      >
                        Başla →
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
