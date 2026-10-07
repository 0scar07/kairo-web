import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import { DDImg, Skeleton, StateBox } from "../components/ui";
import { MEDAL_NAMES, getHeroStats, heroImageByName, medalIcon } from "../games/dota2";
import { errorMessage } from "../api/client";
import { gameById } from "../lib/games";
import { useAsync, useTitle } from "../lib/hooks";
import { formatNumber } from "../lib/lol";

const game = gameById("dota2");
const ATTR = { str: "Fuerza", agi: "Agilidad", int: "Inteligencia", all: "Universal" };
const ROLES_ES = { Carry: "Carry", Support: "Soporte", Nuker: "Daño mágico", Disabler: "Control", Jungler: "Jungla", Durable: "Resistente", Escape: "Escape", Pusher: "Empujador", Initiator: "Iniciador" };

/** Héroes de Dota 2 con su winrate y partidas por medalla (OpenDota, últimos días de partidas públicas) */
export default function DotaHeroes() {
  useTitle("Héroes de Dota 2");
  const { data, error, loading, reload } = useAsync(() => getHeroStats(), []);
  const [bracket, setBracket] = useState("all");   // "all" | 0..7 | "pro"
  const [sort, setSort] = useState("wr");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || [])
      .filter(h => !q || h.label.toLowerCase().includes(q))
      .map(h => {
        const s = bracket === "pro" ? h.pro
          : bracket === "all" ? h.brackets.reduce((a, b) => ({ pick: a.pick + b.pick, win: a.win + b.win }), { pick: 0, win: 0 })
          : h.brackets[bracket];
        return { ...h, picks: s.pick, wins: s.win, wr: s.pick ? (s.win / s.pick) * 100 : 0, bans: bracket === "pro" ? h.pro.ban : null };
      })
      .filter(h => h.picks > 0)
      .sort((a, b) => (sort === "wr" ? b.wr - a.wr : b.picks - a.picks));
  }, [data, bracket, sort, query]);
  const maxPicks = Math.max(1, ...rows.map(r => r.picks));

  return (
    <Layout header={{ variant: "nav" }}>
      <div style={{ "--game": game.hex }}>
        <div className="champs-hero bs-hero">
          <div className="container">
            <p className="eyebrow dota-eyebrow"><GameLogo game="dota2" size={14} color={game.color} /> Dota 2</p>
            <h1 className="page-title">Héroes</h1>
            <p className="muted">Winrate y partidas de cada héroe por medalla, con las partidas públicas recientes (OpenDota).</p>
            <div className="champs-tools">
              <label className="champ-search">
                <Icon name="search" size={15} />
                <span className="sr-only">Buscar héroe</span>
                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca un héroe" autoComplete="off" spellCheck="false" />
              </label>
              <div className="segmented medal-filter" role="group" aria-label="Medalla">
                <button type="button" aria-pressed={bracket === "all"} onClick={() => setBracket("all")}>Todas</button>
                {MEDAL_NAMES.map((m, i) => (
                  <button key={m} type="button" aria-pressed={bracket === i} onClick={() => setBracket(i)} title={m}>
                    <img src={medalIcon({ medal: i + 1 })} alt="" width="18" height="18" /> <span className="medal-label">{m}</span>
                  </button>
                ))}
                <button type="button" aria-pressed={bracket === "pro"} onClick={() => setBracket("pro")}>Pro</button>
              </div>
              <div className="segmented" role="group" aria-label="Ordenar por">
                <button type="button" aria-pressed={sort === "wr"} onClick={() => setSort("wr")}>Winrate</button>
                <button type="button" aria-pressed={sort === "picks"} onClick={() => setSort("picks")}>Partidas</button>
              </div>
            </div>
          </div>
        </div>
        <div className="container champs-page">
          <div className="card">
            {loading && !data ? (
              <div className="card-pad">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={40} style={{ marginBottom: 8 }} />)}</div>
            ) : error ? (
              <StateBox tone="error" title="No se pudieron cargar los héroes" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox>
            ) : (
              <div className="table-scroll">
                <table className="data-table hero-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Héroe</th>
                      <th scope="col" className="r">Winrate</th>
                      <th scope="col">Partidas</th>
                      {bracket === "pro" && <th scope="col" className="r">Bloqueos</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((h, i) => (
                      <tr key={h.id}>
                        <td className="num faint">{i + 1}</td>
                        <td>
                          <div className="cell-champ">
                            <DDImg src={heroImageByName(h.name)} size={34} alt="" className="hero-img" />
                            <span className="hero-name"><strong>{h.label}</strong><span className="faint">{[ATTR[h.attr], ...h.roles.slice(0, 2).map(r => ROLES_ES[r] || r)].filter(Boolean).join(" · ")}</span></span>
                          </div>
                        </td>
                        <td className={`r num ${h.wr >= 50 ? "win" : "loss"}`}>{h.wr.toFixed(1)}%</td>
                        <td>
                          <span className="hero-picks num">{formatNumber(h.picks)}</span>
                          <span className="dmg-bar"><span style={{ width: `${(h.picks / maxPicks) * 100}%` }} /></span>
                        </td>
                        {bracket === "pro" && <td className="r num">{formatNumber(h.bans)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
