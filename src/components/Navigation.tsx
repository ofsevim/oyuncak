'use client';

import { motion } from 'framer-motion';
import { Pencil, Gamepad2, Home, BookOpen } from 'lucide-react';
import { playPopSound } from '@/utils/soundEffects';

type Tab = 'home' | 'draw' | 'games' | 'story';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

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
          className="flex justify-around items-center p-1.5 rounded-2xl border border-white/[0.06]"
          style={{
            background: 'hsl(var(--background) / 0.7)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            boxShadow: '0 -4px 30px hsl(var(--background) / 0.5)',
          }}
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
                className={`relative flex flex-col items-center gap-1 py-2.5 px-4 md:py-3 md:px-6 rounded-xl transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.03]'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-bg"
                    className="absolute inset-0 rounded-xl bg-primary/[0.08] border border-primary/15"
                    style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.1)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_10px_hsl(var(--primary)/0.6)]' : ''}`} />
                <span className={`relative z-10 text-[10px] md:text-xs font-bold ${isActive ? 'text-primary' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-primary"
                    style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.7)' }}
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
