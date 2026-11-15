import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/utils/confettiUtil';
import { Star, Heart, Sparkles } from 'lucide-react';

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  level?: number;
}

const SuccessPopup = ({ isOpen, onClose, message = 'Tebrikler!', level }: SuccessPopupProps) => {
  useEffect(() => {
    if (!isOpen) return;

    fireConfetti({
      particleCount: 55,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4FC3F7', '#FFD54F', '#81C784', '#F48FB1', '#B39DDB'],
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const timeout = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timeout);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-popup-title"
            className="card-playful p-8 md:p-12 text-center max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.3, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center gap-4 mb-6">
              <div className="animate-bounce">
                <Star className="w-12 h-12 text-secondary fill-secondary" />
              </div>
              <div className="animate-pulse">
                <Heart className="w-14 h-14 text-destructive fill-destructive" />
              </div>
              <div className="animate-bounce">
                <Sparkles className="w-12 h-12 text-accent fill-accent" />
              </div>
            </div>

            <motion.h2
              id="success-popup-title"
              className="text-3xl md:text-4xl font-extrabold text-foreground mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            >
              {message}
            </motion.h2>

            {level && (
              <motion.p
                className="text-xl text-muted-foreground font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Seviye {level} tamamlandı! 🎉
              </motion.p>
            )}

            <button
              className="mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg btn-bouncy"
              onClick={onClose}
            >
              Devam Et
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessPopup;
