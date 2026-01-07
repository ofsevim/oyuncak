import { Loader2 } from "lucide-react";

type Props = {
  label?: string;
  className?: string;
};

/**
 * Basit, erişilebilir loading spinner.
 * - Suspense fallback'lerinde kullanılır.
 */
export default function LoadingSpinner({ label = "Yükleniyor…", className }: Props) {
  return (
    <div className={["flex flex-col items-center justify-center gap-3", className ?? ""].join(" ")}>
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm font-bold text-muted-foreground" role="status" aria-live="polite">
        {label}
      </span>
    </div>
  );
}


