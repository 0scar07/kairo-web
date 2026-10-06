import { useEffect, useSyncExternalStore } from "react";
import { getLive } from "../api/lol";
import { getFavorites, useFavorites } from "./library";
import { regionBySlug } from "./regions";

// Qué favoritos están en partida ahora. Lo comparten el header (campanita y contador) y la portada, así que hay una
// sola consulta por favorito, y se repite cada minuto mientras alguno de ellos esté en pantalla y la pestaña visible.
export const MAX_CHECKED = 6;   // favoritos consultados a la vez (cada consulta pasa por la caché del backend)
const REFRESH_MS = 60_000;

let state = { items: [], loading: false, checked: false, watched: 0 };
const listeners = new Set();
const set = patch => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };

let run = 0;
async function refresh(force = false) {
  const watched = getFavorites().filter(f => f.puuid).slice(0, MAX_CHECKED);
  const id = ++run;
  if (!watched.length) { set({ items: [], loading: false, checked: true, watched: 0 }); return; }
  set({ loading: true, watched: watched.length });
  const results = await Promise.allSettled(watched.map(f => getLive(f.puuid, regionBySlug(f.region)?.id, force)));
  if (id !== run) return;   // llegó una consulta más nueva
  const items = results
    .map((r, i) => ({ fav: watched[i], live: r.status === "fulfilled" ? r.value : null }))
    .filter(x => x.live?.inGame);
  set({ items, loading: false, checked: true });
}

let users = 0;
let timer = null;
const onVisible = () => { if (!document.hidden) refresh(true); };

function start() {
  if (users++ > 0) return;
  timer = setInterval(() => { if (!document.hidden) refresh(true); }, REFRESH_MS);
  document.addEventListener("visibilitychange", onVisible);
}
function stop() {
  if (--users > 0) return;
  clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
}

/** { items: [{ fav, live }], loading, checked, watched } */
export function useLiveFavorites() {
  const favorites = useFavorites();
  const key = favorites.filter(f => f.puuid).slice(0, MAX_CHECKED).map(f => f.puuid).join(",");
  useEffect(() => { start(); return stop; }, []);
  useEffect(() => { refresh(false); }, [key]);
  return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);
}
