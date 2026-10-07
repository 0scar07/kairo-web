import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import ShareButton from "../components/ShareButton";
import { DDImg, Initials, Skeleton, StateBox } from "../components/ui";
import { StatCard } from "../games/ui";
import { gameProfilePath } from "../games/registry";
import { bsProfileIcon, cleanName, clanRole, clubBadge, getClub, tagOf } from "../games/supercell";
import { errorMessage } from "../api/client";
import { gameById } from "../lib/games";
import { useAsync, useTitle } from "../lib/hooks";
import { formatNumber } from "../lib/lol";
import { NotFound } from "./Misc";

const CLUB_GAMES = ["brawlstars", "clashroyale", "clashofclans"];
const TYPES = { open: "Abierto", inviteOnly: "Solo con invitación", closed: "Cerrado" };
const BS_ROLES = { president: "Presidente", vicePresident: "Vicepresidente", senior: "Veterano", member: "Miembro" };
const WAR_STATES = { preparation: "Preparación", inWar: "En guerra", warEnded: "Terminada", notInWar: "Sin guerra" };

/** Club de Brawl Stars o clan de Clash Royale / Clash of Clans: datos, miembros y guerra actual */
export default function Club() {
  const { game: gameId, tag } = useParams();
  const game = gameById(gameId);
  if (!game || !CLUB_GAMES.includes(gameId)) return <NotFound />;
  return <ClubPage key={`${gameId}/${tag}`} game={game} tag={tagOf(tag)} />;
}

function ClubPage({ game, tag }) {
  const { data, error, loading, reload } = useAsync(force => getClub(game.id, tag, force), [game.id, tag]);
  const club = data?.club;
  const noun = game.id === "brawlstars" ? "club" : "clan";
  useTitle(club ? cleanName(club.name) : `${noun === "club" ? "Club" : "Clan"} #${tag}`);

  if (!club) {
    return (
      <Layout header={{ variant: "nav" }}>
        <div className="container page-narrow" style={{ "--game": game.hex }}>
          {loading ? <Skeleton h={300} r={16} /> : (
            <div className="card">
              <StateBox icon={error?.status === 404 ? "users" : "alert"} tone={error?.status === 404 ? undefined : "error"}
                title={error?.status === 404 ? `No encontramos el ${noun} #${tag}` : `No se pudo cargar el ${noun}`}
                action={<button type="button" className="btn btn-primary" onClick={() => reload()}>Reintentar</button>}>
                {errorMessage(error)}
              </StateBox>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  const members = club.members && Array.isArray(club.members) ? club.members : club.memberList || [];
  const badge = game.id === "brawlstars" ? clubBadge(club.badgeId) : club.badgeUrls?.medium || null;
  const stats = game.id === "brawlstars"
    ? [
      { label: "Trofeos", value: club.trophies, tone: "accent" },
      { label: "Trofeos para entrar", value: club.requiredTrophies },
      { label: "Miembros", value: `${members.length}/30` },
    ]
    : game.id === "clashroyale"
      ? [
        { label: "Puntos del clan", value: club.clanScore, tone: "accent" },
        { label: "Trofeos de guerra", value: club.clanWarTrophies },
        { label: "Donaciones/semana", value: club.donationsPerWeek },
        { label: "Trofeos para entrar", value: club.requiredTrophies },
        { label: "Miembros", value: `${members.length}/50` },
      ]
      : [
        { label: "Nivel", value: club.clanLevel, tone: "accent" },
        { label: "Puntos", value: club.clanPoints },
        { label: "Guerras ganadas", value: club.warWins, tone: "win" },
        { label: "Racha de guerras", value: club.warWinStreak },
        { label: "Trofeos para entrar", value: club.requiredTrophies },
        { label: "Miembros", value: `${members.length}/50` },
      ];

  return (
    <Layout header={{ variant: "nav" }}>
      <div style={{ "--game": game.hex }}>
        <div className="gp-head">
          <div className="container gp-head-inner">
            <div className="gp-avatar">
              {badge ? <DDImg src={badge} size={72} alt="" /> : <Initials text={cleanName(club.name)} size={72} />}
              <span className="gp-avatar-game"><GameLogo game={game.id} size={16} color={game.color} /></span>
            </div>
            <div className="gp-id">
              <h1>{cleanName(club.name)} <span className="profile-tag">#{tag}</span></h1>
              <p className="muted">
                {game.name} · {noun === "club" ? "Club" : "Clan"} {TYPES[club.type] ? `· ${TYPES[club.type]}` : ""}{club.location?.name ? ` · ${club.location.name}` : ""}
              </p>
            </div>
            <div className="profile-actions">
              <button type="button" className="btn btn-primary" onClick={() => reload(true)} disabled={loading}>
                <Icon name="refresh" size={15} className={loading ? "spin" : ""} /> Actualizar
              </button>
              <ShareButton title={`${cleanName(club.name)} en Kairo`} text={`${noun === "club" ? "Club" : "Clan"} ${cleanName(club.name)} de ${game.name} en Kairo:`} />
            </div>
          </div>
        </div>

        <div className="container gp-body">
          <div className="gp-grid">
            <aside className="gp-side">
              <StatCard index={0} title="Resumen" icon="trophy" items={stats} />
              {club.description && (
                <section className="card gp-list-card reveal" style={{ "--i": 1 }}>
                  <h2 className="gp-card-title">Descripción</h2>
                  <p className="club-desc">{cleanName(club.description)}</p>
                </section>
              )}
              {data.war && <War game={game} war={data.war} tag={tag} />}
            </aside>
            <Members game={game} members={members} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

const SORTS = [
  { key: "trophies", label: "Trofeos" },
  { key: "donations", label: "Donaciones", games: ["clashroyale", "clashofclans"] },
  { key: "expLevel", label: "Nivel", games: ["clashroyale", "clashofclans"] },
];

function Members({ game, members }) {
  const [sort, setSort] = useState("trophies");
  const sorts = SORTS.filter(s => !s.games || s.games.includes(game.id));
  const list = useMemo(() => [...members].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)), [members, sort]);
  const roleOf = r => (game.id === "brawlstars" ? BS_ROLES[r] : clanRole(r)) || "";
  return (
    <section className="card club-members" aria-labelledby="members-title">
      <div className="club-members-head">
        <h2 className="section-title" id="members-title"><Icon name="users" size={18} /> Miembros <span className="faint num">{members.length}</span></h2>
        {sorts.length > 1 && (
          <div className="segmented" role="group" aria-label="Ordenar por">
            {sorts.map(s => <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</button>)}
          </div>
        )}
      </div>
      <ol className="member-list">
        {list.map((m, i) => (
          <li key={m.tag} className="reveal" style={{ "--i": Math.min(i, 14) }}>
            <Link to={gameProfilePath(game.id, tagOf(m.tag))} className="member-row">
              <span className={`member-pos num${i < 3 ? " top" : ""}`}>{i + 1}</span>
              {game.id === "brawlstars" && m.icon?.id
                ? <DDImg src={bsProfileIcon(m.icon.id)} size={34} alt="" />
                : game.id === "clashofclans" && m.league?.iconUrls?.small
                  ? <DDImg src={m.league.iconUrls.small} size={34} alt="" />
                  : <Initials text={cleanName(m.name)} size={34} />}
              <span className="member-text">
                <strong>{cleanName(m.name)}</strong>
                <span className="faint">{[roleOf(m.role), m.expLevel ? `Nivel ${m.expLevel}` : null, m.townHallLevel ? `Ayuntamiento ${m.townHallLevel}` : null].filter(Boolean).join(" · ")}</span>
              </span>
              {m.donations != null && <span className="member-don faint num" title="Donadas / recibidas">{formatNumber(m.donations)} / {formatNumber(m.donationsReceived)}</span>}
              <span className="member-trophies num"><Icon name="trophy" size={13} /> {formatNumber(m.trophies)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Guerra actual: Clash Royale (guerra fluvial, clanes por fama) o Clash of Clans (clan contra clan) */
function War({ game, war, tag }) {
  if (game.id === "clashroyale") {
    const clans = [...(war.clans || [])].sort((a, b) => (b.fame || 0) - (a.fame || 0));
    if (!clans.length) return null;
    return (
      <section className="card gp-list-card reveal" style={{ "--i": 2 }}>
        <h2 className="gp-card-title"><Icon name="swords" size={15} /> Guerra fluvial</h2>
        <ol className="war-river">
          {clans.map((c, i) => (
            <li key={c.tag} className={tagOf(c.tag) === tag ? "mine" : ""}>
              <span className="num faint">{i + 1}</span>
              <Link to={`/juegos/clashroyale/club/${tagOf(c.tag)}`}>{cleanName(c.name)}</Link>
              <span className="num accent">{formatNumber(c.fame)} <span className="faint">fama</span></span>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  if (!war.state || war.state === "notInWar") return null;
  const side = (c, cls) => (
    <div className={`war-side ${cls}`}>
      {c.badgeUrls?.small && <img src={c.badgeUrls.small} alt="" width="40" height="40" />}
      <strong>{cleanName(c.name)}</strong>
      <span className="war-stars num"><Icon name="star" size={14} filled /> {c.stars}</span>
      <span className="faint num">{(c.destructionPercentage || 0).toFixed(1)}% destrucción</span>
    </div>
  );
  return (
    <section className="card gp-list-card reveal" style={{ "--i": 2 }}>
      <h2 className="gp-card-title"><Icon name="swords" size={15} /> Guerra · {WAR_STATES[war.state] || war.state}</h2>
      <div className="war-coc">
        {side(war.clan, "us")}
        <span className="war-vs">VS</span>
        {side(war.opponent, "them")}
      </div>
      {war.teamSize && <p className="faint war-size">{war.teamSize} contra {war.teamSize}</p>}
    </section>
  );
}
