import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import GameLogo from "../../components/GameLogo";
import Icon from "../../components/Icon";
import { GAMES, gamePath } from "../../lib/games";

// Arte de la tarjeta de League of Legends: el splash de Ahri (Data Dragon). El resto de juegos no tiene un CDN de
// arte público como Data Dragon, así que su tarjeta usa el color del juego y su logo real en grande.
const LOL_ART = "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Tarjeta con inclinación 3D que sigue al puntero, un reflejo que lo acompaña y elevación. El movimiento se escribe
 * en variables CSS (--rx, --ry, --gx, --gy) y el CSS solo anima transform y opacity.
 */
function GameCard({ game, index }) {
  const ref = useRef(null);
  const frame = useRef(0);

  function onMove(e) {
    if (e.pointerType === "touch" || reduceMotion()) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-py * 12).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    });
  }

  function onLeave() {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    ["--rx", "--ry", "--gx", "--gy"].forEach(v => el.style.removeProperty(v));
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <li className="game-card-wrap reveal" style={{ "--i": index }}>
      <Link
        ref={ref}
        to={gamePath(game)}
        className={`game-card${game.available ? " available" : ""}`}
        style={{ "--game": game.color }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-label={game.available ? `${game.name}: buscar jugadores` : `${game.name}: próximamente`}
      >
        <span className="game-card-art">
          {game.id === "lol"
            ? <img src={LOL_ART} alt="" loading="lazy" decoding="async" />
            : <span className="game-card-logo-big"><GameLogo game={game.id} size={88} color={game.color} /></span>}
        </span>
        <span className="game-card-glare" />
        <span className={`game-card-badge${game.available ? " on" : ""}`}>{game.available ? "Disponible" : "Pronto"}</span>
        {game.id === "lol" && <span className="game-card-mark"><GameLogo game="lol" size={46} color="#F0E6D2" /></span>}
      </Link>
      <span className="game-card-label">
        <GameLogo game={game.id} size={15} color={game.color} />
        {game.name}
      </span>
    </li>
  );
}

/** Fila de tarjetas de los 9 juegos, con flechas para desplazarla cuando no caben */
export default function GameCards() {
  const rail = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  function update() {
    const el = rail.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scroll = dir => {
    const el = rail.current;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  return (
    <section className="game-cards" aria-label="Juegos de Kairo">
      <ul className="game-rail" ref={rail} onScroll={update}>
        {GAMES.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
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
