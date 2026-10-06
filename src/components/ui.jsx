import { useState } from "react";
import Icon from "./Icon";
import { rankLabel } from "../lib/lol";

/** Imagen de Data Dragon con cuadro de respaldo (mientras carga, si falla o si no hay URL). */
export function DDImg({ src, size = 32, alt = "", round = false, className = "", title, style }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, ...style };
  if (!src || failed) {
    return <span className={`dd dd-empty${round ? " round" : ""} ${className}`} style={box} title={title || alt || undefined} aria-hidden={alt ? undefined : true} role={alt ? "img" : undefined} aria-label={alt || undefined} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      title={title || alt || undefined}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`dd${round ? " round" : ""} ${className}`}
      style={box}
      onError={() => setFailed(true)}
    />
  );
}

/** Emblema oficial de rango (assets del cliente vía Community Dragon, los mismos de la app) */
export function RankEmblem({ tier, rank, size = 48 }) {
  if (!tier) {
    return <span className="rank-emblem rank-emblem-none" style={{ width: size, height: size }} aria-label="Sin clasificar" role="img" />;
  }
  return (
    <img
      className="rank-emblem"
      src={`${import.meta.env.BASE_URL}ranks/${tier.toLowerCase()}.png`}
      alt={rankLabel(tier, rank)}
      width={Math.round(size * (256 / 224))}
      height={size}
      style={{ height: size, width: "auto" }}
    />
  );
}

export const Skeleton = ({ w = "100%", h = 14, r, style }) => (
  <span className="skeleton" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
);

/** Estado vacío o de error: ícono, título, texto y acción opcional */
export function StateBox({ icon = "alert", title, children, action, compact = false, tone }) {
  return (
    <div className={`state${compact ? " compact" : ""}`} role={tone === "error" ? "alert" : undefined}>
      <span className="state-icon" style={tone === "error" ? { color: "var(--loss)" } : undefined}><Icon name={icon} size={22} /></span>
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Cuadro con iniciales (solo cuando no hay imagen real disponible, p. ej. la clasificación) */
export function Initials({ text, size = 28 }) {
  const initials = String(text || "?").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
  return <span className="initials" style={{ width: size, height: size }} aria-hidden="true">{initials}</span>;
}
