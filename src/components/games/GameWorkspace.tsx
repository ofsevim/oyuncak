import type { ReactNode } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { GameDefinition } from '@/data/gameCatalog';
import GameArtwork from './GameArtwork';

interface Props {
  game: GameDefinition;
  onBack: () => void;
  children: ReactNode;
}

/** Shared visual frame. Individual games retain their input and sizing rules. */
export default function GameWorkspace({ game, onBack, children }: Props) {
  return (
    <div className="garden-game-stage" data-game={game.id}>
      <header className="garden-play-header">
        <button type="button" onClick={onBack} className="garden-play-back" aria-label="Oyunlara Dön">
          <ArrowLeft size={16} aria-hidden="true" /><span>Oyunlara Dön</span>
        </button>
        <a href="/" className="garden-play-wordmark" aria-label="Oyuncak ana sayfa">oyuncak<span>.</span></a>
      </header>
      <div className="garden-play-intro">
        <div className="garden-play-art" aria-hidden="true"><GameArtwork id={game.id} /></div>
        <div>
          <p className="garden-play-eyebrow"><Sparkles size={12} aria-hidden="true" /> Gece Bahçesi · Oyun zamanı</p>
          <h1>{game.title}</h1>
          <p className="garden-play-description">{game.description}</p>
        </div>
        <div className="garden-play-details"><span>{game.minAge}+ yaş</span><span>{game.duration}</span><span>{game.skill}</span></div>
      </div>
      <div className="garden-game-content">{children}</div>
      <footer className="garden-play-footer"><span>Keşfet. Dene. Bir daha oyna.</span><span>Her küçük adım, yeni bir keşif.</span></footer>
    </div>
  );
}
