import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import { DDImg } from "../../components/ui";
import { championIcon, championName, itemIcon, itemName, perkIcon, perkName, spellIcon, spellName } from "../../lib/ddragon";
import { findMe, formatDuration, formatNumber, kdaText, killParticipation, placementLabel, positionName, queueShort, timeAgo } from "../../lib/lol";
import { profilePath } from "../../lib/regions";

const resultOf = me => (me.remake ? "remake" : me.win ? "win" : "loss");
const RESULT_LABEL = { win: "Victoria", loss: "Derrota", remake: "Remake" };

/** Hechizos (arriba) y runas (abajo) en una cuadrícula de 2x2 */
function Loadout({ p, size = 18 }) {
  return (
    <div className="loadout" style={{ gridTemplateColumns: `repeat(2, ${size}px)` }}>
      <DDImg src={spellIcon(p.spells[0])} size={size} alt={spellName(p.spells[0])} />
      <DDImg src={spellIcon(p.spells[1])} size={size} alt={spellName(p.spells[1])} />
      <DDImg src={perkIcon(p.keystone)} size={size} alt={perkName(p.keystone)} round className="perk" />
      <DDImg src={perkIcon(p.secondary)} size={size} alt={perkName(p.secondary)} round className="perk perk-secondary" />
    </div>
  );
}

function Items({ items, size = 22 }) {
  return (
    <div className="items">
      {items.map((id, i) => (
        <DDImg key={i} src={itemIcon(id)} size={size} className={i === 6 ? "trinket" : ""} alt={itemName(id)} />
      ))}
    </div>
  );
}

export default function MatchRow({ match, puuid, region }) {
  const [open, setOpen] = useState(false);
  const me = findMe(match, puuid);
  if (!me) return null;
  const result = resultOf(me);
  const minutes = match.duration / 60;
  const champ = championName(me.championId, me.championName);
  const detailId = `match-${match.id}`;
  const kda = kdaText(me.kills, me.deaths, me.assists);

  return (
    <article className={`match match-${result}`}>
      <div className="match-row">
        <span className="match-bar" aria-hidden="true" />
        <div className="match-result">
          <strong className="match-result-label">{RESULT_LABEL[result]}</strong>
          <span className="match-queue">{queueShort(match.queueId)}{match.arena && me.placement ? ` · ${placementLabel(me.placement)}` : ""}</span>
          <span className="faint num">{formatDuration(match.duration)} · {timeAgo(match.end || match.start + match.duration * 1000)}</span>
        </div>

        <div className="match-champ">
          <div className="champ-wrap">
            <DDImg src={championIcon(me.championId, me.championName)} size={40} alt={champ} />
            <span className="champ-level num" aria-label={`Nivel ${me.champLevel}`}>{me.champLevel}</span>
          </div>
          <Loadout p={me} />
        </div>

        <div className="match-kda">
          <strong className="num">
            {me.kills} <span className="slash">/</span> <span className="loss">{me.deaths}</span> <span className="slash">/</span> {me.assists}
          </strong>
          <span className="faint num">{kda === "Perfecto" ? "KDA perfecto" : `${kda} KDA`}</span>
        </div>

        <div className="match-stats faint num">
          <span>{me.cs} ({minutes > 0 ? (me.cs / minutes).toFixed(1) : "0.0"}) CS</span>
          <span>{killParticipation(match, me)}% part.</span>
        </div>

        <Items items={me.items} />

        <button
          type="button"
          className="btn btn-icon match-toggle"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={open ? "Ocultar detalle de la partida" : "Ver detalle de la partida"}
          onClick={() => setOpen(v => !v)}
        >
          <Icon name="chevronDown" size={16} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
        </button>
      </div>

      {open && <MatchDetail id={detailId} match={match} puuid={puuid} region={region} />}
    </article>
  );
}

function MatchDetail({ id, match, puuid, region }) {
  const placeOf = teamId => match.participants.find(p => p.teamId === teamId)?.placement || 99;
  const teams = [...new Set(match.participants.map(p => p.teamId))].sort((a, b) => (match.arena ? placeOf(a) - placeOf(b) : a - b));
  const minutes = match.duration / 60;
  const maxDamage = Math.max(1, ...match.participants.map(p => p.damage));

  return (
    <div className="match-detail" id={id}>
      {teams.map(teamId => {
        const players = match.participants.filter(p => p.teamId === teamId);
        const won = players[0]?.win;
        const remake = players[0]?.remake;
        const name = match.arena ? `Pareja · ${placementLabel(players[0]?.placement)}` : teamId === 100 ? "Equipo azul" : teamId === 200 ? "Equipo rojo" : `Equipo ${teamId}`;
        const kills = players.reduce((s, p) => s + p.kills, 0);
        return (
          <div key={teamId} className="detail-team">
            <div className={`detail-head ${teamId === 100 ? "blue" : teamId === 200 ? "red" : ""}`}>
              <strong>{name}</strong>
              <span className={remake ? "faint" : won ? "win" : "loss"}>{remake ? "Remake" : won ? "Victoria" : "Derrota"}</span>
              <span className="faint num">{kills} kills</span>
            </div>
            <div className="table-scroll">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th scope="col">Jugador</th>
                    <th scope="col">KDA</th>
                    <th scope="col">Daño</th>
                    <th scope="col">CS</th>
                    <th scope="col">Objetos</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => {
                    const pName = championName(p.championId, p.championName);
                    return (
                      <tr key={p.puuid} className={p.puuid === puuid ? "me" : ""}>
                        <td>
                          <div className="detail-player">
                            <DDImg src={championIcon(p.championId, p.championName)} size={28} alt={pName} />
                            <Loadout p={p} size={13} />
                            <div className="detail-name">
                              {p.gameName && p.tagLine
                                ? <Link to={profilePath(region, p.gameName, p.tagLine)}>{p.gameName}</Link>
                                : <span>{p.gameName || pName}</span>}
                              <span className="faint">{[pName, positionName(p.position)].filter(Boolean).join(" · ")}</span>
                            </div>
                          </div>
                        </td>
                        <td className="num">
                          <span className="detail-kda">{p.kills}/{p.deaths}/{p.assists}</span>
                          <span className="faint">{kdaText(p.kills, p.deaths, p.assists)}</span>
                        </td>
                        <td className="num">
                          <span>{formatNumber(p.damage)}</span>
                          <span className="dmg-bar"><span style={{ width: `${(p.damage / maxDamage) * 100}%` }} /></span>
                        </td>
                        <td className="num">
                          <span>{p.cs}</span>
                          <span className="faint">{minutes > 0 ? (p.cs / minutes).toFixed(1) : "0.0"}/min</span>
                        </td>
                        <td><Items items={p.items} size={20} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
