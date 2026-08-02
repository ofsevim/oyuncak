import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getNicknameFromExistingScores,
  updateNicknameInScores,
} from '@/services/scoreService';
import { sanitizeNickname, MAX_NICKNAME_LENGTH } from '@/lib/utils';

const NICKNAME_KEY = 'oyuncak.nickname';
const ASKED_KEY = 'oyuncak.nickname.asked';

export default function NicknameModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const initialize = async () => {
      try {
        const savedNickname = localStorage.getItem(NICKNAME_KEY);
        const alreadyAsked = localStorage.getItem(ASKED_KEY);
        if (savedNickname?.trim()) {
          localStorage.setItem(ASKED_KEY, '1');
          return;
        }
        if (alreadyAsked) return;
      } catch {
        // Try cloud recovery even when local storage is unavailable.
      }

      const recoveredNickname = await getNicknameFromExistingScores();
      if (cancelled || recoveredNickname) {
        if (recoveredNickname) {
          try {
            localStorage.setItem(NICKNAME_KEY, recoveredNickname);
            localStorage.setItem(ASKED_KEY, '1');
          } catch {
            // Do not show the modal again during this session.
          }
        }
        return;
      }
      timer = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 1500);
    };

    void initialize();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        localStorage.setItem(ASKED_KEY, '1');
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    const handleOpenRequest = () => {
      const saved = localStorage.getItem(NICKNAME_KEY) || '';
      setName(saved);
      setOpen(true);
    };
    window.addEventListener('oyuncak:open-nickname-modal', handleOpenRequest);
    return () => window.removeEventListener('oyuncak:open-nickname-modal', handleOpenRequest);
  }, []);

  const handleSave = async () => {
    const safeName = sanitizeNickname(name);
    localStorage.setItem(NICKNAME_KEY, safeName);
    localStorage.setItem(ASKED_KEY, '1');
    window.dispatchEvent(new CustomEvent('oyuncak:nickname-changed', { detail: safeName }));
    setOpen(false);
    await updateNicknameInScores(safeName);
  };

  const handleSkip = () => {
    localStorage.setItem(ASKED_KEY, '1');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
            aria-label="Takma ad penceresini kapat"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nickname-title"
            aria-describedby="nickname-desc"
            className="relative w-full max-w-sm rounded-3xl p-6 text-center max-h-[90vh] overflow-y-auto"
            style={{
              background: 'rgba(15,18,25,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
          >
            <span className="text-5xl block mb-3" aria-hidden="true">🎮</span>
            <h2 id="nickname-title" className="text-xl font-black text-white mb-1">Takma Adını Seç!</h2>
            <p id="nickname-desc" className="text-sm text-white/50 mb-5">Liderlik tablosunda bu isimle görüneceksin</p>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Takma adın..."
              aria-label="Takma adın"
              maxLength={MAX_NICKNAME_LENGTH}
              className="w-full px-4 py-3 rounded-xl text-center font-bold text-white text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              onKeyDown={(event) => { if (event.key === 'Enter') void handleSave(); }}
            />
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={handleSkip} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/50 transition-all hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Daha sonra
              </button>
              <button type="button" onClick={() => void handleSave()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 active:scale-95">
                Kaydet
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
