import { useState } from "react";
import { Link } from "react-router-dom";
import { DDImg } from "../components/ui";
import { formatNumber, winrate } from "../lib/lol";
import { StatCard, BattleList, BattleRow } from "./ui";
import {
  brawlerPath,
  averageElixir, brawlerIcon, bsBattleView, cardIcon, clanRole, cleanName, crBattleView, displayLevel, tagOf, titleCase,
} from "./supercell";

const STRIP_MAX = 20;
const signed = n => (n > 0 ? `+${n}` : `${n}`);
const toneOf = n => (n > 0 ? "win" : n < 0 ? "loss" : "faint");

// ─── Brawl Stars ─────────────────────────────────────────────────────────
export function BrawlStarsBody({ data }) {
  const { player, battles } = data;
  const [showAll, setShowAll] = useState(false);
  const myTag = tagOf(player.tag);
  const brawlers = [...(player.brawlers || [])].sort((a, b) => b.trophies - a.trophies);
  const shown = showAll ? brawlers : brawlers.slice(0, 8);
  const views = (battles || []).map(b => bsBattleView(b, myTag));
  // Cuenta lo mismo que pinta la tira: victoria/derrota en equipos y puesto bueno/malo en Showdown
  const counted = views.filter(v => v.win !== null);

  return (
    <div className="gp-grid">
      <aside className="gp-side">
        <StatCard index={0} title="Resumen" icon="trophy" items={[
          { label: "Trofeos", value: player.trophies, tone: "accent" },
          { label: "Récord", value: player.highestTrophies },
          { label: "Nivel", value: player.expLevel },
        ]} />
        <StatCard index={1} title="Victorias" icon="swords" items={[
          { label: "3 contra 3", value: player["3vs3Victories"] },
          { label: "Solo", value: player.soloVictories },
          { label: "Dúo", value: player.duoVictories },
        ]} />
        {brawlers.length > 0 && (
          <section className="card gp-list-card reveal" style={{ "--i": 2 }}>
            <h2 className="gp-card-title">Brawlers <span className="faint num">{brawlers.length}</span></h2>
            <ul className="gp-rows">
              {shown.map(b => (
                <li key={b.id}>
                  <DDImg src={brawlerIcon(b.id)} size={38} alt={titleCase(b.name)} className="gp-row-img" />
                  <span className="gp-row-text"><Link to={brawlerPath(b.id)} className="gp-row-link">{titleCase(b.name)}</Link><span className="faint">Poder {b.power} · Rango {b.rank}</span></span>
                  <span className="gp-row-value"><strong className="num accent">{formatNumber(b.trophies)}</strong><span className="faint num">máx. {formatNumber(b.highestTrophies)}</span></span>
                </li>
              ))}
            </ul>
            {brawlers.length > 8 && <button type="button" className="btn btn-block gp-more" onClick={() => setShowAll(v => !v)}>{showAll ? "Ver menos" : `Ver los ${brawlers.length}`}</button>}
          </section>
        )}
      </aside>
      <BattleList
        title={`Últimas ${views.length} batallas`}
        tones={views.slice(0, STRIP_MAX).filter(v => v.win !== null).map(v => (v.win ? "win" : "loss"))}
        wins={counted.filter(v => v.win).length}
        losses={counted.filter(v => !v.win).length}
        empty="No hay batallas recientes en el registro de este jugador."
      >
        {views.map((v, i) => (
          <BattleRow
            key={`${v.time}-${i}`} index={i} tone={v.tone} label={v.label}
            image={v.brawler ? brawlerIcon(v.brawler.id) : null} imageAlt={v.brawler ? titleCase(v.brawler.name) : ""}
            title={v.brawler ? titleCase(v.brawler.name) : "—"}
            subtitle={[v.mode, v.map].filter(Boolean).join(" · ")}
            value={v.trophyChange != null ? signed(v.trophyChange) : null} valueTone={toneOf(v.trophyChange)}
            time={v.time}
          />
        ))}
      </BattleList>
    </div>
  );
}

// ─── Clash Royale ────────────────────────────────────────────────────────
export function ClashRoyaleBody({ data }) {
  const { player, battles } = data;
  const deck = player.currentDeck || [];
  const elixir = averageElixir(deck);
  const views = (battles || []).map(crBattleView);
  const pol = player.currentPathOfLegendSeasonResult;
  return (
    <div className="gp-grid">
      <aside className="gp-side">
        <StatCard index={0} title="Resumen" icon="trophy" items={[
          { label: "Trofeos", value: player.trophies, tone: "accent" },
          { label: "Récord", value: player.bestTrophies },
          { label: "Nivel", value: player.expLevel },
        ]} />
        <StatCard index={1} title="Historial" icon="history" items={[
          { label: "Victorias", value: player.wins, tone: "win" },
          { label: "Derrotas", value: player.losses, tone: "loss" },
          { label: "Winrate", value: winrate(player.wins, player.losses), suffix: "%" },
          { label: "Batallas", value: player.battleCount },
          { label: "Tres coronas", value: player.threeCrownWins },
        ]} />
        {pol?.leagueNumber ? (
          <StatCard index={2} title="Senda de leyendas" icon="trophy" items={[
            { label: "Liga", value: pol.leagueNumber, tone: "accent" },
            pol.trophies != null && { label: "Puntos", value: pol.trophies },
            pol.rank && { label: "Ranking", value: `#${formatNumber(pol.rank)}` },
          ]} />
        ) : null}
        {deck.length > 0 && (
          <section className="card gp-list-card reveal" style={{ "--i": 3 }}>
            <h2 className="gp-card-title">Mazo actual {elixir && <span className="accent num">{elixir} de elixir</span>}</h2>
            <ul className="cr-deck">
              {deck.map(c => (
                <li key={c.id} title={c.name}>
                  <DDImg src={cardIcon(c)} size={64} alt={c.name} className="cr-card" />
                  <span className="cr-card-level num">Nv. {displayLevel(c)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
      <BattleList
        title={`Últimas ${views.length} batallas`}
        tones={views.slice(0, STRIP_MAX).filter(v => v.win !== null).map(v => (v.win ? "win" : "loss"))}
        wins={views.filter(v => v.win === true).length}
        losses={views.filter(v => v.win === false).length}
        empty="No hay batallas recientes en el registro de este jugador."
      >
        {views.map((v, i) => (
          <BattleRow
            key={`${v.time}-${i}`} index={i} tone={v.tone} label={v.label}
            title={`contra ${cleanName(v.rival)}`} subtitle={v.kind}
            extra={v.deck.length ? <span className="cr-mini-deck">{v.deck.slice(0, 8).map(c => <DDImg key={c.id} src={cardIcon(c)} size={22} alt={c.name} />)}</span> : null}
            value={v.score}
            valueTone={v.trophyChange != null && v.trophyChange !== 0 ? toneOf(v.trophyChange) : ""}
            time={v.time}
          />
        ))}
      </BattleList>
    </div>
  );
}

// ─── Clash of Clans ──────────────────────────────────────────────────────
function HeroBars({ heroes }) {
  return (
    <ul className="coc-heroes">
      {heroes.map(h => (
        <li key={h.name}>
          <span className="coc-hero-head"><strong>{h.name}</strong><span className="num">Nv. {h.level}<span className="faint"> / {h.maxLevel}</span></span></span>
          <span className="coc-bar"><span style={{ transform: `scaleX(${h.maxLevel ? h.level / h.maxLevel : 0})` }} /></span>
        </li>
      ))}
    </ul>
  );
}

export function ClashOfClansBody({ data }) {
  const { player } = data;
  const heroes = player.heroes || [];
  const home = heroes.filter(h => h.village !== "builderBase");
  const builder = heroes.filter(h => h.village === "builderBase");
  const clan = player.clan;
  return (
    <div className="gp-grid">
      <aside className="gp-side">
        <StatCard index={0} title="Resumen" icon="trophy" items={[
          { label: "Ayuntamiento", value: player.townHallLevel, tone: "accent" },
          { label: "Trofeos", value: player.trophies },
          { label: "Récord", value: player.bestTrophies },
        ]} />
        <StatCard index={1} title="Guerra y clan" icon="swords" items={[
          { label: "Estrellas de guerra", value: player.warStars },
          { label: "Ataques ganados", value: player.attackWins, tone: "win" },
          { label: "Defensas ganadas", value: player.defenseWins },
          { label: "Donadas", value: player.donations },
          { label: "Recibidas", value: player.donationsReceived },
          { label: "Nivel", value: player.expLevel },
        ]} />
        {clan && (
          <section className="card gp-list-card reveal" style={{ "--i": 2 }}>
            <h2 className="gp-card-title">Clan</h2>
            <div className="coc-clan">
              {clan.badgeUrls?.medium && <img src={clan.badgeUrls.medium} alt="" width="56" height="56" loading="lazy" />}
              <span className="gp-row-text">
                <strong>{cleanName(clan.name)}</strong>
                <span className="faint">{[clanRole(player.role), clan.clanLevel ? `Nivel ${clan.clanLevel}` : null].filter(Boolean).join(" · ")}</span>
              </span>
            </div>
          </section>
        )}
      </aside>
      <div className="gp-main-col">
        {home.length > 0 && (
          <section className="card gp-list-card reveal" style={{ "--i": 3 }}>
            <h2 className="gp-card-title">Héroes</h2>
            <HeroBars heroes={home} />
          </section>
        )}
        {(player.builderHallLevel || builder.length > 0) && (
          <section className="card gp-list-card reveal" style={{ "--i": 4 }}>
            <h2 className="gp-card-title">Base del constructor</h2>
            <p className="faint coc-builder">
              {[player.builderHallLevel ? `Taller del constructor nivel ${player.builderHallLevel}` : null,
                player.builderBaseTrophies != null ? `${formatNumber(player.builderBaseTrophies)} trofeos` : null].filter(Boolean).join(" · ")}
            </p>
            {builder.length > 0 && <HeroBars heroes={builder} />}
          </section>
        )}
        <p className="gp-note faint">La API de Clash of Clans no publica el registro de ataques, por eso no hay historial de batallas.</p>
      </div>
    </div>
  );
}
