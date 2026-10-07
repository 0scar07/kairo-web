import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { StateBox } from "../components/ui";
import { GAMES, gamePath, isSearchable } from "../lib/games";
import GameLogo from "../components/GameLogo";
import { APK_URL } from "../lib/config";
import { useTitle } from "../lib/hooks";

// Todos los juegos de Kairo con su estado en la web (página "Más juegos")
export function ComingSoon() {
  useTitle("Juegos");
  return (
    <Layout header={{ variant: "nav" }}>
      <div className="container page-narrow">
        <div className="section-head">
          <h1 className="section-title page-title">Juegos de Kairo</h1>
          <span className="faint">{GAMES.filter(isSearchable).length} de {GAMES.length} con búsqueda en la web</span>
        </div>
        <ul className="soon-list" aria-label="Juegos">
          {GAMES.map(g => (
            <li key={g.id}>
              <Link to={gamePath(g)} className="soon-link">
                <GameLogo game={g.id} size={20} color={g.color} />
                {g.name}
                <span className={`soon-tag${isSearchable(g) ? " on" : ""}`}>{isSearchable(g) ? "Disponible" : "Próximamente"}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="faint games-app-note">
          Los que aún no tienen búsqueda en la web ya están en la <a href={APK_URL} rel="noopener">app de Kairo</a>.
        </p>
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
