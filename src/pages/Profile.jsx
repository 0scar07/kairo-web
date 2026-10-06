import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import CountUp from "../components/CountUp";
import { DDImg, Skeleton, StateBox } from "../components/ui";
import { errorMessage } from "../api/client";
import { useProfile, useMatches } from "./profile/useProfile";
import { ChampionsCard, FlexCard, LpChart, SoloCard } from "./profile/Sidebar";
import RecentCard from "./profile/RecentCard";
import MatchRow from "./profile/MatchRow";
import { REGIONS, livePath, parseRiotIdSlug, profilePath, regionBySlug } from "../lib/regions";
import { QUEUE_FILTERS, championStats, findMe, formatNumber, rankLabel, timeAgo } from "../lib/lol";
import { championIcon, championName, championSplash, profileIcon, useDDragon } from "../lib/ddragon";
import { addRecent, isFavorite, toggleFavorite, updateFavorite, useFavorites } from "../lib/library";
import { useNow, useTitle } from "../lib/hooks";
import { NotFound } from "./Misc";

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "campeones", label: "Campeones" },
  { key: "maestria", label: "Maestría" },
];

export default function Profile() {
  const params = useParams();
  const region = regionBySlug(params.region);
  const id = parseRiotIdSlug(params.riotId);
  if (!region || !id) return <NotFound />;
  // key: al pasar a otro jugador se reinicia todo el estado de la página
  return <ProfilePage key={`${region.slug}/${id.gameName}#${id.tagLine}`.toLowerCase()} region={region} gameName={id.gameName} tagLine={id.tagLine} />;
}

function ProfilePage({ region, gameName, tagLine }) {
  useDDragon();
  const profile = useProfile(region.id, gameName, tagLine);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some(t => t.key === searchParams.get("tab")) ? searchParams.get("tab") : "resumen";
  const [filter, setFilter] = useState("all");
  const filterDef = QUEUE_FILTERS.find(f => f.key === filter) || QUEUE_FILTERS[0];
  const [champQuery, setChampQuery] = useState("");

  const data = profile.data;
  const puuid = data?.account?.puuid;
  const matches = useMatches(puuid, region.id, filterDef, refreshKey);

  // Búsqueda de campeón: filtra el resumen y el historial (por el nombre en español o el de la partida)
  const shown = useMemo(() => {
    const q = champQuery.trim().toLowerCase();
    if (!q) return matches.matches;
    return matches.matches.filter(m => {
      const me = findMe(m, puuid);
      return me && (championName(me.championId, me.championName).toLowerCase().includes(q) || String(me.championName).toLowerCase().includes(q));
    });
  }, [matches.matches, champQuery, puuid]);

  const name = data?.account?.gameName || gameName;
  const tag = data?.account?.tagLine || tagLine;
  useTitle(`${name}#${tag}`);

  // Fondo de la cabecera: el campeón más jugado de la primera carga (no cambia al filtrar por cola)
  const [splashChamp, setSplashChamp] = useState(null);
  useEffect(() => {
    if (splashChamp || matches.loading || !matches.matches.length) return;
    const top = championStats(matches.matches, puuid)[0];
    if (top) setSplashChamp({ id: top.championId, key: top.championName });
  }, [splashChamp, matches.loading, matches.matches, puuid]);

  const solo = data?.ranked.find(r => r.queueType === "RANKED_SOLO_5x5") || null;
  const flex = data?.ranked.find(r => r.queueType === "RANKED_FLEX_SR") || null;

  // Guarda la búsqueda en recientes en cuanto el perfil carga
  // y refresca el ícono y el rango guardados si es favorito (los usa el autocompletado del buscador)
  useEffect(() => {
    if (!data) return;
    const rank = solo ? rankLabel(solo.tier, solo.rank) : null;
    const player = { region: region.slug, gameName: data.account.gameName, tagLine: data.account.tagLine };
    addRecent({
      game: "lol",
      ...player,
      iconId: data.summoner.profileIconId ?? null,
      rank,
      subtitle: `League of Legends · ${rank || `Nivel ${data.summoner.summonerLevel}`}`,
    });
    updateFavorite(player, { ...player, puuid: data.account.puuid, iconId: data.summoner.profileIconId ?? null, rank });
  }, [data, region.slug, solo]);

  const refresh = () => { profile.reload(true); setRefreshKey(k => k + 1); };
  const setTab = key => setSearchParams(key === "resumen" ? {} : { tab: key }, { replace: true });

  if (profile.error && !data) {
    return (
      <Layout header={{ variant: "search", region: region.slug }}>
        <div className="container page-narrow"><ProfileError error={profile.error} region={region} gameName={gameName} tagLine={tagLine} onRetry={() => profile.reload()} /></div>
      </Layout>
    );
  }

  return (
    <Layout header={{ variant: "search", region: region.slug }}>
      <ProfileHeader
        loading={!data}
        name={name}
        tag={tag}
        region={region}
        summoner={data?.summoner}
        updatedAt={data?.updatedAt}
        refreshing={profile.loading && Boolean(data)}
        onRefresh={refresh}
        puuid={puuid}
        tab={tab}
        setTab={setTab}
        inGame={Boolean(data?.live?.inGame)}
        splash={splashChamp ? championSplash(splashChamp.id, splashChamp.key) : null}
        soloRank={solo ? rankLabel(solo.tier, solo.rank) : null}
      />

      <div className="container profile-body">
        {profile.error && data && <p className="list-note loss refresh-error" role="alert">No se pudo actualizar: {errorMessage(profile.error)}</p>}
        {!data ? (
          <ProfileSkeleton />
        ) : tab === "campeones" ? (
          <ChampionsTab matches={matches} puuid={puuid} />
        ) : tab === "maestria" ? (
          <MasteryTab mastery={data.mastery} error={data.masteryError} />
        ) : (
          <>
            <nav className="queue-tabs" aria-label="Filtrar por cola">
              {QUEUE_FILTERS.map(f => (
                <button key={f.key} type="button" className={`queue-tab${filter === f.key ? " active" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </nav>
            <div className="profile-grid">
              <aside className="profile-side">
                <SoloCard entry={solo} error={data.rankedError} history={data.history} />
                <FlexCard entry={flex} history={data.history} />
                <LpChart history={data.history} soloEntry={solo} />
                <ChampionsCard stats={championStats(shown, puuid)} games={shown.length} loading={matches.loading} />
              </aside>
              <section className="profile-main" aria-label="Historial de partidas">
                <RecentCard
                  matches={shown}
                  puuid={puuid}
                  loading={matches.loading}
                  query={champQuery}
                  setQuery={setChampQuery}
                  queueLabel={filterDef.queue || filterDef.queues ? filterDef.label : null}
                />
                <MatchList matches={matches} list={shown} puuid={puuid} region={region.slug} filtered={Boolean(filterDef.queues)} searching={Boolean(champQuery.trim())} />
              </section>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

// ─── Cabecera ─────────────────────────────────────────────────────────────
function ProfileHeader({ loading, name, tag, region, summoner, updatedAt, refreshing, onRefresh, puuid, tab, setTab, inGame, splash, soloRank }) {
  const now = useNow(30_000);
  const favorites = useFavorites();
  const player = { region: region.slug, gameName: name, tagLine: tag };
  const fav = isFavorite(favorites, player);

  return (
    <div className="profile-head">
      {splash && <ProfileSplash src={splash} />}
      <div className="container">
        <div className="profile-id">
          <div className="profile-icon">
            {loading ? <Skeleton w={72} h={72} r={16} /> : <DDImg src={profileIcon(summoner.profileIconId)} size={72} alt="Ícono de invocador" />}
            {!loading && <span className="profile-level num" title="Nivel de invocador">{summoner.summonerLevel}</span>}
          </div>
          <div className="profile-name">
            <h1>{name} <span className="profile-tag">#{tag}</span></h1>
            <p className="muted">
              League of Legends · {region.name}
              {updatedAt ? ` · Actualizado ${timeAgo(updatedAt, now)}` : ""}
            </p>
          </div>
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={loading || refreshing}>
              <Icon name="refresh" size={15} className={refreshing ? "spin" : ""} /> {refreshing ? "Actualizando" : "Actualizar"}
            </button>
            <button
              type="button"
              className={`btn btn-icon fav-btn${fav ? " on" : ""}`}
              disabled={!puuid}
              aria-pressed={fav}
              aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
              title={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
              onClick={() => toggleFavorite({ ...player, puuid, iconId: summoner?.profileIconId ?? null, rank: soloRank })}
            >
              <Icon name="star" size={16} filled={fav} />
            </button>
            <button type="button" className="btn" disabled title="Próximamente" aria-describedby="compare-soon">
              Comparar <span className="soon-pill" id="compare-soon">Próximamente</span>
            </button>
          </div>
        </div>

        <nav className="profile-tabs" aria-label="Secciones del perfil">
          {TABS.map(t => (
            <button key={t.key} type="button" className={`profile-tab${tab === t.key ? " active" : ""}`} aria-current={tab === t.key ? "page" : undefined} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
          <Link to={livePath(region.slug, name, tag)} className="profile-tab">
            <span className={`live-dot${inGame ? " pulse" : " off"}`} aria-hidden="true" /> En vivo
            {inGame && <span className="sr-only"> (en partida ahora)</span>}
          </Link>
        </nav>
      </div>
    </div>
  );
}

/** Splash art oscurecido y difuminado, con degradado hacia el fondo. Aparece con un fundido cuando termina de cargar. */
function ProfileSplash({ src }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`profile-splash${loaded ? " loaded" : ""}`} aria-hidden="true">
      <picture>
        <source media="(max-width: 700px)" srcSet={src.narrow} />
        <img src={src.wide} alt="" decoding="async" onLoad={() => setLoaded(true)} />
      </picture>
    </div>
  );
}

// ─── Resumen e historial ──────────────────────────────────────────────────
function MatchList({ matches, list, puuid, region, filtered, searching }) {
  if (matches.loading) {
    return <div className="match-list">{[0, 1, 2, 3, 4].map(i => <div key={i} className="match match-skeleton"><Skeleton h={66} r={14} /></div>)}</div>;
  }
  if (matches.error && !matches.matches.length) {
    return (
      <div className="card"><StateBox compact tone="error" title="No se pudo cargar el historial">{errorMessage(matches.error)}</StateBox></div>
    );
  }
  if (!list.length) {
    return (
      <div className="card">
        <StateBox compact icon="swords" title={searching ? "Sin partidas con ese campeón" : filtered ? "Sin partidas de esta cola" : "Sin partidas recientes"}>
          {searching
            ? "No hay partidas con ese campeón entre las cargadas."
            : filtered
            ? (matches.hasMore ? "No hay partidas de esta cola entre las cargadas. Prueba con «Cargar más partidas»." : "No encontramos partidas de esta cola.")
            : "Este jugador no tiene partidas recientes."}
        </StateBox>
        {matches.hasMore && <LoadMore matches={matches} />}
      </div>
    );
  }
  return (
    <div className="match-list">
      {list.map((m, i) => <MatchRow key={m.id} match={m} puuid={puuid} region={region} index={i} />)}
      {matches.failed > 0 && <p className="list-note faint">{matches.failed === 1 ? "Una partida no se pudo cargar." : `${matches.failed} partidas no se pudieron cargar.`}</p>}
      {matches.error && <p className="list-note loss" role="alert">{errorMessage(matches.error)}</p>}
      {matches.hasMore && <LoadMore matches={matches} />}
    </div>
  );
}

const LoadMore = ({ matches }) => (
  <button type="button" className="btn btn-block load-more" onClick={matches.loadMore} disabled={matches.loadingMore}>
    {matches.loadingMore ? <><span className="spinner" aria-hidden="true" /> Cargando…</> : "Cargar más partidas"}
  </button>
);

// ─── Pestaña Campeones ────────────────────────────────────────────────────
function ChampionsTab({ matches, puuid }) {
  const stats = useMemo(() => championStats(matches.matches, puuid), [matches.matches, puuid]);
  return (
    <section className="tab-section" aria-labelledby="champs-title">
      <div className="section-head">
        <h2 className="section-title" id="champs-title">Campeones</h2>
        <span className="faint">{matches.loading ? "" : `Calculado con las últimas ${matches.matches.length} partidas`}</span>
      </div>
      <div className="card">
        {matches.loading ? (
          <div className="card-pad">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={36} style={{ marginBottom: 10 }} />)}</div>
        ) : !stats.length ? (
          <StateBox compact icon="swords" title="Sin partidas para calcular">Cuando juegue partidas aparecerán sus campeones aquí.</StateBox>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Campeón</th>
                  <th scope="col" className="r">Partidas</th>
                  <th scope="col" className="r">Victorias</th>
                  <th scope="col" className="r">KDA</th>
                  <th scope="col" className="r">K / D / A</th>
                  <th scope="col" className="r">CS/min</th>
                  <th scope="col" className="r">Daño medio</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(c => {
                  const name = championName(c.championId, c.championName);
                  return (
                    <tr key={c.championId}>
                      <td><div className="cell-champ"><DDImg src={championIcon(c.championId, c.championName)} size={30} alt="" /><strong>{name}</strong></div></td>
                      <td className="r num">{c.games}</td>
                      <td className={`r num ${c.wr >= 50 ? "win" : "loss"}`}>{c.wr}% <span className="faint">({c.wins}V {c.games - c.wins}D)</span></td>
                      <td className="r num">{c.kda === Infinity ? "Perfecto" : c.kda.toFixed(2)}</td>
                      <td className="r num faint">{c.avgK.toFixed(1)} / {c.avgD.toFixed(1)} / {c.avgA.toFixed(1)}</td>
                      <td className="r num">{c.csMin.toFixed(1)}</td>
                      <td className="r num">{formatNumber(c.avgDamage)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!matches.loading && matches.hasMore && <LoadMore matches={matches} />}
    </section>
  );
}

// ─── Pestaña Maestría ─────────────────────────────────────────────────────
function MasteryTab({ mastery, error }) {
  return (
    <section className="tab-section" aria-labelledby="mastery-title">
      <div className="section-head">
        <h2 className="section-title" id="mastery-title">Maestría</h2>
        {mastery && <span className="faint num">Puntuación de maestría: {formatNumber(mastery.score)}</span>}
      </div>
      {!mastery ? (
        <div className="card"><StateBox compact tone={error ? "error" : undefined} title="Maestría no disponible">{error ? errorMessage(error) : "No hay datos de maestría."}</StateBox></div>
      ) : !mastery.top.length ? (
        <div className="card"><StateBox compact icon="trophy" title="Sin maestría todavía">Aún no tiene puntos de maestría con ningún campeón.</StateBox></div>
      ) : (
        <ul className="mastery-grid">
          {mastery.top.map((m, i) => {
            const name = championName(m.championId, "Campeón");
            return (
              <li key={m.championId} className="card mastery-card reveal" style={{ "--i": i }}>
                <span className="mastery-rank num">{i + 1}</span>
                <DDImg src={championIcon(m.championId)} size={56} alt="" />
                <strong>{name}</strong>
                <span className="mastery-level">Nivel {m.level}</span>
                <span className="num">{formatNumber(m.points)} pts</span>
                {m.lastPlayTime ? <span className="faint">Jugado {timeAgo(m.lastPlayTime)}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Carga y errores ──────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="profile-grid" aria-busy="true" aria-label="Cargando perfil">
      <aside className="profile-side">
        {[110, 150, 66, 260].map((h, i) => <div key={i} className="card"><Skeleton h={h} r={16} /></div>)}
      </aside>
      <section className="profile-main">
        <div className="card"><Skeleton h={66} r={16} /></div>
        <div className="match-list">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={66} r={14} />)}</div>
      </section>
    </div>
  );
}

function ProfileError({ error, region, gameName, tagLine, onRetry }) {
  const riotId = `${gameName}#${tagLine}`;
  if (error.code === "PLAYER_NOT_FOUND" || error.code === "SUMMONER_NOT_FOUND") {
    const others = REGIONS.filter(r => r.slug !== region.slug);
    return (
      <div className="card">
        <StateBox
          icon="userX"
          title={error.code === "PLAYER_NOT_FOUND" ? `No encontramos a ${riotId}` : `${riotId} no tiene perfil de LoL en ${region.label}`}
          action={error.code === "PLAYER_NOT_FOUND"
            // Las cuentas Riot son globales: si el Riot ID no existe, no existe en ninguna región
            ? <Link className="btn btn-primary" to="/">Buscar otro jugador</Link>
            : (
              <div className="state-actions">
                {others.map(r => <Link key={r.slug} className="btn" to={profilePath(r.slug, gameName, tagLine)}>Buscar en {r.label}</Link>)}
              </div>
            )}
        >
          {error.code === "PLAYER_NOT_FOUND"
            ? "No existe ninguna cuenta Riot con ese nombre y #TAG. Revisa espacios y acentos (las mayúsculas no importan)."
            : "La cuenta Riot existe, pero no juega League of Legends en esta región. Prueba en otra."}
        </StateBox>
      </div>
    );
  }
  const limited = error.status === 429;
  return (
    <div className="card">
      <StateBox
        icon={error.code === "SERVER_DOWN" ? "wifiOff" : limited ? "clock" : "alert"}
        tone="error"
        title={limited ? "Demasiadas consultas" : "No se pudo cargar el perfil"}
        action={<button type="button" className="btn btn-primary" onClick={onRetry}>Reintentar</button>}
      >
        {errorMessage(error)}
      </StateBox>
    </div>
  );
}
