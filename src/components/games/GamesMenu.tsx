import { forwardRef, lazy, Suspense, useEffect, useState, memo, type ComponentType, type LazyExoticComponent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Brain, Gamepad2, ArrowLeft, Flame, Star, Zap, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isMuted, setSoundProfile, toggleMute } from '@/utils/soundEffects';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotFound from '@/pages/NotFound';
import { GAME_CATALOG, type GameDefinition, type GameCategory } from '@/data/gameCatalog';
import { useGameLibrary } from '@/hooks/useGameLibrary';
import GameControls from '@/components/GameControls';
import { isGameRouteId, type GameRouteId } from '@/constants/gameIds';

const modules = import.meta.glob('./*.tsx');
const gameComponents = Object.fromEntries(GAME_CATALOG.map((game) => [
  game.id, lazy(modules['./' + game.component + '.tsx'] as () => Promise<{ default: ComponentType }>),
])) as Record<GameRouteId, LazyExoticComponent<ComponentType>>;
type GameType = 'menu' | GameRouteId;
type GameDef = GameDefinition;
const games = GAME_CATALOG;


const CATEGORIES: { id: GameCategory; label: string; icon: typeof Flame }[] = [
  { id: 'all', label: 'Tümü', icon: Gamepad2 },
  { id: 'action', label: 'Aksiyon', icon: Flame },
  { id: 'brain', label: 'Zeka', icon: Brain },
  { id: 'creative', label: 'Yaratıcı', icon: Star },
  { id: 'learn', label: 'Öğren', icon: Zap },
];

interface GameCardProps {
  game: GameDef;
  index: number;
  onClick: () => void;
}

const GameCard = memo(forwardRef<HTMLButtonElement, GameCardProps>(({ game, index, onClick }, ref) => {
  const Icon = Gamepad2;
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.035, duration: 0.3, type: 'spring', stiffness: 220, damping: 26 }}
      onClick={onClick}
      className="game-card group text-left p-4 md:p-5 relative w-full"
    >
      {/* Badge */}
      {game.badge && (
        <span
          className="absolute top-3 right-3 hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ background: game.badgeColor ?? game.color, opacity: 0.9 }}
        >
          {game.badge}
        </span>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Icon container */}
          <div
            className="w-12 h-12 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: game.colorSoft, border: `1px solid ${game.color.replace(')', ' / 0.25)')}` }}
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

        <p className="text-xs text-muted-foreground">{game.minAge}+ yaş · {game.duration} · {game.difficulty}</p>
        <p className="text-xs text-muted-foreground">{game.skill}</p>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color: game.color }} />
          <span className="text-xs font-semibold" style={{ color: game.color }}>
            Oyna →
          </span>
        </div>
      </div>
    </motion.button>
  );
}));

GameCard.displayName = 'GameCard';

const GamesMenu = () => {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const activeGame: GameType = gameId && isGameRouteId(gameId) ? gameId : 'menu';
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const activeCategory = CATEGORIES.find((category) => category.id === categoryParam)?.id ?? 'all';
  const { favorites, toggleFavorite, remember } = useGameLibrary();
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [age, setAge] = useState('all');
  useEffect(() => { if (activeGame !== 'menu') remember(activeGame); }, [activeGame, remember]);

  useEffect(() => {
    setSoundProfile(activeGame === 'menu' ? undefined : activeGame);
    return () => setSoundProfile(undefined);
  }, [activeGame]);

  const [muted, setMutedState] = useState(isMuted());
  useEffect(() => {
    const updateMute = () => setMutedState(isMuted());
    window.addEventListener('oyuncak:mute-changed', updateMute);
    return () => window.removeEventListener('oyuncak:mute-changed', updateMute);
  }, []);

  const filteredGames = games.filter((game) =>
    (activeCategory === 'all' || game.category.some((category) => category === activeCategory)) &&
    (!onlyFavorites || favorites.includes(game.id)) &&
    (age === 'all' || game.minAge <= Number(age)));

  const ActiveGame = activeGame === 'menu' ? null : gameComponents[activeGame];
  if (gameId && !isGameRouteId(gameId)) return <NotFound />;

  if (activeGame !== 'menu') {
    return (
      <div className="pb-12 md:pb-32 w-full flex flex-col items-center relative">
        <GameControls />
        {/* Runner kendi geri butonunu yönetir, çakışma olmasın */}
        {activeGame !== 'runner' && (
          <div className="w-full px-4 pt-4 pb-3 md:pt-5 md:pb-4">
            <div className="mx-auto flex w-full max-w-2xl justify-start">
            <motion.button
              onClick={() => navigate('/games')}
              className="px-4 py-2.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 text-xs transition-all shadow-xl"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                minHeight: '44px',
              }}
              whileHover={{ x: -2, background: 'rgba(0, 0, 0, 0.72)', scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <ArrowLeft className="w-4 h-4" /> Oyunlara Dön
            </motion.button>
            </div>
          </div>
        )}
        <div className="w-full">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20 w-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Yükleniyor…</p>
              </div>
            </div>
          }>
            <ErrorBoundary key={activeGame}>
              {ActiveGame && <ActiveGame />}
            </ErrorBoundary>
          </Suspense>
        </div>
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
            type="button"
            onClick={() => { toggleMute(); setMutedState(isMuted()); }}
            className="p-2 rounded-xl transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))' }}
            aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
            aria-pressed={muted}
            title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {muted ? <VolumeX className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> : <Volume2 className="w-5 h-5 text-primary" aria-hidden="true" />}
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
              onClick={() => setSearchParams(cat.id === 'all' ? {} : { category: cat.id })}
              aria-pressed={isActive}
              className="relative flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
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
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <label className="flex items-center gap-2">Yaşa göre
          <select aria-label="Yaşa göre oyunları filtrele" value={age} onChange={(event) => setAge(event.target.value)} className="rounded-xl bg-card border border-border p-3">
            <option value="all">Tüm yaşlar</option><option value="4">4 yaş</option><option value="5">5 yaş</option><option value="6">6 yaş</option><option value="7">7 yaş</option><option value="8">8 yaş ve üzeri</option>
          </select>
        </label>
        <button aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((value) => !value)} className="min-h-11 rounded-xl border border-border px-4">{onlyFavorites ? '★' : '☆'} Favorilerim</button>
      </div>
      <p className="text-xs text-muted-foreground">Yaş ve süre bilgileri yol göstericidir; çocuğunun ilgisine göre birlikte seçebilirsiniz.</p>
      {filteredGames.length === 0 && <p role="status">Bu seçimde oyun yok. Filtreleri değiştirebilirsin.</p>}
      <div
        className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl"
      >
        <AnimatePresence mode="popLayout">
          {filteredGames.map((game, i) => (
            <div key={game.id} className="relative flex flex-col gap-1">
            <GameCard
              game={game}
              index={i}
              onClick={() => navigate(`/games/${game.id}`)}
            />
            <button type="button" aria-pressed={favorites.includes(game.id)} aria-label={`${game.title} ${favorites.includes(game.id) ? 'favorilerden çıkar' : 'favorilere ekle'}`} onClick={() => toggleFavorite(game.id)} className="min-h-11 rounded-xl border border-border text-sm text-muted-foreground hover:text-primary">{favorites.includes(game.id) ? '★ Favorim' : '☆ Favorilere ekle'}</button>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GamesMenu;
