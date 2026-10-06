import { useCallback, useEffect, useRef, useState } from "react";

/** Hora actual que se actualiza cada `ms` (para cronómetros y "hace X min") */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/**
 * Ejecuta una función async cuando cambian las dependencias. Ignora respuestas viejas (si el usuario cambió de
 * jugador antes de que llegara la anterior). reload(true) vuelve a pedir pasando force=true.
 */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const run = useRef(0);

  const execute = useCallback((force = false) => {
    const id = ++run.current;
    setState(s => ({ data: force ? s.data : undefined, error: null, loading: true }));
    Promise.resolve()
      .then(() => fn(force))
      .then(
        data => { if (id === run.current) setState({ data, error: null, loading: false }); },
        error => { if (id === run.current) setState(s => ({ data: s.data, error, loading: false })); },
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { execute(false); }, [execute]);

  return { ...state, reload: execute };
}

/** Repite `fn` cada `ms` mientras la pestaña está visible (y al volver a ella). */
export function useInterval(fn, ms, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => { if (!document.hidden) saved.current(); }, ms);
    const onVisible = () => { if (!document.hidden) saved.current(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [ms, enabled]);
}

/** Título de la pestaña del navegador */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Kairo` : "Kairo · Estadísticas de League of Legends";
  }, [title]);
}
