'use client';

import { useEffect, useState } from 'react';
import { Search, Brain, Hash, Palette, Wind, Piano, BookA, Puzzle, Calculator, Gamepad2, Rat, Shapes } from 'lucide-react';
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

type GameType = 'menu' | 'oddone' | 'memory' | 'whack' | 'counting' | 'coloring' | 'balloons' | 'puzzle' | 'piano' | 'alphabet' | 'math' | 'runner' | 'tetris';

const GamesMenu = () => {
  const [activeGame, setActiveGame] = useState<GameType>('menu');
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
    const allowed = ['balloons', 'oddone', 'memory', 'whack', 'counting', 'coloring', 'puzzle', 'piano', 'alphabet', 'math', 'runner', 'tetris'] as const;
    if ((allowed as readonly string[]).includes(preferredGameId)) {
      setActiveGame(preferredGameId as GameType);
    }
  }, [preferredGameId]);

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
      id: 'whack' as GameType,
      title: 'Köstebek Yakala',
      emoji: '🐹',
      icon: Rat,
      color: 'bg-orange-400',
      description: 'Hızlı ol, köstebekleri yakala!',
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
    {
      id: 'puzzle' as GameType,
      title: 'Puzzle',
      emoji: '🧩',
      icon: Puzzle,
      color: 'bg-teal-500',
      description: 'Resim parçalarını birleştir!',
    },
    {
      id: 'piano' as GameType,
      title: 'Piyano',
      emoji: '🎹',
      icon: Piano,
      color: 'bg-indigo-500',
      description: 'Melodiler çal, müzik yap!',
    },
    {
      id: 'alphabet' as GameType,
      title: 'Harf Öğren',
      emoji: '🔤',
      icon: BookA,
      color: 'bg-rose-500',
      description: 'A-B-C harflerini öğren!',
    },
    {
      id: 'math' as GameType,
      title: 'Matematik',
      emoji: '➕',
      icon: Calculator,
      color: 'bg-blue-600',
      description: 'Toplama ve çıkarma işlemleri!',
    },
    {
      id: 'runner' as GameType,
      title: 'Koşucu',
      emoji: '🏃',
      icon: Gamepad2,
      color: 'bg-emerald-500',
      description: 'Engelleri atla, yıldız topla!',
    },
    {
      id: 'tetris' as GameType,
      title: 'Tetris',
      emoji: '🧱',
      icon: Shapes,
      color: 'bg-blue-400',
      description: 'Blokları yerleştir, puanları yakala!',
    },
  ];

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
    <div className="flex flex-col items-center gap-6 p-4 pb-32 animate-fade-in">
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
    </div>
  );
};

export default GamesMenu;
