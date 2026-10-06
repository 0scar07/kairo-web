// Logotipo animado de la portada: "KAIRO" hecho de mosaicos por los que corre un degradado de color, con mosaicos que
// destellan, y personajes de varios juegos de Kairo bailando delante (cada uno a su ritmo) sobre un brillo de piso y
// confeti. Todo el movimiento es transform/opacity y se detiene con prefers-reduced-motion. Es decorativo.
//
// Arte: Lux (splash de Data Dragon, recortado con scripts/hero-art.py; política «Legal Jibber Jabber» de Riot),
// Pengu (Data Dragon) y Leon y el Bárbaro (Fan Kit de Supercell), los mismos de los pósters.
const asset = path => `${import.meta.env.BASE_URL}${path}`;

// Personajes: posición (en % del contenedor), alto, ritmo del baile y desfase
const CAST = [
  { src: "games/clashofclans-char.webp", left: -3, h: 62, z: 1, dur: 2.6, delay: -0.9, flip: false },
  { src: "hero/lux.webp", left: 7, h: 94, z: 3, dur: 3.2, delay: 0, flip: false },
  { src: "games/brawlstars-char.webp", left: 79, h: 74, z: 3, dur: 2.8, delay: -1.4, flip: true },
  { src: "games/tft-char.webp", left: 90, h: 46, z: 2, dur: 2.2, delay: -0.5, flip: true },
];

// Mosaicos que destellan (columna, fila en la cuadrícula de 12 px del logotipo)
const GLINTS = [[6, 4], [11, 9], [17, 3], [22, 7], [27, 11], [31, 5], [36, 8], [41, 3], [46, 10], [50, 6], [14, 12], [39, 12]];

// Confeti que sube desde el piso (posición horizontal en %, color, desfase)
const CONFETTI = [
  [12, "#35E0A1", 0], [20, "#0BC4E3", 1.1], [28, "#FFCE1F", .5], [36, "#A855F7", 1.7],
  [64, "#E23E57", .3], [72, "#35E0A1", 1.4], [80, "#0BC4E3", .8], [88, "#F5A623", 2],
];

export default function HeroShowcase() {
  return (
    <div className="showcase" aria-hidden="true">
      <svg className="wordmark" viewBox="0 0 640 170" role="presentation">
        <defs>
          <pattern id="wm-tiles" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="2" fill="#fff" />
          </pattern>
          <mask id="wm-tile-mask"><rect width="640" height="170" fill="url(#wm-tiles)" /></mask>
          {/* Degradado que se repite cada 640 px: al desplazarlo 640 px el bucle no tiene salto */}
          <linearGradient id="wm-flow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="640" y2="0" spreadMethod="repeat">
            <stop offset="0" stopColor="#35E0A1" />
            <stop offset=".3" stopColor="#0BC4E3" />
            <stop offset=".55" stopColor="#A855F7" />
            <stop offset=".8" stopColor="#7FB0FF" />
            <stop offset="1" stopColor="#35E0A1" />
          </linearGradient>
          <clipPath id="wm-letters">
            <text x="320" y="146" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize="172" letterSpacing="8">KAIRO</text>
          </clipPath>
        </defs>
        <g clipPath="url(#wm-letters)">
          <rect width="640" height="170" fill="#0e1d17" />
          <g mask="url(#wm-tile-mask)">
            <rect className="wm-flow" x="-640" y="0" width="1920" height="170" fill="url(#wm-flow)" />
          </g>
          <g className="wm-glints">
            {GLINTS.map(([c, r], i) => (
              <rect key={i} x={c * 12 + 0.8} y={r * 12 + 0.8} width="10.4" height="10.4" rx="2" fill="#fff" style={{ "--d": `${(i * 0.37) % 2.4}s` }} />
            ))}
          </g>
        </g>
      </svg>

      <span className="showcase-floor" />
      {CAST.map((c, i) => (
        <span
          key={i}
          className="dancer"
          style={{ left: `${c.left}%`, height: `${c.h}%`, zIndex: c.z, "--dur": `${c.dur}s`, "--delay": `${c.delay}s` }}
        >
          <img src={asset(c.src)} alt="" decoding="async" style={c.flip ? { transform: "scaleX(-1)" } : undefined} />
          <span className="dancer-glow" />
        </span>
      ))}
      {CONFETTI.map(([x, color, d], i) => (
        <span key={i} className="confetti" style={{ left: `${x}%`, background: color, "--d": `${d}s` }} />
      ))}
    </div>
  );
}
