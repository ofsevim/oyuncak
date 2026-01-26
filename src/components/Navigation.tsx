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
    { id: 'home' as Tab, icon: Home, label: 'Ana Sayfa', color: 'bg-primary' },
    { id: 'draw' as Tab, icon: Pencil, label: 'Çiz', color: 'bg-accent' },
    { id: 'story' as Tab, icon: BookOpen, label: 'Hikaye', color: 'bg-purple-500' },
    { id: 'games' as Tab, icon: Gamepad2, label: 'Oyunlar', color: 'bg-secondary' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 p-2 md:p-4 pb-safe animate-fade-in">
      <div className="max-w-lg mx-auto">
        <motion.div
          className="card-playful flex justify-around items-center p-1 md:p-2 bg-card/90 backdrop-blur-md border border-white/20"
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
                className={`relative flex flex-col items-center gap-1 py-1.5 px-3 md:py-2 md:px-5 rounded-2xl transition-all duration-200 active:scale-90 ${isActive ? tab.color : 'bg-transparent hover:bg-muted/50'
                  }`}
              >
                <div className={isActive ? 'animate-float-up' : ''}>
                  <Icon
                    className={`w-5 h-5 md:w-7 md:h-7 ${isActive ? 'text-white' : 'text-muted-foreground'
                      }`}
                  />
                </div>
                <span
                  className={`text-[10px] md:text-sm font-bold ${isActive ? 'text-white' : 'text-muted-foreground'
                    }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="nav-dot"
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-white"
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
