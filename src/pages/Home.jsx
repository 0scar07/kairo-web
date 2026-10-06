import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SearchForm from "../components/SearchForm";
import Icon from "../components/Icon";
import { DDImg, GameChips, Initials, Skeleton, StateBox } from "../components/ui";
import { getLeaderboard, getLive } from "../api/lol";
import { errorMessage } from "../api/client";
import { useAsync, useInterval, useNow, useTitle } from "../lib/hooks";
import { clearRecents, useFavorites, useRecents } from "../lib/library";
import { REGIONS, livePath, profilePath, regionBySlug, savedRegion } from "../lib/regions";
import { formatDuration, formatNumber, queueLong, rankLabel, winrate } from "../lib/lol";
import { championIcon, championName, useDDragon } from "../lib/ddragon";
import { gameById } from "../lib/games";
import { APK_URL } from "../lib/config";

export default function Home() {
  useTitle(null);
  return (
    <Layout header={{ variant: "nav" }}>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid" />
          <div className="hero-glow" />
        </div>
        <div className="container hero-inner">
          <p className="eyebrow hero-eyebrow">Estadísticas de 9 juegos en un solo lugar</p>
          <h1 className="hero-title">Cada partida cuenta.</h1>
          <p className="hero-sub">Busca cualquier jugador y mira su rango, su historial y su partida en vivo.</p>
          <div className="hero-search"><SearchForm size="large" /></div>
          <GameChips />
        </div>
      </section>

      <div className="container home-body">
        <LiveFavorites />
        <div className="home-grid">
          <Leaderboard />
          <aside className="home-aside">
            <Recents />
            <PocketCard />
          </aside>
        </div>
      </div>
    </Layout>
  );
}

// ─── Tus favoritos en partida ─────────────────────────────────────────────
const MAX_CHECKED = 6;   // favoritos consultados a la vez (cada consulta pasa por la caché del backend)

function LiveFavorites() {
  useDDragon();
  const favorites = useFavorites();
  const [showAll, setShowAll] = useState(false);
  const watched = useMemo(() => favorites.filter(f => f.puuid).slice(0, MAX_CHECKED), [favorites]);
  const key = watched.map(f => f.puuid).join(",");

  const { data, loading, reload } = useAsync(async force => {
    const results = await Promise.allSettled(watched.map(f => getLive(f.puuid, regionBySlug(f.region)?.id, force)));
    return results
      .map((r, i) => ({ fav: watched[i], live: r.status === "fulfilled" ? r.value : null }))
      .filter(x => x.live?.inGame);
  }, [key]);

  useInterval(() => reload(true), 60_000, watched.length > 0);

  const live = data || [];
  const visible = showAll ? live : live.slice(0, 3);

  return (
    <section className="home-section" aria-labelledby="live-favs-title">
      <div className="section-head">
        <h2 className="section-title live-title" id="live-favs-title">
          <span className={`live-dot${live.length ? " pulse" : ""}`} aria-hidden="true" /> Tus favoritos en partida
        </h2>
        {live.length > 3 && (
          <button type="button" className="link-btn" onClick={() => setShowAll(v => !v)}>{showAll ? "Ver menos" : "Ver todos"}</button>
        )}
      </div>

      {!watched.length ? (
        <div className="card"><StateBox compact icon="star" title="Aún no tienes favoritos">
          Abre el perfil de un jugador y márcalo con la estrella: aquí verás cuándo está jugando.
        </StateBox></div>
      ) : loading && !data ? (
        <div className="fav-grid">{[0, 1, 2].map(i => <FavoriteSkeleton key={i} />)}</div>
      ) : !live.length ? (
        <div className="card"><StateBox compact icon="clock" title="Ninguno de tus favoritos está en partida">
          Revisamos de nuevo cada minuto mientras tengas esta página abierta.
        </StateBox></div>
      ) : (
        <div className="fav-grid">{visible.map((x, i) => <FavoriteLiveCard key={x.fav.puuid} {...x} index={i} />)}</div>
      )}
    </section>
  );
}

function FavoriteLiveCard({ fav, live, index }) {
  const now = useNow(1000);
  const me = live.participants.find(p => p.puuid === fav.puuid);
  const champ = me ? championName(me.championId) : "";
  const r = me?.ranked;
  return (
    <article className="card fav-card reveal" style={{ "--i": index }}>
      <div className="fav-top">
        <DDImg src={me ? championIcon(me.championId) : null} size={40} alt={champ} />
        <div className="fav-info">
          <Link to={profilePath(fav.region, fav.gameName, fav.tagLine)} className="fav-name">{fav.gameName}#{fav.tagLine}</Link>
          <span className="fav-sub">{[champ, queueLong(live.queueId)].filter(Boolean).join(" · ")}</span>
        </div>
        <span className="fav-timer num">{live.startTime > 0 ? formatDuration((now - live.startTime) / 1000) : "Cargando"}</span>
      </div>
      <div className="fav-bottom">
        <span className="faint">{r ? `${rankLabel(r.tier, r.rank)} · ${r.leaguePoints} LP` : "Sin clasificar"}</span>
        <Link to={livePath(fav.region, fav.gameName, fav.tagLine)} className="fav-link">Ver partida</Link>
      </div>
    </article>
  );
}

const FavoriteSkeleton = () => (
  <div className="card fav-card">
    <div className="fav-top">
      <Skeleton w={40} h={40} r={8} />
      <div className="fav-info"><Skeleton w="60%" h={13} /><Skeleton w="80%" h={11} style={{ marginTop: 6 }} /></div>
    </div>
    <div className="fav-bottom"><Skeleton w="40%" h={11} /></div>
  </div>
);

// ─── Clasificación Challenger ─────────────────────────────────────────────
function Leaderboard() {
  const [region, setRegion] = useState(() => savedRegion().slug);
  const { data, error, loading, reload } = useAsync(() => getLeaderboard(regionBySlug(region).id, 10), [region]);

  return (
    <section className="home-section leaderboard" aria-labelledby="ladder-title">
      <div className="section-head">
        <h2 className="section-title" id="ladder-title">Clasificación · Solo/Duo</h2>
        {/* Las regiones solo tienen sentido cuando el backend ya ofrece la clasificación */}
        {data !== null && (
          <div className="segmented region-tabs" role="group" aria-label="Región de la clasificación">
            {REGIONS.map(r => (
              <button key={r.slug} type="button" aria-pressed={r.slug === region} onClick={() => setRegion(r.slug)}>{r.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="card ladder-card">
        {loading ? (
          <LadderTable rows={null} region={region} />
        ) : error ? (
          <StateBox compact tone="error" title="No se pudo cargar la clasificación" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>
            {errorMessage(error)}
          </StateBox>
        ) : data === null ? (
          <LadderPreview />
        ) : !data.length ? (
          <StateBox compact icon="trophy" title="Sin jugadores en Challenger">
            Riot todavía no publica la clasificación de esta región (pasa al inicio de cada temporada).
          </StateBox>
        ) : (
          <LadderTable rows={data} region={region} />
        )}
      </div>
    </section>
  );
}

/** Clasificación aún no disponible: la forma de la tabla, tenue y quieta, con el aviso encima */
function LadderPreview() {
  const widths = [132, 118, 146, 104, 126, 112];
  return (
    <div className="ladder-preview">
      <div className="ladder-ghost" aria-hidden="true">
        {widths.map((w, i) => (
          <div key={i} className="ghost-row">
            <span className={`ghost-pos${i < 3 ? " top" : ""}`}>{i + 1}</span>
            <span className="ghost-avatar" />
            <span className="ghost-bar" style={{ width: w }} />
            <span className="ghost-bar ghost-tier" />
            <span className="ghost-bar ghost-lp" />
            <span className="ghost-wr"><span style={{ width: `${62 - i * 2}%` }} /></span>
          </div>
        ))}
      </div>
      <div className="ladder-soon">
        <span className="soon-badge"><Icon name="trophy" size={14} /> Disponible pronto</span>
        <h3>Los mejores Challenger de cada región</h3>
        <p>LAN, LAS, NA, EUW, KR y BR con LP y winrate. Llega en una próxima actualización de Kairo.</p>
      </div>
    </div>
  );
}

function LadderTable({ rows, region }) {
  return (
    <div className="table-scroll">
      <table className="ladder">
        <thead>
          <tr>
            <th scope="col" className="col-pos">#</th>
            <th scope="col">Jugador</th>
            <th scope="col">Liga</th>
            <th scope="col" className="col-lp">LP</th>
            <th scope="col" className="col-wr">Victorias</th>
          </tr>
        </thead>
        <tbody>
          {rows === null
            ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                <td className="col-pos"><Skeleton w={12} h={12} /></td>
                <td><Skeleton w={140} h={14} /></td>
                <td><Skeleton w={70} h={12} /></td>
                <td className="col-lp"><Skeleton w={40} h={12} style={{ marginLeft: "auto" }} /></td>
                <td className="col-wr"><Skeleton w={130} h={8} /></td>
              </tr>
            ))
            : rows.map((p, i) => {
              const wr = winrate(p.wins, p.losses) ?? 0;
              const name = p.gameName ? `${p.gameName}#${p.tagLine}` : "Jugador oculto";
              return (
                <tr key={p.puuid || i} className="reveal" style={{ "--i": i }}>
                  <td className={`col-pos num${i < 3 ? " top" : ""}`}>{i + 1}</td>
                  <td>
                    <div className="ladder-player">
                      <Initials text={p.gameName} size={24} />
                      {p.gameName
                        ? <Link to={profilePath(region, p.gameName, p.tagLine)} className="ladder-name">{name}</Link>
                        : <span className="ladder-name muted">{name}</span>}
                    </div>
                  </td>
                  <td className="ladder-tier">Challenger</td>
                  <td className="col-lp num">{formatNumber(p.leaguePoints)}</td>
                  <td className="col-wr">
                    <div className="wr-bar-wrap" title={`${p.wins} V · ${p.losses} D`}>
                      <span className="wr-bar"><span style={{ width: `${wr}%` }} /></span>
                      <span className="num">{wr}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Búsquedas recientes ──────────────────────────────────────────────────
function Recents() {
  const recents = useRecents();
  return (
    <section className="home-section" aria-labelledby="recents-title">
      <div className="section-head">
        <h2 className="section-title" id="recents-title">Búsquedas recientes</h2>
        {recents.length > 0 && <button type="button" className="link-btn muted" onClick={clearRecents}>Borrar</button>}
      </div>
      <div className="card">
        {!recents.length ? (
          <StateBox compact icon="history" title="Sin búsquedas todavía">Los jugadores que busques aparecerán aquí.</StateBox>
        ) : (
          <ul className="recents">
            {recents.map((r, i) => {
              const game = gameById(r.game);
              return (
                <li key={`${r.game}:${r.region}:${r.gameName}#${r.tagLine}`} className="reveal" style={{ "--i": i }}>
                  <Link to={profilePath(r.region, r.gameName, r.tagLine)} className="recent">
                    <span className="recent-badge" style={{ color: game?.color }}>{game?.short}</span>
                    <span className="recent-text">
                      <span className="recent-name">{r.gameName}#{r.tagLine}</span>
                      <span className="recent-sub">{r.subtitle || game?.name}</span>
                    </span>
                    <Icon name="chevronRight" size={14} className="faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

const PocketCard = () => (
  <div className="card pocket">
    <h3>Llévalo en el bolsillo</h3>
    <p>Avisos cuando un favorito entra en partida, en la app de Kairo.</p>
    <a className="btn btn-primary" href={APK_URL} rel="noopener"><Icon name="download" size={15} /> Descargar APK</a>
  </div>
);
