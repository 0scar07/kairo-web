import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { DDImg, Skeleton, StateBox } from "../components/ui";
import { errorMessage } from "../api/client";
import { getAccount, getLive } from "../api/lol";
import { useAsync, useInterval, useNow, useTitle } from "../lib/hooks";
import { parseRiotId, parseRiotIdSlug, profilePath, regionBySlug } from "../lib/regions";
import { formatDuration, mapName, queueLong, rankFromScore, rankLabel, rankScore, tierColor, winrate } from "../lib/lol";
import { championIcon, championName, perkIcon, perkName, spellIcon, spellName, useDDragon } from "../lib/ddragon";
import { APK_URL } from "../lib/config";
import { NotFound } from "./Misc";

const REFRESH_MS = 60_000;
const TEAMS = { 100: { name: "Equipo azul", cls: "blue", bans: "Bloqueos azul" }, 200: { name: "Equipo rojo", cls: "red", bans: "Bloqueos rojo" } };

export default function Live() {
  const params = useParams();
  const region = regionBySlug(params.region);
  const id = parseRiotIdSlug(params.riotId);
  if (!region || !id) return <NotFound />;
  return <LivePage key={`${region.slug}/${id.gameName}#${id.tagLine}`.toLowerCase()} region={region} gameName={id.gameName} tagLine={id.tagLine} />;
}

function LivePage({ region, gameName, tagLine }) {
  useDDragon();
  const wasInGame = useRef(false);
  const { data, error, loading, reload } = useAsync(async force => {
    const { data: account } = await getAccount(gameName, tagLine, region.id);
    const live = await getLive(account.puuid, region.id, force);
    return { account, live };
  }, [region.id, gameName, tagLine]);

  const inGame = Boolean(data?.live?.inGame);
  if (inGame) wasInGame.current = true;
  useInterval(() => reload(true), REFRESH_MS, Boolean(data));

  const name = data?.account?.gameName || gameName;
  const tag = data?.account?.tagLine || tagLine;
  const riotId = `${name}#${tag}`;
  const toProfile = profilePath(region.slug, name, tag);
  useTitle(`${riotId} en vivo`);

  let body;
  if (!data && loading) {
    body = <LiveSkeleton />;
  } else if (!data && error) {
    const notFound = error.code === "PLAYER_NOT_FOUND";
    body = (
      <div className="container page-narrow"><div className="card">
        <StateBox
          icon={notFound ? "userX" : "alert"}
          tone={notFound ? undefined : "error"}
          title={notFound ? `No encontramos a ${gameName}#${tagLine}` : "No se pudo consultar la partida"}
          action={notFound ? <Link className="btn btn-primary" to="/">Buscar otro jugador</Link> : <button type="button" className="btn btn-primary" onClick={() => reload(true)}>Reintentar</button>}
        >
          {notFound ? "No existe ninguna cuenta Riot con ese nombre y #TAG. Revisa espacios y acentos." : errorMessage(error)}
        </StateBox>
      </div></div>
    );
  } else if (!inGame) {
    body = (
      <div className="container page-narrow"><div className="card">
        <StateBox
          icon={wasInGame.current ? "trophy" : "clock"}
          title={wasInGame.current ? "La partida terminó" : `${riotId} no está en partida ahora`}
          action={
            <div className="state-actions">
              <Link className="btn btn-primary" to={toProfile}>{wasInGame.current ? "Ver el resultado en el perfil" : "Ver perfil"}</Link>
              <button type="button" className="btn" onClick={() => reload(true)} disabled={loading}>
                <Icon name="refresh" size={15} className={loading ? "spin" : ""} /> Volver a comprobar
              </button>
            </div>
          }
        >
          {wasInGame.current
            ? "El resultado aparecerá en su historial en unos minutos."
            : "Cuando empiece una partida aparecerá aquí. Mientras tengas esta página abierta revisamos cada minuto."}
        </StateBox>
      </div></div>
    );
  } else {
    body = <LiveGame live={data.live} puuid={data.account.puuid} region={region} riotId={riotId} />;
  }

  return (
    <Layout header={{ variant: "back", back: { to: toProfile, label: `Volver al perfil de ${riotId}` } }}>
      {body}
    </Layout>
  );
}

function LiveGame({ live, puuid, region, riotId }) {
  const now = useNow(1000);
  const elapsed = live.startTime > 0 ? (now - live.startTime) / 1000 : null;
  const teamIds = [...new Set(live.participants.map(p => p.teamId))].sort((a, b) => a - b);
  const bansOf = teamId => live.bans.filter(b => b.teamId === teamId).sort((a, b) => a.pickTurn - b.pickTurn);
  const hasBans = live.bans.length > 0;

  return (
    <>
      <section className="live-hero">
        <div className="container live-hero-inner">
          <div>
            <span className="live-pill"><span className="live-dot pulse" aria-hidden="true" /> En vivo</span>
            <h1 className="live-heading">{queueLong(live.queueId)}</h1>
            <p className="muted">{mapName(live.mapId)} · {region.name}</p>
          </div>
          <div className="live-clock">
            <span className="eyebrow">Tiempo de partida</span>
            <strong className="num" aria-live="off">{elapsed === null ? "Cargando" : formatDuration(elapsed)}</strong>
          </div>
        </div>
      </section>

      <div className="container live-body">
        {hasBans && teamIds.length === 2 && (
          <div className="card bans">
            <BanGroup label={TEAMS[100].bans} cls="blue" bans={bansOf(100)} />
            <BanGroup label={TEAMS[200].bans} cls="red" bans={bansOf(200)} reverse />
          </div>
        )}

        <div className="teams">
          {teamIds.map(teamId => (
            <Team key={teamId} teamId={teamId} players={live.participants.filter(p => p.teamId === teamId)} puuid={puuid} region={region} />
          ))}
        </div>

        <div className="card notify">
          <Icon name="bell" size={18} className="brand" />
          <p>Recibe el aviso en la app de Kairo cuando {riotId} termine esta partida, con el resultado.</p>
          <a className="btn btn-primary" href={APK_URL} rel="noopener">Descargar app</a>
        </div>
      </div>
    </>
  );
}

function BanGroup({ label, cls, bans, reverse }) {
  return (
    <div className={`ban-group ${cls}${reverse ? " reverse" : ""}`}>
      <span className="ban-label">{label}</span>
      <ul className="ban-list">
        {bans.map((b, i) => {
          const name = b.championId > 0 ? championName(b.championId) : "";
          return (
            <li key={i} className="ban" title={name || "Sin bloqueo"}>
              {b.championId > 0 ? <DDImg src={championIcon(b.championId)} size={28} alt={`${name} bloqueado`} /> : <span className="dd dd-empty" style={{ width: 28, height: 28 }} aria-label="Sin bloqueo" role="img" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Team({ teamId, players, puuid, region }) {
  const meta = TEAMS[teamId] || { name: `Equipo ${teamId}`, cls: "" };
  const scores = players.map(p => p.ranked && rankScore(p.ranked.tier, p.ranked.rank, p.ranked.leaguePoints)).filter(Number.isFinite);
  const avg = scores.length ? rankFromScore(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
  return (
    <section className={`card team team-${meta.cls}`} aria-label={meta.name}>
      <header className="team-head">
        <h2>{meta.name}</h2>
        {avg && <span className="muted">Rango medio <strong>{avg}</strong></span>}
      </header>
      <ul className="team-list">
        {players.map((p, i) => <LivePlayer key={p.puuid || i} p={p} me={p.puuid === puuid} region={region} />)}
      </ul>
    </section>
  );
}

function LivePlayer({ p, me, region }) {
  const champ = championName(p.championId, "Campeón");
  const id = p.riotId ? parseRiotId(p.riotId) : null;
  const r = p.ranked;
  const games = r ? r.wins + r.losses : 0;
  const wr = r ? winrate(r.wins, r.losses) : null;
  return (
    <li className={`live-player${me ? " me" : ""}`} aria-current={me ? "true" : undefined}>
      <DDImg src={championIcon(p.championId)} size={40} alt={champ} />
      <div className="live-spells">
        <DDImg src={spellIcon(p.spell1Id)} size={18} alt={spellName(p.spell1Id)} />
        <DDImg src={spellIcon(p.spell2Id)} size={18} alt={spellName(p.spell2Id)} />
      </div>
      <div className="live-runes">
        <DDImg src={perkIcon(p.keystone)} size={26} round alt={perkName(p.keystone)} className="keystone" />
        <DDImg src={perkIcon(p.secondary)} size={14} round alt={perkName(p.secondary)} className="secondary" />
      </div>
      <div className="live-name">
        {p.bot ? <strong>Bot</strong>
          : id ? <Link to={profilePath(region.slug, id.gameName, id.tagLine)}><strong>{id.gameName}<span className="faint">#{id.tagLine}</span></strong></Link>
          : <strong>{p.riotId || "Jugador"}</strong>}
        <span className="faint">{champ}</span>
      </div>
      <div className="live-rank">
        {r ? (
          <>
            <strong style={{ color: tierColor(r.tier) }}>{rankLabel(r.tier, r.rank)}</strong>
            <span className="faint num">{r.leaguePoints} LP</span>
          </>
        ) : <span className="faint">Sin clasificar</span>}
      </div>
      <div className="live-wr">
        {r && wr !== null ? (
          <>
            <strong className={`num ${wr >= 50 ? "win" : "loss"}`}>{wr}%</strong>
            <span className="faint num">{games} part.</span>
          </>
        ) : <span className="faint">—</span>}
      </div>
    </li>
  );
}

function LiveSkeleton() {
  return (
    <>
      <section className="live-hero">
        <div className="container live-hero-inner">
          <div><Skeleton w={80} h={22} r={999} /><Skeleton w={280} h={32} style={{ marginTop: 14 }} /><Skeleton w={220} h={13} style={{ marginTop: 12 }} /></div>
          <Skeleton w={110} h={44} />
        </div>
      </section>
      <div className="container live-body" aria-busy="true" aria-label="Cargando partida">
        <div className="card"><Skeleton h={58} r={16} /></div>
        <div className="teams">
          {[0, 1].map(t => (
            <div key={t} className="card team">
              <div className="team-head"><Skeleton w={100} h={16} /></div>
              <ul className="team-list">{[0, 1, 2, 3, 4].map(i => <li key={i} className="live-player"><Skeleton w={40} h={40} r={8} /><Skeleton w="60%" h={14} /></li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
