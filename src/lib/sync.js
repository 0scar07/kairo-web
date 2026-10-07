import { useSyncExternalStore } from "react";
import { API_URL } from "./config";
import { readJSON, writeJSON } from "./storage";
import { favoriteKey, getFavorites, getRemoved, setFavorites, setRemoved, subscribeFavorites } from "./library";

// Favoritos sincronizados entre dispositivos (backend: /sync). Sin cuentas: un código de 12 caracteres une los
// navegadores. Al abrir la web se traen los cambios; al cambiar un favorito se suben (con una pequeña espera).
const STATE_KEY = "kairo:sync";
const REMOVED_TTL = 60 * 24 * 60 * 60_000;   // los quitados se recuerdan 60 días

let state = readJSON(STATE_KEY, null);   // { code, at } | null
const listeners = new Set();
const setState = next => { state = next; writeJSON(STATE_KEY, next); listeners.forEach(fn => fn()); };
export const useSync = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);

/** "ABCDEFGHJKMN" -> "ABCD-EFGH-JKMN" */
export const formatCode = code => String(code || "").replace(/(.{4})(?=.)/g, "$1-");

async function call(method, path, body) {
  const res = await fetch(`${API_URL}/sync${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status, code: data.code });
  return data;
}

/**
 * Une dos listas de favoritos: todos los de ambos lados, menos los quitados después de agregarse.
 * Los quitados también se unen (el más reciente por jugador) y caducan a los 60 días.
 */
export function mergeFavorites(local, remote, localRemoved, remoteRemoved, now = Date.now()) {
  const removed = new Map();
  for (const r of [...localRemoved, ...remoteRemoved]) {
    if (!r?.key || now - r.at > REMOVED_TTL) continue;
    if (!removed.has(r.key) || removed.get(r.key).at < r.at) removed.set(r.key, r);
  }
  const byKey = new Map();
  for (const f of [...local, ...remote]) {
    if (!f?.gameName || !f?.tagLine || !f?.region) continue;
    const key = favoriteKey(f);
    const gone = removed.get(key);
    if (gone && gone.at >= (f.addedAt || 0)) continue;
    const prev = byKey.get(key);
    // Si está en los dos, se queda el que tenga más datos (puuid, ícono, rango)
    byKey.set(key, prev ? { ...f, ...prev, addedAt: Math.min(prev.addedAt || now, f.addedAt || now) } : f);
  }
  const favorites = [...byKey.values()].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  return { favorites, removed: [...removed.values()] };
}

const payload = () => ({ favorites: getFavorites(), removed: getRemoved() });

/** Crea un código nuevo con los favoritos de este navegador */
export async function createSync() {
  const { code } = await call("POST", "", { data: payload() });
  setState({ code, at: Date.now() });
  return code;
}

/** Une este navegador a un código existente (trae sus favoritos y suma los de aquí) */
export async function linkSync(rawCode) {
  const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const doc = await call("GET", `/${code}`);
  setState({ code, at: Date.now() });
  await applyRemote(doc.data);
  await pushNow();
  return code;
}

export function unlinkSync() { setState(null); }

let applying = false;
async function applyRemote(data) {
  const merged = mergeFavorites(getFavorites(), data?.favorites || [], getRemoved(), data?.removed || []);
  applying = true;
  try {
    setRemoved(merged.removed);
    if (JSON.stringify(merged.favorites) !== JSON.stringify(getFavorites())) setFavorites(merged.favorites);
  } finally {
    applying = false;
  }
}

/** Sube lo de este navegador (sin esperar) */
export async function pushNow() {
  if (!state?.code) return;
  try {
    await call("PUT", `/${state.code}`, { data: payload() });
    setState({ ...state, at: Date.now(), error: null });
  } catch (e) {
    setState({ ...state, error: e.status === 404 ? "Ese código ya no existe" : e.message });
  }
}

/** Al abrir la web: trae los cambios de otros dispositivos y sube los cambios locales cuando ocurran */
export function startSync() {
  let timer = null;
  const unsubscribe = subscribeFavorites(() => {
    if (applying || !state?.code) return;
    clearTimeout(timer);
    timer = setTimeout(pushNow, 1500);
  });
  if (state?.code) {
    call("GET", `/${state.code}`).then(doc => applyRemote(doc.data)).then(pushNow).catch(e => {
      if (e.status === 404) setState({ ...state, error: "Ese código ya no existe" });
    });
  }
  return () => { clearTimeout(timer); unsubscribe(); };
}
