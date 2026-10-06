import { IMAGE_LOGOS, SVG_LOGOS } from "../lib/gameLogos";

// Logo real de un juego. Los SVG toman `color`; los PNG de Supercell van a color y la "A" de Apex se tiñe con una
// máscara (es de una sola tinta, como en la app).
export default function GameLogo({ game, size = 18, color = "currentColor", className = "" }) {
  const svg = SVG_LOGOS[game];
  if (svg) {
    return (
      <svg width={size} height={size} viewBox={svg.viewBox} fill={color} className={`game-logo ${className}`} aria-hidden="true">
        {svg.paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  }
  const file = IMAGE_LOGOS[game];
  if (!file) return null;
  const src = `${import.meta.env.BASE_URL}games/${file}`;
  if (game === "apex") {
    return (
      <span
        className={`game-logo ${className}`}
        aria-hidden="true"
        style={{
          width: size, height: size, display: "inline-block", background: color,
          WebkitMask: `url(${src}) center / contain no-repeat`, mask: `url(${src}) center / contain no-repeat`,
        }}
      />
    );
  }
  return <img src={src} width={size} height={size} alt="" className={`game-logo ${className}`} style={{ borderRadius: size / 4.5 }} />;
}
