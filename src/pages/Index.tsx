'use client';

import { Suspense, lazy, useState } from 'react';
import FloatingBubbles from '@/components/ui/FloatingBubbles';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Home from '@/components/home/Home';
import ThemeToggle from '@/components/ThemeToggle';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

type Tab = 'home' | 'draw' | 'games' | 'story';

// Heavy modülleri lazy-load ederek ilk açılışı hızlandır
const DrawingCanvas = lazy(() => import('@/components/DrawingCanvas'));
const GamesMenu = lazy(() => import('@/components/games/GamesMenu'));
const StoryTime = lazy(() => import('@/components/StoryTime'));

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [, setPreferredGameId] = useLocalStorageState<string | null>("oyuncak.preferredGameId", null);


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
      <FloatingBubbles />
      <ThemeToggle />
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
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;

