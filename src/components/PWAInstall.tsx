import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const DISMISSED_KEY = 'oyuncak.pwa-install-dismissed';
const appIconSrc = `${import.meta.env.BASE_URL}favicon.png`;

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

const PWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isApp = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as NavigatorWithStandalone).standalone === true;
    const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    const dismissed = wasDismissed();
    setIsStandalone(isApp);
    setIsIOS(isIPhone);

    const handler = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      if (!isApp && !dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    if (isIPhone && !isApp && !dismissed) {
      const timer = window.setTimeout(() => setShowBanner(true), 3000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismissBanner = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // The banner can still be dismissed for this session.
    }
    setShowBanner(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted' || outcome === 'dismissed') dismissBanner();
  };

  if (isStandalone || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed left-4 right-4 z-40 md:left-auto md:right-8 md:bottom-8 md:w-80"
        style={{ bottom: 'max(6rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))' }}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30">
            <img src={appIconSrc} alt="Oyuncak uygulama simgesi" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">Uygulamayı Yükle</h4>
            <p className="text-[11px] text-muted-foreground leading-tight">Oyuncak'ı ana ekranına ekle, daha hızlı ulaş!</p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Yükleme bildirimini kapat"
              className="absolute -top-2 -right-2 w-8 h-8 touch-manipulation rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {isIOS ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse bg-primary/10 px-2 py-1 rounded-lg">
                <Share className="w-3 h-3" />
                <span>Paylaş ve Ekle</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-primary text-primary-foreground text-xs font-black px-3 py-2 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <Download className="w-3 h-3 inline-block mr-1" />
                YÜKLE
              </button>
            )}
          </div>
        </div>
        {isIOS && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 bg-slate-800/90 border border-white/5 rounded-xl p-3 text-[10px] text-muted-foreground flex items-center gap-2"
          >
            <PlusSquare className="w-4 h-4 text-white" />
            <span>Alttaki <span className="text-white font-bold">Paylaş</span> düğmesine dokunup <span className="text-white font-bold">Ana Ekrana Ekle</span> seçeneğini seç.</span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstall;
