'use client';

import { Suspense, lazy, useState } from 'react';
import FloatingBubbles from '@/components/ui/FloatingBubbles';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Home from '@/components/home/Home';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

type Tab = 'home' | 'draw' | 'games' | 'story';

const DrawingCanvas = lazy(() => import('@/components/DrawingCanvas'));
const GamesMenu = lazy(() => import('@/components/games/GamesMenu'));
const StoryTime = lazy(() => import('@/components/StoryTime'));

const Index = () => {
  const [activeTab, setActiveTabRaw] = useState<Tab>('home');
  const [isGameActive, setIsGameActive] = useState(false);
  const [, setPreferredGameId] = useLocalStorageState<string | null>("oyuncak.preferredGameId", null);

  const setActiveTab = (tab: Tab) => {
    setActiveTabRaw(tab);
    setIsGameActive(false); // Reset when tab changes
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'draw':
        return <DrawingCanvas />;
      case 'games':
        return <GamesMenu onActiveGameChange={setIsGameActive} />;
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
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      {/* Mesh gradient ambient */}
      <div className="fixed inset-0 mesh-gradient pointer-events-none" />
      <FloatingBubbles />
      <main className="relative z-10">
        <Suspense
          fallback={
            <div className="min-h-[70vh] grid place-items-center pb-32">
              <LoadingSpinner />
            </div>
          }
        >
          {renderContent()}
        </Suspense>
      </main>
      {!isGameActive && <Navigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};


export default Index;
