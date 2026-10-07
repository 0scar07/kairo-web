import { useEffect, useId, useRef } from "react";
import { HEROES, WORDMARK_EFFECT } from "../../lib/heroes";

// Hero animado de cada juego: la palabra del juego con un efecto premium y, delante y al centro, una pareja de
// personajes SOLO de ese juego que entran saltando y luego bailan (o flotan) con movimiento en capas: salto, balanceo
// y sombra van a ritmos distintos, así nunca se ve un bucle mecánico. En escritorio la escena tiene un parallax suave
// con el puntero. Todo es transform/opacity y se detiene con prefers-reduced-motion. Es decorativo (aria-hidden).
//
// Efectos de la palabra (WORDMARK_EFFECT en lib/heroes.js):
//   foil:   letras en relieve con un degradado holográfico que corre, un brillo que las barre y destellos de estrella
//           (sin contorno: Sora es una fuente variable con contornos superpuestos y un stroke dibujaría líneas internas)
//   mosaic: letras hechas de mosaicos de colores con mosaicos que destellan
const asset = path => `${import.meta.env.BASE_URL}${path}`;
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const VIEW_W = 640;
// Estrella de 4 puntas (destellos del efecto foil), centrada en 0,0
const STAR = "M0-10C1 -3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10Z";

export default function HeroShowcase({ game = "lol" }) {
  const hero = HEROES[game] || HEROES.lol;
  const uid = useId().replace(/:/g, "");
  const ref = useRef(null);
  const effect = WORDMARK_EFFECT;

  // Parallax: el puntero mueve la escena unos pocos píxeles (por capas). Se escribe en variables CSS con rAF.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion() || !window.matchMedia?.("(pointer: fine)").matches) return undefined;
    let raf = 0;
    const onMove = e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // Tamaño de letra según el largo de la palabra (una sola línea)
  const word = hero.word;
  const fontSize = Math.min(168, Math.round(600 / (word.length * 0.68)));
  const viewH = Math.round(fontSize * 1.08);
  const baseline = viewH * 0.82;
  const hasPair = hero.pair.length === 2;
  // Con pareja, el contenedor es más alto: los personajes quedan al centro, tapando solo la parte baja de las letras
  const stageH = hasPair ? Math.round(fontSize * 0.62) : 10;
  const id = name => `${name}-${uid}`;

  const text = props => (
    <text x={VIEW_W / 2} y={baseline} textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize={fontSize} {...props}>
      {word}
    </text>
  );

  return (
    <div ref={ref} className={`showcase effect-${effect}${hasPair ? "" : " no-cast"}`} style={{ "--view-ratio": `${VIEW_W} / ${viewH + stageH}`, "--word-h": `${(viewH / (viewH + stageH)) * 100}%` }} aria-hidden="true">
      <div className="showcase-layer wordmark-layer">
        <svg className="wordmark" viewBox={`0 0 ${VIEW_W} ${viewH}`}>
          <defs>
            {/* Degradado que se repite cada 640 px: al desplazarlo 640 px el bucle no tiene salto */}
            <linearGradient id={id("flow")} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VIEW_W} y2="0" spreadMethod="repeat">
              {hero.palette.map((c, i) => <stop key={i} offset={i / (hero.palette.length - 1)} stopColor={c} />)}
            </linearGradient>
            <linearGradient id={id("shine")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={id("gloss")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".45" />
              <stop offset=".45" stopColor="#fff" stopOpacity=".06" />
              <stop offset=".55" stopColor="#000" stopOpacity=".05" />
              <stop offset="1" stopColor="#000" stopOpacity=".28" />
            </linearGradient>
            {/* Máscara (no clipPath): Chrome dibuja el texto de un clipPath con otra geometría y las capas no calzan */}
            <mask id={id("letters")} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={viewH}>
              {text({ fill: "#fff" })}
            </mask>
            {effect === "mosaic" && (
              <>
                <pattern id={id("tiles")} width="12" height="12" patternUnits="userSpaceOnUse">
                  <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="2" fill="#fff" />
                </pattern>
                <mask id={id("tile-mask")}><rect width={VIEW_W} height={viewH} fill={`url(#${id("tiles")})`} /></mask>
              </>
            )}
          </defs>

          {effect === "foil" ? (
            <>
              {/* Relieve: dos capas desplazadas hacia abajo (sombra y canto de color) */}
              {text({ transform: "translate(4 9)", fill: "#030b08", opacity: ".85" })}
              {text({ transform: "translate(1.5 4)", fill: hero.palette[2], opacity: ".55" })}
              <g mask={`url(#${id("letters")})`}>
                <rect className="wm-flow" x={-VIEW_W} y="0" width={VIEW_W * 3} height={viewH} fill={`url(#${id("flow")})`} />
                <rect width={VIEW_W} height={viewH} fill={`url(#${id("gloss")})`} />
                <rect className="wm-shine" x="-220" y={-viewH} width="160" height={viewH * 3} fill={`url(#${id("shine")})`} />
              </g>
              <g className="wm-stars">
                {[[0.17, 0.2, 1], [0.39, 0.12, 0.7], [0.58, 0.3, 0.85], [0.8, 0.16, 1.1], [0.27, 0.62, 0.6], [0.7, 0.66, 0.75]].map(([x, y, s], i) => (
                  // El grupo fija la posición; la estrella de adentro es la que se anima (sin pisar el transform)
                  <g key={i} transform={`translate(${x * VIEW_W} ${y * viewH}) scale(${s})`}>
                    <path d={STAR} fill="#fff" style={{ "--d": `${i * 0.55}s` }} />
                  </g>
                ))}
              </g>
            </>
          ) : (
            <g mask={`url(#${id("letters")})`}>
              <rect width={VIEW_W} height={viewH} fill="#0e1d17" />
              <g mask={`url(#${id("tile-mask")})`}>
                <rect className="wm-flow" x={-VIEW_W} y="0" width={VIEW_W * 3} height={viewH} fill={`url(#${id("flow")})`} />
                <rect className="wm-shine" x="-220" y={-viewH} width="180" height={viewH * 3} fill={`url(#${id("shine")})`} />
              </g>
            </g>
          )}
        </svg>
      </div>

      {hasPair && <span className="showcase-floor" style={{ "--floor": hero.palette[0] }} />}
      {hasPair && hero.pair.map((c, i) => (
        <span
          key={c.src}
          className={`dancer-pos ${i === 0 ? "left" : "right"}${c.float ? " floating" : ""}`}
          style={{
            height: `${c.h}%`, bottom: `${c.lift || 0}%`, "--gap": `${c.gap || 0}%`,
            "--depth": 2 + i, "--dur": `${c.dur}s`, "--delay": `${c.delay}s`, "--in": `${0.35 + i * 0.15}s`,
          }}
        >
          <span className="dancer-shadow" />
          <span className="dancer-parallax">
            <span className="dancer-in">
              <span className="dancer-bob">
                <span className="dancer-sway">
                  <img src={asset(c.src)} alt="" decoding="async" style={c.flip ? { transform: "scaleX(-1)" } : undefined} />
                </span>
              </span>
            </span>
          </span>
        </span>
      ))}
      {hasPair && [[38, 0, -14], [44, 1.1, 10], [50, 0.5, -6], [56, 1.7, 12], [62, 0.3, -10]].map(([x, d, dx], i) => (
        <span key={i} className="confetti" style={{ left: `${x}%`, background: hero.palette[i % hero.palette.length], "--d": `${d}s`, "--dx": `${dx}px` }} />
      ))}
    </div>
  );
}
