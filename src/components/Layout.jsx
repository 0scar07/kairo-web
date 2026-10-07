import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import GameLogo from "./GameLogo";
import SearchForm from "./SearchForm";
import { DDImg } from "./ui";
import { GAMES, gameById, gamePath, isSearchable } from "../lib/games";
import { useLiveFavorites } from "../lib/liveFavorites";
import { useNow } from "../lib/hooks";
import { livePath } from "../lib/regions";
import { championIcon, championName, useDDragon } from "../lib/ddragon";
import { formatDuration, queueShort } from "../lib/lol";
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

// Menú desplegable sencillo: se cierra con Esc, al hacer clic fuera o al elegir una opción
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === "Escape") { setOpen(false); ref.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return { open, ref, toggle: () => setOpen(v => !v), close: () => setOpen(false) };
}

/** Selector de juego: League of Legends hoy; el resto, próximamente (ya están en la app) */
function GamePicker() {
  const pop = usePopover();
  const id = useId();
  const { pathname } = useLocation();
  const current = gameById(pathname.match(/^\/juegos\/([^/]+)/)?.[1]) || gameById("lol");
  return (
    <div className="popover game-picker" ref={pop.ref}>
      <button type="button" className="game-pill" aria-expanded={pop.open} aria-controls={id} onClick={pop.toggle}>
        <GameLogo game={current.id} size={16} color={current.color} />
        <span className="game-pill-name">{current.name}</span>
        <Icon name="chevronDown" size={14} style={{ transform: pop.open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {pop.open && (
        <div className="popover-panel games-panel" id={id}>
          <p className="popover-title">Juegos de Kairo</p>
          <ul>
            {GAMES.map(g => (
              <li key={g.id}>
                <Link to={gamePath(g)} className={`game-option${g.id === current.id ? " current" : ""}`} onClick={pop.close} aria-current={g.id === current.id ? "page" : undefined}>
                  <span className="game-option-logo"><GameLogo game={g.id} size={18} color={g.color} /></span>
                  <span className="game-option-name">{g.name}</span>
                  <span className={`game-option-tag${isSearchable(g) ? " on" : ""}`}>{isSearchable(g) ? "Disponible" : "Próximamente"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Campanita: qué favoritos están jugando ahora (los avisos con la app cerrada solo existen en la app) */
function LiveBell() {
  const pop = usePopover();
  const id = useId();
  const now = useNow(1000);
  const { items, watched } = useLiveFavorites();
  return (
    <div className="popover" ref={pop.ref}>
      <button
        type="button"
        className="btn btn-icon tool-btn"
        aria-expanded={pop.open}
        aria-controls={id}
        aria-label={items.length ? `${items.length} favoritos en partida` : "Favoritos en partida"}
        title="Favoritos en partida"
        onClick={pop.toggle}
      >
        <Icon name="bell" size={17} />
        {items.length > 0 && <span className="tool-dot" aria-hidden="true" />}
      </button>
      {pop.open && (
        <div className="popover-panel bell-panel" id={id}>
          <p className="popover-title">Favoritos en partida</p>
          {!watched ? (
            <p className="popover-empty">Marca jugadores con la estrella en su perfil y aquí verás cuándo están jugando.</p>
          ) : !items.length ? (
            <p className="popover-empty">Ninguno de tus favoritos está jugando ahora. Revisamos cada minuto.</p>
          ) : (
            <ul className="bell-list">
              {items.map(({ fav, live }) => {
                const me = live.participants.find(p => p.puuid === fav.puuid);
                return (
                  <li key={fav.puuid}>
                    <Link to={livePath(fav.region, fav.gameName, fav.tagLine)} className="bell-item" onClick={pop.close}>
                      <DDImg src={me ? championIcon(me.championId) : null} size={30} alt="" />
                      <span className="bell-text">
                        <strong>{fav.gameName}<span className="faint">#{fav.tagLine}</span></strong>
                        <span className="faint">{[me && championName(me.championId), queueShort(live.queueId)].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="bell-time num">{live.startTime > 0 ? formatDuration((now - live.startTime) / 1000) : "Cargando"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="popover-foot">
            <Link to="/favoritos" onClick={pop.close}>Ver favoritos</Link>
            <a href={APK_URL} rel="noopener">Avisos en el celular</a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 *   variant="nav"    portada (el buscador grande ya está en la página)
 *   variant="search" con buscador compacto en el header
 *   variant="back"   con buscador y una barra de vuelta debajo (back = { to, label })
 */
export function Header({ variant = "nav", back, region }) {
  useDDragon();
  const { pathname, hash } = useLocation();
  const { items } = useLiveFavorites();
  const at = (path, h = "") => pathname === path && hash === h;
  const cls = active => `nav-item${active ? " active" : ""}`;

  return (
    <header className="header">
      <div className="container header-inner">
        <Logo />
        <GamePicker />
        <nav className="header-nav" aria-label="Principal">
          <Link to="/" className={cls(at("/"))} aria-current={at("/") ? "page" : undefined}><Icon name="home" size={15} /> Inicio</Link>
          <Link to={{ pathname: "/", hash: "#en-partida" }} className={cls(at("/", "#en-partida"))}>
            <Icon name="radio" size={15} /> En vivo
            {items.length > 0 && <span className="nav-count">{items.length}<span className="sr-only"> en partida</span></span>}
          </Link>
          <Link to="/favoritos" className={cls(pathname === "/favoritos")} aria-current={pathname === "/favoritos" ? "page" : undefined}><Icon name="star" size={15} /> Favoritos</Link>
          <Link to={{ pathname: "/", hash: "#clasificacion" }} className={cls(at("/", "#clasificacion"))}><Icon name="trophy" size={15} /> Clasificación</Link>
          <a href={APK_URL} rel="noopener" className="nav-item"><Icon name="phone" size={15} /> App <span className="nav-new">Nuevo</span></a>
        </nav>
        {variant !== "nav" && <div className="header-search"><SearchForm size="compact" initialRegion={region} /></div>}
        <div className="header-tools">
          <LiveBell />
          <a className="btn btn-icon tool-btn" href={GITHUB_URL} rel="noopener" aria-label="Código en GitHub" title="Código en GitHub"><Icon name="github" size={17} /></a>
        </div>
      </div>
      {variant === "back" && back && (
        <div className="subbar">
          <div className="container">
            <Link to={back.to} className="header-back"><Icon name="chevronLeft" size={14} /> {back.label}</Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-legal">
          <p>
            Kairo no está respaldada por Riot Games, Supercell, Valve, Epic Games, Electronic Arts ni KRAFTON.
            Todas las marcas pertenecen a sus dueños.
          </p>
          {/* Avisos que exigen las políticas de contenido de fans de Riot y de Supercell */}
          <p>
            Kairo fue creada bajo la política «Legal Jibber Jabber» de Riot Games usando recursos propiedad de Riot Games.
            Riot Games no respalda ni patrocina este proyecto.
          </p>
          <p>
            Este material no es oficial y no está respaldado por Supercell. Para más información, consulta la{" "}
            <a href="https://supercell.com/en/fan-content-policy/" rel="noopener">Política de contenido de fans de Supercell</a>.
          </p>
        </div>
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
