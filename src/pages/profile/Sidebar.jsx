import { DDImg, RankEmblem, Skeleton } from "../../components/ui";
import CountUp from "../../components/CountUp";
import Icon from "../../components/Icon";
import { rankLabel, rankScore, tierColor, winrate } from "../../lib/lol";
import { championIcon, championName } from "../../lib/ddragon";

const wrClass = wr => (wr >= 50 ? "win" : "loss");

// Color de la liga para teñir la tarjeta (fondo, borde, brillo y barra de LP); gris si no tiene rango
const tierStyle = (entry, i) => ({ "--i": i, "--tier": entry ? tierColor(entry.tier) : "var(--text-3)" });

/** Emblema con un brillo suave del color de la liga detrás */
const GlowEmblem = ({ entry, size }) => (
  <span className={`rank-glow${entry ? "" : " none"}`}>
    <RankEmblem tier={entry?.tier ?? null} rank={entry?.rank} size={size} />
  </span>
);

// ─── Tarjetas de rango (estilo op.gg) ────────────────────────────────────
const QUEUE_INFO = "Temporada actual. La API de Riot no ofrece el rango de temporadas pasadas.";

/** Mejor rango de los últimos 30 días según las fotos diarias del backend, si supera al actual */
function peakOf(history, queue, entry) {
  const current = entry ? rankScore(entry.tier, entry.rank, entry.leaguePoints) : null;
  let best = null;
  for (const snap of history || []) {
    const e = snap[queue];
    if (e && Number.isFinite(e.score) && (!best || e.score > best.score)) best = e;
  }
  return best && current !== null && best.score > current ? best : null;
}

function RankedCard({ title, entry, error, history, queue, index, emptyText, big = false }) {
  const wr = entry ? winrate(entry.wins, entry.losses) : null;
  const peak = peakOf(history, queue, entry);
  return (
    <section className={`card ranked tier-card reveal${entry ? "" : " unranked"}${big ? " big" : ""}`} style={tierStyle(entry, index)} aria-label={title}>
      <header className="ranked-head">
        <h2>{title}</h2>
        <span className="ranked-info" title={QUEUE_INFO} aria-label={QUEUE_INFO} role="img"><Icon name="info" size={14} /></span>
      </header>
      <div className="ranked-body">
        <span className="ranked-emblem"><GlowEmblem entry={entry} size={big ? 62 : 46} /></span>
        <div className="ranked-text">
          <strong className="ranked-tier" style={entry ? { color: tierColor(entry.tier) } : undefined}>{entry ? rankLabel(entry.tier, entry.rank) : "Sin clasificar"}</strong>
          <span className="faint num">{entry ? <><CountUp value={entry.leaguePoints} /> LP</> : (error ? "No se pudo cargar el rango" : emptyText)}</span>
        </div>
        {entry && (
          <div className="ranked-record">
            <span className="faint num">{entry.wins}V {entry.losses}D</span>
            <span className="num">Winrate <strong className={wrClass(wr)}><CountUp value={wr} suffix="%" /></strong></span>
          </div>
        )}
      </div>
      {peak && (
        <div className="ranked-peak">
          <span className="ranked-emblem small"><RankEmblem tier={peak.tier} rank={peak.rank} size={30} /></span>
          <div className="ranked-text">
            <strong>{rankLabel(peak.tier, peak.rank)}</strong>
            <span className="faint num">{peak.lp} LP</span>
          </div>
          <span className="peak-badge" title="El rango más alto que guardó Kairo en los últimos 30 días">Mejor nivel · 30 días</span>
        </div>
      )}
    </section>
  );
}

export const SoloCard = ({ entry, error, history }) => (
  <RankedCard title="Clasificatoria Solo/Dúo" entry={entry} error={error} history={history} queue="solo" index={0} emptyText="Aún no juega Solo/Dúo esta temporada" big />
);

export const FlexCard = ({ entry, history }) => (
  <RankedCard title="Clasificatoria flexible" entry={entry} history={history} queue="flex" index={1} emptyText="Aún no juega Flex esta temporada" />
);

// ─── Gráfico de LP (últimos 30 días) ─────────────────────────────────────
export function LpChart({ history, soloEntry }) {
  const series = (history || [])
    .filter(s => s.solo && Number.isFinite(s.solo.score))
    .map(s => ({ day: s.day, score: s.solo.score, entry: s.solo }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  let body;
  if (!history) {
    body = <p className="chart-note">El historial de LP no está disponible ahora.</p>;
  } else if (!soloEntry && !series.length) {
    body = <p className="chart-note">Sin partidas Solo/Duo para graficar.</p>;
  } else if (series.length < 2) {
    body = <p className="chart-note">Kairo empezó a guardar su LP hoy: el gráfico suma un punto por día.</p>;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const change = series.length >= 2 ? last.score - first.score : null;

  return (
    <section className="card card-pad lp-card reveal" style={{ "--i": 1 }} aria-label="LP de los últimos 30 días">
      <div className="lp-head">
        <p className="eyebrow">LP · Últimos 30 días</p>
        {change !== null && <span className={`lp-change num ${change >= 0 ? "brand" : "loss"}`}><CountUp value={change} prefix={change >= 0 ? "+" : ""} suffix=" LP" /></span>}
      </div>
      {body || (
        <>
          <Sparkline points={series.map(p => p.score)} />
          <div className="lp-foot faint">
            <span>{rankLabel(first.entry.tier, first.entry.rank)}</span>
            <span>{rankLabel(last.entry.tier, last.entry.rank)}</span>
          </div>
        </>
      )}
    </section>
  );
}

function Sparkline({ points }) {
  const W = 240, H = 84, PAD = 6;
  const min = Math.min(...points), max = Math.max(...points);
  const span = Math.max(max - min, 40);
  const x = i => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = v => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lx = x(points.length - 1), ly = y(points[points.length - 1]);
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Puntos de liga: de ${points[0]} a ${points[points.length - 1]}`}>
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="spark-grid" />)}
      <path d={d} className="spark-line" />
      <circle cx={lx} cy={ly} r="3" className="spark-dot" />
    </svg>
  );
}

// ─── Campeones de las partidas cargadas ──────────────────────────────────
export function ChampionsCard({ stats, games, loading }) {
  return (
    <section className="card card-pad champs-card reveal" style={{ "--i": 3 }} aria-label="Campeones">
      <p className="eyebrow">Campeones · {games ? `Últimas ${games} partidas` : "Partidas recientes"}</p>
      {loading ? (
        <ul className="champ-list">{[0, 1, 2, 3, 4].map(i => (
          <li key={i}><Skeleton w={30} h={30} r={8} /><div style={{ flex: 1 }}><Skeleton w="50%" h={12} /><Skeleton w="70%" h={10} style={{ marginTop: 5 }} /></div></li>
        ))}</ul>
      ) : !stats.length ? (
        <p className="chart-note">Sin partidas para calcular estadísticas.</p>
      ) : (
        <ul className="champ-list">
          {stats.slice(0, 5).map((c, i) => {
            const name = championName(c.championId, c.championName);
            return (
              <li key={c.championId} className="reveal" style={{ "--i": i + 4 }}>
                <DDImg src={championIcon(c.championId, c.championName)} size={30} alt={name} />
                <div className="champ-text">
                  <strong>{name}</strong>
                  <span className="faint num">{c.kda === Infinity ? "KDA perfecto" : `${c.kda.toFixed(1)} KDA`} · {c.games} {c.games === 1 ? "partida" : "partidas"}</span>
                </div>
                <span className={`champ-wr num ${wrClass(c.wr)}`}><CountUp value={c.wr} suffix="%" /></span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

