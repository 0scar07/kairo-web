import { DDImg, RankEmblem, Skeleton } from "../../components/ui";
import CountUp from "../../components/CountUp";
import { isApex, rankLabel, tierColor, winrate } from "../../lib/lol";
import { championIcon, championName } from "../../lib/ddragon";

const wrClass = wr => (wr >= 50 ? "win" : "loss");

// ─── Rango Solo/Duo ──────────────────────────────────────────────────────
export function SoloCard({ entry, error }) {
  const wr = entry ? winrate(entry.wins, entry.losses) : null;
  return (
    <section className="card card-pad rank-card reveal" style={{ "--i": 0 }} aria-label="Clasificatoria Solo/Duo">
      <p className="eyebrow">Clasificatoria Solo/Duo</p>
      {entry ? (
        <>
          <div className="rank-main">
            <RankEmblem tier={entry.tier} rank={entry.rank} size={44} />
            <div className="rank-text">
              <strong className="rank-name" style={{ color: tierColor(entry.tier) }}>{rankLabel(entry.tier, entry.rank)}</strong>
              <span className="faint num"><CountUp value={entry.leaguePoints} /> LP · {entry.wins}V {entry.losses}D</span>
            </div>
            {wr !== null && <span className={`rank-wr num ${wrClass(wr)}`}><CountUp value={wr} suffix="%" /></span>}
          </div>
          {!isApex(entry.tier) && (
            <div className="lp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={entry.leaguePoints} aria-label="LP de la división">
              <span style={{ width: `${Math.min(100, entry.leaguePoints)}%` }} />
            </div>
          )}
        </>
      ) : (
        <div className="rank-main">
          <RankEmblem tier={null} size={44} />
          <div className="rank-text">
            <strong className="rank-name">Sin clasificar</strong>
            <span className="faint">{error ? "No se pudo cargar el rango" : "Aún no juega Solo/Duo esta temporada"}</span>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Rango Flex ──────────────────────────────────────────────────────────
export function FlexCard({ entry }) {
  const wr = entry ? winrate(entry.wins, entry.losses) : null;
  return (
    <section className="card flex-card reveal" style={{ "--i": 2 }} aria-label="Clasificatoria Flex 5v5">
      <RankEmblem tier={entry?.tier} rank={entry?.rank} size={34} />
      <div className="rank-text">
        <p className="eyebrow">Flex 5v5</p>
        <strong className="flex-name">{entry ? <>{rankLabel(entry.tier, entry.rank)} · <CountUp value={entry.leaguePoints} /> LP</> : "Sin clasificar"}</strong>
      </div>
      {wr !== null && <span className="flex-wr num"><CountUp value={wr} suffix="%" /></span>}
    </section>
  );
}

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

