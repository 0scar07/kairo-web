import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { DDImg, Initials, Skeleton, StateBox } from "../components/ui";
import { gameProfilePath } from "../games/registry";
import {
  COUNTRIES, brawlerIcon, brawlerPath, brawlerPortrait, bsProfileIcon, cleanName, gadgetIcon, getBrawlers, getTop, starPowerIcon, tagOf, titleCase,
} from "../games/supercell";
import { errorMessage } from "../api/client";
import { gameById } from "../lib/games";
import { useAsync, useTitle } from "../lib/hooks";
import { formatNumber } from "../lib/lol";

const game = gameById("brawlstars");

// ─── Lista ────────────────────────────────────────────────────────────────
export function BrawlerList() {
  useTitle("Brawlers");
  const { data, error, loading, reload } = useAsync(() => getBrawlers(), []);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => (data || []).filter(b => !query.trim() || b.name.toLowerCase().includes(query.trim().toLowerCase())), [data, query]);
  return (
    <Layout header={{ variant: "nav" }}>
      <div style={{ "--game": game.hex }}>
        <div className="champs-hero bs-hero">
          <div className="container">
            <p className="eyebrow">Brawl Stars</p>
            <h1 className="page-title">Brawlers</h1>
            <p className="muted">{data ? `${data.length} brawlers` : "Todos los brawlers"} con sus habilidades estelares, gadgets y los mejores jugadores con cada uno.</p>
            <div className="champs-tools">
              <label className="champ-search">
                <Icon name="search" size={15} />
                <span className="sr-only">Buscar brawler</span>
                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca un brawler" autoComplete="off" spellCheck="false" />
              </label>
            </div>
          </div>
        </div>
        <div className="container champs-page">
          {loading && !data ? (
            <ul className="brawler-grid">{Array.from({ length: 24 }, (_, i) => <li key={i}><Skeleton h={130} r={14} /></li>)}</ul>
          ) : error ? (
            <div className="card"><StateBox tone="error" title="No se pudieron cargar los brawlers" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox></div>
          ) : (
            <ul className="brawler-grid">
              {shown.map((b, i) => (
                <li key={b.id} className="reveal" style={{ "--i": Math.min(i, 24) }}>
                  <Link to={brawlerPath(b.id)} className="brawler-tile">
                    <img src={brawlerIcon(b.id)} alt="" loading="lazy" decoding="async" />
                    <strong>{titleCase(b.name)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Ficha de un brawler ─────────────────────────────────────────────────
export function BrawlerPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const country = COUNTRIES.some(c => c.code === params.get("pais")) ? params.get("pais") : "global";
  const list = useAsync(() => getBrawlers(), []);
  const brawler = list.data?.find(b => String(b.id) === String(id)) || null;
  const top = useAsync(() => getTop("brawlstars", 50, { country, brawler: id }), [id, country]);
  useTitle(brawler ? titleCase(brawler.name) : "Brawler");

  if (!brawler) {
    return (
      <Layout header={{ variant: "nav" }}>
        <div className="container page-narrow">
          {list.loading ? <Skeleton h={300} r={16} /> : (
            <div className="card"><StateBox icon="alert" title="No encontramos este brawler" action={<Link className="btn btn-primary" to="/juegos/brawlstars/brawlers">Ver todos</Link>}>{errorMessage(list.error)}</StateBox></div>
          )}
        </div>
      </Layout>
    );
  }

  const name = titleCase(brawler.name);
  return (
    <Layout header={{ variant: "nav" }}>
      <div style={{ "--game": game.hex }}>
        <div className="brawler-hero">
          <div className="container brawler-hero-inner">
            <Link to="/juegos/brawlstars/brawlers" className="back-link"><Icon name="chevronLeft" size={14} /> Brawlers</Link>
            <div className="brawler-id">
              <span className="brawler-portrait"><img src={brawlerPortrait(brawler.id)} alt="" /></span>
              <div>
                <p className="eyebrow">Brawl Stars</p>
                <h1 className="champ-name">{name}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="container champ-page">
          <div className="champ-grid-2">
            <section className="card card-pad" aria-labelledby="kit-title">
              <h2 className="section-title" id="kit-title">Habilidades</h2>
              <Kit title="Habilidades estelares" items={brawler.starPowers} icon={starPowerIcon} />
              <Kit title="Gadgets" items={brawler.gadgets} icon={gadgetIcon} />
            </section>
            <section className="card brawler-top" aria-labelledby="btop-title">
              <div className="club-members-head">
                <h2 className="section-title" id="btop-title"><Icon name="trophy" size={18} /> Mejores con {name}</h2>
                <label className="country-select">
                  <span className="sr-only">País</span>
                  <select value={country} onChange={e => setParams(e.target.value === "global" ? {} : { pais: e.target.value }, { replace: true })}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </label>
              </div>
              <TopList state={top} />
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const Kit = ({ title, items, icon }) => (
  items?.length ? (
    <div className="kit">
      <h3 className="eyebrow">{title}</h3>
      <ul>
        {items.map(x => (
          <li key={x.id}><img src={icon(x.id)} alt="" width="40" height="40" loading="lazy" /> <strong>{titleCase(x.name)}</strong></li>
        ))}
      </ul>
    </div>
  ) : null
);

/** Lista de jugadores de un ranking de Brawl Stars (sirve para el ranking por país y por brawler) */
export function TopList({ state, limit = 50 }) {
  const { data, error, loading, reload } = state;
  if (loading && !data) return <div className="card-pad">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} h={38} style={{ marginBottom: 8 }} />)}</div>;
  if (error) return <StateBox compact tone="error" title="No se pudo cargar el ranking" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox>;
  if (!data?.length) return <StateBox compact icon="trophy" title="Sin jugadores en este ranking">Prueba con otro país.</StateBox>;
  return (
    <ol className="top-list">
      {data.slice(0, limit).map((p, i) => (
        <li key={p.tag} className="reveal" style={{ "--i": Math.min(i, 14) }}>
          <Link to={gameProfilePath("brawlstars", tagOf(p.tag))} className="top-row">
            <span className={`top-pos num${i < 3 ? " podium" : ""}`}>{p.rank || i + 1}</span>
            {p.icon?.id ? <DDImg src={bsProfileIcon(p.icon.id)} size={30} alt="" /> : <Initials text={cleanName(p.name)} size={30} />}
            <span className="top-name"><strong>{cleanName(p.name)}</strong><span className="faint">{p.club?.name ? cleanName(p.club.name) : "Sin club"}</span></span>
            <span className="top-value num"><strong>{formatNumber(p.trophies)}</strong> <span className="faint">trofeos</span></span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
