// localStorage con try/catch (puede fallar en modo privado o con el almacenamiento lleno) y una caché con caducidad.

const CACHE_PREFIX = "kc:";

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ─── Caché persistente: { at, exp, data } ────────────────────────────────

export function cacheRead(key) {
  const entry = readJSON(CACHE_PREFIX + key);
  if (!entry || typeof entry.exp !== "number") return null;
  if (entry.exp < Date.now()) {
    try { localStorage.removeItem(CACHE_PREFIX + key); } catch { /* nada */ }
    return null;
  }
  return entry;
}

export function cacheWrite(key, data, ttl) {
  const entry = { at: Date.now(), exp: Date.now() + ttl, data };
  if (writeJSON(CACHE_PREFIX + key, entry)) return;
  // Sin espacio: se borra lo caducado y, si no alcanza, toda la caché de Kairo (los favoritos y recientes no se tocan)
  sweepCache();
  if (writeJSON(CACHE_PREFIX + key, entry)) return;
  sweepCache(true);
  writeJSON(CACHE_PREFIX + key, entry);
}

export function sweepCache(all = false) {
  try {
    const now = Date.now();
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      if (all) { localStorage.removeItem(k); continue; }
      const entry = readJSON(k);
      if (!entry || entry.exp < now) localStorage.removeItem(k);
    }
  } catch { /* nada */ }
}
