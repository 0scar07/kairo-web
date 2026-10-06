import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";
import SearchForm from "./SearchForm";
import { NAV_GAMES, gamePath } from "../lib/games";
import { APK_URL, GITHUB_URL, PRIVACY_URL } from "../lib/config";
import { useServerState } from "../api/server";

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Kairo, inicio">
      <span className="logo-mark" aria-hidden="true">
        <span className="logo-glow" />
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="30" height="30" />
        <span className="logo-shine" />
      </span>
      <span className="logo-word">KAIRO</span>
    </Link>
  );
}

const DownloadButton = () => (
  <a className="btn header-download" href={APK_URL} rel="noopener">Descargar app</a>
);

/**
 *   variant="nav"    portada: menú de juegos
 *   variant="search" perfil: buscador compacto
 *   variant="back"   en vivo: enlace de vuelta (back = { to, label })
 */
export function Header({ variant = "nav", back, region }) {
  return (
    <header className="header">
      <div className={`container header-inner header-${variant}`}>
        <Logo />
        {variant === "nav" && (
          <nav className="header-nav" aria-label="Juegos">
            {NAV_GAMES.map(g => (
              <NavLink key={g.id} to={gamePath(g)} end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                {g.name}
              </NavLink>
            ))}
            <NavLink to="/juegos" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Más juegos</NavLink>
          </nav>
        )}
        {variant === "search" && <div className="header-search"><SearchForm size="compact" initialRegion={region} /></div>}
        {variant === "back" && back && (
          <Link to={back.to} className="header-back">
            <Icon name="chevronLeft" size={14} /> {back.label}
          </Link>
        )}
        <DownloadButton />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>
          Kairo no está respaldada por Riot Games, Supercell, Valve, Epic Games, Electronic Arts ni KRAFTON.
          Todas las marcas pertenecen a sus dueños.
        </p>
        <nav className="footer-links" aria-label="Enlaces">
          <a href={PRIVACY_URL} rel="noopener">Privacidad</a>
          <a href={GITHUB_URL} rel="noopener">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}

// Aviso mientras Render despierta el servidor (o si no se pudo conectar)
export function ServerBanner() {
  const state = useServerState();
  if (state === "waking") {
    return (
      <div className="server-banner" role="status">
        <span className="spinner" aria-hidden="true" />
        Despertando el servidor… La primera consulta puede tardar hasta un minuto.
      </div>
    );
  }
  if (state === "down") {
    return (
      <div className="server-banner server-banner-down" role="alert">
        <Icon name="wifiOff" size={16} />
        No pudimos conectar con el servidor de Kairo. Revisa tu conexión y vuelve a intentarlo.
      </div>
    );
  }
  return null;
}

export default function Layout({ header, children }) {
  return (
    <>
      <ServerBanner />
      <Header {...header} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
