import { useId } from "react";
import CountUp from "../../components/CountUp";
import Icon from "../../components/Icon";
import { DDImg, Skeleton } from "../../components/ui";
import { championIcon, championName } from "../../lib/ddragon";
import { championStats, findMe, kdaTone, roleStats, summarize } from "../../lib/lol";

// Íconos de posición de la Grieta (dibujo propio, al estilo de los del cliente): la parte llena es el carril
const ROLE_PATHS = {
  TOP: { on: "M3 3h15l-4 4H7v7l-4 4z", off: "M10 10h11v11H10z" },
  JUNGLE: { on: "M7.5 3c-.6 5.2.9 9.4 4.5 15 3.6-5.6 5.1-9.8 4.5-15-1.3 3.7-2.7 6.3-4.5 8.4C10.2 9.3 8.8 6.7 7.5 3zM4 7.5c.8 3 2.2 5.8 4.4 8.3-.4-2.6-1.8-5.4-4.4-8.3zM20 7.5c-2.6 2.9-4 5.7-4.4 8.3 2.2-2.5 3.6-5.3 4.4-8.3z", off: "" },
  MIDDLE: { on: "M16.5 3H21v4.5L7.5 21H3v-4.5z", off: "M3 3h8.5L3 11.5zM21 21h-8.5l8.5-8.5z" },
  BOTTOM: { on: "M21 21H6l4-4h7v-7l4-4z", off: "M3 3h11v11H3z" },
  UTILITY: { on: "M12 8.5l2.6 2.6L12 20l-2.6-8.9zM2 7.5h6.2l2 2.7-3 2.3H4.6zM22 7.5h-6.2l-2 2.7 3 2.3h2.6zM9.6 3h4.8L12 6.2z", off: "" },
};

export function RoleIcon({ role, size = 18 }) {
  const p = ROLE_PATHS[role];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="role-icon">
      {p.off && <path d={p.off} fill="currentColor" opacity=".28" />}
      <path d={p.on} fill="currentColor" />
    </svg>
  );
}

/** Anillo de victorias y derrotas con el winrate en el centro */
function WinDonut({ wins, losses }) {
  const total = wins + losses;
  const wr = total ? wins / total : 0;
  const R = 42, C = 2 * Math.PI * R;
  return (
    <div className="donut" role="img" aria-label={`${Math.round(wr * 100)}% de victorias: ${wins} victorias y ${losses} derrotas`}>
      <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="donut-loss" />
        {wins > 0 && <circle cx="50" cy="50" r={R} className="donut-win" strokeDasharray={`${C * wr} ${C}`} transform="rotate(-90 50 50)" />}
      </svg>
      <span className="donut-label num"><CountUp value={Math.round(wr * 100)} suffix="%" /></span>
    </div>
  );
}

/**
 * Resumen de las partidas cargadas (de la cola elegida y, si se escribió, del campeón buscado):
 * victorias, KDA, participación, los 3 campeones más jugados y el rol preferido.
 */
export default function RecentCard({ matches, puuid, loading, query, setQuery, queueLabel }) {
  const searchId = useId();
  const s = summarize(matches, puuid);
  const champs = championStats(matches, puuid).slice(0, 3);
  const roles = roleStats(matches, puuid);
  const games = matches.filter(m => findMe(m, puuid)).length;
  const avg = s ? avgKda(matches, puuid) : null;

  return (
    <section className="card recent-card reveal" style={{ "--i": 0 }} aria-label="Partidas recientes">
      <header className="recent-head">
        <h2>Partidas recientes</h2>
        <label className="champ-search" htmlFor={searchId}>
          <Icon name="search" size={15} />
          <span className="sr-only">Buscar un campeón</span>
          <input id={searchId} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca un campeón" autoComplete="off" spellCheck="false" />
        </label>
      </header>

      {loading ? (
        <div className="recent-body"><Skeleton w={104} h={104} r={52} /><Skeleton h={90} style={{ flex: 1 }} /><Skeleton h={90} style={{ flex: 1 }} /></div>
      ) : !s ? (
        <p className="recent-empty">{query ? "No hay partidas con ese campeón entre las cargadas." : "Sin partidas para resumir."}</p>
      ) : (
        <div className="recent-body">
          <div className="recent-col recent-overall">
            <span className="recent-label num">{games}P {s.wins}V {s.losses}D</span>
            <div className="recent-overall-row">
              <WinDonut wins={s.wins} losses={s.losses} />
              <div className="recent-kda">
                <span className="faint num">{avg.k.toFixed(1)} / <span className="loss">{avg.d.toFixed(1)}</span> / {avg.a.toFixed(1)}</span>
                <strong className={`num ${kdaTone(s.kda)}`}>{s.kda === Infinity ? "Perfecto" : <CountUp value={s.kda} decimals={2} suffix=" : 1" />}</strong>
                <span className="loss num">P/Kill <CountUp value={s.kp} suffix="%" /></span>
              </div>
            </div>
          </div>

          <div className="recent-col recent-champs">
            <span className="recent-label">Campeones jugados en las últimas {games} partidas</span>
            <ul>
              {champs.map(c => {
                const name = championName(c.championId, c.championName);
                return (
                  <li key={c.championId}>
                    <DDImg src={championIcon(c.championId, c.championName)} size={26} alt={name} round />
                    <span className={`num ${c.wr >= 60 ? "kda-5" : c.wr >= 50 ? "win" : "loss"}`}><strong>{c.wr}%</strong></span>
                    <span className="faint num">({c.wins}V / {c.games - c.wins}D)</span>
                    <span className={`num ${kdaTone(c.kda)}`}>{c.kda === Infinity ? "Perfecto" : `${c.kda.toFixed(2)}:1`} KDA</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="recent-col recent-roles">
            <span className="recent-label">Rol preferido{queueLabel ? ` (${queueLabel})` : ""}</span>
            {roles.total ? (
              <ul className="role-bars">
                {roles.roles.map(r => (
                  <li key={r.key} title={`${r.label}: ${r.games} ${r.games === 1 ? "partida" : "partidas"}`}>
                    <span className="role-track"><span className="role-fill" style={{ transform: `scaleY(${r.share})` }} /></span>
                    <RoleIcon role={r.key} />
                    <span className="sr-only">{r.label}: {r.games} partidas</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="recent-empty small">Sin partidas con rol (ARAM y Arena no tienen carriles).</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function avgKda(matches, puuid) {
  let k = 0, d = 0, a = 0, n = 0;
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake) continue;
    k += me.kills; d += me.deaths; a += me.assists; n++;
  }
  return n ? { k: k / n, d: d / n, a: a / n } : { k: 0, d: 0, a: 0 };
}
