import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Brain, Hash, Palette, Wind, Piano, Calculator, Gamepad2, Rat, ArrowLeft, Flame, Star, Zap, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isMuted, toggleMute } from '@/utils/soundEffects';
import ErrorBoundary from '@/components/ErrorBoundary';

const OddOneOutGame = lazy(() => import('./OddOneOutGame'));
const MemoryFlipGame = lazy(() => import('./MemoryFlipGame'));
const WhackAMoleGame = lazy(() => import('./WhackAMoleGame'));
const BattleCityGame = lazy(() => import('./BattleCityGame'));
const CountingGame = lazy(() => import('./CountingGame'));
const ColoringBookGame = lazy(() => import('./ColoringBookGame'));
const BalloonPopGame = lazy(() => import('./BalloonPopGame'));
const PianoGame = lazy(() => import('./PianoGame'));
const MathGame = lazy(() => import('./MathGame'));
const RunnerGame = lazy(() => import('./RunnerGame'));
const TetrisGame = lazy(() => import('./TetrisGame'));
const SnakeGame = lazy(() => import('./SnakeGame'));
const Game2048 = lazy(() => import('./Game2048'));
const BasketballGame = lazy(() => import('./BasketballGame'));
const ShapeMatchGame = lazy(() => import('./ShapeMatchGame'));
const WordCatchGame = lazy(() => import('./WordCatchGame'));
const SimonSaysGame = lazy(() => import('./SimonSaysGame'));
const CodingTurtleGame = lazy(() => import('./CodingTurtleGame'));
const ComparisonGame = lazy(() => import('./ComparisonGame'));

type GameType = 'menu' | 'odd-one-out' | 'memory' | 'whack' | 'counting' | 'coloring' | 'balloon' | 'piano' | 'math' | 'runner' | 'tetris' | 'snake' | '2048' | 'battle-city' | 'basketball' | 'shapematch' | 'wordcatch' | 'simonsays' | 'codingturtle' | 'comparison';
type GameCategory = 'all' | 'action' | 'brain' | 'creative' | 'learn';

interface GameDef {
  id: GameType;
  title: string;
  emoji: string;
  icon: typeof Wind;
  color: string;     // solid hsl for icon bg
  colorSoft: string; // low-opacity for hover
  description: string;
  category: GameCategory[];
  badge?: string;
  badgeColor?: string;
}

const games: GameDef[] = [
  { id: 'balloon', title: 'Balon Patlat', emoji: '🎈', icon: Wind, color: 'hsl(198 85% 50%)', colorSoft: 'hsl(198 85% 50% / 0.1)', description: 'Doğru renkli balonları yakala!', category: ['action'], badge: 'Popüler', badgeColor: 'hsl(198 85% 50%)' },
  { id: 'basketball', title: 'Basket At', emoji: '🏀', icon: Gamepad2, color: 'hsl(28 90% 55%)', colorSoft: 'hsl(28 90% 55% / 0.1)', description: 'Çek bırak — topu potaya sok!', category: ['action'], badge: 'Yeni', badgeColor: 'hsl(158 65% 48%)' },
  { id: 'battle-city', title: 'Tank 1990', emoji: '🕹️', icon: Gamepad2, color: 'hsl(220 18% 45%)', colorSoft: 'hsl(220 18% 45% / 0.1)', description: 'Atari salonlarının efsanesi!', category: ['action'], badge: 'Retro', badgeColor: 'hsl(220 18% 55%)' },
  { id: 'whack', title: 'Köstebek Yakala', emoji: '🐹', icon: Rat, color: 'hsl(28 90% 55%)', colorSoft: 'hsl(28 90% 55% / 0.1)', description: 'Hızlı ol, köstebekleri yakala!', category: ['action'], badge: 'Eğlenceli', badgeColor: 'hsl(28 90% 55%)' },
  { id: 'runner', title: 'Koşucu', emoji: '🏃', icon: Gamepad2, color: 'hsl(152 65% 45%)', colorSoft: 'hsl(152 65% 45% / 0.1)', description: 'Engelleri atla, yıldız topla!', category: ['action'] },
  { id: 'tetris', title: 'Tetris', emoji: '🧱', icon: Zap, color: 'hsl(220 85% 58%)', colorSoft: 'hsl(220 85% 58% / 0.1)', description: 'Blokları yerleştir, puanları yakala!', category: ['action', 'brain'], badge: 'Klasik', badgeColor: 'hsl(220 85% 58%)' },
  { id: 'snake', title: 'Yılan Oyunu', emoji: '🐍', icon: Zap, color: 'hsl(140 60% 45%)', colorSoft: 'hsl(140 60% 45% / 0.1)', description: 'Yemleri ye, büyü, duvarlara çarpma!', category: ['action'], badge: 'Klasik', badgeColor: 'hsl(140 60% 45%)' },
  { id: 'odd-one-out', title: 'Farklı Olanı Bul', emoji: '🔍', icon: Search, color: 'hsl(338 80% 58%)', colorSoft: 'hsl(338 80% 58% / 0.1)', description: 'Gruba uymayan resmi bul!', category: ['brain'] },
  { id: 'shapematch', title: 'Şekil Eşleştirme', emoji: '🧩', icon: Brain, color: 'hsl(330 80% 60%)', colorSoft: 'hsl(330 80% 60% / 0.1)', description: 'Gölgelerin sahiplerini bul!', category: ['brain'] },
  { id: 'simonsays', title: 'Müzikal Hafıza', emoji: '🧠', icon: Brain, color: 'hsl(220 70% 60%)', colorSoft: 'hsl(220 70% 60% / 0.1)', description: 'Renk ve ses kalıplarını ezberle!', category: ['brain'] },
  { id: 'memory', title: 'Hafıza Oyunu', emoji: '🃏', icon: Brain, color: 'hsl(258 88% 62%)', colorSoft: 'hsl(258 88% 62% / 0.1)', description: 'Kartları çevir, eşleri bul!', category: ['brain'], badge: 'Beyin', badgeColor: 'hsl(258 88% 62%)' },
  { id: '2048', title: '2048', emoji: '🔢', icon: Brain, color: 'hsl(38 90% 55%)', colorSoft: 'hsl(38 90% 55% / 0.1)', description: "Kaydır, birleştir, 2048'e ulaş!", category: ['brain'], badge: 'Popüler', badgeColor: 'hsl(38 90% 55%)' },
  { id: 'coloring', title: 'Boyama Kitabı', emoji: '🎨', icon: Palette, color: 'hsl(318 75% 58%)', colorSoft: 'hsl(318 75% 58% / 0.1)', description: 'Resimleri dilediğince boya!', category: ['creative'] },
  { id: 'piano', title: 'Piyano', emoji: '🎹', icon: Piano, color: 'hsl(255 75% 62%)', colorSoft: 'hsl(255 75% 62% / 0.1)', description: 'Melodiler çal, müzik yap!', category: ['creative'] },
  { id: 'counting', title: 'Sayma Oyunu', emoji: '🔢', icon: Hash, color: 'hsl(278 75% 60%)', colorSoft: 'hsl(278 75% 60% / 0.1)', description: 'Nesneleri say, rakamı bul!', category: ['learn'] },
  { id: 'math', title: 'Matematik', emoji: '➕', icon: Calculator, color: 'hsl(200 80% 52%)', colorSoft: 'hsl(200 80% 52% / 0.1)', description: 'Toplama ve çıkarma işlemleri!', category: ['learn'] },
  { id: 'wordcatch', title: 'Kelime Avı', emoji: '🎈', icon: Hash, color: 'hsl(190 80% 60%)', colorSoft: 'hsl(190 80% 60% / 0.1)', description: 'Balonlardaki harflerle kelimeyi tamamla!', category: ['learn'] },
  { id: 'codingturtle', title: 'Tavşan Kodlama', emoji: '🐇', icon: Brain, color: 'hsl(140 70% 50%)', colorSoft: 'hsl(140 70% 50% / 0.1)', description: 'Tavşanı komutlarla havuca ulaştır!', category: ['learn'] },
  { id: 'comparison', title: 'Karşılaştırma', emoji: '⚖️', icon: Calculator, color: 'hsl(30 80% 60%)', colorSoft: 'hsl(30 80% 60% / 0.1)', description: 'Hangisi daha büyük veya daha ağır?', category: ['learn'] },
];

const CATEGORIES: { id: GameCategory; label: string; icon: typeof Flame }[] = [
  { id: 'all', label: 'Tümü', icon: Gamepad2 },
  { id: 'action', label: 'Aksiyon', icon: Flame },
  { id: 'brain', label: 'Zeka', icon: Brain },
  { id: 'creative', label: 'Yaratıcı', icon: Star },
  { id: 'learn', label: 'Öğren', icon: Zap },
];

const GamesMenu = () => {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const activeGame = gameId || 'menu';

  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [muted, setMutedState] = useState(isMuted());
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>('.game-card');
    cards?.forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  }, []);

  const filteredGames = activeCategory === 'all' ? games : games.filter(g => g.category.includes(activeCategory));

  const renderActiveGame = () => {
    // Provide a generic callback for games that want to handle active state
    // but we use routing now, so they can navigate away if needed.
    const onActiveGameChange = (active: boolean) => {
      // noop
    };

    switch (activeGame) {
      case 'basketball': return <BasketballGame />;
      case 'odd-one-out': return <OddOneOutGame />;
      case 'memory': return <MemoryFlipGame onActiveGameChange={onActiveGameChange} />;
      case 'whack': return <WhackAMoleGame />;
      case 'battle-city': return <BattleCityGame onActiveGameChange={onActiveGameChange} />;
      case 'counting': return <CountingGame />;
      case 'coloring': return <ColoringBookGame />;
      case 'balloon': return <BalloonPopGame />;
      case 'piano': return <PianoGame />;
      case 'math': return <MathGame />;
      case 'runner': return <RunnerGame />;
      case 'tetris': return <TetrisGame />;
      case 'snake': return <SnakeGame />;
      case '2048': return <Game2048 />;
      case 'shapematch': return <ShapeMatchGame />;
      case 'wordcatch': return <WordCatchGame />;
      case 'simonsays': return <SimonSaysGame />;
      case 'codingturtle': return <CodingTurtleGame />;
      case 'comparison': return <ComparisonGame />;
      default: return null;
    }
  };

  if (activeGame !== 'menu') {
    return (
      <div className="pb-12 md:pb-32 w-full flex flex-col items-center">
        <motion.button
          onClick={() => navigate('/games')}
          className="mb-4 ml-4 mt-3 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 self-start text-sm transition-all"
          style={{
            background: 'hsl(var(--muted) / 0.5)',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--muted-foreground))',
          }}
          whileHover={{ x: -3, color: 'hsl(var(--foreground))' }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" /> Oyunlara Dön
        </motion.button>
        <Suspense fallback={
          <div className="flex items-center justify-center py-20 w-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Yükleniyor…</p>
            </div>
          </div>
        }>
          <ErrorBoundary>
            {renderActiveGame()}
          </ErrorBoundary>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4 pb-36 animate-fade-in">
      {/* Header */}
      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      >
        <div className="flex items-center justify-center gap-3 mb-1">
          <div
            className="p-2 rounded-xl"
            style={{ background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.2)' }}
          >
            <Gamepad2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Oyun <span className="text-gradient">Merkezi</span>
          </h2>
          <button
            onClick={() => { toggleMute(); setMutedState(isMuted()); }}
            className="p-2 rounded-xl transition-all hover:scale-110"
            style={{ background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))' }}
            title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {muted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{games.length}</span> oyun seni bekliyor
        </p>
      </motion.div>

      {/* Category tabs */}
      <motion.div
        className="flex gap-1.5 flex-wrap justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted) / 0.5)',
                color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                border: isActive ? '1px solid hsl(var(--primary) / 0.4)' : '1px solid hsl(var(--border))',
                boxShadow: isActive ? '0 4px 16px hsl(var(--primary) / 0.3)' : 'none',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </motion.div>

      {/* Games grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl"
        onMouseMove={handleMouseMove}
      >
        <AnimatePresence mode="popLayout">
          {filteredGames.map((game, i) => {
            const Icon = game.icon;
            return (
              <motion.button
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.035, duration: 0.3, type: 'spring', stiffness: 220, damping: 26 }}
                onClick={() => navigate(`/games/${game.id}`)}
                className="game-card group text-left p-4 md:p-5"
              >
                {/* Badge */}
                {game.badge && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ background: game.badgeColor ?? game.color, opacity: 0.9 }}
                  >
                    {game.badge}
                  </span>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {/* Icon container */}
                    <div
                      className="w-12 h-12 md:w-13 md:h-13 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: game.colorSoft, border: `1px solid ${game.color}30` }}
                    >
                      {game.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-bold text-foreground truncate">
                        {game.title}
                      </h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground font-medium mt-0.5 hidden sm:block leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3" style={{ color: game.color }} />
                    <span className="text-xs font-semibold" style={{ color: game.color }}>
                      Oyna →
                    </span>
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
