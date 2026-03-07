import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateNicknameInScores } from '@/services/scoreService';
import { ensureAuth } from '@/services/authService';

const NICKNAME_KEY = 'oyuncak.nickname';
const ASKED_KEY = 'oyuncak.nickname.asked';

/**
 * Uygulama ilk açılışta bir kez gösterilir.
 * Kullanıcı takma ad girer veya "Daha sonra" ile geçer.
 */
export default function NicknameModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const alreadyAsked = localStorage.getItem(ASKED_KEY);
    if (!alreadyAsked) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim() || 'Anonim Oyuncu';
    localStorage.setItem(NICKNAME_KEY, trimmed);
    localStorage.setItem(ASKED_KEY, '1');
    setOpen(false);
    try {
      await ensureAuth();
      await updateNicknameInScores(trimmed);
    } catch { /* sessiz */ }
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(15,18,25,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
          >
            <span className="text-5xl block mb-3">🎮</span>
            <h2 className="text-xl font-black text-white mb-1">Takma Adını Seç!</h2>
            <p className="text-sm text-white/50 mb-5">
              Liderlik tablosunda bu isimle görüneceksin
            </p>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Takma adın..."
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-center font-bold text-white text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/50 transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Daha sonra
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 active:scale-95"
              >
                Kaydet
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
