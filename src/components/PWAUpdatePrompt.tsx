import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SERVICE_WORKER_UPDATE_EVENT,
  requestWaitingServiceWorkerActivation,
} from '@/utils/serviceWorkerUpdate';
import { logger } from '@/lib/logger';

export default function PWAUpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onReady = () => setReady(true);
    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, onReady);
    void navigator.serviceWorker
      .getRegistration(import.meta.env.BASE_URL)
      .then((registration) => {
        if (registration?.waiting && navigator.serviceWorker.controller) setReady(true);
      })
      .catch(() => {});
    return () => window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, onReady);
  }, []);

  const applyUpdate = async () => {
    if (!('serviceWorker' in navigator)) return;
    setUpdating(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
      if (!registration || !requestWaitingServiceWorkerActivation(registration)) {
        setUpdating(false);
        setReady(false);
      }
    } catch (err) {
      logger.warn('Service worker update activation failed', { err: String(err) });
      setUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {ready && (
        <motion.aside
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-auto md:right-8"
        >
          <button
            type="button"
            onClick={() => setReady(false)}
            aria-label="Güncelleme bildirimini kapat"
            className="absolute right-2 top-2 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="pr-8 text-sm font-bold text-white">Yeni sürüm hazır</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Güncelleme, sen onayladıktan sonra uygulanacak.
          </p>
          <button
            type="button"
            onClick={applyUpdate}
            disabled={updating}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Güncelleniyor…' : 'Şimdi Güncelle'}
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
