import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Home, RefreshCw } from "lucide-react";
import type { Story } from "@/data/stories";
import { StoryIllustration } from "./StoryIllustration";
import { clearStoryProgress, saveStoryProgress } from "./storyProgress";

type Props = {
  story: Story;
  initialPageIndex?: number;
  onExit: () => void;
};

/**
 * Tek bir hikayeyi sayfa sayfa okutan ekran.
 * - Klavye: ← → / ESC
 * - localStorage: ilerleme kaydı
 */
export default function StoryReader({ story, initialPageIndex = 0, onExit }: Props) {
  const maxIndex = story.pages.length - 1;
  const [pageIndex, setPageIndex] = useState(() => Math.min(Math.max(initialPageIndex, 0), maxIndex));

  const page = story.pages[pageIndex];
  const progressPct = useMemo(() => Math.round(((pageIndex + 1) / story.pages.length) * 100), [pageIndex, story.pages.length]);

  // İlerlemeyi kaydet
  useEffect(() => {
    saveStoryProgress(story.id, pageIndex);
  }, [story.id, pageIndex]);

  const goPrev = useCallback(() => setPageIndex((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setPageIndex((p) => Math.min(maxIndex, p + 1)), [maxIndex]);

  const restart = useCallback(() => {
    clearStoryProgress(story.id);
    setPageIndex(0);
  }, [story.id]);

  // Klavye navigasyonu (a11y)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onExit]);

  const hasChoices = !!page.choices?.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid place-items-center rounded-2xl bg-gradient-to-br ${story.coverGradient} p-4`}>
            <span className="text-4xl" aria-hidden="true">
              {story.coverEmoji}
            </span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">{story.title}</h2>
            <p className="text-sm md:text-base text-muted-foreground font-semibold">{story.tagline}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sayfa {pageIndex + 1}/{story.pages.length} • {progressPct}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 font-bold text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Hikaye kütüphanesine dön"
          >
            <Home className="h-5 w-5" /> Kütüphane
          </button>
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 font-bold text-secondary-foreground shadow-sm hover:opacity-90 transition-opacity"
            aria-label="Hikayeyi baştan başlat"
          >
            <RefreshCw className="h-5 w-5" /> Baştan
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Page card */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${story.id}-${pageIndex}`}
            className="relative overflow-hidden rounded-[2.5rem] border-4 border-primary/10 bg-white/60 backdrop-blur-sm p-6 md:p-10 shadow-playful"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <StoryIllustration emoji={page.illustration} />
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">{page.title}</h3>
                <p className="text-base md:text-lg font-semibold leading-relaxed text-foreground/90">{page.text}</p>
              </div>

              {/* Choices OR Navigation */}
              {hasChoices ? (
                <div className="mt-2 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
                  {page.choices!.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => setPageIndex(Math.min(Math.max(c.nextPageIndex, 0), maxIndex))}
                      className="rounded-2xl bg-primary px-5 py-4 text-left font-extrabold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={goPrev}
                    disabled={pageIndex === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-muted px-8 py-4 font-black text-muted-foreground disabled:opacity-50"
                    aria-label="Önceki sayfa"
                  >
                    <ArrowLeft className="h-5 w-5" /> Geri
                  </button>
                  <button
                    onClick={goNext}
                    disabled={pageIndex === maxIndex}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-success px-8 py-4 font-black text-white shadow-lg disabled:opacity-50"
                    aria-label="Sonraki sayfa"
                  >
                    Devam <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {pageIndex === maxIndex && !hasChoices && (
              <div className="mt-6 text-center text-sm font-bold text-muted-foreground">
                Bitti! İstersen “Baştan” deyip tekrar okuyabilirsin.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}


