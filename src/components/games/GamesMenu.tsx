'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shapes, Search, Brain } from 'lucide-react';
import ShapeMatcherGame from './ShapeMatcherGame';
import OddOneOutGame from './OddOneOutGame';
import MemoryFlipGame from './MemoryFlipGame';

type GameType = 'menu' | 'shapes' | 'oddone' | 'memory';

const GamesMenu = () => {
  const [activeGame, setActiveGame] = useState<GameType>('menu');

  const games = [
    {
      id: 'shapes' as GameType,
      title: 'Şekil Eşleştirme',
      emoji: '🔷',
      icon: Shapes,
      color: 'bg-primary',
      description: 'Şekilleri gölgelerine eşleştir!',
    },
    {
      id: 'oddone' as GameType,
      title: 'Farklı Olanı Bul',
      emoji: '🔍',
      icon: Search,
      color: 'bg-accent',
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
  ];

  if (activeGame === 'shapes') {
    return (
      <div className="pb-32">
        <button
          onClick={() => setActiveGame('menu')}
          className="mb-4 ml-4 px-4 py-2 bg-muted text-muted-foreground rounded-full font-bold btn-bouncy"
        >
          ← Oyunlara Dön
        </button>
        <ShapeMatcherGame />
      </div>
    );
  }

  if (activeGame === 'oddone') {
    return (
      <div className="pb-32">
        <button
          onClick={() => setActiveGame('menu')}
          className="mb-4 ml-4 px-4 py-2 bg-muted text-muted-foreground rounded-full font-bold btn-bouncy"
        >
          ← Oyunlara Dön
        </button>
        <OddOneOutGame />
      </div>
    );
  }

  if (activeGame === 'memory') {
    return (
      <div className="pb-32">
        <button
          onClick={() => setActiveGame('menu')}
          className="mb-4 ml-4 px-4 py-2 bg-muted text-muted-foreground rounded-full font-bold btn-bouncy"
        >
          ← Oyunlara Dön
        </button>
        <MemoryFlipGame />
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

      <div className="grid gap-4 w-full max-w-md">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className={`${game.color} p-6 rounded-3xl shadow-playful text-left transition-all duration-200 hover:scale-105 active:scale-95`}
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">{game.emoji}</span>
                <div>
                  <h3 className="text-xl font-bold text-white">{game.title}</h3>
                  <p className="text-white/80 font-medium">{game.description}</p>
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
