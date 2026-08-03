import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, X } from 'lucide-react';
import {
  SCORE_SYNC_STATUS_EVENT,
  flushScoreSyncQueue,
  getPendingScoreSyncCount,
  type ScoreSyncStatus,
} from '@/utils/scoreSyncQueue';

export default function ScoreSyncNotice() {
  const [pending, setPending] = useState(() => getPendingScoreSyncCount());
  const [retrying, setRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onStatus = (event: Event) => {
      const { detail } = event as CustomEvent<ScoreSyncStatus>;
      setPending(detail.pending);
      setRetrying(false);
      if (detail.state === 'pending') setDismissed(false);
    };
    window.addEventListener(SCORE_SYNC_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(SCORE_SYNC_STATUS_EVENT, onStatus);
  }, []);

  if (pending === 0 || dismissed) return null;

  return (
    <aside className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-sm rounded-2xl border border-amber-400/20 bg-slate-900/95 p-3 shadow-xl backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Senkronizasyon bildirimini kapat"
        className="absolute right-2 top-2 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3 pr-7">
        <CloudOff className="h-5 w-5 flex-none text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white">Skor cihazda güvende</p>
          <p className="text-[11px] text-white/55">{pending} skor internete bağlanınca gönderilecek.</p>
        </div>
        <button
          type="button"
          disabled={retrying || !navigator.onLine}
          onClick={() => {
            setRetrying(true);
            void flushScoreSyncQueue(true);
          }}
          className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/15 disabled:opacity-40"
          aria-label="Skor senkronizasyonunu yeniden dene"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
