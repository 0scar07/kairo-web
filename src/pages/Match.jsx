import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import ShareButton from "../components/ShareButton";
import { DDImg, Skeleton, StateBox } from "../components/ui";
import { MatchDetail } from "./profile/MatchRow";
import { errorMessage } from "../api/client";
import { getMatch } from "../api/lol";
import { useAsync, useTitle } from "../lib/hooks";
import { parseRiotIdSlug, profilePath, regionOfMatchId } from "../lib/regions";
import { formatDuration, formatNumber, mapName, queueLong } from "../lib/lol";
import { championIcon, championName, championSplash, useDDragon } from "../lib/ddragon";

const TEAM = { 100: { name: "Equipo azul", cls: "blue" }, 200: { name: "Equipo rojo", cls: "red" } };

// Qué se compara en las barras (campo de cada participante y cómo se muestra)
const METRICS = [
  { key: "damage", label: "Daño a campeones" },
  { key: "gold", label: "Oro" },
  { key: "taken", label: "Daño recibido" },
  { key: "cs", label: "CS" },
  { key: "vision", label: "Visión" },
  { key: "buildings", label: "Daño a estructuras" },
];

// Objetivos de cada equipo en el orden en que se muestran
const OBJECTIVES = [
  { key: "champion", label: "Kills" },
  { key: "tower", label: "Torres" },
  { key: "dragon", label: "Dragones" },
  { key: "baron", label: "Barones" },
  { key: "horde", label: "Larvas" },
  { key: "riftHerald", label: "Heraldo" },
  { key: "atakhan", label: "Atakhan" },
  { key: "inhibitor", label: "Inhibidores" },
];

export default function Match() {
  const { matchId } = useParams();
  const [params] = useSearchParams();
  const who = parseRiotIdSlug(params.get("jugador"));
  useDDragon();
  const region = regionOfMatchId(matchId);
  const { data: match, error, loading, reload } = useAsync(() => getMatch(matchId, region?.id || "la1"), [matchId]);

  // Jugador resaltado: el de ?jugador=Nombre-TAG (si está en la partida)
  const me = useMemo(() => {
    if (!match || !who) return null;
    const low = s => String(s || "").toLowerCase();
    return match.participants.find(p => low(p.gameName) === low(who.gameName) && low(p.tagLine) === low(who.tagLine)) || null;
  }, [match, who]);

  const title = match ? `${queueLong(match.queueId)}${me ? ` · ${me.gameName}` : ""}` : "Partida";
  useTitle(title);

  if (!match) {
    return (
      <Layout header={{ variant: "search", region: region?.slug }}>
        <div className="container match-page">
          {loading ? <MatchSkeleton /> : (
            <div className="card">
              <StateBox
                icon={error?.code === "MATCH_NOT_FOUND" ? "swords" : "alert"}
                tone={error?.code === "MATCH_NOT_FOUND" ? undefined : "error"}
                title={error?.code === "MATCH_NOT_FOUND" ? "No encontramos esta partida" : "No se pudo cargar la partida"}
                action={error?.code === "MATCH_NOT_FOUND" ? <Link className="btn btn-primary" to="/">Ir al inicio</Link> : <button type="button" className="btn btn-primary" onClick={() => reload()}>Reintentar</button>}
              >
                {error?.code === "MATCH_NOT_FOUND" ? "Revisa el enlace: puede que la partida sea muy antigua o de otra región." : errorMessage(error)}
              </StateBox>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout header={{ variant: "search", region: region?.slug }}>
      <MatchHeader match={match} me={me} region={region} />
      <div className="container match-page">
        {!match.arena && <Objectives match={match} />}
        <Compare match={match} me={me} />
        <section aria-labelledby="board-title">
          <h2 className="section-title match-section-title" id="board-title">Marcador</h2>
          <div className="card match-board">
            <MatchDetail id="match-board" match={match} puuid={me?.puuid} region={region?.slug || null} />
          </div>
        </section>
      </div>
    </Layout>
  );
}

function MatchHeader({ match, me, region }) {
  const winner = match.participants.find(p => p.win && !p.remake);
  const remake = match.participants.some(p => p.remake);
  const result = me ? (me.remake ? "remake" : me.win ? "win" : "loss") : null;
  const date = new Date(match.start).toLocaleString("es", { dateStyle: "long", timeStyle: "short" });
  const splash = me ? championSplash(me.championId, me.championName) : null;
  const text = me
    ? `${me.gameName} ${me.win ? "ganó" : "perdió"} con ${championName(me.championId, me.championName)} (${me.kills}/${me.deaths}/${me.assists}) en Kairo:`
    : `Partida de ${queueLong(match.queueId)} en Kairo:`;

  return (
    <div className="profile-head match-head">
      {splash && (
        <div className="profile-splash loaded" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet={splash.narrow} />
            <img src={splash.wide} alt="" decoding="async" />
          </picture>
        </div>
      )}
      <div className="container match-head-inner">
        <div>
          <p className="eyebrow">
            {result && <span className={`match-chip ${result}`}>{result === "win" ? "Victoria" : result === "loss" ? "Derrota" : "Remake"}</span>}
            {queueLong(match.queueId)}
          </p>
          <h1 className="match-title">
            {me ? (
              <>
                <DDImg src={championIcon(me.championId, me.championName)} size={44} alt="" />
                {me.gameName} <span className="profile-tag">· {championName(me.championId, me.championName)}</span>
              </>
            ) : remake ? "Partida terminada en remake" : winner ? `Ganó el ${TEAM[winner.teamId]?.name.toLowerCase() || "equipo"}` : "Partida"}
          </h1>
          <p className="muted num">
            {mapName(match.mapId)} · {formatDuration(match.duration)} · {date}{region ? ` · ${region.label}` : ""}
          </p>
        </div>
        <div className="match-head-actions">
          {me && region && (
            <Link className="btn" to={profilePath(region.slug, me.gameName, me.tagLine)}><Icon name="chevronLeft" size={15} /> Perfil</Link>
          )}
          <ShareButton title="Partida en Kairo" text={text} className="btn btn-primary" />
        </div>
      </div>
    </div>
  );
}

/** Kills, torres, dragones… de cada equipo, frente a frente */
function Objectives({ match }) {
  const blue = match.teams?.find(t => t.teamId === 100);
  const red = match.teams?.find(t => t.teamId === 200);
  if (!blue || !red) return null;
  const gold = teamId => match.participants.filter(p => p.teamId === teamId).reduce((s, p) => s + p.gold, 0);
  const rows = [
    ...OBJECTIVES.filter(o => (blue.objectives[o.key] || 0) + (red.objectives[o.key] || 0) > 0)
      .map(o => ({ label: o.label, a: blue.objectives[o.key] || 0, b: red.objectives[o.key] || 0 })),
    { label: "Oro total", a: gold(100), b: gold(200), money: true },
  ];
  return (
    <section className="card objectives reveal" aria-label="Objetivos por equipo">
      <div className="objectives-head">
        <span className={`obj-team blue${blue.win ? " won" : ""}`}>Equipo azul {blue.win && <span className="obj-win">Victoria</span>}</span>
        <span className={`obj-team red${red.win ? " won" : ""}`}>{red.win && <span className="obj-win">Victoria</span>} Equipo rojo</span>
      </div>
      <ul className="obj-list">
        {rows.map((r, i) => {
          const total = r.a + r.b || 1;
          return (
            <li key={r.label} className="obj-row reveal" style={{ "--i": i }}>
              <strong className={`num${r.a > r.b ? " lead" : ""}`}>{r.money ? formatNumber(r.a) : r.a}</strong>
              <span className="obj-bar" aria-hidden="true">
                <span className="obj-a" style={{ "--w": r.a / total }} />
                <span className="obj-b" style={{ "--w": r.b / total }} />
              </span>
              <strong className={`num${r.b > r.a ? " lead" : ""}`}>{r.money ? formatNumber(r.b) : r.b}</strong>
              <span className="obj-label faint">{r.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Barras de los 10 jugadores para una estadística, agrupadas por equipo */
function Compare({ match, me }) {
  const [metric, setMetric] = useState("damage");
  const def = METRICS.find(m => m.key === metric);
  const max = Math.max(1, ...match.participants.map(p => p[metric] || 0));
  const teams = [...new Set(match.participants.map(p => p.teamId))].sort((a, b) => a - b);

  return (
    <section className="card match-compare" aria-labelledby="compare-title">
      <div className="match-compare-head">
        <h2 className="section-title" id="compare-title">Comparación</h2>
        <div className="segmented metric-tabs" role="group" aria-label="Estadística">
          {METRICS.map(m => (
            <button key={m.key} type="button" aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}>{m.label}</button>
          ))}
        </div>
      </div>
      <div className="compare-teams">
        {teams.map(teamId => (
          <div key={teamId} className={`compare-team ${TEAM[teamId]?.cls || ""}`}>
            <span className="compare-team-name">{TEAM[teamId]?.name || `Pareja ${teamId - 1000}`}</span>
            <ol className="bars">
              {match.participants.filter(p => p.teamId === teamId).sort((a, b) => (b[metric] || 0) - (a[metric] || 0)).map((p, i) => {
                const value = p[metric] || 0;
                const name = championName(p.championId, p.championName);
                return (
                  // key con la métrica: al cambiarla, las barras vuelven a crecer
                  <li key={`${metric}:${p.puuid}`} className={`bar-row${me?.puuid === p.puuid ? " me" : ""}`} style={{ "--i": i }}>
                    <DDImg src={championIcon(p.championId, p.championName)} size={28} alt={name} />
                    <span className="bar-name">{p.gameName || name}</span>
                    <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ "--w": value / max }} /></span>
                    <span className="bar-value num" aria-label={`${def.label}: ${formatNumber(value)}`}>{formatNumber(value)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

const MatchSkeleton = () => (
  <div aria-busy="true" aria-label="Cargando partida" className="match-skeleton-page">
    <Skeleton h={120} r={16} />
    <Skeleton h={220} r={16} />
    <Skeleton h={360} r={16} />
  </div>
);
