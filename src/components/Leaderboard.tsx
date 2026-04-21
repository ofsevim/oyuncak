import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeaderboard, type LeaderboardEntry } from '@/services/scoreService';

interface Props {
  gameId: string;
  /** Compact mod — oyun bitis popup'larinda kullanilir */
  compact?: boolean;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ gameId, compact = false }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const data = await getLeaderboard(gameId, 10);
    return data;
  }, [gameId]);

  useEffect(() => {
    if (!open && !compact) return;
    let cancelled = false;
    setLoading(true);
    fetchData().then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [gameId, open, compact, fetchData]);

  /* ── Compact mod: sadece top 3 satır ── */
  if (compact) {
    if (loading) return <div className="text-xs text-white/30 text-center py-2">Yükleniyor…</div>;
    if (entries.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 mt-2">
        <p className="text-xs font-bold text-white/40 text-center">🏆 Liderlik Tablosu</p>
        {entries.slice(0, 3).map((e, i) => (
          <div
            key={e.uid}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs ${e.isMe ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5'}`}
          >
            <span>{RANK_MEDALS[i] || `${i + 1}.`}</span>
            <span className="flex-1 truncate font-medium text-white/80">{e.name}</span>
            <span className="font-black text-amber-300">{e.score.toLocaleString('tr-TR')}</span>
          </div>
        ))}
      </div>
    );
  }

  /* ── Full mod: açılır-kapanır panel ── */
  return (
    <div className="w-full max-w-sm mx-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`leaderboard-panel-${gameId}`}
        aria-label="Liderlik tablosunu aç/kapat"
        className="w-full px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        style={{
          background: open ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
          color: open ? '#c084fc' : 'rgba(255,255,255,0.6)',
        }}
      >
        🏆 Liderlik Tablosu
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={`leaderboard-panel-${gameId}`}
            role="region"
            aria-label="Liderlik tablosu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 rounded-2xl p-3 flex flex-col gap-1.5"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <p className="text-center text-sm text-white/30 py-4">Henüz skor yok — ilk rekoru sen kır!</p>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center text-[10px] font-bold text-white/30 px-2 pb-1 border-b border-white/5">
                    <span className="w-8">#</span>
                    <span className="flex-1">Oyuncu</span>
                    <span className="w-20 text-right">Skor</span>
                  </div>

                  {/* Rows */}
                  {entries.map((entry, i) => (
                    <motion.div
                      key={entry.uid}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center px-2 py-1.5 rounded-xl text-sm transition-all ${
                        entry.isMe
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-500/25'
                          : i % 2 === 0 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <span className="w-8 font-bold text-xs">
                        {RANK_MEDALS[i] || <span className="text-white/40">{i + 1}.</span>}
                      </span>
                      <span className={`flex-1 truncate font-medium ${entry.isMe ? 'text-purple-300' : 'text-white/70'}`}>
                        {entry.name}
                        {entry.isMe && <span className="ml-1 text-[10px] text-purple-400">(sen)</span>}
                      </span>
                      <span className={`w-20 text-right font-black ${
                        i === 0 ? 'text-amber-300' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white/60'
                      }`}>
                        {entry.score.toLocaleString('tr-TR')}
                      </span>
                    </motion.div>
                  ))}
                </>
              )}

              {/* Refresh button */}
              <button
                onClick={async () => {
                  setLoading(true);
                  const data = await fetchData();
                  setEntries(data);
                  setLoading(false);
                }}
                className="mt-1 text-[10px] text-white/25 hover:text-white/50 transition-colors text-center"
              >
                ↻ Yenile
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
