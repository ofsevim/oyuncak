import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getPlayerPreferences, setPlayerPreferences, type PlayerPreferences } from '@/utils/playerPreferences';
import { settleScoreSync } from '@/utils/scoreSyncQueue';
import { deleteAfterSync } from '@/utils/cloudDeletion';
import { withTimeout } from '@/utils/promiseTimeout';

export default function Parents() {
  const [preferences, setPreferences] = useState(getPlayerPreferences);
  const [answer, setAnswer] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [confirm, setConfirm] = useState<'local' | 'cloud' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = async (patch: Partial<PlayerPreferences>) => {
    const next = setPlayerPreferences(patch);
    setPreferences(next);
    if (patch.shareScores) {
      try {
        localStorage.removeItem('oyuncak.firebase.synced.v2');
        const { syncExistingScores } = await import('@/utils/highScores');
        await syncExistingScores();
      } catch { toast.error('Skorlar şu an gönderilemedi. Rekorların cihazında duruyor.'); }
    }
  };

  const removeData = async () => {
    if (!confirm) return;
    setBusy(true);
    setError('');
    try {
      await change({ shareScores: false });
      if (confirm === 'cloud') {
        const { deleteCloudScores } = await withTimeout(import('@/services/scoreService'));
        await deleteAfterSync(settleScoreSync, deleteCloudScores);
        toast.success('Bu oturumun global skorları ve bulut takma adı silindi.');
      } else {
        const { clearDrawings } = await import('@/utils/drawingStore');
        await clearDrawings();
        const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
        keys.forEach((key) => { if (key?.startsWith('oyuncak')) localStorage.removeItem(key); });
        setPlayerPreferences({ shareScores: false, breakMinutes: 0, reducedMotion: false });
        window.location.reload();
      }
      setConfirm(null);
    } catch (cause) {
      setError(cause instanceof Error ? `Silme sonucu: ${cause.message}` : 'Silme tamamlanamadı. Tekrar deneyebilirsin.');
    } finally { setBusy(false); }
  };

  return <main className="mx-auto max-w-3xl px-5 py-10 space-y-7">
    <Link to="/" className="text-primary underline">← Ana sayfa</Link>
    <h1 className="text-3xl font-black">Ebeveyn Alanı</h1>
    <p className="text-muted-foreground">Oyuncak; oyun, çizim ve hikâyeleri bir araya getirir. Reklam ve uygulama içi satın alma bulunmaz. Oyunlardaki yaş etiketleri öneridir; çocuğunuzun ilgisi ve gelişimiyle birlikte değerlendirin.</p>
    <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h2 className="text-xl font-bold">Birlikte keşfedin</h2>
      <p>İlk oyunu birlikte seçin. Takma ad olarak gerçek ad, okul, telefon veya adres kullanmayın. Çizimleri düzenli olarak indirerek yedekleyin; tarayıcı verileri temizlendiğinde cihazdaki kayıtlar kaybolabilir.</p>
      <Link to="/privacy" className="inline-block text-primary underline">Veriler nasıl kullanılıyor?</Link>
    </section>
    {!unlocked ? <form className="rounded-2xl border border-border bg-card p-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (answer.trim() === '21') { setUnlocked(true); setError(''); } else setError('Yanıtı kontrol edip tekrar deneyin.'); }}>
      <h2 className="text-xl font-bold">Yetişkin ayarları</h2>
      <label className="block" htmlFor="parent-answer">Ayarları açmak için: 7 × 3 kaç eder?</label>
      <input id="parent-answer" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value)} className="w-28 rounded-xl border border-border bg-background p-3" />
      <button className="ml-3 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-bold">Ayarları aç</button>
    </form> : <section className="rounded-2xl border border-border bg-card p-6 space-y-6">
      <h2 className="text-xl font-bold">Bu cihazın tercihleri</h2>
      <label className="flex items-start gap-3"><input type="checkbox" checked={preferences.shareScores} disabled={busy} onChange={(event) => void change({ shareScores: event.target.checked })} className="mt-1 h-5 w-5" /><span><strong>Global skor paylaşımı</strong><span className="block text-sm text-muted-foreground">Açıkken yerel rekorlar ve takma ad global tabloya gönderilir. Kapatmak mevcut global skorları silmez; aşağıdan ayrıca silebilirsiniz.</span></span></label>
      <label className="flex items-start gap-3"><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => void change({ reducedMotion: event.target.checked })} className="mt-1 h-5 w-5" /><span>Animasyonları azalt</span></label>
      <label className="flex flex-wrap items-center gap-3">Mola hatırlatıcısı<select aria-label="Mola hatırlatıcısı" value={preferences.breakMinutes} onChange={(event) => void change({ breakMinutes: Number(event.target.value) })} className="rounded-xl border border-border bg-background p-3"><option value={0}>Kapalı</option><option value={15}>15 dakika</option><option value={30}>30 dakika</option><option value={45}>45 dakika</option></select></label>
      <p className="text-sm text-muted-foreground">Mola süresi yalnızca bu sekme görünürken sayılır. Bu ayarlar cihazda saklanır; yetişkin geçişi bir hesap veya kimlik doğrulama sistemi değildir.</p>
      <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => setConfirm('cloud')} className="rounded-xl border border-border px-4 py-3">Global skorlarımı sil</button><button disabled={busy} onClick={() => setConfirm('local')} className="rounded-xl border border-destructive text-destructive px-4 py-3">Cihazdaki verilerimi sil</button></div>
      {confirm && <div role="alert" className="rounded-xl border border-destructive p-4 space-y-3">
        <p>{confirm === 'local' ? 'Çizimler, yerel rekorlar, favoriler ve hikâye ilerlemesi kalıcı olarak silinecek. Global kayıtlar etkilenmez. Çizimlerinizi önce galeriden indirin.' : 'Mevcut anonim oturuma ait global skorlar ve bulut takma adı kalıcı olarak silinecek. Yerel rekorlar korunur ve skor paylaşımı kapanır.'}</p>
        <button disabled={busy} onClick={() => void removeData()} className="rounded-lg bg-destructive text-white px-4 py-2">{busy ? 'Siliniyor…' : 'Evet, kalıcı olarak sil'}</button>
        <button disabled={busy} onClick={() => setConfirm(null)} className="ml-3 rounded-lg border border-border px-4 py-2">Vazgeç</button>
      </div>}
    </section>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <p className="text-sm text-muted-foreground">Global silme işlemi mevcut tarayıcı oturumuyla ilişkilidir. Önceden kaybedilmiş anonim oturumlara ait kayıtlar bu cihazdan yönetilemez.</p>
    <div className="flex flex-wrap gap-5"><Link to="/privacy" className="text-primary underline">Gizlilik</Link><Link to="/terms" className="text-primary underline">Kullanım bilgileri</Link><a href="https://omersevim.com.tr" target="_blank" rel="noopener noreferrer" className="text-primary underline">Geliştirici ve iletişim</a></div>
  </main>;
}
