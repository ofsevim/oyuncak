'use client';

import { motion } from 'framer-motion';
import { Pencil, Gamepad2, Home, BookOpen } from 'lucide-react';
import { playPopSound } from '@/utils/soundEffects';

type Tab = 'home' | 'draw' | 'games' | 'story';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/**
 * Modern gaming bottom navigation
 * - Glassmorphism bar, neon active indicator
 */
const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const handleTabChange = (tab: Tab) => {
    playPopSound();
    onTabChange(tab);
  };

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: 'Ana Sayfa' },
    { id: 'draw' as Tab, icon: Pencil, label: 'Çiz' },
    { id: 'story' as Tab, icon: BookOpen, label: 'Hikaye' },
    { id: 'games' as Tab, icon: Gamepad2, label: 'Oyunlar' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4 pb-safe animate-fade-in">
      <div className="max-w-lg mx-auto">
        <motion.div
          className="glass-card flex justify-around items-center p-1.5 border border-white/10"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-1 py-2 px-4 md:py-2.5 md:px-6 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : ''}`} />
                <span className={`text-[10px] md:text-xs font-bold transition-colors ${isActive ? 'text-primary' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                    style={{ boxShadow: '0 0 10px hsl(var(--primary) / 0.6)' }}
                  />
                )}
              </button>
            );
          })}
        </motion.div>
      </div>
    </nav>
  );
};

export default Navigation;
