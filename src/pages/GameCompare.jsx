import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import H2H from "../components/H2H";
import ShareButton from "../components/ShareButton";
import { DDImg, Initials, Skeleton, StateBox } from "../components/ui";
import { PROFILES, gameProfilePath } from "../games/registry";
import { averageElixir, brawlerIcon, bsBattleView, cardIcon, crBattleView, tagOf, titleCase } from "../games/supercell";
import { cocProgress } from "../games/coc";
import { heroIcon, heroName } from "../games/dota2";
import { errorMessage } from "../api/client";
import { gameById } from "../lib/games";
import { useAsync, useTitle } from "../lib/hooks";
import { formatNumber, kdaValue, winrate } from "../lib/lol";
import { NotFound } from "./Misc";

const GAMES = ["brawlstars", "clashroyale", "clashofclans", "dota2"];
const n = v => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pct = v => `${v}%`;
const num = v => formatNumber(v);
const dec = d => v => (v === Infinity ? "Perfecto" : v.toFixed(d));

/** Winrate de una lista de vistas de batalla ({ win }); null si no hay ninguna con resultado */
function battleWr(views) {
  const done = views.filter(v => v.win !== null);
  return done.length ? Math.round((done.filter(v => v.win).length / done.length) * 100) : null;
}

/** Filas cara a cara de cada juego a partir de lo que carga su perfil (games/registry.js) */
function rowsFor(game, A, B) {
  const both = (label, get, show = num, extra = {}) => ({ label, a: n(get(A)), b: n(get(B)), show, ...extra });
  if (game === "brawlstars") {
    const wr = X => battleWr(X.battles.map(b => bsBattleView(b, tagOf(X.player.tag))));
    return [
      both("Trofeos", X => X.player.trophies),
      both("Récord de trofeos", X => X.player.highestTrophies),
      both("Nivel", X => X.player.expLevel),
      both("Victorias 3 contra 3", X => X.player["3vs3Victories"]),
      both("Victorias en solitario", X => X.player.soloVictories),
      both("Victorias a dúo", X => X.player.duoVictories),
      both("Brawlers", X => X.player.brawlers?.length),
      both("Brawlers en poder 11", X => X.player.brawlers?.filter(b => b.power >= 11).length),
      { section: "Últimas batallas" },
      { label: "Winrate", a: wr(A), b: wr(B), show: pct },
    ];
  }
  if (game === "clashroyale") {
    const wr = X => battleWr(X.battles.map(crBattleView));
    return [
      both("Trofeos", X => X.player.trophies),
      both("Récord de trofeos", X => X.player.bestTrophies),
      both("Nivel", X => X.player.expLevel),
      both("Victorias", X => X.player.wins),
      { label: "Winrate total", a: winrate(A.player.wins || 0, A.player.losses || 0), b: winrate(B.player.wins || 0, B.player.losses || 0), show: pct },
      both("Victorias de tres coronas", X => X.player.threeCrownWins),
      both("Batallas", X => X.player.battleCount),
      { label: "Elixir medio del mazo", a: n(Number(averageElixir(A.player.currentDeck))), b: n(Number(averageElixir(B.player.currentDeck))), show: v => v.toFixed(1), lower: true },
      { section: "Últimas batallas" },
      { label: "Winrate", a: wr(A), b: wr(B), show: pct },
    ];
  }
  if (game === "clashofclans") {
    const groups = X => Object.fromEntries(cocProgress(X.player).map(g => [g.key, g.pct]));
    const ga = groups(A), gb = groups(B);
    const heroSum = X => (X.player.heroes || []).filter(h => h.village === "home").reduce((s, h) => s + h.level, 0);
    return [
      both("Ayuntamiento", X => X.player.townHallLevel),
      both("Trofeos", X => X.player.trophies),
      both("Récord de trofeos", X => X.player.bestTrophies),
      both("Nivel", X => X.player.expLevel),
      both("Estrellas de guerra", X => X.player.warStars),
      both("Ataques ganados", X => X.player.attackWins),
      both("Defensas ganadas", X => X.player.defenseWins),
      both("Tropas donadas", X => X.player.donations),
      { label: "Niveles de héroes (suma)", a: heroSum(A), b: heroSum(B), show: num },
      { section: "Progreso de la aldea" },
      ...[["troops", "Tropas"], ["spells", "Hechizos"], ["siege", "Máquinas de asedio"], ["equipment", "Equipo de héroes"], ["pets", "Mascotas"]]
        .filter(([k]) => ga[k] !== undefined || gb[k] !== undefined)
        .map(([k, label]) => ({ label, a: ga[k] ?? null, b: gb[k] ?? null, show: pct })),
    ];
  }
  // Dota 2
  const avg = (X, f) => (X.player.recent?.length ? X.player.recent.reduce((s, m) => s + (f(m) || 0), 0) / X.player.recent.length : null);
  const kda = X => {
    const r = X.player.recent || [];
    return r.length ? kdaValue(r.reduce((s, m) => s + m.kills, 0), r.reduce((s, m) => s + m.deaths, 0), r.reduce((s, m) => s + m.assists, 0)) : null;
  };
  return [
    { label: "Medalla", a: n(A.player.rankTier), b: n(B.player.rankTier), show: (_, side) => (side === "a" ? A : B).header.subtitle },
    both("Victorias", X => X.player.wins),
    { label: "Winrate total", a: winrate(A.player.wins, A.player.losses), b: winrate(B.player.wins, B.player.losses), show: pct },
    both("Partidas", X => X.player.wins + X.player.losses),
    { section: `Últimas partidas` },
    { label: "Winrate", a: battleWr(A.player.recent || []), b: battleWr(B.player.recent || []), show: pct },
    { label: "KDA", a: kda(A), b: kda(B), show: dec(2) },
    { label: "Oro por minuto", a: avg(A, m => m.goldPerMin), b: avg(B, m => m.goldPerMin), show: num },
    { label: "Experiencia por minuto", a: avg(A, m => m.xpPerMin), b: avg(B, m => m.xpPerMin), show: num },
    { label: "Last hits", a: avg(A, m => m.lastHits), b: avg(B, m => m.lastHits), show: num },
    { label: "Daño a héroes", a: avg(A, m => m.heroDamage), b: avg(B, m => m.heroDamage), show: num },
  ];
}

/** Lo que tienen en común: brawlers, cartas del mazo o héroes de Dota */
function Common({ game, A, B }) {
  let title, items;
  if (game === "brawlstars") {
    const bb = new Map((B.player.brawlers || []).map(b => [b.id, b]));
    items = (A.player.brawlers || []).filter(b => bb.has(b.id))
      .map(b => ({ id: b.id, name: titleCase(b.name), img: brawlerIcon(b.id), a: `${num(b.trophies)} trofeos`, b: `${num(bb.get(b.id).trophies)} trofeos`, aWins: b.trophies > bb.get(b.id).trophies, bWins: bb.get(b.id).trophies > b.trophies, sort: b.trophies + bb.get(b.id).trophies }))
      .sort((x, y) => y.sort - x.sort).slice(0, 8);
    title = "Brawlers con más trofeos de los dos";
  } else if (game === "clashroyale") {
    const deckB = new Map((B.player.currentDeck || []).map(c => [c.id, c]));
    items = (A.player.currentDeck || []).filter(c => deckB.has(c.id)).map(c => ({ id: c.id, name: c.name, img: cardIcon(c), a: "En su mazo", b: "En su mazo" }));
    title = "Cartas en los dos mazos";
  } else if (game === "dota2") {
    const hb = new Map((B.player.heroes || []).map(h => [h.heroId, h]));
    items = (A.player.heroes || []).filter(h => hb.has(h.heroId)).map(h => {
      const o = hb.get(h.heroId);
      const wa = winrate(h.wins, h.games - h.wins), wb = winrate(o.wins, o.games - o.wins);
      return { id: h.heroId, name: heroName(A.heroes, h.heroId), img: heroIcon(A.heroes, h.heroId), a: `${wa}% en ${h.games}`, b: `${wb}% en ${o.games}`, aWins: wa > wb, bWins: wb > wa };
    });
    title = "Héroes que juegan los dos";
  } else return null;
  return (
    <section className="card common-card" aria-label={title}>
      <div className="common-head"><h2 className="section-title">{title}</h2></div>
      {!items.length ? <StateBox compact icon="swords" title="Nada en común">No comparten {game === "clashroyale" ? "cartas en el mazo" : game === "dota2" ? "héroes entre sus más jugados" : "brawlers"}.</StateBox> : (
        <ul className="common-list">
          {items.map((it, i) => (
            <li key={it.id} className="common-row reveal" style={{ "--i": i }}>
              <span className={`common-side a${it.aWins ? " best" : ""}`}><strong className="num common-small">{it.a}</strong></span>
              <span className="common-champ"><DDImg src={it.img} size={40} alt="" /><strong>{it.name}</strong></span>
              <span className={`common-side b${it.bWins ? " best" : ""}`}><strong className="num common-small">{it.b}</strong></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function GameCompare() {
  const { game: gameId } = useParams();
  const game = gameById(gameId);
  const def = PROFILES[gameId];
  const [params, setParams] = useSearchParams();
  const a = params.get("a"), b = params.get("b");
  const load = id => async () => {
    if (!id || !def) return null;
    const data = await def.load(id);
    return { ...data, header: def.header(data) };
  };
  const A = useAsync(load(a), [gameId, a]);
  const B = useAsync(load(b), [gameId, b]);
  useTitle(A.data && B.data ? `${A.data.header.name} vs ${B.data.header.name}` : `Comparar en ${game?.name || ""}`);
  if (!game || !def || !GAMES.includes(gameId)) return <NotFound />;

  const set = (slot, id) => {
    const next = new URLSearchParams(params);
    if (id) next.set(slot, id); else next.delete(slot);
    setParams(next, { replace: true });
  };
  const both = A.data && B.data;

  return (
    <Layout header={{ variant: "nav" }}>
      <div style={{ "--game": game.hex }}>
        <div className="compare-hero game-compare-hero">
          <div className="container">
            <p className="eyebrow"><GameLogo game={game.id} size={14} color={game.color} /> {game.name}</p>
            <h1 className="page-title compare-title"><Icon name="compare" size={26} /> Comparar jugadores</h1>
          </div>
        </div>
        <div className="container compare-page">
          <div className="vs-row">
            <Slot slot="a" game={game} def={def} id={a} state={A} onPick={id => set("a", id)} />
            <button type="button" className="vs-badge" onClick={() => setParams(new URLSearchParams([...(b ? [["a", b]] : []), ...(a ? [["b", a]] : [])]), { replace: true })} disabled={!a && !b} aria-label="Intercambiar jugadores" title="Intercambiar"><span>VS</span></button>
            <Slot slot="b" game={game} def={def} id={b} state={B} onPick={id => set("b", id)} />
          </div>
          {both ? (
            <>
              <div className="compare-share"><ShareButton title="Comparación en Kairo" text={`${A.data.header.name} vs ${B.data.header.name} en ${game.name}:`} /></div>
              <H2H rows={rowsFor(game.id, A.data, B.data)} />
              <Common game={game.id} A={A.data} B={B.data} />
            </>
          ) : (
            <div className="card compare-hint"><StateBox compact icon="compare" title={a || b ? "Elige al segundo jugador" : "Elige a dos jugadores"}>{def.invalidHint}</StateBox></div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Slot({ slot, game, def, id, state, onPick }) {
  const side = slot === "a" ? "side-a" : "side-b";
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const parsed = def.parse(text);
    if (parsed) { onPick(parsed); return; }
    if (!def.search || text.trim().length < 2) { setError(def.invalidHint); return; }
    setBusy(true); setError("");
    try {
      const found = await def.search(text);
      if (!found.length) setError("No encontramos jugadores con ese nombre.");
      setResults(found);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  if (!id) {
    return (
      <div className={`card vs-slot empty ${side}`}>
        <span className="vs-slot-label">{slot === "a" ? "Jugador 1" : "Jugador 2"}</span>
        <form className="search search-compact" onSubmit={submit} noValidate>
          <div className="search-box">
            <Icon name="search" size={16} className="search-lead" />
            <label className="search-input"><span className="sr-only">Jugador</span>
              <input type="text" value={text} onChange={e => { setText(e.target.value); setError(""); }} placeholder={game.searchHint} autoComplete="off" spellCheck="false" />
            </label>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? <span className="spinner" aria-hidden="true" /> : "Elegir"}</button>
          </div>
          {error && <p className="search-error" role="alert">{error}</p>}
        </form>
        {results?.length > 0 && (
          <ul className="name-results">
            {results.map(p => (
              <li key={p.id}><button type="button" className="name-result" onClick={() => onPick(p.id)}>
                {p.avatar ? <DDImg src={p.avatar} size={30} alt="" /> : <Initials text={p.name} size={30} />}
                <span className="top-name"><strong>{p.name}</strong><span className="faint">{p.sub}</span></span>
              </button></li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (state.loading && !state.data) {
    return <div className={`card vs-slot ${side}`} aria-busy="true"><Skeleton w={64} h={64} r={16} /><div style={{ flex: 1 }}><Skeleton w="70%" h={18} /><Skeleton w="45%" h={12} style={{ marginTop: 8 }} /></div></div>;
  }
  if (state.error || !state.data) {
    return (
      <div className={`card vs-slot empty ${side}`}>
        <StateBox compact icon="userX" tone="error" title="No se pudo cargar a ese jugador" action={<button type="button" className="btn" onClick={() => onPick(null)}>Elegir otro</button>}>{errorMessage(state.error)}</StateBox>
      </div>
    );
  }
  const h = state.data.header;
  return (
    <div className={`card vs-slot ${side} reveal`}>
      <span className="vs-icon">{h.avatar ? <DDImg src={h.avatar} size={64} alt="" /> : <Initials text={h.name} size={64} />}</span>
      <div className="vs-id">
        <Link to={gameProfilePath(game.id, id)} className="vs-name">{h.name}</Link>
        <span className="faint">{h.tag}</span>
        <span className="faint">{h.subtitle}</span>
      </div>
      <button type="button" className="btn btn-icon vs-clear" onClick={() => onPick(null)} aria-label="Cambiar jugador" title="Cambiar jugador"><Icon name="close" size={14} /></button>
    </div>
  );
}
