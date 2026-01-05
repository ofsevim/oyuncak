'use client';

import { useState } from 'react';
import FloatingBubbles from '@/components/ui/FloatingBubbles';
import Navigation from '@/components/Navigation';
import DrawingCanvas from '@/components/DrawingCanvas';
import GamesMenu from '@/components/games/GamesMenu';
import StoryTime from '@/components/StoryTime';
import { motion } from 'framer-motion';
import { Pencil, Gamepad2, BookOpen, Sparkles } from 'lucide-react';

type Tab = 'home' | 'draw' | 'games' | 'story';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'draw':
        return <DrawingCanvas />;
      case 'games':
        return <GamesMenu />;
      case 'story':
        return <StoryTime />;
      default:
        return (
          <motion.div className="flex flex-col items-center justify-center gap-8 p-6 text-center min-h-[60vh]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <Sparkles className="w-16 h-16 text-secondary" />
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground">Merhaba Küçük Dahi! 👋</h1>
            <p className="text-xl text-muted-foreground max-w-md">Çizim yap, oyunlar oyna ve eğlenerek öğren!</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button onClick={() => setActiveTab('draw')} className="flex flex-col items-center gap-2 p-6 bg-accent text-accent-foreground rounded-3xl shadow-playful btn-bouncy">
                <Pencil className="w-10 h-10" /><span className="font-bold">Çiz</span>
              </button>
              <button onClick={() => setActiveTab('games')} className="flex flex-col items-center gap-2 p-6 bg-secondary text-secondary-foreground rounded-3xl shadow-playful btn-bouncy">
                <Gamepad2 className="w-10 h-10" /><span className="font-bold">Oyna</span>
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
