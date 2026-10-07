import CountUp from "../../components/CountUp";
import RoleIcon from "../../components/RoleIcon";
import Icon from "../../components/Icon";
import { DDImg, Skeleton } from "../../components/ui";
import {
  championIcon, championName, championSplash, itemIcon, itemName, perkIcon, perkName, spellIcon, spellName,
} from "../../lib/ddragon";
import {
  championStats, currentStreak, findMe, formatDuration, formatNumber, kdaTone, kdaValue, mapName, matchHighlights, positionName,
  queueLong, roleStats, summarize, timeAgo,
} from "../../lib/lol";

/**
 * "Tu última partida": la partida más reciente (de la cola elegida) con el splash del campeón de fondo, el resultado,
 * el K/D/A en grande, estadísticas en mosaicos e insignias. Al lado, la forma reciente: las últimas partidas como una
 * tira de resultados, la racha actual y el rol principal.
 */
export default function LastMatchCard({ matches, puuid, loading }) {
  if (loading) {
    return (
      <div className="kairo-spotlight">
        <div className="card spotlight"><Skeleton h={232} r={16} /></div>
        <div className="card form-panel"><Skeleton h={232} r={16} /></div>
      </div>
    );
  }
  const last = matches[0];
  const h = last ? matchHighlights(last, puuid) : null;
  if (!h) return null;
  return (
    <div className="kairo-spotlight">
      <Spotlight match={last} h={h} />
      <FormPanel matches={matches} puuid={puuid} />
    </div>
  );
}

function Spotlight({ match, h }) {
  const { me } = h;
  const result = me.remake ? "remake" : me.win ? "win" : "loss";
  const name = championName(me.championId, me.championName);
  const splash = championSplash(me.championId, me.championName);
  const kda = kdaValue(me.kills, me.deaths, me.assists);
  const tiles = [
    { label: "CS", value: <CountUp value={me.cs} />, sub: `${h.csMin.toFixed(1)} por min` },
    { label: "Daño", value: <CountUp value={me.damage} format={formatNumber} />, sub: `${h.damageShare}% del equipo` },
    { label: "Oro", value: <CountUp value={me.gold} format={formatNumber} />, sub: "ganado" },
    { label: "Visión", value: <CountUp value={me.vision} />, sub: "puntaje" },
    { label: "Participación", value: <CountUp value={h.kp} suffix="%" />, sub: "en kills" },
  ];

  return (
    <section className={`card spotlight spotlight-${result} reveal`} style={{ "--i": 0 }} aria-label="Tu última partida">
      {splash && (
        <span className="spotlight-art" aria-hidden="true">
          <img src={splash.wide} alt="" decoding="async" />
        </span>
      )}
      <div className="spotlight-body">
        <header className="spotlight-head">
          <span className="eyebrow">Tu última partida</span>
          <span className={`result-chip ${result}`}>{result === "win" ? "Victoria" : result === "loss" ? "Derrota" : "Remake"}</span>
          <span className="spotlight-meta faint">
            {queueLong(match.queueId)} · {mapName(match.mapId)} · {formatDuration(match.duration)} · {timeAgo(match.end || match.start + match.duration * 1000)}
          </span>
        </header>

        <div className="spotlight-main">
          <div className="spotlight-champ">
            <span className="spotlight-portrait">
              <DDImg src={championIcon(me.championId, me.championName)} size={68} alt={name} />
              <span className="champ-level num">{me.champLevel}</span>
            </span>
            <div className="spotlight-name">
              <strong>{name}</strong>
              <span className="faint">{positionName(me.position) || "Sin carril"}</span>
              <span className="spotlight-loadout">
                <DDImg src={spellIcon(me.spells[0])} size={20} alt={spellName(me.spells[0])} />
                <DDImg src={spellIcon(me.spells[1])} size={20} alt={spellName(me.spells[1])} />
                <DDImg src={perkIcon(me.keystone)} size={20} round alt={perkName(me.keystone)} />
                <DDImg src={perkIcon(me.secondary)} size={20} round alt={perkName(me.secondary)} />
              </span>
            </div>
          </div>

          <div className="spotlight-kda">
            <strong className="num">
              <CountUp value={me.kills} /><span className="slash">/</span><span className="loss"><CountUp value={me.deaths} /></span><span className="slash">/</span><CountUp value={me.assists} />
            </strong>
            <span className={`num ${kdaTone(kda)}`}>{kda === Infinity ? "KDA perfecto" : <><CountUp value={kda} decimals={2} /> KDA</>}</span>
          </div>

          <div className="spotlight-items" aria-label="Objetos">
            {me.items.map((id, i) => <DDImg key={i} src={itemIcon(id)} size={28} alt={itemName(id)} className={i === 6 ? "trinket" : ""} />)}
          </div>
        </div>

        <ul className="spotlight-tiles">
          {tiles.map((t, i) => (
            <li key={t.label} className="reveal" style={{ "--i": i + 1 }}>
              <span className="tile-label">{t.label}</span>
              <strong className="tile-value num">{t.value}</strong>
              <span className="tile-sub faint">{t.sub}</span>
            </li>
          ))}
        </ul>

        {h.badges.length > 0 && (
          <ul className="spotlight-badges" aria-label="Logros de la partida">
            {h.badges.map(b => <li key={b.key} className={`badge badge-${b.tone}`}>{b.label}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Anillo de winrate (verde = victorias sobre rojo) con el porcentaje que cuenta en el centro */
function WinRing({ wr }) {
  const R = 26, C = 2 * Math.PI * R;
  return (
    <span className="win-ring" role="img" aria-label={`${wr}% de victorias`}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r={R} className="win-ring-track" />
        <circle cx="32" cy="32" r={R} className="win-ring-fill" strokeDasharray={`${(C * wr) / 100} ${C}`} transform="rotate(-90 32 32)" />
      </svg>
      <span className="win-ring-label num" aria-hidden="true"><CountUp value={wr} suffix="%" /></span>
    </span>
  );
}

function FormPanel({ matches, puuid }) {
  const recent = matches.slice(0, 20);
  const s = summarize(recent, puuid);
  const streak = currentStreak(recent, puuid);
  const roles = roleStats(recent, puuid);
  const main = roles.total ? [...roles.roles].sort((a, b) => b.games - a.games)[0] : null;
  const remakes = recent.filter(m => findMe(m, puuid)?.remake).length;
  const star = championStats(recent, puuid)[0];
  const hot = streak && streak.count >= 2 ? (streak.win ? "hot" : "cold") : "";
  return (
    <section className={`card form-panel ${hot} reveal`} style={{ "--i": 1 }} aria-label="Forma reciente">
      <div className="form-top">
        <div className="form-title">
          <span className="eyebrow">Forma reciente</span>
          {s && (
            <p className="form-record num">
              <strong>{s.wins}V <span className="faint">/</span> {s.losses}D</strong>
              <span className="faint">en {s.games} partidas</span>
            </p>
          )}
        </div>
        {s && <WinRing wr={s.wr} />}
      </div>

      {streak && streak.count >= 2 && (
        <span className={`streak-chip ${streak.win ? "win" : "loss"}`}>
          <Icon name="flame" size={14} /> {streak.count} {streak.win ? "victorias" : "derrotas"} seguidas
        </span>
      )}

      {/* Ecualizador: de izquierda a derecha, de la más reciente a la más vieja */}
      <ol className="form-bars" aria-label="Resultados de las últimas partidas, de la más reciente a la más vieja">
        {recent.map((m, i) => {
          const me = findMe(m, puuid);
          const r = !me ? "none" : me.remake ? "remake" : me.win ? "win" : "loss";
          const label = r === "win" ? "Victoria" : r === "loss" ? "Derrota" : "Remake";
          const detail = me ? `${label} · ${championName(me.championId, me.championName)} · ${me.kills}/${me.deaths}/${me.assists}` : label;
          return (
            <li key={m.id} className={`form-bar ${r}`} style={{ "--i": i }} title={detail}>
              <span className="form-bar-fill" />
              <span className="sr-only">{detail}</span>
            </li>
          );
        })}
      </ol>
      <div className="form-legend faint">
        <span>Más reciente</span>
        {remakes > 0 && <span>{remakes === 1 ? "1 remake" : `${remakes} remakes`} en gris (no cuentan)</span>}
      </div>

      <div className="form-tiles">
        {s && (
          <div className="form-tile">
            <span className="tile-label">KDA medio</span>
            <strong className={`num ${kdaTone(s.kda)}`}>{s.kda === Infinity ? "Perfecto" : <CountUp value={s.kda} decimals={2} />}</strong>
          </div>
        )}
        {main && (
          <div className="form-tile">
            <span className="tile-label">Rol principal</span>
            <strong className="form-role"><span className="role-badge"><RoleIcon role={main.key} size={14} /></span>{main.label}</strong>
            <span className="faint num">{main.games} de {roles.total} partidas</span>
          </div>
        )}
        {star && (
          <div className="form-tile form-star">
            <span className="tile-label">Campeón estrella</span>
            <span className="form-star-row">
              <DDImg src={championIcon(star.championId, star.championName)} size={30} alt="" />
              <span className="form-star-text">
                <strong>{championName(star.championId, star.championName)}</strong>
                <span className="num"><span className={star.wr >= 50 ? "win" : "loss"}>{star.wr}%</span> <span className="faint">en {star.games}</span></span>
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
