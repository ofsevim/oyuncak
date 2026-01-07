import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Shuffle, Filter } from "lucide-react";
import type { Story } from "@/data/stories";
import { STORIES, STORY_CATEGORIES } from "@/data/stories";
import { loadStoryProgress } from "./storyProgress";
import StoryReader from "./StoryReader";

/**
 * Hikaye kütüphanesi:
 * - Kapak seçimi
 * - Rastgele hikaye
 * - Kategori filtresi
 * - Devam et (localStorage ilerlemesi varsa)
 */
export default function StoryLibrary() {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const activeStory = useMemo(() => STORIES.find((s) => s.id === activeStoryId) ?? null, [activeStoryId]);

  const filteredStories = useMemo(() => {
    if (activeCategory === 'all') return STORIES;
    return STORIES.filter(s => s.category === activeCategory);
  }, [activeCategory]);

  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of STORIES) {
      const p = loadStoryProgress(s.id);
      if (typeof p === "number" && p > 0) map.set(s.id, p);
    }
    return map;
  }, []);

  const openStory = (story: Story) => setActiveStoryId(story.id);

  const openRandom = () => {
    const stories = filteredStories.length > 0 ? filteredStories : STORIES;
    const idx = Math.floor(Math.random() * stories.length);
    setActiveStoryId(stories[idx].id);
  };

  if (activeStory) {
    const initialPageIndex = loadStoryProgress(activeStory.id) ?? 0;
    return <StoryReader story={activeStory} initialPageIndex={initialPageIndex} onExit={() => setActiveStoryId(null)} />;
  }

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl px-4 pb-32"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Hikaye Kitaplığı</h2>
        </div>
        <p className="text-muted-foreground font-semibold max-w-2xl">
          {STORIES.length} hikaye seni bekliyor! Kapağı seç, sayfa sayfa oku.
        </p>

        {/* Kategori Filtreleri */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {STORY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-white scale-105'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={openRandom}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-black text-white shadow-lg hover:opacity-95 transition-opacity"
            aria-label="Rastgele bir hikaye aç"
          >
            <Shuffle className="h-5 w-5" /> Rastgele Hikaye
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredStories.length} hikaye gösteriliyor
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStories.map((s) => {
          const savedPage = progressMap.get(s.id);
          const categoryData = STORY_CATEGORIES.find(c => c.id === s.category);
          return (
            <button
              key={s.id}
              onClick={() => openStory(s)}
              className={[
                "group relative overflow-hidden rounded-[2.5rem] border-4 border-primary/10 bg-white/60 backdrop-blur-sm p-6",
                "shadow-playful transition-transform hover:scale-[1.02] active:scale-[0.99] text-left",
              ].join(" ")}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.coverGradient}`} aria-hidden="true" />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid place-items-center rounded-2xl bg-white/70 p-3 shadow-sm">
                    <span className="text-4xl" aria-hidden="true">
                      {s.coverEmoji}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-foreground shadow-sm">
                      {s.durationLabel}
                    </span>
                    {categoryData && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                        {categoryData.emoji} {categoryData.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-foreground">{s.title}</h3>
                  <p className="text-sm font-semibold text-muted-foreground">{s.tagline}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">{s.pages.length} sayfa</span>
                  {typeof savedPage === "number" ? (
                    <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-black text-success-foreground">
                      Devam et: {savedPage + 1}. sayfa
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-foreground">
                      Başla
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}


