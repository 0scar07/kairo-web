import { useEffect, useState } from "react";
import { getRotation } from "../../api/lol";
import { championLoading, championName, useDDragon } from "../../lib/ddragon";
import { savedRegion } from "../../lib/regions";

// Las tarjetas muestran "Gratis" cuando vienen de la rotación de la semana.
// Respaldo si el backend no responde: Ahri, Lee Sin, Jinx y Yasuo
const FALLBACK = [103, 64, 222, 157];

// Posición, giro y ritmo de cada tarjeta (dos a cada lado del título). Cada una flota a su propio ritmo para que el
// conjunto nunca se vea sincronizado.
const SLOTS = [
  { side: "left", x: "4%", y: 26, rot: -9, dur: 7.5, delay: 0 },
  { side: "left", x: "14%", y: 128, rot: 5, dur: 9, delay: -2.5 },
  { side: "right", x: "14%", y: 34, rot: 8, dur: 8.2, delay: -1.2 },
  { side: "right", x: "4%", y: 134, rot: -6, dur: 9.6, delay: -4 },
];

// Destellos alrededor de las tarjetas (posiciones fijas, titilan desfasados)
const SPARKS = [
  [9, 18, 0], [22, 60, 1.1], [6, 74, 2.3], [17, 88, .6], [27, 30, 1.8],
  [91, 22, .4], [78, 58, 1.6], [94, 70, 2.6], [83, 86, .9], [73, 34, 2],
];

/**
 * Arte animado del hero: campeones de la rotación gratuita de esta semana (dato real del backend) flotando alrededor
 * del título, con destellos. Es decorativo (aria-hidden) y solo aparece en pantallas anchas; con
 * prefers-reduced-motion queda quieto.
 */
export default function HeroArt() {
  useDDragon();
  const [ids, setIds] = useState(FALLBACK);
  const [isRotation, setIsRotation] = useState(false);

  useEffect(() => {
    let alive = true;
    getRotation(savedRegion().id).then(r => {
      // Cuatro campeones repartidos por la lista, para que no salgan siempre los de id más bajo
      const free = r?.free || [];
      if (!alive || free.length < 4) return;
      setIds([0, 1, 2, 3].map(i => free[Math.floor((i * free.length) / 4)]));
      setIsRotation(true);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="hero-art" aria-hidden="true">
      {SLOTS.map((slot, i) => {
        const src = championLoading(ids[i]);
        return (
          <div
            key={i}
            className={`hero-card ${slot.side}`}
            style={{ [slot.side]: slot.x, top: slot.y, "--rot": `${slot.rot}deg`, "--dur": `${slot.dur}s`, "--delay": `${slot.delay}s` }}
          >
            <div className="hero-card-inner">
              {src && <img src={src} alt="" width="308" height="560" decoding="async" />}
              <span className="hero-card-shine" />
              <span className="hero-card-name">
                {championName(ids[i])}
                {/* Solo se dice "gratis" si los campeones salieron de la rotación real, no del respaldo */}
                {isRotation && <small>Gratis</small>}
              </span>
            </div>
          </div>
        );
      })}
      {SPARKS.map(([x, y, d], i) => (
        <span key={i} className="hero-spark" style={{ left: `${x}%`, top: `${y}%`, "--d": `${d}s` }} />
      ))}
    </div>
  );
}
