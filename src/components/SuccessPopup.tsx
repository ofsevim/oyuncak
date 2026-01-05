'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Star, Heart, Sparkles } from 'lucide-react';
import { speakSuccess } from '@/utils/voiceFeedback';

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  level?: number;
}

const SuccessPopup = ({ isOpen, onClose, message = 'Harikasın!', level }: SuccessPopupProps) => {
  useEffect(() => {
    if (isOpen) {
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const colors = ['#4FC3F7', '#FFD54F', '#81C784', '#F48FB1', '#B39DDB'];

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 4,
          angle: randomInRange(55, 125),
          spread: randomInRange(50, 70),
          origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.1, 0.5) },
          colors: colors,
          shapes: ['star', 'circle'],
          scalar: 1.2,
        });
      }, 50);

      speakSuccess();

      const timeout = setTimeout(() => {
        onClose();
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card-playful p-8 md:p-12 text-center max-w-md mx-4"
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
