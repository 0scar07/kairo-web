import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import CountUp from "../components/CountUp";
import SearchForm from "../components/SearchForm";
import { DDImg, Skeleton, StateBox } from "../components/ui";
import { errorMessage } from "../api/client";
import { getAccount, getBuildsMeta, getMastery, getMatchIds, getMatches, getRotation } from "../api/lol";
import { useAsync, useTitle } from "../lib/hooks";
import { parsePlayerKey, playerKey, profilePath, savedRegion } from "../lib/regions";
import { championStats, formatNumber, kdaTone, timeAgo } from "../lib/lol";
import {
  championIcon, championNumericId, getChampionDetail, getChampionList, passiveImage, skinLoading, skinSplash, spellImage, useDDragon,
} from "../lib/ddragon";
import { CHAMPION_ROLES, burnText, championPath, cleanText, filterChampions, roleLabel } from "../lib/champions";
import { NotFound } from "./Misc";
import ChallengerBuild from "./champion/ChallengerBuild";

/** Campeones gratis esta semana (ids numéricos) en la región guardada; vacío si falla */
function useFreeChampions() {
  const region = savedRegion();
  const { data } = useAsync(() => getRotation(region.id).catch(() => null), [region.id]);
  return useMemo(() => new Set((data?.free || []).map(String)), [data]);
}

// ─── Lista ────────────────────────────────────────────────────────────────
export function ChampionList() {
  useTitle("Campeones");
  const { data, error, loading, reload } = useAsync(() => getChampionList(), []);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [metaOnly, setMetaOnly] = useState(false);
  const free = useFreeChampions();
  // Meta de Challenger (backend: /lol/builds): partidas y victorias de cada campeón en el parche actual
  const { data: meta } = useAsync(() => getBuildsMeta(), []);
  const metaBy = useMemo(() => new Map((meta?.champions || []).map(c => [String(c.championId), c])), [meta]);
  const shown = useMemo(() => {
    let list = filterChampions(data || [], query, role);
    if (freeOnly) list = list.filter(c => free.has(c.key));
    if (metaOnly) list = list.filter(c => metaBy.has(c.key)).sort((a, b) => metaBy.get(b.key).games - metaBy.get(a.key).games);
    return list;
  }, [data, query, role, freeOnly, free, metaOnly, metaBy]);

  return (
    <Layout header={{ variant: "search" }}>
      <div className="champs-hero">
        <div className="container">
          <p className="eyebrow">League of Legends</p>
          <h1 className="page-title">Campeones</h1>
          <p className="muted">{data ? `${data.length} campeones` : "Todos los campeones"} con sus habilidades, aspectos e historia.</p>
          <div className="champs-tools">
            <label className="champ-search">
              <Icon name="search" size={15} />
              <span className="sr-only">Buscar campeón</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca un campeón" autoComplete="off" spellCheck="false" />
            </label>
            <div className="segmented role-filter" role="group" aria-label="Rol">
              <button type="button" aria-pressed={!role && !freeOnly && !metaOnly} onClick={() => { setRole(null); setFreeOnly(false); setMetaOnly(false); }}>Todos</button>
              {metaBy.size > 0 && <button type="button" aria-pressed={metaOnly} onClick={() => setMetaOnly(v => !v)} title={`Más jugados en Challenger · parche ${meta.patch}`}>Meta Challenger</button>}
              {free.size > 0 && <button type="button" aria-pressed={freeOnly} onClick={() => setFreeOnly(v => !v)}>Gratis</button>}
              {CHAMPION_ROLES.map(r => (
                <button key={r.key} type="button" aria-pressed={role === r.key} onClick={() => setRole(role === r.key ? null : r.key)}>{r.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container champs-page">
        {loading && !data ? (
          <ul className="champ-grid">{Array.from({ length: 24 }, (_, i) => <li key={i}><Skeleton h={128} r={14} /></li>)}</ul>
        ) : error ? (
          <div className="card"><StateBox tone="error" title="No se pudo cargar la lista" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox></div>
        ) : !shown.length ? (
          <div className="card"><StateBox compact icon="search" title="Sin resultados">Prueba con otro nombre o quita el filtro de rol.</StateBox></div>
        ) : (
          <ul className="champ-grid">
            {shown.map((c, i) => (
              <li key={c.id} className="reveal" style={{ "--i": Math.min(i, 24) }}>
                <Link to={championPath(c.id)} className="champ-tile">
                  <span className="champ-tile-art"><img src={skinLoading(c.id, 0)} alt="" loading="lazy" decoding="async" /></span>
                  {free.has(c.key) && <span className="free-badge">Gratis</span>}
                  {metaOnly && metaBy.has(c.key) && (
                    <span className="meta-badge num">{metaBy.get(c.key).games} part. · {Math.round((metaBy.get(c.key).wins / metaBy.get(c.key).games) * 100)}%</span>
                  )}
                  <span className="champ-tile-text">
                    <strong>{c.name}</strong>
                    <span>{c.tags.map(roleLabel).join(" · ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

// ─── Ficha de un campeón ─────────────────────────────────────────────────
const SLOTS = ["Q", "W", "E", "R"];

export function ChampionPage() {
  useDDragon();
  const { key } = useParams();
  const { data: champ, error, loading, reload } = useAsync(() => getChampionDetail(key), [key]);
  useTitle(champ ? `${champ.name}, ${champ.title}` : "Campeón");
  if (error?.message?.includes("403") || error?.message?.includes("404")) return <NotFound />;

  if (!champ) {
    return (
      <Layout header={{ variant: "search" }}>
        <div className="container champ-page">
          {loading ? <Skeleton h={360} r={16} /> : (
            <div className="card"><StateBox tone="error" title="No se pudo cargar el campeón" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox></div>
          )}
        </div>
      </Layout>
    );
  }
  return <ChampionView champ={champ} />;
}

function ChampionView({ champ }) {
  const [skin, setSkin] = useState(0);
  const free = useFreeChampions();
  // Las cromas (parentSkin) son variantes de color sin arte propio: solo se muestran los aspectos
  const skins = useMemo(() => champ.skins.filter(s => s.parentSkin === undefined), [champ]);
  const current = skins[skin] || skins[0];
  const info = champ.info || {};
  const bars = [
    { label: "Ataque", value: info.attack },
    { label: "Defensa", value: info.defense },
    { label: "Magia", value: info.magic },
    { label: "Dificultad", value: info.difficulty },
  ];

  return (
    <Layout header={{ variant: "search" }}>
      <div className="champ-hero">
        <div className="champ-hero-art" aria-hidden="true">
          <img key={current.num} src={skinSplash(champ.id, current.num)} alt="" decoding="async" />
        </div>
        <div className="container champ-hero-inner">
          <Link to="/lol/campeones" className="back-link"><Icon name="chevronLeft" size={14} /> Campeones</Link>
          <div className="champ-hero-id">
            <DDImg src={championIcon(champ.key, champ.id)} size={72} alt="" />
            <div>
              <p className="eyebrow">{champ.tags.map(roleLabel).join(" · ")}{free.has(champ.key) && <span className="free-badge inline">Gratis esta semana</span>}</p>
              <h1 className="champ-name">{champ.name}</h1>
              <p className="champ-title">{champ.title}</p>
            </div>
          </div>
          <ul className="champ-bars" aria-label="Características">
            {bars.map((b, i) => (
              <li key={b.label} style={{ "--i": i }}>
                <span className="faint">{b.label}</span>
                <span className="champ-bar" role="img" aria-label={`${b.label}: ${b.value} de 10`}><span style={{ "--w": (b.value || 0) / 10 }} /></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container champ-page">
        <PlayerWithChampion champ={champ} />
        <ChallengerBuild championId={champ.key} name={champ.name} />
        <div className="champ-grid-2">
          <Abilities champ={champ} />
          <section className="card card-pad champ-lore" aria-labelledby="lore-title">
            <h2 className="section-title" id="lore-title"><Icon name="book" size={18} /> Historia</h2>
            {cleanText(champ.lore).map((p, i) => <p key={i}>{p}</p>)}
            {(champ.allytips?.length > 0 || champ.enemytips?.length > 0) && (
              <div className="champ-tips">
                {champ.allytips?.length > 0 && <TipList title={`Jugando con ${champ.name}`} tips={champ.allytips} />}
                {champ.enemytips?.length > 0 && <TipList title={`Jugando contra ${champ.name}`} tips={champ.enemytips} />}
              </div>
            )}
          </section>
        </div>
        <section aria-labelledby="skins-title">
          <h2 className="section-title champ-section" id="skins-title"><Icon name="image" size={18} /> Aspectos <span className="faint num">{skins.length}</span></h2>
          <ul className="skin-grid">
            {skins.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={`skin${i === skin ? " active" : ""}`} onClick={() => { setSkin(i); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={i === skin}>
                  <img src={skinLoading(champ.id, s.num)} alt="" loading="lazy" decoding="async" />
                  <span>{s.num === 0 ? "Aspecto original" : s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}

const TipList = ({ title, tips }) => (
  <div>
    <h3 className="eyebrow">{title}</h3>
    <ul>{tips.map((t, i) => <li key={i}>{cleanText(t).join(" ")}</li>)}</ul>
  </div>
);

function Abilities({ champ }) {
  const list = [
    { slot: "P", name: champ.passive.name, image: passiveImage(champ.passive.image.full), text: champ.passive.description },
    ...champ.spells.map((s, i) => ({ slot: SLOTS[i], name: s.name, image: spellImage(s.image.full), text: s.description, cooldown: burnText(s.cooldownBurn), cost: burnText(s.costBurn), range: burnText(s.rangeBurn) })),
  ];
  const [active, setActive] = useState(0);
  const a = list[active];
  return (
    <section className="card card-pad abilities" aria-labelledby="abilities-title">
      <h2 className="section-title" id="abilities-title">Habilidades</h2>
      <div className="ability-tabs" role="tablist" aria-label="Habilidades">
        {list.map((s, i) => (
          <button key={s.slot} type="button" role="tab" aria-selected={i === active} className={`ability-tab${i === active ? " active" : ""}`} onClick={() => setActive(i)} title={s.name}>
            <img src={s.image} alt="" width="48" height="48" />
            <span className="ability-key">{s.slot}</span>
          </button>
        ))}
      </div>
      <div className="ability-body" role="tabpanel" key={a.slot}>
        <h3>{a.name} <span className="faint">{a.slot === "P" ? "Pasiva" : a.slot}</span></h3>
        {(a.cooldown || a.cost) && (
          <p className="ability-meta faint num">
            {a.cooldown && <span><Icon name="clock" size={13} /> {a.cooldown} s</span>}
            {a.cost && <span>Costo {a.cost}</span>}
          </p>
        )}
        {cleanText(a.text).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </section>
  );
}

/** Estadísticas de un jugador con este campeón (?jugador=region/Nombre-TAG), o un buscador para elegirlo */
function PlayerWithChampion({ champ }) {
  const [params, setParams] = useSearchParams();
  const who = parsePlayerKey(params.get("jugador"));
  const whoKey = who ? playerKey(who.region.slug, who.gameName, who.tagLine) : null;
  const numericId = Number(champ.key || championNumericId(champ.id));

  const { data, error, loading } = useAsync(async () => {
    if (!who) return null;
    const { data: account } = await getAccount(who.gameName, who.tagLine, who.region.id);
    const [ids, mastery] = await Promise.all([
      getMatchIds(account.puuid, who.region.id, { count: 20 }),
      getMastery(account.puuid, who.region.id).catch(() => null),
    ]);
    const { matches } = ids.length ? await getMatches(ids, who.region.id) : { matches: [] };
    const stats = championStats(matches, account.puuid).find(c => c.championId === numericId) || null;
    return { account, stats, games: matches.length, mastery: mastery?.top?.find(m => m.championId === numericId) || null };
  }, [whoKey, numericId]);

  const pick = p => setParams({ jugador: playerKey(p.region, p.gameName, p.tagLine) }, { replace: true });

  if (!who) {
    return (
      <section className="card champ-player empty">
        <div>
          <h2 className="section-title">Tus estadísticas con {champ.name}</h2>
          <p className="muted">Busca a un jugador para ver cómo le va con {champ.name} en sus últimas 20 partidas.</p>
        </div>
        <SearchForm size="compact" onPick={pick} placeholder="Nombre#TAG" />
      </section>
    );
  }
  if (loading && !data) return <div className="card champ-player"><Skeleton h={84} r={12} /></div>;
  if (error) return <div className="card champ-player"><StateBox compact tone="error" title="No se pudieron cargar sus partidas">{errorMessage(error)}</StateBox></div>;

  const { account, stats, games, mastery } = data;
  const name = `${account.gameName}#${account.tagLine}`;
  return (
    <section className="card champ-player reveal" aria-label={`${name} con ${champ.name}`}>
      <div className="champ-player-id">
        <span className="eyebrow">Con {champ.name}</span>
        <Link to={profilePath(who.region.slug, account.gameName, account.tagLine)} className="champ-player-name">{name}</Link>
        <button type="button" className="link-btn muted" onClick={() => setParams({}, { replace: true })}>Cambiar jugador</button>
      </div>
      {stats ? (
        <dl className="champ-player-stats">
          <div><dt>Partidas</dt><dd className="num"><CountUp value={stats.games} /> <span className="faint">de {games}</span></dd></div>
          <div><dt>Winrate</dt><dd className={`num ${stats.wr >= 50 ? "win" : "loss"}`}><CountUp value={stats.wr} suffix="%" /></dd></div>
          <div><dt>KDA</dt><dd className={`num ${kdaTone(stats.kda)}`}>{stats.kda === Infinity ? "Perfecto" : stats.kda.toFixed(2)}</dd></div>
          <div><dt>CS/min</dt><dd className="num">{stats.csMin.toFixed(1)}</dd></div>
          <div><dt>Daño medio</dt><dd className="num">{formatNumber(stats.avgDamage)}</dd></div>
          {mastery && <div><dt>Maestría</dt><dd className="num">Nv. {mastery.level} <span className="faint">· {formatNumber(mastery.points)} pts</span></dd></div>}
        </dl>
      ) : (
        <p className="muted champ-player-none">
          No jugó a {champ.name} en sus últimas {games} partidas.
          {mastery ? ` Tiene maestría ${mastery.level} (${formatNumber(mastery.points)} pts), jugado por última vez ${timeAgo(mastery.lastPlayTime)}.` : ""}
        </p>
      )}
    </section>
  );
}
