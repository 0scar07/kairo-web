import { Link } from "react-router-dom";
import { DDImg, Skeleton, StateBox } from "../../components/ui";
import { activityGrid, matchRecords, timeAgo } from "../../lib/lol";
import { championIcon, championName } from "../../lib/ddragon";
import { matchPath } from "../../lib/regions";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

/** Pestaña "Récords": sus mejores marcas en las partidas cargadas y un mapa de calor de cuándo juega */
export default function ActivityTab({ matches, puuid, who, loadMore }) {
  if (matches.loading) {
    return <div className="tab-section"><Skeleton h={180} r={16} /><Skeleton h={260} r={16} style={{ marginTop: 16 }} /></div>;
  }
  const list = matches.matches;
  const records = matchRecords(list, puuid);
  const grid = activityGrid(list, puuid);
  if (!records.length) {
    return <div className="tab-section card"><StateBox compact icon="trophy" title="Sin partidas para calcular">Cuando juegue partidas aparecerán aquí sus récords.</StateBox></div>;
  }

  return (
    <div className="tab-section activity">
      <section aria-labelledby="records-title">
        <div className="section-head">
          <h2 className="section-title" id="records-title">Récords</h2>
          <span className="faint">En sus últimas {list.length} partidas</span>
        </div>
        <ul className="records">
          {records.map((r, i) => {
            const champ = championName(r.me.championId, r.me.championName);
            return (
              <li key={r.key} className="reveal" style={{ "--i": i }}>
                <Link to={matchPath(r.match.id, who)} className={`record ${r.me.win ? "win" : "loss"}`}>
                  <span className="record-label eyebrow">{r.label}</span>
                  <strong className="record-value num">{r.display}</strong>
                  <span className="record-foot">
                    <DDImg src={championIcon(r.me.championId, r.me.championName)} size={22} alt="" />
                    <span className="faint">{champ} · {r.me.win ? "Victoria" : "Derrota"} · {timeAgo(r.match.end || r.match.start)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card heat-card" aria-labelledby="heat-title">
        <div className="section-head">
          <h2 className="section-title" id="heat-title">Cuándo juega</h2>
          {grid.peakDay !== null && <span className="faint">Más activo los <strong>{DAYS[grid.peakDay].toLowerCase()}</strong> cerca de las <strong className="num">{grid.peakHour}:00</strong></span>}
        </div>
        <div className="heat-scroll">
          <table className="heat" aria-label="Partidas por día y hora (hora local)">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Día</span></th>
                {Array.from({ length: 24 }, (_, h) => <th key={h} scope="col" className="num">{h % 3 === 0 ? h : ""}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.cells.map((row, d) => (
                <tr key={d}>
                  <th scope="row" title={DAYS[d]}>{DAYS_SHORT[d]}</th>
                  {row.map((c, h) => (
                    <td key={h}>
                      <span
                        className={`heat-cell${c.games ? " on" : ""}`}
                        style={{ "--a": grid.max ? c.games / grid.max : 0 }}
                        title={c.games ? `${DAYS[d]} ${h}:00 · ${c.games} ${c.games === 1 ? "partida" : "partidas"} · ${c.wins} ${c.wins === 1 ? "victoria" : "victorias"}` : `${DAYS[d]} ${h}:00 · sin partidas`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint heat-note">Hora de tu dispositivo. Más partidas cargadas dan un mapa más fiel.</p>
        {matches.hasMore && (
          <button type="button" className="btn btn-block load-more" onClick={loadMore} disabled={matches.loadingMore}>
            {matches.loadingMore ? <><span className="spinner" aria-hidden="true" /> Cargando…</> : "Cargar más partidas"}
          </button>
        )}
      </section>
    </div>
  );
}
