import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import CountUp from "../components/CountUp";
import RoleIcon from "../components/RoleIcon";
import SearchForm from "../components/SearchForm";
import ShareButton from "../components/ShareButton";
import { DDImg, RankEmblem, Skeleton, StateBox } from "../components/ui";
import { errorMessage } from "../api/client";
import { getAccount, getMatchIds, getMatches, getRanked, getSummoner } from "../api/lol";
import { useAsync, useTitle } from "../lib/hooks";
import { parsePlayerKey, playerKey, profilePath, matchPath } from "../lib/regions";
import {
  averages, championStats, currentStreak, findMe, formatNumber, kdaValue, rankLabel, rankScore, roleStats, sharedMatches, tierColor, winrate,
} from "../lib/lol";
import { championIcon, championName, profileIcon, useDDragon } from "../lib/ddragon";

const GAMES = 20;   // partidas recientes que se comparan

/** Perfil para comparar: cuenta, invocador, rango y las últimas 20 partidas */
async function loadPlayer({ region, gameName, tagLine }) {
  const { data: account } = await getAccount(gameName, tagLine, region.id);
  const [summoner, ranked, ids] = await Promise.all([
    getSummoner(account.puuid, region.id).then(r => r.data),
    getRanked(account.puuid, region.id).catch(() => []),
    getMatchIds(account.puuid, region.id, { count: GAMES }).catch(() => []),
  ]);
  const { matches } = ids.length ? await getMatches(ids, region.id).catch(() => ({ matches: [] })) : { matches: [] };
  const solo = ranked.find(r => r.queueType === "RANKED_SOLO_5x5") || null;
  return { account, summoner, solo, matches, region };
}

export default function Compare() {
  useDDragon();
  const [params, setParams] = useSearchParams();
  const a = parsePlayerKey(params.get("a"));
  const b = parsePlayerKey(params.get("b"));
  const keyA = a ? playerKey(a.region.slug, a.gameName, a.tagLine) : null;
  const keyB = b ? playerKey(b.region.slug, b.gameName, b.tagLine) : null;

  const A = useAsync(() => (a ? loadPlayer(a) : Promise.resolve(null)), [keyA]);
  const B = useAsync(() => (b ? loadPlayer(b) : Promise.resolve(null)), [keyB]);

  const set = (slot, p) => {
    const next = new URLSearchParams(params);
    if (p) next.set(slot, playerKey(p.region, p.gameName, p.tagLine)); else next.delete(slot);
    setParams(next, { replace: true });
  };
  const swap = () => {
    const next = new URLSearchParams();
    if (keyB) next.set("a", keyB);
    if (keyA) next.set("b", keyA);
    setParams(next, { replace: true });
  };

  const both = A.data && B.data;
  useTitle(both ? `${A.data.account.gameName} vs ${B.data.account.gameName}` : "Comparar jugadores");

  return (
    <Layout header={{ variant: "search" }}>
      <div className="compare-hero">
        <div className="container">
          <p className="eyebrow">League of Legends</p>
          <h1 className="page-title compare-title"><Icon name="compare" size={26} /> Comparar jugadores</h1>
          <p className="muted">Rango, rendimiento en las últimas {GAMES} partidas, roles, campeones en común y si se han cruzado.</p>
        </div>
      </div>

      <div className="container compare-page">
        <div className="vs-row">
          <Slot slot="a" state={A} wanted={a} onPick={p => set("a", p)} onClear={() => set("a", null)} />
          <button type="button" className="vs-badge" onClick={swap} disabled={!keyA && !keyB} title="Intercambiar" aria-label="Intercambiar jugadores">
            <span>VS</span>
          </button>
          <Slot slot="b" state={B} wanted={b} onPick={p => set("b", p)} onClear={() => set("b", null)} />
        </div>

        {both ? (
          <>
            <div className="compare-share"><ShareButton title="Comparación en Kairo" text={`${A.data.account.gameName} vs ${B.data.account.gameName} en Kairo:`} /></div>
            <HeadToHead A={A.data} B={B.data} />
            <div className="compare-grid">
              <RolesCompare A={A.data} B={B.data} />
              <FormCompare A={A.data} B={B.data} />
            </div>
            <CommonChampions A={A.data} B={B.data} />
            <Crossed A={A.data} B={B.data} />
          </>
        ) : (
          <div className="card compare-hint">
            <StateBox compact icon="compare" title={keyA || keyB ? "Elige al segundo jugador" : "Elige a dos jugadores"}>
              Busca por Riot ID en cada lado. Tus favoritos y búsquedas recientes aparecen al escribir.
            </StateBox>
          </div>
        )}
      </div>
    </Layout>
  );
}

/** Un lado de la comparación: el buscador o el jugador cargado */
function Slot({ slot, state, wanted, onPick, onClear }) {
  const side = slot === "a" ? "side-a" : "side-b";
  if (!wanted) {
    return (
      <div className={`card vs-slot empty ${side}`}>
        <span className="vs-slot-label">{slot === "a" ? "Jugador 1" : "Jugador 2"}</span>
        <SearchForm size="compact" onPick={onPick} placeholder="Nombre#TAG" autoFocus={slot === "a"} />
      </div>
    );
  }
  if (state.loading && !state.data) {
    return (
      <div className={`card vs-slot ${side}`} aria-busy="true">
        <Skeleton w={64} h={64} r={16} />
        <div style={{ flex: 1 }}><Skeleton w="70%" h={18} /><Skeleton w="45%" h={12} style={{ marginTop: 8 }} /></div>
      </div>
    );
  }
  if (state.error || !state.data) {
    return (
      <div className={`card vs-slot empty ${side}`}>
        <StateBox compact icon="userX" tone="error" title={`No se pudo cargar a ${wanted.gameName}#${wanted.tagLine}`}
          action={<button type="button" className="btn" onClick={onClear}>Elegir otro</button>}>
          {errorMessage(state.error)}
        </StateBox>
      </div>
    );
  }
  const { account, summoner, solo, region } = state.data;
  return (
    <div className={`card vs-slot ${side} reveal`} style={solo ? { "--tier": tierColor(solo.tier) } : undefined}>
      <span className="vs-icon">
        <DDImg src={profileIcon(summoner.profileIconId)} size={64} alt="" />
        <span className="profile-level num">{summoner.summonerLevel}</span>
      </span>
      <div className="vs-id">
        <Link to={profilePath(region.slug, account.gameName, account.tagLine)} className="vs-name">
          {account.gameName}<span className="profile-tag">#{account.tagLine}</span>
        </Link>
        <span className="vs-rank">
          <RankEmblem tier={solo?.tier ?? null} rank={solo?.rank} size={26} />
          <span style={solo ? { color: tierColor(solo.tier) } : undefined}>{solo ? rankLabel(solo.tier, solo.rank) : "Sin clasificar"}</span>
          {solo && <span className="faint num">{solo.leaguePoints} LP</span>}
        </span>
        <span className="faint">{region.label}</span>
      </div>
      <button type="button" className="btn btn-icon vs-clear" onClick={onClear} aria-label="Cambiar jugador" title="Cambiar jugador"><Icon name="close" size={14} /></button>
    </div>
  );
}

/** Filas cara a cara: el mejor de cada fila se marca y la barra muestra cuánto se separan */
function HeadToHead({ A, B }) {
  const sa = averages(A.matches, A.account.puuid);
  const sb = averages(B.matches, B.account.puuid);
  const wrA = A.solo ? winrate(A.solo.wins, A.solo.losses) : null;
  const wrB = B.solo ? winrate(B.solo.wins, B.solo.losses) : null;
  const scoreA = A.solo ? rankScore(A.solo.tier, A.solo.rank, A.solo.leaguePoints) : null;
  const scoreB = B.solo ? rankScore(B.solo.tier, B.solo.rank, B.solo.leaguePoints) : null;
  const kda = v => (v === Infinity ? "Perfecto" : v.toFixed(2));
  const dec = n => v => v.toFixed(n);

  const rows = [
    { label: "Rango Solo/Dúo", a: scoreA, b: scoreB, show: (v, x) => (x.solo ? `${rankLabel(x.solo.tier, x.solo.rank)} · ${x.solo.leaguePoints} LP` : "Sin clasificar") },
    { label: "Winrate de la temporada", a: wrA, b: wrB, show: v => `${v}%` },
    { label: "Partidas de la temporada", a: A.solo ? A.solo.wins + A.solo.losses : null, b: B.solo ? B.solo.wins + B.solo.losses : null, show: formatNumber },
    { section: `Últimas ${GAMES} partidas` },
    { label: "Winrate", a: sa?.wr ?? null, b: sb?.wr ?? null, show: v => `${v}%` },
    { label: "KDA", a: sa ? sa.kda : null, b: sb ? sb.kda : null, show: kda },
    { label: "Participación en kills", a: sa?.kp ?? null, b: sb?.kp ?? null, show: v => `${v}%` },
    { label: "CS por minuto", a: sa?.csMin ?? null, b: sb?.csMin ?? null, show: dec(1) },
    { label: "Daño por minuto", a: sa?.dmgMin ?? null, b: sb?.dmgMin ?? null, show: formatNumber },
    { label: "Oro por minuto", a: sa?.goldMin ?? null, b: sb?.goldMin ?? null, show: formatNumber },
    { label: "Visión por minuto", a: sa?.visionMin ?? null, b: sb?.visionMin ?? null, show: dec(2) },
    { label: "Muertes por partida", a: sa?.deathsAvg ?? null, b: sb?.deathsAvg ?? null, show: dec(1), lower: true },
  ];

  return (
    <section className="card h2h" aria-labelledby="h2h-title">
      <h2 className="sr-only" id="h2h-title">Cara a cara</h2>
      <ul className="h2h-list">
        {rows.map((r, i) => {
          if (r.section) return <li key={r.section} className="h2h-section eyebrow">{r.section}</li>;
          const has = r.a !== null && r.b !== null;
          const fa = Number.isFinite(r.a) ? r.a : r.a === Infinity ? 99 : 0;
          const fb = Number.isFinite(r.b) ? r.b : r.b === Infinity ? 99 : 0;
          const aWins = has && (r.lower ? fa < fb : fa > fb);
          const bWins = has && (r.lower ? fb < fa : fb > fa);
          const total = Math.abs(fa) + Math.abs(fb) || 1;
          return (
            <li key={r.label} className="h2h-row reveal" style={{ "--i": i }}>
              <span className={`h2h-val a num${aWins ? " best" : ""}`}>{r.a === null ? "—" : r.show(r.a, A)}</span>
              <span className="h2h-mid">
                <span className="h2h-label">{r.label}</span>
                <span className="h2h-bar" aria-hidden="true">
                  <span className={`h2h-a${aWins ? " best" : ""}`} style={{ "--w": has ? fa / total : 0 }} />
                  <span className={`h2h-b${bWins ? " best" : ""}`} style={{ "--w": has ? fb / total : 0 }} />
                </span>
              </span>
              <span className={`h2h-val b num${bWins ? " best" : ""}`}>{r.b === null ? "—" : r.show(r.b, B)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RolesCompare({ A, B }) {
  const ra = roleStats(A.matches, A.account.puuid);
  const rb = roleStats(B.matches, B.account.puuid);
  return (
    <section className="card card-pad" aria-labelledby="roles-cmp">
      <h2 className="eyebrow" id="roles-cmp">Roles</h2>
      <ul className="roles-cmp">
        {ra.roles.map((r, i) => {
          const b = rb.roles[i];
          return (
            <li key={r.key} className="roles-cmp-row">
              <span className="roles-cmp-bar a" aria-hidden="true"><span style={{ "--w": r.share }} /></span>
              <span className="num faint">{r.games}</span>
              <span className="role-badge" title={r.label}><RoleIcon role={r.key} size={16} /></span>
              <span className="num faint">{b.games}</span>
              <span className="roles-cmp-bar b" aria-hidden="true"><span style={{ "--w": b.share }} /></span>
              <span className="sr-only">{r.label}: {r.games} contra {b.games}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FormStrip({ P, side }) {
  const list = P.matches.slice(0, GAMES);
  const streak = currentStreak(list, P.account.puuid);
  return (
    <div className={`form-cmp ${side}`}>
      <span className="form-cmp-name">{P.account.gameName}</span>
      <ol className="form-cmp-bars" aria-label={`Forma reciente de ${P.account.gameName}`}>
        {list.map(m => {
          const me = findMe(m, P.account.puuid);
          const res = !me ? "none" : me.remake ? "remake" : me.win ? "win" : "loss";
          return <li key={m.id} className={`form-cmp-pip ${res}`} title={res === "win" ? "Victoria" : res === "loss" ? "Derrota" : "Remake"} />;
        })}
      </ol>
      {streak && streak.count >= 2 && (
        <span className={`streak-chip ${streak.win ? "win" : "loss"}`}><Icon name="flame" size={13} /> {streak.count} {streak.win ? "victorias" : "derrotas"} seguidas</span>
      )}
    </div>
  );
}

const FormCompare = ({ A, B }) => (
  <section className="card card-pad" aria-labelledby="form-cmp">
    <h2 className="eyebrow" id="form-cmp">Forma reciente</h2>
    <FormStrip P={A} side="a" />
    <FormStrip P={B} side="b" />
  </section>
);

/** Campeones que jugaron los dos en sus últimas partidas */
function CommonChampions({ A, B }) {
  const common = useMemo(() => {
    const ca = championStats(A.matches, A.account.puuid);
    const cb = new Map(championStats(B.matches, B.account.puuid).map(c => [c.championId, c]));
    return ca.filter(c => cb.has(c.championId)).map(c => ({ a: c, b: cb.get(c.championId) }))
      .sort((x, y) => (y.a.games + y.b.games) - (x.a.games + x.b.games));
  }, [A, B]);
  return (
    <section className="card common-card" aria-labelledby="common-title">
      <div className="common-head">
        <h2 className="section-title" id="common-title">Campeones en común</h2>
        <span className="faint">{common.length ? `${common.length} en las últimas ${GAMES} partidas de cada uno` : ""}</span>
      </div>
      {!common.length ? (
        <StateBox compact icon="swords" title="Sin campeones en común">No jugaron el mismo campeón en sus últimas {GAMES} partidas.</StateBox>
      ) : (
        <ul className="common-list">
          {common.map(({ a, b }, i) => {
            const name = championName(a.championId, a.championName);
            const line = c => `${c.games} ${c.games === 1 ? "partida" : "partidas"} · ${c.kda === Infinity ? "KDA perfecto" : `${c.kda.toFixed(1)} KDA`}`;
            return (
              <li key={a.championId} className="common-row reveal" style={{ "--i": i }}>
                <span className={`common-side a${a.wr > b.wr ? " best" : ""}`}><strong className="num"><CountUp value={a.wr} suffix="%" /></strong><span className="faint num">{line(a)}</span></span>
                <span className="common-champ"><DDImg src={championIcon(a.championId, a.championName)} size={40} alt="" /><strong>{name}</strong></span>
                <span className={`common-side b${b.wr > a.wr ? " best" : ""}`}><strong className="num"><CountUp value={b.wr} suffix="%" /></strong><span className="faint num">{line(b)}</span></span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Partidas en las que coincidieron (en el mismo equipo o en contra) */
function Crossed({ A, B }) {
  const s = sharedMatches(A.matches, A.account.puuid, B.matches, B.account.puuid);
  if (!s.matches.length) return null;
  const nameA = A.account.gameName, nameB = B.account.gameName;
  return (
    <section className="card card-pad crossed" aria-labelledby="crossed-title">
      <h2 className="section-title" id="crossed-title"><Icon name="users" size={18} /> Se han cruzado</h2>
      <div className="crossed-stats">
        {s.together > 0 && <p><strong className="num">{s.together}</strong> {s.together === 1 ? "partida" : "partidas"} en el mismo equipo · <span className={s.togetherWins * 2 >= s.together ? "win" : "loss"}>{s.togetherWins}V {s.together - s.togetherWins}D</span></p>}
        {s.against > 0 && <p><strong className="num">{s.against}</strong> {s.against === 1 ? "partida" : "partidas"} en contra · {nameA} ganó <strong className="num">{s.aWins}</strong>, {nameB} ganó <strong className="num">{s.against - s.aWins}</strong></p>}
      </div>
      <ul className="crossed-list">
        {s.matches.slice(0, 6).map(m => {
          const pa = findMe(m, A.account.puuid), pb = findMe(m, B.account.puuid);
          const same = pa.teamId === pb.teamId;
          return (
            <li key={m.id}>
              <Link to={matchPath(m.id, pa)} className="crossed-item">
                <DDImg src={championIcon(pa.championId, pa.championName)} size={30} alt="" />
                <span className={`crossed-res ${pa.win ? "win" : "loss"}`}>{pa.kills}/{pa.deaths}/{pa.assists}</span>
                <span className="crossed-mid faint">{same ? "Juntos" : "En contra"} · {kdaValue(pa.kills, pa.deaths, pa.assists) >= kdaValue(pb.kills, pb.deaths, pb.assists) ? nameA : nameB} con mejor KDA</span>
                <span className={`crossed-res ${pb.win ? "win" : "loss"}`}>{pb.kills}/{pb.deaths}/{pb.assists}</span>
                <DDImg src={championIcon(pb.championId, pb.championName)} size={30} alt="" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
