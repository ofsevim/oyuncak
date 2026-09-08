import { useEffect, useState } from 'react';
import { getPlayerPreferences, PREFERENCES_EVENT } from '@/utils/playerPreferences';
import { GAME_ACTIVITY_EVENT, isGamePaused, setGamePaused } from '@/utils/gameActivity';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isMuted, toggleMute } from '@/utils/soundEffects';

function PauseDialog({ onContinue, isBreak }: { onContinue: () => void; isBreak: boolean }) {
  const ref = useDialogFocus(onContinue);
  return <div className="fixed inset-0 z-[90] bg-black/80 grid place-items-center p-5" onKeyDown={(event) => event.stopPropagation()}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="pause-title" tabIndex={-1} className="w-full max-w-sm rounded-3xl bg-card border border-border p-7 text-center space-y-5">
      <h2 id="pause-title" className="text-2xl font-black">{isBreak ? 'Biraz mola verelim' : 'Oyun duraklatıldı'}</h2>
      <p className="text-muted-foreground">{isBreak ? 'Gözlerini dinlendir, biraz hareket et. Hazır olduğunda devam edebilirsin.' : 'Hazır olduğunda kaldığın yerden devam edebilirsin.'}</p>
      <button onClick={onContinue} className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-bold">Devam et</button>
    </div>
  </div>;
}

export default function GameControls() {
  const [paused, setPaused] = useState(isGamePaused);
  const [isBreak, setIsBreak] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [preferences, setPreferences] = useState(getPlayerPreferences);
  useEffect(() => {
    const update = () => setPaused(isGamePaused());
    const settings = () => setPreferences(getPlayerPreferences());
    const visibility = () => { if (document.hidden) setGamePaused(true); update(); };
    window.addEventListener(GAME_ACTIVITY_EVENT, update);
    window.addEventListener(PREFERENCES_EVENT, settings);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener(GAME_ACTIVITY_EVENT, update);
      window.removeEventListener(PREFERENCES_EVENT, settings);
      document.removeEventListener('visibilitychange', visibility);
      setGamePaused(false);
    };
  }, []);
  useEffect(() => {
    if (!preferences.breakMinutes) return;
    let elapsed = 0;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!isGamePaused()) elapsed += Math.min(now - last, 2000);
      last = now;
      if (elapsed >= preferences.breakMinutes * 60_000) {
        elapsed = 0; setIsBreak(true); setGamePaused(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [preferences.breakMinutes]);
  return <>
    <div className="fixed right-3 top-3 z-[70] flex gap-2 rounded-2xl bg-slate-950/90 p-2 shadow-lg">
      <button aria-label="Oyunu duraklat" onClick={() => setGamePaused(true)} className="min-h-11 px-3 rounded-xl text-white hover:bg-white/10">⏸<span className="hidden sm:inline"> Duraklat</span></button>
      <button aria-label={muted ? 'Oyun sesini aç' : 'Oyun sesini kapat'} aria-pressed={muted} onClick={() => { toggleMute(); setMuted(isMuted()); }} className="min-h-11 px-3 rounded-xl text-white hover:bg-white/10">{muted ? '🔇' : '🔊'}</button>
    </div>
    {paused && <PauseDialog isBreak={isBreak} onContinue={() => { setIsBreak(false); setGamePaused(false); }} />}
  </>;
}
