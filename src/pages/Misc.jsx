import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { StateBox } from "../components/ui";
import { GAMES, gameById } from "../lib/games";
import { APK_URL } from "../lib/config";
import { useTitle } from "../lib/hooks";

// Juegos que todavía no están en la web (sí en la app)
export function ComingSoon() {
  const { game: id } = useParams();
  const game = gameById(id);
  useTitle(game ? game.name : "Más juegos");

  const upcoming = GAMES.filter(g => !g.available);
  return (
    <Layout header={{ variant: "nav" }}>
      <div className="container page-narrow">
        <div className="card">
          <StateBox
            icon="hourglass"
            title={game && !game.available ? `${game.name}: próximamente en la web` : "Más juegos, próximamente en la web"}
            action={
              <div className="state-actions">
                <Link className="btn btn-primary" to="/">Buscar en League of Legends</Link>
                <a className="btn" href={APK_URL} rel="noopener">Descargar app</a>
              </div>
            }
          >
            Esta primera versión de Kairo Web es solo para League of Legends. Los demás juegos ya están en la app.
          </StateBox>
        </div>
        <ul className="soon-list" aria-label="Juegos próximamente">
          {upcoming.map(g => (
            <li key={g.id} className={g.id === id ? "current" : ""}>
              <span className="game-dot" style={{ background: g.color }} aria-hidden="true" />
              {g.name}
              <span className="soon-tag">Próximamente</span>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}

export function NotFound() {
  useTitle("Página no encontrada");
  return (
    <Layout header={{ variant: "nav" }}>
      <div className="container page-narrow">
        <div className="card">
          <StateBox icon="alert" title="Esta página no existe" action={<Link className="btn btn-primary" to="/">Ir al inicio</Link>}>
            Revisa el enlace o busca al jugador desde el inicio.
          </StateBox>
        </div>
      </div>
    </Layout>
  );
}
