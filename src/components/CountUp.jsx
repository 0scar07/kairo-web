import { useLayoutEffect, useRef } from "react";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const easeOut = t => 1 - Math.pow(1 - t, 3);

/**
 * Número que sube contando hasta `value` (desde 0 la primera vez y desde el valor anterior después).
 * Escribe directo en el DOM con requestAnimationFrame: no re-renderiza el componente en cada cuadro.
 * Con prefers-reduced-motion muestra el valor final sin animar.
 */
export default function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 800, format }) {
  const ref = useRef(null);
  const from = useRef(0);
  const fmt = v => `${prefix}${format ? format(v) : v.toFixed(decimals)}${suffix}`;

  // useLayoutEffect: el valor de partida se escribe antes de pintar (sin parpadeo del valor final)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!Number.isFinite(value)) { el.textContent = ""; return undefined; }
    const start = from.current;
    from.current = value;
    if (reduceMotion() || start === value) { el.textContent = fmt(value); return undefined; }

    el.textContent = fmt(start);
    let raf;
    let done = false;
    const t0 = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / duration);
      el.textContent = fmt(start + (value - start) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else done = true;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Interrumpida (otro valor o el doble efecto de StrictMode): la próxima parte desde donde iba
      if (!done) from.current = start;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // El span animado no tiene hijos de React (su texto lo escribe el efecto). Los lectores de pantalla leen solo
  // el valor final, no los intermedios.
  const final = Number.isFinite(value) ? fmt(value) : "";
  return (
    <span className="num">
      <span ref={ref} aria-hidden="true" />
      <span className="sr-only">{final}</span>
    </span>
  );
}
