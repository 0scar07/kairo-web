import { Link } from "react-router-dom";
import CountUp from "../components/CountUp";
import Icon from "../components/Icon";
import { DDImg } from "../components/ui";
import { formatNumber, timeAgo } from "../lib/lol";

// Piezas comunes de los perfiles de los demás juegos (Supercell, Dota 2, Fortnite, Apex). Usan el color de acento del
// juego (--game) y las mismas animaciones de la web (reveal, CountUp).

/** Número animado si es un número; si no, el texto tal cual */
export const Num = ({ value, suffix = "", decimals = 0 }) =>
  typeof value === "number" && Number.isFinite(value)
    ? <CountUp value={value} decimals={decimals} suffix={suffix} format={decimals ? undefined : formatNumber} />
    : <>{value ?? "—"}</>;

/** Tarjeta con un título y una cuadrícula de estadísticas: items = [{ label, value, tone?, suffix?, decimals? }] */
export function StatCard({ title, icon, items, index = 0 }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <section className="card gp-stats reveal" style={{ "--i": index }}>
      <h2 className="gp-card-title">{icon && <Icon name={icon} size={15} />} {title}</h2>
      <dl className="gp-stat-grid">
        {shown.map(s => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd className={`num ${s.tone || ""}`}><Num value={s.value} suffix={s.suffix} decimals={s.decimals} /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Tira de resultados recientes (verde victoria, rojo derrota) con el resumen */
export function ResultsStrip({ tones, wins, losses }) {
  if (!tones.length) return null;
  return (
    <div className="gp-strip-wrap">
      <span className="eyebrow">Resultados recientes</span>
      <span className="num gp-strip-sum"><span className="win">{wins}V</span> <span className="loss">{losses}D</span></span>
      <ol className="form-strip gp-strip">
        {tones.map((t, i) => <li key={i} className={`form-pip ${t === "gold" ? "win" : t}`}><span className="sr-only">{t === "loss" ? "Derrota" : t === "draw" ? "Empate" : "Victoria"}</span></li>)}
      </ol>
    </div>
  );
}

/** Fila de una batalla o partida. `to`: la fila entera abre esa página (detalle de la partida) */
export function BattleRow({ tone, label, image, imageAlt = "", title, subtitle, value, valueTone, time, index = 0, extra, to }) {
  return (
    <li className={`gp-battle tone-${tone} reveal`} style={{ "--i": Math.min(index, 12) }}>
      {to && <Link to={to} className="stretched" aria-label={`Ver partida: ${title}`} />}
      <span className="gp-battle-bar" aria-hidden="true" />
      <span className={`gp-battle-result ${tone}`}>{label}</span>
      {image !== undefined && <DDImg src={image} size={40} alt={imageAlt} className="gp-battle-img" />}
      <span className="gp-battle-text">
        <strong>{title}</strong>
        {subtitle && <span className="faint">{subtitle}</span>}
        {extra}
      </span>
      <span className="gp-battle-value">
        {value != null && <strong className={`num ${valueTone || ""}`}>{value}</strong>}
        {time ? <span className="faint">{timeAgo(time)}</span> : null}
      </span>
    </li>
  );
}

/** Lista de batallas con su tira de resultados; muestra un estado vacío si no hay */
export function BattleList({ title, children, tones, wins, losses, empty }) {
  return (
    <section className="gp-battles" aria-label={title}>
      <ResultsStrip tones={tones} wins={wins} losses={losses} />
      <h2 className="gp-section-title">{title}</h2>
      {children?.length ? <ul className="gp-battle-list">{children}</ul> : <div className="card"><p className="gp-empty">{empty}</p></div>}
    </section>
  );
}
