'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { playPopSound } from '@/utils/soundEffects';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    playPopSound();
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-card shadow-playful border-2 border-primary/10 hover:scale-110 transition-transform"
      aria-label={theme === 'light' ? 'Karanlık moda geç' : 'Aydınlık moda geç'}
    >
      {theme === 'light' ? (
        <Moon className="w-6 h-6 text-foreground" />
      ) : (
        <Sun className="w-6 h-6 text-yellow-400" />
      )}
    </button>
  );
}

