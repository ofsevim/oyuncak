'use client';

import { useState } from 'react';
import FloatingBubbles from '@/components/ui/FloatingBubbles';
import Navigation from '@/components/Navigation';
import DrawingCanvas from '@/components/DrawingCanvas';
import GamesMenu from '@/components/games/GamesMenu';
import { motion } from 'framer-motion';
import { Pencil, Gamepad2, Sparkles } from 'lucide-react';

type Tab = 'home' | 'draw' | 'games';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'draw':
        return <DrawingCanvas />;
      case 'games':
        return <GamesMenu />;
      default:
        return (
          <motion.div
            className="flex flex-col items-center justify-center gap-8 p-6 text-center min-h-[80vh]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="relative"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src="/favicon.png"
                alt="Oyuncak"
                className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] shadow-bounce border-8 border-white"
              />
              <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-secondary animate-pulse" />
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
                Hoş Geldin! 👋
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-lg font-medium">
                Hayal et, çiz ve eğlenceli oyunlar oyna!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xl mt-4">
              <button
                onClick={() => setActiveTab('draw')}
                className="flex flex-col items-center gap-3 p-6 bg-accent text-accent-foreground rounded-[2.5rem] shadow-playful btn-bouncy border-b-8 border-green-600/20"
              >
                <div className="bg-white/30 p-4 rounded-3xl">
                  <Pencil className="w-10 h-10" />
                </div>
                <span className="font-black text-xl">Çiz</span>
              </button>

              <button
                onClick={() => setActiveTab('games')}
                className="flex flex-col items-center gap-3 p-6 bg-secondary text-secondary-foreground rounded-[2.5rem] shadow-playful btn-bouncy border-b-8 border-yellow-600/20"
              >
                <div className="bg-white/30 p-4 rounded-3xl">
                  <Gamepad2 className="w-10 h-10" />
                </div>
                <span className="font-black text-xl">Oyna</span>
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingBubbles />
      <main className="relative z-10 pb-32">{renderContent()}</main>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
