import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import HeroShowcase from "./home/HeroShowcase";
import GameCards from "./home/GameCards";
import { gameById } from "../lib/games";
import { useTitle } from "../lib/hooks";
import { APK_URL } from "../lib/config";
import { NotFound } from "./Misc";

/**
 * Página de un juego que todavía no tiene búsqueda en la web: su propio hero (solo personajes de ese juego), un
 * buscador de muestra con el formato que usa ese juego (deshabilitado, "Próximamente") y el carrusel de pósters.
 */
export default function GamePage() {
  const { game: id } = useParams();
  const game = gameById(id);
  useTitle(game?.name);
  if (!game || game.available) return <NotFound />;

  return (
    <Layout header={{ variant: "nav" }}>
      <section className="hero game-hero" style={{ "--game": game.hex }}>
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid" />
          <div className="hero-glow game-glow" />
        </div>
        <div className="container hero-inner">
          <HeroShowcase game={game.id} />
          <p className="eyebrow hero-eyebrow game-eyebrow">
            <GameLogo game={game.id} size={16} color={game.color} /> {game.fullName || game.name} en Kairo
          </p>
          <h1 className="hero-title">Muy pronto en la web.</h1>
          <p className="hero-sub">
            Las estadísticas de {game.name} ya están en la app de Kairo. La búsqueda de jugadores llega a la web en una
            próxima actualización.
          </p>

          {/* Buscador de muestra: el formato real de ese juego, deshabilitado hasta que exista en la web */}
          <div className="hero-search">
            <div className="search search-large soon-search" aria-disabled="true">
              <div className="search-box">
                <label className="search-input">
                  <span className="sr-only">Buscar en {game.name} (próximamente)</span>
                  <input type="text" placeholder={game.searchHint} disabled />
                </label>
                <span className="soon-search-tag">Próximamente</span>
              </div>
            </div>
          </div>
          <div className="state-actions game-actions">
            <a className="btn btn-primary" href={APK_URL} rel="noopener"><Icon name="download" size={15} /> Verlo en la app</a>
            <Link className="btn" to="/"><GameLogo game="lol" size={15} color="var(--game-lol)" /> Buscar en League of Legends</Link>
          </div>
        </div>
        <div className="container">
          <GameCards />
        </div>
      </section>
    </Layout>
  );
}
