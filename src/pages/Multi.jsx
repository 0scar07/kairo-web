import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import RoleIcon from "../components/RoleIcon";
import ShareButton from "../components/ShareButton";
import { DDImg, RankEmblem, Skeleton, StateBox } from "../components/ui";
import { errorMessage } from "../api/client";
import { getAccount, getMatchIds, getMatches, getRanked, getSummoner } from "../api/lol";
import { useAsync, useTitle } from "../lib/hooks";
import { REGIONS, parseLobby, parseRiotIdSlug, profilePath, regionBySlug, riotIdSlug, saveRegion, savedRegion } from "../lib/regions";
import { championStats, currentStreak, findMe, kdaTone, rankLabel, roleStats, summarize, tierColor, winrate } from "../lib/lol";
import { championIcon, championName, profileIcon, useDDragon } from "../lib/ddragon";

const RECENT = 8;   // partidas recientes por jugador (5 jugadores = unas 60 consultas: se cargan de a uno)

// Cola: los jugadores se cargan uno detrás de otro para no gastar de golpe el cupo de Riot del servidor
let queue = Promise.resolve();
const inTurn = fn => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };

async function loadPlayer({ gameName, tagLine }, region) {
  const { data: account } = await getAccount(gameName, tagLine, region.id);
  const [summoner, ranked, ids] = await Promise.all([
    getSummoner(account.puuid, region.id).then(r => r.data),
    getRanked(account.puuid, region.id).catch(() => []),
    getMatchIds(account.puuid, region.id, { count: RECENT }).catch(() => []),
  ]);
  const { matches } = ids.length ? await getMatches(ids, region.id).catch(() => ({ matches: [] })) : { matches: [] };
  return { account, summoner, solo: ranked.find(r => r.queueType === "RANKED_SOLO_5x5") || null, matches };
}

export default function Multi() {
  useDDragon();
  const [params, setParams] = useSearchParams();
  const region = regionBySlug(params.get("region")) || savedRegion();
  const players = (params.get("jugadores") || "").split(",").map(parseRiotIdSlug).filter(Boolean).slice(0, 10);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useTitle(players.length ? `Multi-búsqueda (${players.length})` : "Multi-búsqueda");

  function submit(e) {
    e.preventDefault();
    const found = parseLobby(text);
    if (!found.length) { setError("No encontramos ningún Riot ID. Pega las líneas del lobby o escribe Nombre#TAG separados por comas."); return; }
    setError("");
    saveRegion(region.slug);
    setParams({ region: region.slug, jugadores: found.map(p => riotIdSlug(p.gameName, p.tagLine)).join(",") });
  }

  return (
    <Layout header={{ variant: "search", region: region.slug }}>
      <div className="multi-hero">
        <div className="container">
          <p className="eyebrow">League of Legends</p>
          <h1 className="page-title"><Icon name="users" size={26} /> Multi-búsqueda</h1>
          <p className="muted">Copia el chat del lobby («Nombre#TAG se unió a la sala») y pégalo aquí para ver a todos tus compañeros de una vez.</p>
          <form className="multi-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="multi-text">Jugadores</label>
            <textarea
              id="multi-text"
              value={text}
              onChange={e => { setText(e.target.value); setError(""); }}
              placeholder={"Faker#KR1 se unió a la sala\nHide on bush#KR1 se unió a la sala\n…"}
              rows={5}
              spellCheck="false"
            />
            <div className="multi-actions">
              <label className="search-region">
                <span className="sr-only">Región</span>
                <select value={region.slug} onChange={e => setParams(p => { const n = new URLSearchParams(p); n.set("region", e.target.value); return n; }, { replace: true })}>
                  {REGIONS.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                </select>
              </label>
              <button type="submit" className="btn btn-primary"><Icon name="search" size={16} /> Buscar a todos</button>
              {players.length > 0 && <ShareButton title="Multi-búsqueda en Kairo" text="Mi lobby en Kairo:" />}
            </div>
            {error && <p className="search-error" role="alert">{error}</p>}
          </form>
        </div>
      </div>

      <div className="container multi-page">
        {players.length ? (
          <ul className="multi-grid">
            {players.map((p, i) => <PlayerCard key={`${region.slug}/${p.gameName}#${p.tagLine}`.toLowerCase()} player={p} region={region} index={i} />)}
          </ul>
        ) : (
          <div className="card"><StateBox compact icon="users" title="Pega tu lobby">Funciona con el texto en español o en inglés, y también con una lista de Riot IDs separados por comas.</StateBox></div>
        )}
      </div>
    </Layout>
  );
}

function PlayerCard({ player, region, index }) {
  const { data, error, loading } = useAsync(() => inTurn(() => loadPlayer(player, region)), [player.gameName, player.tagLine, region.id]);
  const riotId = `${player.gameName}#${player.tagLine}`;

  if (loading && !data) {
    return (
      <li className="card multi-card" aria-busy="true">
        <div className="multi-head"><Skeleton w={52} h={52} r={14} /><div style={{ flex: 1 }}><Skeleton w="70%" h={14} /><Skeleton w="50%" h={11} style={{ marginTop: 6 }} /></div></div>
        <Skeleton h={160} r={12} />
        <span className="faint multi-wait">{index ? "En cola…" : "Cargando…"}</span>
      </li>
    );
  }
  if (error) {
    return (
      <li className="card multi-card">
        <div className="multi-head"><span className="multi-name">{riotId}</span></div>
        <p className="loss multi-error">{error.code === "PLAYER_NOT_FOUND" ? "No existe ese Riot ID." : errorMessage(error)}</p>
      </li>
    );
  }

  const { account, summoner, solo, matches } = data;
  const puuid = account.puuid;
  const recent = summarize(matches, puuid);
  const streak = currentStreak(matches, puuid);
  const champs = championStats(matches, puuid).slice(0, 3);
  const roles = roleStats(matches, puuid);
  const main = roles.total ? [...roles.roles].sort((a, b) => b.games - a.games)[0] : null;
  const wr = solo ? winrate(solo.wins, solo.losses) : null;

  return (
    <li className="card multi-card reveal" style={{ "--i": index, ...(solo ? { "--tier": tierColor(solo.tier) } : {}) }}>
      <div className="multi-head">
        <span className="vs-icon"><DDImg src={profileIcon(summoner.profileIconId)} size={52} alt="" /><span className="profile-level num">{summoner.summonerLevel}</span></span>
        <div className="multi-id">
          <Link to={profilePath(region.slug, account.gameName, account.tagLine)} className="multi-name">{account.gameName}<span className="faint">#{account.tagLine}</span></Link>
          {main && <span className="faint multi-role"><RoleIcon role={main.key} size={13} /> {main.label}</span>}
        </div>
      </div>

      <div className="multi-rank">
        <RankEmblem tier={solo?.tier ?? null} rank={solo?.rank} size={40} />
        <div>
          <strong style={solo ? { color: tierColor(solo.tier) } : undefined}>{solo ? rankLabel(solo.tier, solo.rank) : "Sin clasificar"}</strong>
          <span className="faint num">{solo ? `${solo.leaguePoints} LP · ${wr}% en ${solo.wins + solo.losses}` : "Solo/Dúo"}</span>
        </div>
      </div>

      <ol className="multi-form-pips" aria-label="Últimas partidas">
        {matches.map(m => {
          const me = findMe(m, puuid);
          const res = !me ? "none" : me.remake ? "remake" : me.win ? "win" : "loss";
          return <li key={m.id} className={`form-cmp-pip ${res}`} title={me ? `${res === "win" ? "Victoria" : res === "loss" ? "Derrota" : "Remake"} · ${championName(me.championId, me.championName)} · ${me.kills}/${me.deaths}/${me.assists}` : ""} />;
        })}
      </ol>
      {recent ? (
        <p className="multi-recent num">
          <span className={recent.wr >= 50 ? "win" : "loss"}>{recent.wr}%</span> en {recent.games} ·{" "}
          <span className={kdaTone(recent.kda)}>{recent.kda === Infinity ? "KDA perfecto" : `${recent.kda.toFixed(2)} KDA`}</span>
        </p>
      ) : <p className="faint multi-recent">Sin partidas recientes</p>}
      {streak && streak.count >= 3 && (
        <span className={`streak-chip ${streak.win ? "win" : "loss"}`}><Icon name="flame" size={12} /> {streak.count} {streak.win ? "victorias" : "derrotas"} seguidas</span>
      )}

      <ul className="multi-champs">
        {champs.map(c => (
          <li key={c.championId}>
            <DDImg src={championIcon(c.championId, c.championName)} size={30} alt="" />
            <span className="multi-champ-text"><strong>{championName(c.championId, c.championName)}</strong><span className="faint num">{c.games} · {c.wr}% · {c.kda === Infinity ? "∞" : c.kda.toFixed(1)} KDA</span></span>
          </li>
        ))}
      </ul>
    </li>
  );
}
