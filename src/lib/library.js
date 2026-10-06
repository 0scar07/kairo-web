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

// ─── Favoritos: { region (slug), gameName, tagLine, puuid, iconId } ─────
const favorites = createList(FAVORITES_KEY);
export const useFavorites = favorites.use;
export const isFavorite = (list, player) => list.some(f => sameId(f, player));

export function toggleFavorite(player) {
  const list = favorites.get();
  if (isFavorite(list, player)) favorites.set(list.filter(f => !sameId(f, player)));
  else favorites.set([{ ...player, addedAt: Date.now() }, ...list].slice(0, MAX_FAVORITES));
}

// ─── Recientes: { game, region, gameName, tagLine, subtitle } ──────────
const recents = createList(RECENTS_KEY);
export const useRecents = recents.use;

export function addRecent(entry) {
  const list = recents.get().filter(r => !(r.game === entry.game && sameId(r, entry)));
  recents.set([{ ...entry, at: Date.now() }, ...list].slice(0, MAX_RECENTS));
}

export const clearRecents = () => recents.set([]);
