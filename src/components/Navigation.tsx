'use client';

import { motion } from 'framer-motion';
import { Pencil, Gamepad2, Home } from 'lucide-react';
import { playPopSound } from '@/utils/soundEffects';

type Tab = 'home' | 'draw' | 'games';

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
    { id: 'home' as Tab, icon: Home, label: 'Ana Sayfa', color: 'bg-primary' },
    { id: 'draw' as Tab, icon: Pencil, label: 'Çiz', color: 'bg-accent' },
    { id: 'games' as Tab, icon: Gamepad2, label: 'Oyunlar', color: 'bg-secondary' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          className="card-playful flex justify-around items-center p-1.5 md:p-2"
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
                className={`relative flex flex-col items-center gap-0.5 py-1 px-3 md:py-1.5 md:px-5 rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95 ${isActive ? tab.color : 'bg-transparent'
                  }`}
              >
                <div className={isActive ? 'animate-float-up' : ''}>
                  <Icon
                    className={`w-6 h-6 md:w-7 md:h-7 ${isActive ? 'text-white' : 'text-muted-foreground'
                      }`}
                  />
                </div>
                <span
                  className={`text-xs md:text-sm font-bold ${isActive ? 'text-white' : 'text-muted-foreground'
                    }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
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
