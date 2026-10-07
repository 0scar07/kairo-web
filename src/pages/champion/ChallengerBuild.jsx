import RoleIcon from "../../components/RoleIcon";
import Icon from "../../components/Icon";
import { DDImg, Skeleton } from "../../components/ui";
import { getBuild } from "../../api/lol";
import { useAsync } from "../../lib/hooks";
import { itemIcon, itemKind, itemName, perkIcon, perkName, spellIcon, spellName, useDDragon } from "../../lib/ddragon";
import { positionName, timeAgo } from "../../lib/lol";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

/** Build de los Challenger con este campeón (backend: /lol/builds/:id, se arma con sus partidas de Solo/Dúo) */
export default function ChallengerBuild({ championId, name }) {
  useDDragon();
  const { data, loading } = useAsync(() => getBuild(championId), [championId]);

  if (loading && !data) return <section className="card card-pad build-card"><Skeleton h={180} r={12} /></section>;
  if (!data) {
    return (
      <section className="card card-pad build-card empty">
        <h2 className="section-title"><Icon name="trophy" size={18} /> Build de los Challenger</h2>
        <p className="muted">Kairo junta partidas de jugadores Challenger cada 20 minutos. Todavía no hay suficientes con {name}: vuelve más tarde.</p>
      </section>
    );
  }

  const core = data.items.filter(i => itemKind(i.id) === "core").slice(0, 6);
  const boots = data.items.filter(i => itemKind(i.id) === "boots").slice(0, 2);
  const page = data.pages[0];
  return (
    <section className="card card-pad build-card reveal" aria-labelledby="build-title">
      <div className="build-head">
        <h2 className="section-title" id="build-title"><Icon name="trophy" size={18} /> Build de los Challenger</h2>
        <span className="faint num">
          Parche {data.patch} · {data.games} {data.games === 1 ? "partida" : "partidas"} · <span className={pct(data.wins, data.games) >= 50 ? "win" : "loss"}>{pct(data.wins, data.games)}% de victorias</span>
        </span>
      </div>

      {data.positions.length > 0 && (
        <div className="build-positions">
          {data.positions.map(p => (
            <span key={p.position} className="build-pos"><RoleIcon role={p.position} size={14} /> {positionName(p.position)} <span className="faint num">{pct(p.games, data.games)}%</span></span>
          ))}
        </div>
      )}

      <div className="build-grid">
        <div>
          <h3 className="eyebrow">Objetos principales</h3>
          <ul className="build-items">
            {core.map(i => <BuildPick key={i.id} img={itemIcon(i.id)} label={itemName(i.id)} games={i.games} wins={i.wins} total={data.games} />)}
          </ul>
          {boots.length > 0 && (
            <>
              <h3 className="eyebrow">Botas</h3>
              <ul className="build-items">{boots.map(i => <BuildPick key={i.id} img={itemIcon(i.id)} label={itemName(i.id)} games={i.games} wins={i.wins} total={data.games} />)}</ul>
            </>
          )}
        </div>
        <div>
          {page && (
            <>
              <h3 className="eyebrow">Runas <span className="faint num">{pct(page.games, data.games)}% · {pct(page.wins, page.games)}% de victorias</span></h3>
              <div className="build-runes">
                <div className="rune-tree">
                  <DDImg src={perkIcon(page.primaryStyle)} size={26} round alt={perkName(page.primaryStyle)} title={perkName(page.primaryStyle)} />
                  {page.primary.map((id, i) => <DDImg key={id} src={perkIcon(id)} size={i === 0 ? 48 : 32} round alt={perkName(id)} title={perkName(id)} className={i === 0 ? "keystone" : ""} />)}
                </div>
                <div className="rune-tree secondary">
                  <DDImg src={perkIcon(page.secondaryStyle)} size={22} round alt={perkName(page.secondaryStyle)} title={perkName(page.secondaryStyle)} />
                  {page.secondary.map(id => <DDImg key={id} src={perkIcon(id)} size={28} round alt={perkName(id)} title={perkName(id)} />)}
                </div>
              </div>
            </>
          )}
          {data.spells.length > 0 && (
            <>
              <h3 className="eyebrow">Hechizos</h3>
              <ul className="build-spells">
                {data.spells.slice(0, 2).map(s => (
                  <li key={s.ids.join("-")}>
                    {s.ids.map(id => <DDImg key={id} src={spellIcon(id)} size={30} alt={spellName(id)} title={spellName(id)} />)}
                    <span className="faint num">{pct(s.games, data.games)}% · {pct(s.wins, s.games)}% V</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <p className="faint build-note">Partidas de Solo/Dúo de jugadores Challenger de KR, EUW, NA y LAN. Actualizado {timeAgo(Date.parse(data.updatedAt))}.</p>
    </section>
  );
}

function BuildPick({ img, label, games, wins, total }) {
  return (
    <li className="build-pick" title={label}>
      <DDImg src={img} size={42} alt={label} />
      <span className="num">{pct(games, total)}%</span>
      <span className={`num faint ${pct(wins, games) >= 50 ? "win" : "loss"}`}>{pct(wins, games)}% V</span>
    </li>
  );
}
