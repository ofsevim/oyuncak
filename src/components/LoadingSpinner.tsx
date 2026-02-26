type Props = {
  label?: string;
  className?: string;
};

export default function LoadingSpinner({ label = "Yükleniyor…", className }: Props) {
  return (
    <div className={["flex flex-col items-center justify-center gap-4", className ?? ""].join(" ")}>
      {/* Animated neon spinner */}
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'hsl(var(--primary) / 0.3)',
            filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))',
          }}
        />
        <div
          className="absolute inset-1.5 rounded-full animate-spin"
          style={{
            border: '2px solid transparent',
            borderBottomColor: 'hsl(var(--secondary))',
            borderLeftColor: 'hsl(var(--secondary) / 0.3)',
            animationDirection: 'reverse',
            animationDuration: '0.8s',
            filter: 'drop-shadow(0 0 6px hsl(var(--secondary) / 0.3))',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ boxShadow: '0 0 8px hsl(var(--primary) / 0.5)' }} />
        </div>
      </div>
      <span className="text-sm font-bold text-muted-foreground/70" role="status" aria-live="polite">
        {label}
      </span>
    </div>
  );
}
