'use client';

import { Suspense, lazy, useMemo, useState } from 'react';
import FloatingBubbles from '@/components/ui/FloatingBubbles';
import Navigation from '@/components/Navigation';
import { AnimatePresence, motion } from 'framer-motion';
import LoadingSpinner from '@/components/LoadingSpinner';
import Home from '@/components/home/Home';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

type Tab = 'home' | 'draw' | 'games' | 'story';

// Heavy modülleri lazy-load ederek ilk açılışı hızlandır
const DrawingCanvas = lazy(() => import('@/components/DrawingCanvas'));
const GamesMenu = lazy(() => import('@/components/games/GamesMenu'));
const StoryTime = lazy(() => import('@/components/StoryTime'));

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [preferredGameId, setPreferredGameId] = useLocalStorageState<string | null>("oyuncak.preferredGameId", null);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'draw':
        return <DrawingCanvas />;
      case 'games':
        return <GamesMenu />;
      case 'story':
        return <StoryTime />;
      default:
        return (
          <Home
            onGoDraw={() => setActiveTab('draw')}
            onGoGames={() => setActiveTab('games')}
            onGoStories={() => setActiveTab('story')}
            onGoFeaturedGame={(gameId) => {
              setPreferredGameId(gameId);
              setActiveTab("games");
            }}
          />
        );
    }
  }, [activeTab, setPreferredGameId]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingBubbles />
      <main className="relative z-10">
        <Suspense
          fallback={
            <div className="min-h-[70vh] grid place-items-center pb-32">
              <LoadingSpinner />
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
