import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { GAME_CATALOG } from "@/data/gameCatalog";
import { STORIES } from "@/data/stories";
import type { FeaturedGameRouteId } from "@/constants/gameIds";
import { useGameLibrary } from "@/hooks/useGameLibrary";
import GardenCharacter from "@/components/GardenCharacter";
import GameArtwork from "@/components/games/GameArtwork";

type Props = {
  onGoDraw: () => void;
  onGoGames: () => void;
  onGoStories: () => void;
  onGoFeaturedGame?: (id: FeaturedGameRouteId) => void;
};
export default function Home({ onGoDraw, onGoGames, onGoStories }: Props) {
  const navigate = useNavigate();
  const { recent } = useGameLibrary();
  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem("oyuncak.nickname") || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    const update = () => {
      try {
        setNickname(localStorage.getItem("oyuncak.nickname") || "");
      } catch {
        /* storage may be unavailable */
      }
    };
    window.addEventListener("oyuncak:nickname-changed", update);
    return () => window.removeEventListener("oyuncak:nickname-changed", update);
  }, []);
  const picks = ["memory", "runner", "basketball"] as const;
  return (
    <div className="garden-home">
      <section className="garden-hero">
        <GardenCharacter />
        <div className="garden-hero-copy">
          <p className="garden-eyebrow">
            <span /> MERAK ET. DENE. BİR DAHA OYNA.
          </p>
          <h1>
            Bir dünya
            <br />
            <em>hayal et.</em>
          </h1>
          <p className="garden-intro">
            Oyunlar, renkler ve masallar.
            <br />
            İçindeki kocaman hayal gücüne <br />
            küçük bir oyun alanı.
          </p>
          <div className="garden-actions">
            <button className="garden-button" onClick={onGoGames}>
              Oyunları keşfet <ArrowUpRight size={18} />
            </button>
            <button
              className="garden-button garden-button-soft"
              onClick={onGoDraw}
            >
              Bir şeyler çiz <Pencil size={16} />
            </button>
          </div>
        </div>
      </section>
      <div className="garden-promise">
        <span>{GAME_CATALOG.length} OYUN · SONSUZ MERAK</span>
        <span>REKLAMSIZ</span>
        <span>TAMAMEN ÜCRETSİZ</span>
      </div>
      {recent.length > 0 && (
        <section className="garden-recent" aria-label="Son oynanan oyunlar">
          <span>Kaldığın yerden</span>
          {recent.map((id) => {
            const game = GAME_CATALOG.find((g) => g.id === id);
            return game ? (
              <Link key={id} to={"/games/" + id}>
                {game.title}
                <ArrowUpRight size={14} />
              </Link>
            ) : null;
          })}
        </section>
      )}
      <section className="garden-featured">
        <div className="garden-section-heading">
          <div>
            <p className="garden-eyebrow">BUGÜNÜN KÜÇÜK MACERALARI</p>
            <h2>Bugün ne oynasak?</h2>
          </div>
          <button onClick={onGoGames} className="garden-text-link">
            Tüm oyunlar <ArrowRight size={16} />
          </button>
        </div>
        <div className="garden-feature-grid">
          {picks.map((id) => {
            const game = GAME_CATALOG.find((g) => g.id === id)!;
            return (
              <button
                key={id}
                className="garden-feature"
                onClick={() => navigate("/games/" + id)}
              >
                <GameArtwork id={id} />
                <span className="garden-feature-title">
                  {game.title}
                  <ArrowUpRight size={19} />
                </span>
                <span className="garden-feature-meta">
                  {game.minAge}+ yaş · {game.skill}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="garden-explore" aria-label="Keşif alanları">
        <button
          onClick={() => navigate("/games?category=brain")}
          aria-label="Zeka Hafıza, 2048 ve Tetris"
        >
          <Sparkles />
          <span>
            <strong>Biraz düşünelim.</strong>
            <small>Zeka oyunları</small>
          </span>
          <ArrowUpRight />
        </button>
        <button onClick={onGoDraw}>
          <Pencil />
          <span>
            <strong>Renkleri özgür bırak.</strong>
            <small>Çizim atölyesi</small>
          </span>
          <ArrowUpRight />
        </button>
        <button onClick={onGoStories}>
          <BookOpen />
          <span>
            <strong>Bir varmış, bir hayal varmış.</strong>
            <small>{STORIES.length} hikâye</small>
          </span>
          <ArrowUpRight />
        </button>
      </section>
      <footer className="garden-footer">
        <div>
          <Link to="/" className="garden-wordmark">
            oyuncak<span>✳</span>
          </Link>
          <p>Küçük insanlar. Kocaman hayaller.</p>
        </div>
        <nav aria-label="Bilgilendirme">
          <Link to="/parents">Ebeveyn alanı</Link>
          <Link to="/privacy">Gizlilik</Link>
          <Link to="/terms">Kullanım bilgileri</Link>
        </nav>
        <button
          className="garden-profile"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("oyuncak:open-nickname-modal"))
          }
        >
          {nickname || "Rumuzunu seç"} <ArrowUpRight size={14} />
        </button>
      </footer>
    </div>
  );
}
