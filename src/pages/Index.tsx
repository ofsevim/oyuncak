import { Suspense, lazy } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import FloatingBubbles from '@/components/ui/FloatingBubbles';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Home from '@/components/home/Home';
import PWAInstall from '@/components/PWAInstall';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

type Tab = 'home' | 'draw' | 'games' | 'story';

const DrawingCanvas = lazy(() => import('@/components/DrawingCanvas'));
const GamesMenu = lazy(() => import('@/components/games/GamesMenu'));
const StoryTime = lazy(() => import('@/components/StoryTime'));

const Index = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { gameId } = useParams();
  const [, setPreferredGameId] = useLocalStorageState<string | null>("oyuncak.preferredGameId", null);

  let activeTab: Tab = 'home';
  if (pathname.startsWith('/draw')) activeTab = 'draw';
  else if (pathname.startsWith('/games')) activeTab = 'games';
  else if (pathname.startsWith('/story')) activeTab = 'story';

  const isGameActive = activeTab === 'games' && !!gameId;

  const setActiveTab = (tab: Tab) => {
    if (tab === 'home') navigate('/');
    else navigate(`/${tab}`);
  };

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
            onGoFeaturedGame={(id) => {
              setPreferredGameId(id);
              navigate(`/games/${id}`);
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
      <PWAInstall />
    </div>
  );
};

export default Index;
