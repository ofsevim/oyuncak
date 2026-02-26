'use client';

import { useEffect, useState } from 'react';
import { Search, Brain, Hash, Palette, Wind, Piano, BookA, Puzzle, Calculator, Gamepad2, Rat, Shapes, ArrowLeft, Flame, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OddOneOutGame from './OddOneOutGame';
import MemoryFlipGame from './MemoryFlipGame';
import WhackAMoleGame from './WhackAMoleGame';
import CountingGame from './CountingGame';
import ColoringBookGame from './ColoringBookGame';
import BalloonPopGame from './BalloonPopGame';
import PuzzleGame from './PuzzleGame';
import PianoGame from './PianoGame';
import AlphabetGame from './AlphabetGame';
import MathGame from './MathGame';
import RunnerGame from './RunnerGame';
import TetrisGame from './TetrisGame';
import SnakeGame from './SnakeGame';
import Game2048 from './Game2048';

type GameType = 'menu' | 'oddone' | 'memory' | 'whack' | 'counting' | 'coloring' | 'balloons' | 'puzzle' | 'piano' | 'alphabet' | 'math' | 'runner' | 'tetris' | 'snake' | '2048';

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
  {
    id: 'balloons',
    title: 'Balon Patlat',
    emoji: '🎈',
    icon: Wind,
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Doğru renkli balonları yakala!',
    category: ['action'],
    badge: 'Popüler',
  },
  {
    id: 'whack',
    title: 'Köstebek Yakala',
    emoji: '🐹',
    icon: Rat,
    gradient: 'from-orange-500 to-amber-600',
    description: 'Hızlı ol, köstebekleri yakala!',
    category: ['action'],
    badge: 'Eğlenceli',
  },
  {
    id: 'runner',
    title: 'Koşucu',
    emoji: '🏃',
    icon: Gamepad2,
    gradient: 'from-emerald-500 to-green-600',
    description: 'Engelleri atla, yıldız topla!',
    category: ['action'],
  },
  {
    id: 'tetris',
    title: 'Tetris',
    emoji: '🧱',
    icon: Shapes,
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Blokları yerleştir, puanları yakala!',
    category: ['action', 'brain'],
    badge: 'Klasik',
  },
  {
    id: 'oddone',
    title: 'Farklı Olanı Bul',
    emoji: '🔍',
    icon: Search,
    gradient: 'from-rose-500 to-pink-600',
    description: 'Gruba uymayan resmi bul!',
    category: ['brain'],
  },
  {
    id: 'memory',
    title: 'Hafıza Oyunu',
    emoji: '🃏',
    icon: Brain,
    gradient: 'from-violet-500 to-purple-600',
    description: 'Kartları çevir, eşleri bul!',
    category: ['brain'],
    badge: 'Beyin',
  },
  {
    id: 'puzzle',
    title: 'Puzzle',
    emoji: '🧩',
    icon: Puzzle,
    gradient: 'from-teal-500 to-cyan-600',
    description: 'Resim parçalarını birleştir!',
    category: ['brain'],
  },
  {
    id: 'coloring',
    title: 'Boyama Kitabı',
    emoji: '🎨',
    icon: Palette,
    gradient: 'from-pink-500 to-rose-600',
    description: 'Resimleri dilediğince boya!',
    category: ['creative'],
  },
  {
    id: 'piano',
    title: 'Piyano',
    emoji: '🎹',
    icon: Piano,
    gradient: 'from-indigo-500 to-violet-600',
    description: 'Melodiler çal, müzik yap!',
    category: ['creative'],
  },
  {
    id: 'counting',
    title: 'Sayma Oyunu',
    emoji: '🔢',
    icon: Hash,
    gradient: 'from-purple-500 to-fuchsia-600',
    description: 'Nesneleri say, rakamı bul!',
    category: ['learn'],
  },
  {
    id: 'alphabet',
    title: 'Harf Öğren',
    emoji: '🔤',
    icon: BookA,
    gradient: 'from-rose-500 to-red-600',
    description: 'A-B-C harflerini öğren!',
    category: ['learn'],
  },
  {
    id: 'math',
    title: 'Matematik',
    emoji: '➕',
    icon: Calculator,
    gradient: 'from-sky-500 to-blue-600',
    description: 'Toplama ve çıkarma işlemleri!',
    category: ['learn'],
  },
  {
    id: 'snake',
    title: 'Yılan Oyunu',
    emoji: '🐍',
    icon: Zap,
    gradient: 'from-lime-500 to-green-600',
    description: 'Yemleri ye, büyü, duvarlara çarpma!',
    category: ['action'],
    badge: 'Klasik',
  },
  {
    id: '2048',
    title: '2048',
    emoji: '🔢',
    icon: Brain,
    gradient: 'from-amber-500 to-orange-600',
    description: 'Kaydır, birleştir, 2048\'e ulaş!',
    category: ['brain'],
    badge: 'Popüler',
  },
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

  // Home'dan "önerilen oyuna" tıklanınca otomatik aç
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("oyuncak.preferredGameId");
      if (raw) setPreferredGameId(JSON.parse(raw));
    } catch {
      setPreferredGameId(null);
    }
  }, []);

  useEffect(() => {
    if (!preferredGameId) return;
    const allowed = games.map(g => g.id);
    if ((allowed as string[]).includes(preferredGameId)) {
      setActiveGame(preferredGameId as GameType);
    }
  }, [preferredGameId]);

  const filteredGames = activeCategory === 'all'
    ? games
    : games.filter(g => g.category.includes(activeCategory));

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
      case 'alphabet': return <AlphabetGame />;
      case 'math': return <MathGame />;
      case 'runner': return <RunnerGame />;
      case 'tetris': return <TetrisGame />;
      case 'snake': return <SnakeGame />;
      case '2048': return <Game2048 />;
      default: return null;
    }
  };

  // Oyun açıkken
  if (activeGame !== 'menu') {
    return (
      <div className="pb-32">
        <motion.button
          onClick={() => setActiveGame('menu')}
          className="mb-4 ml-4 mt-2 px-5 py-2.5 glass-card neon-border text-foreground rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/10 transition-colors"
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
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <span>Oyun <span className="text-gradient">Merkezi</span></span>
        </h2>
        <p className="text-muted-foreground font-medium">
          {games.length} oyun seni bekliyor
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap justify-center">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'glass-card text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Games grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full max-w-5xl">
        <AnimatePresence mode="popLayout">
          {filteredGames.map((game, i) => {
            const Icon = game.icon;
            return (
              <motion.button
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => setActiveGame(game.id)}
                className="game-card group text-left p-4 md:p-5 relative"
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity rounded-2xl`} />

                {/* Badge */}
                {game.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${game.gradient} text-white`}>
                    {game.badge}
                  </span>
                )}

                <div className="relative flex flex-col gap-3">
                  {/* Emoji + icon */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                      {game.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-bold text-foreground truncate">{game.title}</h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground font-medium hidden sm:block">{game.description}</p>
                    </div>
                  </div>

                  {/* Play indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
