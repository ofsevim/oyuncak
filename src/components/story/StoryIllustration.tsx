import { memo } from "react";

type Props = {
  emoji: string;
  className?: string;
};

/**
 * Hikaye sayfası için basit illüstrasyon bileşeni.
 * Performans için memo (emoji değişmedikçe re-render etmez).
 */
export const StoryIllustration = memo(function StoryIllustration({ emoji, className }: Props) {
  return (
    <div
      className={[
        "select-none text-7xl md:text-8xl leading-none",
        "drop-shadow-sm",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
    >
      {emoji}
    </div>
  );
});


