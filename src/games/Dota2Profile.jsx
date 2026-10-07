import { DDImg } from "../components/ui";
import { formatDuration, formatNumber, kdaText, winrate } from "../lib/lol";
import { StatCard, BattleList, BattleRow } from "./ui";
import { heroIcon, heroName, matchPath as dotaMatchPath, medalIcon, medalOf, modeLabel, rankLabel, starIcon } from "./dota2";

/** Medalla de rango con sus estrellas (imágenes de OpenDota, como la app) */
export function DotaMedal({ rankTier, size = 64 }) {
  const m = medalOf(rankTier);
  const medal = medalIcon(m);
  if (!medal) return null;
  return (
    <span className="dota-medal" style={{ width: size, height: size }}>
      <img src={medal} alt="" width={size} height={size} loading="lazy" />
      {starIcon(m) && <img src={starIcon(m)} alt="" width={size} height={size} loading="lazy" />}
    </span>
  );
}

export function Dota2Body({ data }) {
  const { player, heroes } = data;
  const total = player.wins + player.losses;
  const recent = player.recent || [];
  const isPrivate = total === 0 && recent.length === 0;
  return (
    <div className="gp-grid">
      <aside className="gp-side">
        <section className="card gp-stats dota-rank reveal" style={{ "--i": 0 }}>
          <h2 className="gp-card-title">Rango</h2>
          <div className="dota-rank-body">
            <DotaMedal rankTier={player.rankTier} size={72} />
            <span className="gp-row-text">
              <strong className="dota-rank-name">{rankLabel(player.rankTier, player.leaderboardRank)}</strong>
              {player.leaderboardRank ? <span className="faint">Puesto {formatNumber(player.leaderboardRank)} del ranking mundial</span> : null}
            </span>
          </div>
        </section>
        <StatCard index={1} title="Historial" icon="history" items={[
          { label: "Victorias", value: player.wins, tone: "win" },
          { label: "Derrotas", value: player.losses, tone: "loss" },
          total > 0 && { label: "Winrate", value: winrate(player.wins, player.losses), suffix: "%" },
        ]} />
        {player.heroes?.length > 0 && (
          <section className="card gp-list-card reveal" style={{ "--i": 2 }}>
            <h2 className="gp-card-title">Héroes más jugados</h2>
            <ul className="gp-rows">
              {player.heroes.map(h => {
                const wr = winrate(h.wins, h.games - h.wins);
                return (
                  <li key={h.heroId}>
                    <DDImg src={heroIcon(heroes, h.heroId)} size={34} alt={heroName(heroes, h.heroId)} className="gp-row-img" />
                    <span className="gp-row-text"><strong>{heroName(heroes, h.heroId)}</strong><span className="faint num">{formatNumber(h.games)} partidas</span></span>
                    <span className="gp-row-value"><strong className={`num ${wr >= 50 ? "win" : "loss"}`}>{wr}%</strong><span className="faint">winrate</span></span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </aside>
      {isPrivate ? (
        <div className="card"><p className="gp-empty">
          Este jugador no comparte sus partidas públicas, así que faltan datos. Puede activarlo en Dota 2: Ajustes &gt; Opciones &gt;
          Social &gt; Exponer datos públicos de partidas.
        </p></div>
      ) : (
        <BattleList
          title={`Últimas ${recent.length} partidas`}
          tones={recent.slice(0, 20).map(m => (m.win ? "win" : "loss"))}
          wins={recent.filter(m => m.win).length}
          losses={recent.filter(m => !m.win).length}
          empty="No hay partidas recientes."
        >
          {recent.map((m, i) => (
            <BattleRow
              key={m.matchId} index={i} tone={m.win ? "win" : "loss"} label={m.win ? "Victoria" : "Derrota"} to={dotaMatchPath(m.matchId)}
              image={heroIcon(heroes, m.heroId)} imageAlt={heroName(heroes, m.heroId)}
              title={heroName(heroes, m.heroId)}
              subtitle={`${modeLabel(m.gameMode, m.lobbyType)} · ${formatDuration(m.duration)} · ${formatNumber(m.goldPerMin)} oro/min`}
              value={<>{m.kills} / <span className="loss">{m.deaths}</span> / {m.assists}</>}
              extra={<span className="faint num">{kdaText(m.kills, m.deaths, m.assists)} KDA · {formatNumber(m.lastHits)} last hits</span>}
              time={m.startTime * 1000}
            />
          ))}
        </BattleList>
      )}
    </div>
  );
}
