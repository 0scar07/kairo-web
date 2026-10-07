import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import GameLogo from "../components/GameLogo";
import { DDImg, Initials, Skeleton, StateBox } from "../components/ui";
import { errorMessage } from "../api/client";
import { PROFILES } from "../games/registry";
import { gameById } from "../lib/games";
import { addRecent } from "../lib/library";
import { useAsync, useNow, useTitle } from "../lib/hooks";
import { timeAgo } from "../lib/lol";
import { NotFound } from "./Misc";

// Perfil de un jugador de los demás juegos: cabecera común + el cuerpo de cada juego (games/registry.js)
export default function GameProfile() {
  const { game: gameId, id } = useParams();
  const game = gameById(gameId);
  const def = PROFILES[gameId];
  if (!game || !def) return <NotFound />;
  return <GameProfilePage key={`${gameId}/${id}`} game={game} def={def} id={id} />;
}

function GameProfilePage({ game, def, id }) {
  const now = useNow(30_000);
  const { data, error, loading, reload } = useAsync(async force => ({ ...(await def.load(id, force)), at: Date.now() }), [game.id, id]);
  const head = data ? def.header(data) : null;
  useTitle(head ? `${head.name} · ${game.name}` : game.name);

  // Búsqueda reciente (con el juego, para que la lista de la portada muestre su logo)
  useEffect(() => {
    if (!head) return;
    addRecent({ game: game.id, region: "global", gameName: head.name, tagLine: id, subtitle: `${game.name} · ${head.subtitle}` });
  }, [head?.name, game.id, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const Body = def.Body;
  return (
    <Layout header={{ variant: "nav" }}>
      <div className="gp" style={{ "--game": game.hex }}>
        <div className="gp-head">
          <div className="container gp-head-inner">
            {error && !data ? null : (
              <>
                <span className="gp-avatar">
                  {!head ? <Skeleton w={72} h={72} r={16} />
                    : head.avatar ? <DDImg src={head.avatar} size={72} alt="" />
                    : <Initials text={head.name} size={72} />}
                  <span className="gp-avatar-game"><GameLogo game={game.id} size={16} color={game.color} /></span>
                </span>
                <div className="gp-id">
                  {head ? <h1>{head.name} <span className="profile-tag">{head.tag}</span></h1> : <Skeleton w={240} h={30} />}
                  <p className="muted">{head ? `${game.name} · ${head.subtitle}` : <Skeleton w={200} h={12} />}{data ? ` · Actualizado ${timeAgo(data.at, now)}` : ""}</p>
                </div>
                <div className="profile-actions">
                  <button type="button" className="btn btn-primary" onClick={() => reload(true)} disabled={loading}>
                    <Icon name="refresh" size={15} className={loading && data ? "spin" : ""} /> {loading && data ? "Actualizando" : "Actualizar"}
                  </button>
                  <Link className="btn" to={`/juegos/${game.id}`}><GameLogo game={game.id} size={15} color={game.color} /> Buscar otro</Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="container gp-body">
          {error && !data ? (
            <div className="page-narrow"><div className="card">
              <StateBox
                icon={error.code === "TAG_NOT_FOUND" || error.code === "INVALID_TAG" || error.status === 404 ? "userX" : "alert"}
                tone={error.status === 404 ? undefined : "error"}
                title={error.status === 404 ? "No encontramos a ese jugador" : "No se pudo cargar el perfil"}
                action={<div className="state-actions">
                  <Link className="btn btn-primary" to={`/juegos/${game.id}`}>Buscar otro jugador</Link>
                  {error.status !== 404 && <button type="button" className="btn" onClick={() => reload()}>Reintentar</button>}
                </div>}
              >
                {errorMessage(error)}
              </StateBox>
            </div></div>
          ) : !data ? (
            <div className="gp-grid" aria-busy="true">
              <aside className="gp-side">{[120, 150, 260].map((h, i) => <div key={i} className="card"><Skeleton h={h} r={16} /></div>)}</aside>
              <div className="gp-main-col">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={64} r={14} />)}</div>
            </div>
          ) : (
            <>
              {error && <p className="list-note loss" role="alert">No se pudo actualizar: {errorMessage(error)}</p>}
              <Body data={data} />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

