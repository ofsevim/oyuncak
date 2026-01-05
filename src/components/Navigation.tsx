'use client';

import { motion } from 'framer-motion';
import { Pencil, Gamepad2, Home, BookOpen } from 'lucide-react';

type Tab = 'home' | 'draw' | 'games' | 'story';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const tabs = [
    { id: 'home' as Tab, icon: Home, label: 'Ana Sayfa', color: 'bg-primary' },
    { id: 'draw' as Tab, icon: Pencil, label: 'Çiz', color: 'bg-accent' },
    { id: 'games' as Tab, icon: Gamepad2, label: 'Oyunlar', color: 'bg-secondary' },
    { id: 'story' as Tab, icon: BookOpen, label: 'Hikaye', color: 'bg-purple' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          className="card-playful flex justify-around items-center p-3 md:p-4"
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
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-1 p-3 md:p-4 rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isActive ? tab.color : 'bg-transparent'
                }`}
              >
                <div className={isActive ? 'animate-float-up' : ''}>
                  <Icon
                    className={`w-7 h-7 md:w-8 md:h-8 ${
                      isActive ? 'text-white' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs md:text-sm font-bold ${
                    isActive ? 'text-white' : 'text-muted-foreground'
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
