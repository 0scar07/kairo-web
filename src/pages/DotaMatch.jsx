import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import ShareButton from "../components/ShareButton";
import { DDImg, Skeleton, StateBox } from "../components/ui";
import { gameProfilePath } from "../games/registry";
import { getHeroes, getItems, getMatch, heroIcon, heroName, itemIcon, itemName, modeLabel } from "../games/dota2";
import { errorMessage } from "../api/client";
import { gameById } from "../lib/games";
import { useAsync, useTitle } from "../lib/hooks";
import { formatDuration, formatNumber, kdaText } from "../lib/lol";
import { NotFound } from "./Misc";

const game = gameById("dota2");

/** Partida de Dota 2: Radiant contra Dire con los 10 jugadores, objetos y la ventaja de oro */
export default function DotaMatch() {
  const { id } = useParams();
  const valid = /^\d{1,20}$/.test(id || "");
  const { data, error, loading, reload } = useAsync(async () => {
    if (!valid) return null;
    const [match, heroes, items] = await Promise.all([getMatch(id), getHeroes().catch(() => ({})), getItems().catch(() => ({}))]);
    return { match, heroes, items };
  }, [id]);
  useTitle(data?.match ? `Partida ${id} de Dota 2` : "Partida de Dota 2");
  if (!valid) return <NotFound />;

  if (!data) {
    return (
      <Layout header={{ variant: "nav" }}>
        <div className="container match-page" style={{ "--game": game.hex }}>
          {loading ? <Skeleton h={360} r={16} /> : (
            <div className="card">
              <StateBox icon="alert" tone="error" title={error?.code === "MATCH_NOT_FOUND" ? "No encontramos esta partida" : "No se pudo cargar la partida"}
                action={<button type="button" className="btn btn-primary" onClick={() => reload()}>Reintentar</button>}>{errorMessage(error)}</StateBox>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  const { match, heroes, items } = data;
  const radiant = match.players.filter(p => p.radiant);
  const dire = match.players.filter(p => !p.radiant);
  const date = new Date(match.startTime * 1000).toLocaleString("es", { dateStyle: "long", timeStyle: "short" });

  return (
    <Layout header={{ variant: "nav" }}>
      <div style={{ "--game": game.hex }}>
        <div className="gp-head">
          <div className="container gp-head-inner">
            <div className="gp-id">
              <p className="eyebrow dota-eyebrow"><GameLogo game="dota2" size={14} color={game.color} /> Dota 2 · {modeLabel(match.gameMode, match.lobbyType)}</p>
              <h1 className="dota-score">
                <span className={`radiant${match.radiantWin ? " won" : ""}`}>Radiant <strong className="num">{match.radiantScore ?? "—"}</strong></span>
                <span className="faint">–</span>
                <span className={`dire${!match.radiantWin ? " won" : ""}`}><strong className="num">{match.direScore ?? "—"}</strong> Dire</span>
              </h1>
              <p className="muted num">Ganó {match.radiantWin ? "Radiant" : "Dire"} · {formatDuration(match.duration)} · {date}</p>
            </div>
            <div className="profile-actions">
              <ShareButton title="Partida de Dota 2 en Kairo" text={`Partida de Dota 2 (${match.radiantWin ? "ganó Radiant" : "ganó Dire"}) en Kairo:`} />
            </div>
          </div>
        </div>

        <div className="container match-page">
          {match.goldAdvantage?.length > 2 && <Advantage values={match.goldAdvantage} />}
          <DotaTeam title="Radiant" cls="radiant" won={match.radiantWin} players={radiant} heroes={heroes} items={items} duration={match.duration} />
          <DotaTeam title="Dire" cls="dire" won={!match.radiantWin} players={dire} heroes={heroes} items={items} duration={match.duration} />
        </div>
      </div>
    </Layout>
  );
}

function DotaTeam({ title, cls, won, players, heroes, items }) {
  const maxDmg = Math.max(1, ...players.map(p => p.heroDamage || 0));
  return (
    <section className={`card dota-team ${cls}`} aria-label={title}>
      <header className="dota-team-head">
        <h2>{title}</h2>
        <span className={won ? "win" : "loss"}>{won ? "Victoria" : "Derrota"}</span>
        <span className="faint num">{players.reduce((s, p) => s + (p.kills || 0), 0)} kills · {formatNumber(players.reduce((s, p) => s + (p.netWorth || 0), 0))} de oro</span>
      </header>
      <div className="table-scroll">
        <table className="detail-table dota-table">
          <thead>
            <tr>
              <th scope="col">Jugador</th>
              <th scope="col">K / D / A</th>
              <th scope="col">LH / DN</th>
              <th scope="col">Oro/min · XP/min</th>
              <th scope="col">Patrimonio</th>
              <th scope="col">Daño a héroes</th>
              <th scope="col">Objetos</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i}>
                <td>
                  <div className="detail-player">
                    <span className="dota-hero"><DDImg src={heroIcon(heroes, p.heroId)} size={34} alt={heroName(heroes, p.heroId)} /><span className="champ-level num">{p.level}</span></span>
                    <div className="detail-name">
                      {p.accountId ? <Link to={gameProfilePath("dota2", p.accountId)}>{p.name || `ID ${p.accountId}`}</Link> : <span className="faint">Perfil privado</span>}
                      <span className="faint">{heroName(heroes, p.heroId)}</span>
                    </div>
                  </div>
                </td>
                <td className="num"><span className="detail-kda">{p.kills}/{p.deaths}/{p.assists}</span><span className="faint">{kdaText(p.kills, p.deaths, p.assists)}</span></td>
                <td className="num">{p.lastHits} / {p.denies}</td>
                <td className="num">{formatNumber(p.goldPerMin)} · {formatNumber(p.xpPerMin)}</td>
                <td className="num gold-text">{formatNumber(p.netWorth)}</td>
                <td className="num">
                  <span>{formatNumber(p.heroDamage)}</span>
                  <span className="dmg-bar"><span style={{ width: `${(p.heroDamage / maxDmg) * 100}%` }} /></span>
                </td>
                <td>
                  <div className="dota-items">
                    {p.items.map((it, k) => <DDImg key={k} src={itemIcon(items, it)} size={30} alt={itemName(items, it)} title={itemName(items, it)} className="dota-item" />)}
                    {p.neutral ? <DDImg src={itemIcon(items, p.neutral)} size={24} round alt={itemName(items, p.neutral)} title={`${itemName(items, p.neutral)} (neutral)`} className="dota-neutral" /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Ventaja de oro del Radiant minuto a minuto (arriba Radiant, abajo Dire) */
function Advantage({ values }) {
  const W = 760, H = 160, PAD = 30;
  const max = Math.max(1000, ...values.map(v => Math.abs(v)));
  const x = i => PAD + (i / (values.length - 1)) * (W - PAD - 8);
  const y = v => 8 + (1 - (v + max) / (2 * max)) * (H - 26);
  const zero = y(0);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(values.length - 1)},${zero}L${x(0)},${zero}Z`;
  return (
    <section className="card gold-chart" aria-labelledby="adv-title">
      <div className="gold-head">
        <h2 className="section-title" id="adv-title"><Icon name="history" size={18} /> Ventaja de oro</h2>
        <p className="faint gold-summary">Arriba Radiant, abajo Dire</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="gold-svg" role="img" aria-label="Ventaja de oro minuto a minuto">
        <defs>
          <clipPath id="adv-top"><rect x="0" y="0" width={W} height={zero} /></clipPath>
          <clipPath id="adv-bottom"><rect x="0" y={zero} width={W} height={H} /></clipPath>
        </defs>
        <line x1={PAD} x2={W - 8} y1={zero} y2={zero} className="adv-zero" />
        <text x={PAD - 6} y={y(max) + 8} textAnchor="end" className="gold-min">+{Math.round(max / 1000)}k</text>
        <text x={PAD - 6} y={y(-max)} textAnchor="end" className="gold-min">−{Math.round(max / 1000)}k</text>
        <path d={area} className="adv-radiant gold-area" clipPath="url(#adv-top)" />
        <path d={area} className="adv-dire gold-area" clipPath="url(#adv-bottom)" />
        <path d={line} className="gold-line" pathLength="1" />
      </svg>
    </section>
  );
}
