'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shapes, Search, Brain } from 'lucide-react';
import ShapeMatcherGame from './ShapeMatcherGame';
import OddOneOutGame from './OddOneOutGame';
import MemoryFlipGame from './MemoryFlipGame';
import AnimalSoundsGame from './AnimalSoundsGame';
import CountingGame from './CountingGame';
import ColoringBookGame from './ColoringBookGame';
import BalloonPopGame from './BalloonPopGame';
import { MousePointer2, Music, Hash, Palette, Wind } from 'lucide-react';

type GameType = 'menu' | 'shapes' | 'oddone' | 'memory' | 'sounds' | 'counting' | 'coloring' | 'balloons';

const GamesMenu = () => {
  const [activeGame, setActiveGame] = useState<GameType>('menu');

  const games = [
    {
      id: 'balloons' as GameType,
      title: 'Balon Patlat',
      emoji: '🎈',
      icon: Wind,
      color: 'bg-primary',
      description: 'Doğru renkli balonları yakala!',
    },
    {
      id: 'shapes' as GameType,
      title: 'Şekil Eşleştirme',
      emoji: '🔷',
      icon: Shapes,
      color: 'bg-accent',
      description: 'Şekilleri gölgelerine eşleştir!',
    },
    {
      id: 'oddone' as GameType,
      title: 'Farklı Olanı Bul',
      emoji: '🔍',
      icon: Search,
      color: 'bg-destructive/80',
      description: 'Gruba uymayan resmi bul!',
    },
    {
      id: 'memory' as GameType,
      title: 'Hafıza Oyunu',
      emoji: '🃏',
      icon: Brain,
      color: 'bg-secondary',
      description: 'Kartları çevir, eşleri bul!',
    },
    {
      id: 'sounds' as GameType,
      title: 'Hayvan Sesleri',
      emoji: '🐱',
      icon: Music,
      color: 'bg-orange-400',
      description: 'Hayvanların seslerini dinle!',
    },
    {
      id: 'counting' as GameType,
      title: 'Sayma Oyunu',
      emoji: '🔢',
      icon: Hash,
      color: 'bg-purple-500',
      description: 'Nesneleri say, rakamı bul!',
    },
    {
      id: 'coloring' as GameType,
      title: 'Boyama Kitabı',
      emoji: '🎨',
      icon: Palette,
      color: 'bg-pink-400',
      description: 'Resimleri dilediğince boya!',
    },
  ];

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'shapes': return <ShapeMatcherGame />;
      case 'oddone': return <OddOneOutGame />;
      case 'memory': return <MemoryFlipGame />;
      case 'sounds': return <AnimalSoundsGame />;
      case 'counting': return <CountingGame />;
      case 'coloring': return <ColoringBookGame />;
      case 'balloons': return <BalloonPopGame />;
      default: return null;
    }
  };

  if (activeGame !== 'menu') {
    return (
      <div className="pb-32">
        <button
          onClick={() => setActiveGame('menu')}
          className="mb-4 ml-4 px-6 py-3 bg-muted text-muted-foreground rounded-full font-bold btn-bouncy flex items-center gap-2"
        >
          ← Oyunlara Dön
        </button>
        {renderActiveGame()}
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-4 pb-32"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
        🎮 Oyunlar
      </h2>

      <p className="text-muted-foreground text-center font-semibold">
        Bir oyun seç ve eğlenmeye başla!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className={`${game.color} p-6 rounded-3xl shadow-playful text-left transition-all duration-200 hover:scale-105 active:scale-95 group`}
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl group-hover:animate-bounce">{game.emoji}</span>
                <div>
                  <h3 className="text-xl font-extrabold text-white">{game.title}</h3>
                  <p className="text-white/90 font-medium">{game.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default GamesMenu;
