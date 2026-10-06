import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import GameLogo from "../../components/GameLogo";
import Icon from "../../components/Icon";
import { GAMES, gamePath } from "../../lib/games";
import { POSTER_ART } from "./posterArt";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const asset = file => `${import.meta.env.BASE_URL}games/${file}`;

/**
 * Póster de un juego (3:4). Capas, de abajo arriba:
 *   1. fondo recortado dentro de la tarjeta (arte o fondo gráfico propio)
 *   2. personaje sin fondo, SIN recortar: sobresale por encima del borde superior (solo si hay arte permitido)
 *   3. degradado oscuro abajo (recortado a la tarjeta, cubre también al personaje) y nombre del juego en grande
 * En reposo el personaje respira y se balancea; al pasar el mouse la tarjeta sube, se inclina hacia el cursor y el
 * personaje crece un poco más que el fondo. Todo se anima con transform y opacity.
 */
function Poster({ game, index }) {
  const tilt = useRef(null);
  const frame = useRef(0);
  const art = POSTER_ART[game.id];

  function onMove(e) {
    if (e.pointerType === "touch" || reduceMotion()) return;
    const el = tilt.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-py * 10).toFixed(2)}deg`);
    });
  }
  function onLeave() {
    cancelAnimationFrame(frame.current);
    tilt.current.style.removeProperty("--ry");
    tilt.current.style.removeProperty("--rx");
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <li className="poster-wrap" style={{ "--game": game.color, "--i": index }}>
      <Link
        to={gamePath(game)}
        className={`poster${art?.char ? " has-char" : ""}`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-label={game.available ? `${game.name}: buscar jugadores` : `${game.name}: próximamente`}
      >
        <span className="poster-tilt" ref={tilt}>
          <span className="poster-frame">
            {art?.bg ? (
              <img className="poster-bg" src={asset(art.bg)} alt="" width="360" height="480" loading="lazy" decoding="async" />
            ) : (
              // Fondo gráfico propio: color del juego, rayas y el logo real en grande (sin arte de terceros)
              <span className="poster-graphic" aria-hidden="true">
                <span className="poster-watermark"><GameLogo game={game.id} size={190} color={game.color} /></span>
                {/* Con personaje, el logo grande sobra: queda solo la marca de agua */}
                {!art?.char && <span className="poster-emblem"><GameLogo game={game.id} size={64} color={game.color} /></span>}
              </span>
            )}
          </span>
          {art?.char && (
            // Contenedor del tamaño de la tarjeta: en modo free recorta los costados (el personaje no invade la
            // tarjeta vecina) y deja libre la parte de arriba
            <span className={`poster-pop${art.mode === "free" ? " clip-x" : ""}`}>
            <span
              className={`poster-char ${art.mode === "free" ? "free" : "aligned"}`}
              style={art.mode === "free"
                ? { "--char-w": `${art.charWidth}%`, "--char-b": `${art.charBottom}%`, "--char-x": `${art.charX || 0}%` }
                : { "--char-h": `${art.charHeight}%`, "--char-l": `${art.charLeft || 0}%`, "--char-r": `${art.charRight || 0}%` }}
              aria-hidden="true"
            >
              <img src={asset(art.char)} alt="" loading="lazy" decoding="async" />
            </span>
            </span>
          )}
          <span className="poster-shade" aria-hidden="true" />
          <span className="poster-title">{game.name}</span>
          {!game.available && <span className="poster-badge">Próximamente</span>}
        </span>
      </Link>
      <span className="poster-label">
        <GameLogo game={game.id} size={15} color={game.color} />
        {game.name}
      </span>
    </li>
  );
}

/** Carrusel de pósters: flechas, scroll con imán, flechas del teclado y deslizar con el dedo */
export default function GameCards() {
  const rail = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  function update() {
    const el = rail.current;
    if (el) setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scroll = dir => rail.current.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: reduceMotion() ? "auto" : "smooth" });

  // Con el foco en un póster, las flechas del teclado pasan al anterior o al siguiente
  function onKeyDown(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const links = [...rail.current.querySelectorAll(".poster")];
    const i = links.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = links[Math.min(links.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))];
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
  }

  return (
    <section className="game-cards" aria-label="Juegos de Kairo">
      <ul className="game-rail" ref={rail} onScroll={update} onKeyDown={onKeyDown}>
        {GAMES.map((g, i) => <Poster key={g.id} game={g} index={i} />)}
      </ul>
      {!edges.start && (
        <button type="button" className="rail-btn prev" onClick={() => scroll(-1)} aria-label="Ver juegos anteriores">
          <Icon name="chevronLeft" size={18} />
        </button>
      )}
      {!edges.end && (
        <button type="button" className="rail-btn next" onClick={() => scroll(1)} aria-label="Ver más juegos">
          <Icon name="chevronRight" size={18} />
        </button>
      )}
    </section>
  );
}
