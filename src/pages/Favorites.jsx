import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { DDImg, StateBox } from "../components/ui";
import { toggleFavorite, useFavorites } from "../lib/library";
import { useLiveFavorites } from "../lib/liveFavorites";
import { livePath, profilePath, regionBySlug } from "../lib/regions";
import { formatDuration, queueShort } from "../lib/lol";
import { championIcon, championName, profileIcon, useDDragon } from "../lib/ddragon";
import { useNow, useTitle } from "../lib/hooks";
import { APK_URL } from "../lib/config";

// Favoritos de este navegador: quién está jugando ahora, su rango guardado y acceso al perfil
export default function Favorites() {
  useTitle("Favoritos");
  useDDragon();
  const now = useNow(1000);
  const favorites = useFavorites();
  const { items } = useLiveFavorites();
  const liveBy = new Map(items.map(x => [x.fav.puuid, x.live]));

  return (
    <Layout header={{ variant: "search" }}>
      <div className="container favorites-page">
        <div className="section-head">
          <h1 className="section-title page-title">Favoritos</h1>
          {favorites.length > 0 && <span className="faint">{favorites.length} {favorites.length === 1 ? "jugador" : "jugadores"} · se guardan en este navegador</span>}
        </div>

        {!favorites.length ? (
          <div className="card">
            <StateBox icon="star" title="Aún no tienes favoritos" action={<Link className="btn btn-primary" to="/">Buscar un jugador</Link>}>
              Abre el perfil de un jugador y márcalo con la estrella. Aquí verás si está jugando y entrarás a su perfil con un clic.
            </StateBox>
          </div>
        ) : (
          <ul className="fav-list">
            {favorites.map((f, i) => {
              const live = liveBy.get(f.puuid);
              const me = live?.participants.find(p => p.puuid === f.puuid);
              const region = regionBySlug(f.region);
              return (
                <li key={`${f.region}:${f.gameName}#${f.tagLine}`} className="card fav-row reveal" style={{ "--i": i }}>
                  <Link to={profilePath(f.region, f.gameName, f.tagLine)} className="fav-row-main">
                    <DDImg src={f.iconId != null ? profileIcon(f.iconId) : null} size={44} alt="" />
                    <span className="fav-row-text">
                      <strong>{f.gameName}<span className="faint">#{f.tagLine}</span></strong>
                      <span className="faint">{[region?.label, f.rank || "League of Legends"].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                  {live ? (
                    <Link to={livePath(f.region, f.gameName, f.tagLine)} className="fav-row-live">
                      <DDImg src={me ? championIcon(me.championId) : null} size={26} alt="" />
                      <span>
                        <strong><span className="live-dot pulse" aria-hidden="true" /> En partida</strong>
                        <span className="faint">{[me && championName(me.championId), queueShort(live.queueId)].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="fav-row-time num">{live.startTime > 0 ? formatDuration((now - live.startTime) / 1000) : "Cargando"}</span>
                    </Link>
                  ) : (
                    <span className="fav-row-idle faint">{f.puuid ? "No está jugando" : ""}</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-icon fav-row-remove"
                    aria-label={`Quitar a ${f.gameName}#${f.tagLine} de favoritos`}
                    title="Quitar de favoritos"
                    onClick={() => toggleFavorite(f)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="card notify favorites-app">
          <Icon name="bell" size={18} className="brand" />
          <p>En la web revisamos cada minuto mientras la página está abierta. Para recibir avisos con el navegador cerrado, usa la app de Kairo.</p>
          <a className="btn btn-primary" href={APK_URL} rel="noopener">Descargar app</a>
        </div>
      </div>
    </Layout>
  );
}
