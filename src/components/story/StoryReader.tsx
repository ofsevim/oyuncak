import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Home, RefreshCw } from "lucide-react";
import type { Story } from "@/data/stories";
import { StoryIllustration } from "./StoryIllustration";
import { clearStoryProgress, saveStoryProgress } from "./storyProgress";
import { playPopSound, playSuccessSound } from "@/utils/soundEffects";

type Props = {
  story: Story;
  initialPageIndex?: number;
  onExit: () => void;
};

/**
 * Tek bir hikayeyi sayfa sayfa okutan ekran.
 * - Klavye: \u2190 \u2192 / ESC
 * - localStorage: ilerleme kayd\u0131
 */
export default function StoryReader({ story, initialPageIndex = 0, onExit }: Props) {
  const maxIndex = story.pages.length - 1;
  const [pageIndex, setPageIndex] = useState(() => Math.min(Math.max(initialPageIndex, 0), maxIndex));

  const page = story.pages[pageIndex];
  const progressPct = useMemo(() => Math.round(((pageIndex + 1) / story.pages.length) * 100), [pageIndex, story.pages.length]);

  useEffect(() => {
    saveStoryProgress(story.id, pageIndex);
  }, [story.id, pageIndex]);

  const goPrev = useCallback(() => {
    playPopSound();
    setPageIndex((p) => Math.max(0, p - 1));
  }, []);
  const goNext = useCallback(() => {
    playPopSound();
    setPageIndex((p) => {
      const target = story.pages[p]?.nextPageIndex;
      return Math.min(maxIndex, typeof target === "number" ? target : p + 1);
    });
  }, [maxIndex, story.pages]);

  const restart = useCallback(() => {
    clearStoryProgress(story.id);
    setPageIndex(0);
  }, [story.id]);

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

  const completionFiredRef = useRef(false);
  const isFinished = pageIndex === maxIndex && !hasChoices;
  useEffect(() => {
    if (isFinished && !completionFiredRef.current) {
      completionFiredRef.current = true;
      playSuccessSound();
    }
    if (!isFinished) {
      completionFiredRef.current = false;
    }
  }, [isFinished]);

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
              Sayfa {pageIndex + 1}/{story.pages.length} {"\u2022"} {progressPct}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 font-bold text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Hikaye k\u00FCt\u00FCphanesine d\u00F6n"
          >
            <Home className="h-5 w-5" /> K\u00FCt\u00FCphane
          </button>
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 font-bold text-secondary-foreground shadow-sm hover:opacity-90 transition-opacity"
            aria-label="Hikayeyi ba\u015Ftan ba\u015Flat"
          >
            <RefreshCw className="h-5 w-5" /> Ba\u015Ftan
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
                      onClick={() => {
                        playPopSound();
                        setPageIndex(Math.min(Math.max(c.nextPageIndex, 0), maxIndex));
                      }}
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
                    aria-label="\u00D6nceki sayfa"
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

            {isFinished && (
              <motion.div
                className="mt-6 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center gap-1" aria-hidden="true">
                  {["\uD83C\uDF89", "\u2B50", "\uD83E\uDD73", "\u2B50", "\uD83C\uDF89"].map((emoji, i) => (
                    <motion.span
                      key={i}
                      className="text-2xl"
                      initial={{ y: 0 }}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12, ease: "easeInOut" }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
                <p className="text-sm font-bold text-muted-foreground">
                  Tebrikler, hikaye bitti! {"\u201C"}Ba\u015Ftan{"\u201D"} deyip tekrar okuyabilirsin.
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
