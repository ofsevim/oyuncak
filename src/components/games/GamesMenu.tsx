'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Brain, Hash, Palette, Wind, Piano, Puzzle, Calculator, Gamepad2, Rat, Shapes, ArrowLeft, Flame, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OddOneOutGame from './OddOneOutGame';
import MemoryFlipGame from './MemoryFlipGame';
import WhackAMoleGame from './WhackAMoleGame';
import CountingGame from './CountingGame';
import ColoringBookGame from './ColoringBookGame';
import BalloonPopGame from './BalloonPopGame';
import PuzzleGame from './PuzzleGame';
import PianoGame from './PianoGame';
import MathGame from './MathGame';
import RunnerGame from './RunnerGame';
import TetrisGame from './TetrisGame';
import SnakeGame from './SnakeGame';
import Game2048 from './Game2048';

type GameType = 'menu' | 'oddone' | 'memory' | 'whack' | 'counting' | 'coloring' | 'balloons' | 'puzzle' | 'piano' | 'math' | 'runner' | 'tetris' | 'snake' | '2048';
type GameCategory = 'all' | 'action' | 'brain' | 'creative' | 'learn';

interface GameDef {
  id: GameType;
  title: string;
  emoji: string;
  icon: typeof Wind;
  gradient: string;
  description: string;
  category: GameCategory[];
  badge?: string;
}

const games: GameDef[] = [
  { id: 'balloons', title: 'Balon Patlat', emoji: '🎈', icon: Wind, gradient: 'from-cyan-500 to-blue-600', description: 'Doğru renkli balonları yakala!', category: ['action'], badge: 'Popüler' },
  { id: 'whack', title: 'Köstebek Yakala', emoji: '🐹', icon: Rat, gradient: 'from-orange-500 to-amber-600', description: 'Hızlı ol, köstebekleri yakala!', category: ['action'], badge: 'Eğlenceli' },
  { id: 'runner', title: 'Koşucu', emoji: '🏃', icon: Gamepad2, gradient: 'from-emerald-500 to-green-600', description: 'Engelleri atla, yıldız topla!', category: ['action'] },
  { id: 'tetris', title: 'Tetris', emoji: '🧱', icon: Shapes, gradient: 'from-blue-500 to-indigo-600', description: 'Blokları yerleştir, puanları yakala!', category: ['action', 'brain'], badge: 'Klasik' },
  { id: 'oddone', title: 'Farklı Olanı Bul', emoji: '🔍', icon: Search, gradient: 'from-rose-500 to-pink-600', description: 'Gruba uymayan resmi bul!', category: ['brain'] },
  { id: 'memory', title: 'Hafıza Oyunu', emoji: '🃏', icon: Brain, gradient: 'from-violet-500 to-purple-600', description: 'Kartları çevir, eşleri bul!', category: ['brain'], badge: 'Beyin' },
  { id: 'puzzle', title: 'Puzzle', emoji: '🧩', icon: Puzzle, gradient: 'from-teal-500 to-cyan-600', description: 'Resim parçalarını birleştir!', category: ['brain'] },
  { id: 'coloring', title: 'Boyama Kitabı', emoji: '🎨', icon: Palette, gradient: 'from-pink-500 to-rose-600', description: 'Resimleri dilediğince boya!', category: ['creative'] },
  { id: 'piano', title: 'Piyano', emoji: '🎹', icon: Piano, gradient: 'from-indigo-500 to-violet-600', description: 'Melodiler çal, müzik yap!', category: ['creative'] },
  { id: 'counting', title: 'Sayma Oyunu', emoji: '🔢', icon: Hash, gradient: 'from-purple-500 to-fuchsia-600', description: 'Nesneleri say, rakamı bul!', category: ['learn'] },
  { id: 'math', title: 'Matematik', emoji: '➕', icon: Calculator, gradient: 'from-sky-500 to-blue-600', description: 'Toplama ve çıkarma işlemleri!', category: ['learn'] },
  { id: 'snake', title: 'Yılan Oyunu', emoji: '🐍', icon: Zap, gradient: 'from-lime-500 to-green-600', description: 'Yemleri ye, büyü, duvarlara çarpma!', category: ['action'], badge: 'Klasik' },
  { id: '2048', title: '2048', emoji: '🔢', icon: Brain, gradient: 'from-amber-500 to-orange-600', description: "Kaydır, birleştir, 2048'e ulaş!", category: ['brain'], badge: 'Popüler' },
];

const categories = [
  { id: 'all' as GameCategory, label: 'Tümü', icon: Gamepad2 },
  { id: 'action' as GameCategory, label: 'Aksiyon', icon: Flame },
  { id: 'brain' as GameCategory, label: 'Zeka', icon: Brain },
  { id: 'creative' as GameCategory, label: 'Yaratıcı', icon: Star },
  { id: 'learn' as GameCategory, label: 'Öğren', icon: Zap },
];

const GamesMenu = () => {
  const [activeGame, setActiveGame] = useState<GameType>('menu');
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [preferredGameId, setPreferredGameId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Spotlight effect on grid
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>('.game-card');
    cards?.forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("oyuncak.preferredGameId");
      if (raw) setPreferredGameId(JSON.parse(raw));
    } catch { setPreferredGameId(null); }
  }, []);

  useEffect(() => {
    if (!preferredGameId) return;
    const allowed = games.map(g => g.id);
    if ((allowed as string[]).includes(preferredGameId)) {
      setActiveGame(preferredGameId as GameType);
    }
  }, [preferredGameId]);

  const filteredGames = activeCategory === 'all' ? games : games.filter(g => g.category.includes(activeCategory));

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'oddone': return <OddOneOutGame />;
      case 'memory': return <MemoryFlipGame />;
      case 'whack': return <WhackAMoleGame />;
      case 'counting': return <CountingGame />;
      case 'coloring': return <ColoringBookGame />;
      case 'balloons': return <BalloonPopGame />;
      case 'puzzle': return <PuzzleGame />;
      case 'piano': return <PianoGame />;
      case 'math': return <MathGame />;
      case 'runner': return <RunnerGame />;
      case 'tetris': return <TetrisGame />;
      case 'snake': return <SnakeGame />;
      case '2048': return <Game2048 />;
      default: return null;
    }
  };

  if (activeGame !== 'menu') {
    return (
      <div className="pb-32">
        <motion.button
          onClick={() => setActiveGame('menu')}
          className="mb-4 ml-4 mt-2 px-5 py-2.5 glass-card text-foreground rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/[0.08] hover:border-primary/20 transition-all"
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" /> Oyunlara Dön
        </motion.button>
        {renderActiveGame()}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4 pb-32 animate-fade-in">
      {/* Header */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <h2 className="text-3xl md:text-5xl font-black text-foreground flex items-center justify-center gap-3 tracking-tight">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
            <Gamepad2 className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          </div>
          <span>Oyun <span className="text-gradient">Merkezi</span></span>
        </h2>
        <p className="text-muted-foreground font-medium text-sm md:text-base">
          {games.length} oyun seni bekliyor
        </p>
      </motion.div>

      {/* Category filter */}
      <motion.div
        className="flex gap-2 flex-wrap justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'text-primary-foreground'
                  : 'glass-card text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="cat-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                    boxShadow: '0 4px 20px hsl(var(--primary) / 0.3)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{cat.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Games grid with spotlight */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full max-w-5xl"
        onMouseMove={handleMouseMove}
      >
        <AnimatePresence mode="popLayout">
          {filteredGames.map((game, i) => {
            const Icon = game.icon;
            return (
              <motion.button
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04, duration: 0.35, type: "spring", stiffness: 200, damping: 24 }}
                onClick={() => setActiveGame(game.id)}
                className="game-card group text-left p-4 md:p-5 relative"
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500 rounded-2xl`} />

                {/* Badge */}
                {game.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r ${game.gradient} text-white shadow-lg`}>
                    {game.badge}
                  </span>
                )}

                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl md:text-3xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      {game.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-bold text-foreground truncate">{game.title}</h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground/70 font-medium hidden sm:block">{game.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60 group-hover:text-primary/70 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-medium">Oyna →</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GamesMenu;
