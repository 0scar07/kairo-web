import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import { DDImg, Initials, Skeleton, StateBox } from "../components/ui";
import HeroShowcase from "./home/HeroShowcase";
import GameCards from "./home/GameCards";
import { PROFILES, gameProfilePath } from "../games/registry";
import { bsProfileIcon, cleanName, getTop, tagOf } from "../games/supercell";
import { errorMessage } from "../api/client";
import { gameById } from "../lib/games";
import { useAsync, useTitle } from "../lib/hooks";
import { formatNumber } from "../lib/lol";
import { APK_URL } from "../lib/config";
import { NotFound } from "./Misc";

// Por qué un juego todavía no tiene búsqueda en la web (los que no están en games/registry.js)
const WHY_NOT = {
  tft: "Riot todavía no habilitó la API de TFT para la key de Kairo. En cuanto la habilite, la búsqueda llega aquí.",
  pubg: "Falta configurar la key de la API de PUBG en el servidor de Kairo.",
  fortnite: "La key de Fortnite-API del servidor de Kairo todavía no es válida.",
  apex: "La key de Apex Legends Status del servidor de Kairo todavía no es válida.",
};

/** Página de un juego: su hero, el buscador (real si el juego ya tiene perfiles) y, si hay, el ranking mundial */
export default function GamePage() {
  const { game: id } = useParams();
  const game = gameById(id);
  useTitle(game?.name);
  if (!game || game.available) return <NotFound />;
  const def = PROFILES[game.id];

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
          {def ? (
            <>
              <h1 className="hero-title">Cada partida cuenta.</h1>
              <p className="hero-sub">Busca a cualquier jugador de {game.name} y mira su perfil, sus estadísticas y sus últimas partidas.</p>
              <div className="hero-search"><GameSearch game={game} def={def} /></div>
            </>
          ) : (
            <>
              <h1 className="hero-title">Muy pronto en la web.</h1>
              <p className="hero-sub">{WHY_NOT[game.id] || `La búsqueda de ${game.name} llega a la web en una próxima actualización.`} Mientras tanto, está en la app de Kairo.</p>
              <div className="state-actions game-actions">
                <a className="btn btn-primary" href={APK_URL} rel="noopener"><Icon name="download" size={15} /> Verlo en la app</a>
                <Link className="btn" to="/"><GameLogo game="lol" size={15} color="var(--game-lol)" /> Buscar en League of Legends</Link>
              </div>
            </>
          )}
        </div>
        <div className="container"><GameCards /></div>
      </section>
      {["brawlstars", "clashroyale", "clashofclans"].includes(game.id) && (
        <div className="container home-body" style={{ "--game": game.hex }}><TopPlayers game={game} /></div>
      )}
    </Layout>
  );
}

function GameSearch({ game, def }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);   // búsqueda por nombre (Dota 2): lista para elegir
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const id = def.parse(text);
    if (id) { navigate(gameProfilePath(game.id, id)); return; }
    if (!def.search || text.trim().length < 2) { setError(def.invalidHint); return; }
    setBusy(true); setError(""); setResults(null);
    try {
      const found = await def.search(text);
      if (!found.length) setError("No encontramos jugadores con ese nombre. Prueba con el ID de la cuenta.");
      setResults(found);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="search search-large" onSubmit={submit} role="search" noValidate>
      <div className="search-box">
        <label className="search-input">
          <span className="sr-only">Buscar jugador de {game.name}</span>
          <input type="text" value={text} onChange={e => { setText(e.target.value); setError(""); }} placeholder={game.searchHint} autoComplete="off" spellCheck="false" aria-invalid={Boolean(error)} />
        </label>
        <button type="submit" className="btn btn-primary search-submit" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="search" size={16} />} Buscar
        </button>
      </div>
      {error && <p className="search-error" role="alert">{error}</p>}
      {results?.length > 0 && (
        <ul className="name-results" aria-label="Jugadores encontrados">
          {results.map((p, i) => (
            <li key={p.id} className="reveal" style={{ "--i": i }}>
              <Link to={gameProfilePath(game.id, p.id)} className="name-result">
                {p.avatar ? <DDImg src={p.avatar} size={36} alt="" /> : <Initials text={p.name} size={36} />}
                <span className="top-name"><strong>{p.name}</strong><span className="faint">{p.sub}</span></span>
                <Icon name="chevronRight" size={14} className="faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

// Ranking mundial (oficial de Supercell): BS por trofeos, CR por Senda de leyendas, CoC por trofeos
const TOP_INFO = {
  brawlstars: { title: "Mejores jugadores del mundo", value: p => formatNumber(p.trophies), unit: "trofeos", sub: p => (p.club?.name ? cleanName(p.club.name) : "Sin club"), avatar: p => (p.icon?.id ? bsProfileIcon(p.icon.id) : null) },
  clashroyale: { title: "Senda de leyendas · Mundial", value: p => formatNumber(p.eloRating), unit: "puntos", sub: p => (p.clan?.name ? cleanName(p.clan.name) : `Nivel ${p.expLevel}`), avatar: () => null },
  clashofclans: { title: "Mejores jugadores del mundo", value: p => formatNumber(p.trophies), unit: "trofeos", sub: p => (p.clan?.name ? cleanName(p.clan.name) : `Nivel ${p.expLevel}`), avatar: p => p.league?.iconUrls?.small || null },
};

function TopPlayers({ game }) {
  const info = TOP_INFO[game.id];
  const { data, error, loading, reload } = useAsync(() => getTop(game.id, 10), [game.id]);
  return (
    <section className="home-section" aria-labelledby="top-title">
      <div className="section-head"><h2 className="section-title" id="top-title">{info.title}</h2></div>
      <div className="card ladder-card">
        {loading ? (
          <div className="card-pad">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} h={38} style={{ marginBottom: 8 }} />)}</div>
        ) : error ? (
          <StateBox compact tone="error" title="No se pudo cargar el ranking" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox>
        ) : (
          <ol className="top-list">
            {data.map((p, i) => (
              <li key={p.tag} className="reveal" style={{ "--i": i }}>
                <Link to={gameProfilePath(game.id, tagOf(p.tag))} className="top-row">
                  <span className={`top-pos num${i < 3 ? " podium" : ""}`}>{p.rank || i + 1}</span>
                  {info.avatar(p) ? <DDImg src={info.avatar(p)} size={30} alt="" /> : <Initials text={cleanName(p.name)} size={30} />}
                  <span className="top-name"><strong>{cleanName(p.name)}</strong><span className="faint">{info.sub(p)}</span></span>
                  <span className="top-value num"><strong>{info.value(p)}</strong> <span className="faint">{info.unit}</span></span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
