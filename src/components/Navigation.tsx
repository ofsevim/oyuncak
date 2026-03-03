'use client';

import { motion } from 'framer-motion';
import { Pencil, Gamepad2, Home, BookOpen } from 'lucide-react';
import { playNavSound } from '@/utils/soundEffects';

type Tab = 'home' | 'draw' | 'games' | 'story';


interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'home' as Tab, icon: Home, label: 'Ana Sayfa' },
  { id: 'draw' as Tab, icon: Pencil, label: 'Çiz' },
  { id: 'story' as Tab, icon: BookOpen, label: 'Hikaye' },
  { id: 'games' as Tab, icon: Gamepad2, label: 'Oyunlar' },
];

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const handleTabChange = (tab: Tab) => {
    playNavSound();
    onTabChange(tab);
  };


  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ padding: '0 12px 12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-sm mx-auto">
        <motion.div
          className="flex items-center justify-around"
          style={{
            background: 'hsl(224 28% 8% / 0.85)',
            backdropFilter: 'blur(28px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            border: '1px solid hsl(220 20% 100% / 0.07)',
            borderRadius: '20px',
            padding: '6px',
            boxShadow: '0 -2px 24px hsl(224 28% 3% / 0.5), 0 0 0 1px hsl(220 20% 100% / 0.04)',
          }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, delay: 0.1 }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="relative flex flex-col items-center gap-1 py-2.5 px-4 rounded-2xl transition-colors duration-200"
                style={{
                  color: isActive
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted-foreground))',
                  minWidth: 64,
                }}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'hsl(var(--primary) / 0.1)',
                      border: '1px solid hsl(var(--primary) / 0.18)',
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}

                <Icon
                  className="relative z-10 transition-all duration-200"
                  style={{
                    width: 20,
                    height: 20,
                    strokeWidth: isActive ? 2.2 : 1.8,
                    filter: isActive ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' : 'none',
                  }}
                />
                <span
                  className="relative z-10 font-semibold transition-all duration-200"
                  style={{ fontSize: '10px', letterSpacing: '0.02em' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>
    </nav>
  );
};

export default Navigation;
