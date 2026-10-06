import { useSyncExternalStore } from "react";
import { readJSON, writeJSON } from "./storage";

// Favoritos y búsquedas recientes del navegador (localStorage). Sin cuenta: viven solo en este navegador.
const FAVORITES_KEY = "kairo:favorites";
const RECENTS_KEY = "kairo:recents";
const MAX_RECENTS = 6;
const MAX_FAVORITES = 30;

function createList(key) {
  let value = readJSON(key, []);
  if (!Array.isArray(value)) value = [];
  const listeners = new Set();
  const set = next => {
    value = next;
    writeJSON(key, value);
    listeners.forEach(fn => fn());
  };
  // Otras pestañas del mismo navegador
  if (typeof window !== "undefined") {
    window.addEventListener("storage", e => {
      if (e.key !== key) return;
      value = readJSON(key, []);
      listeners.forEach(fn => fn());
    });
  }
  const use = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => value);
  return { get: () => value, set, use };
}

const sameId = (a, b) => a.region === b.region
  && a.gameName.toLowerCase() === b.gameName.toLowerCase()
  && a.tagLine.toLowerCase() === b.tagLine.toLowerCase();

// ─── Favoritos: { region (slug), gameName, tagLine, puuid, iconId, rank } ─────
const favorites = createList(FAVORITES_KEY);
export const useFavorites = favorites.use;
export const getFavorites = favorites.get;
export const isFavorite = (list, player) => list.some(f => sameId(f, player));

/** Actualiza los datos guardados de un favorito (ícono, rango, nombre con mayúsculas correctas) si existe */
export function updateFavorite(player, patch) {
  const list = favorites.get();
  if (!isFavorite(list, player)) return;
  const next = list.map(f => (sameId(f, player) ? { ...f, ...patch } : f));
  if (JSON.stringify(next) !== JSON.stringify(list)) favorites.set(next);
}

export function toggleFavorite(player) {
  const list = favorites.get();
  if (isFavorite(list, player)) favorites.set(list.filter(f => !sameId(f, player)));
  else favorites.set([{ ...player, addedAt: Date.now() }, ...list].slice(0, MAX_FAVORITES));
}

// ─── Recientes: { game, region, gameName, tagLine, subtitle, iconId, rank } ──────────
const recents = createList(RECENTS_KEY);
export const useRecents = recents.use;

export function addRecent(entry) {
  const list = recents.get().filter(r => !(r.game === entry.game && sameId(r, entry)));
  recents.set([{ ...entry, at: Date.now() }, ...list].slice(0, MAX_RECENTS));
}

export const clearRecents = () => recents.set([]);

/**
 * Sugerencias del buscador: favoritos primero y luego recientes (sin repetir), filtrados por lo escrito.
 * Cada una: { key, favorite, region, gameName, tagLine, iconId, rank }
 */
export function suggestions(favoriteList, recentList, query, limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  const out = [];
  const seen = new Set();
  const keyOf = p => `${p.region}:${p.gameName}#${p.tagLine}`.toLowerCase();
  // Un favorito guardado antes de que existiera el ícono o el rango los toma de su búsqueda reciente
  const recentByKey = new Map(recentList.map(r => [keyOf(r), r]));
  const push = (p, favorite) => {
    const key = keyOf(p);
    if (seen.has(key)) return;
    if (q && !`${p.gameName}#${p.tagLine}`.toLowerCase().includes(q)) return;
    seen.add(key);
    const recent = recentByKey.get(key);
    out.push({
      key, favorite, region: p.region, gameName: p.gameName, tagLine: p.tagLine,
      iconId: p.iconId ?? recent?.iconId ?? null,
      rank: p.rank || recent?.rank || null,
    });
  };
  favoriteList.forEach(f => push(f, true));
  recentList.filter(r => r.game === "lol").forEach(r => push(r, false));
  return out.slice(0, limit);
}
