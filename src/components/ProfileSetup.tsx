'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AVATARS, useProfile } from '@/contexts/ProfileContext';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';
import confetti from 'canvas-confetti';

export default function ProfileSetup() {
  const { setProfile } = useProfile();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [step, setStep] = useState<'avatar' | 'name'>('avatar');

  const handleAvatarSelect = (avatarId: string) => {
    playPopSound();
    setSelectedAvatar(avatarId);
  };

  const handleNextStep = () => {
    if (step === 'avatar') {
      playPopSound();
      setStep('name');
    }
  };

  const handleComplete = () => {
    if (!name.trim()) return;
    
    playSuccessSound();
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
    });

    setProfile({
      name: name.trim(),
      avatarId: selectedAvatar,
      createdAt: Date.now(),
    });
  };

  const selectedAvatarData = AVATARS.find(a => a.id === selectedAvatar)!;

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-2xl">
        {step === 'avatar' ? (
          <motion.div
            className="card-playful p-8 text-center space-y-8"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-foreground">Hoş Geldin! 🎉</h1>
              <p className="text-xl text-muted-foreground font-semibold">
                Önce bir avatar seç!
              </p>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.id)}
                  className={`aspect-square text-4xl md:text-5xl rounded-2xl transition-all duration-200 hover:scale-110 ${
                    selectedAvatar === avatar.id
                      ? 'bg-primary shadow-lg ring-4 ring-primary/50 scale-110'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  aria-label={avatar.name}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              <span className="text-6xl">{selectedAvatarData.emoji}</span>
              <span className="text-2xl font-black text-foreground">{selectedAvatarData.name}</span>
            </div>

            <button
              onClick={handleNextStep}
              className="px-12 py-5 bg-primary text-white text-2xl font-black rounded-full shadow-lg btn-bouncy"
            >
              Devam Et →
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="card-playful p-8 text-center space-y-8"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="space-y-2">
              <span className="text-7xl">{selectedAvatarData.emoji}</span>
              <h1 className="text-4xl font-black text-foreground">Adın ne?</h1>
              <p className="text-xl text-muted-foreground font-semibold">
                Sana nasıl seslenelim?
              </p>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="İsmini yaz..."
              maxLength={20}
              className="w-full max-w-sm mx-auto px-6 py-4 text-2xl font-bold text-center rounded-2xl border-4 border-primary/20 focus:border-primary focus:outline-none bg-white"
              autoFocus
            />

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep('avatar')}
                className="px-8 py-4 bg-muted text-muted-foreground text-xl font-bold rounded-full"
              >
                ← Geri
              </button>
              <button
                onClick={handleComplete}
                disabled={!name.trim()}
                className="px-12 py-4 bg-primary text-white text-xl font-black rounded-full shadow-lg btn-bouncy disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Başla! 🚀
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

