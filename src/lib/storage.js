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
// Lo caducado se conserva STALE_GRACE más: sin conexión, la web muestra esa última copia (ver api/client.js).
const STALE_GRACE = 7 * 24 * 60 * 60_000;

export function cacheRead(key) {
  const entry = readJSON(CACHE_PREFIX + key);
  if (!entry || typeof entry.exp !== "number" || entry.exp < Date.now()) return null;
  return entry;
}

/** La última copia guardada aunque haya caducado (para usar sin conexión) */
export function cacheReadStale(key) {
  const entry = readJSON(CACHE_PREFIX + key);
  return entry && typeof entry.exp === "number" && entry.exp + STALE_GRACE > Date.now() ? entry : null;
}

export function cacheWrite(key, data, ttl) {
  const entry = { at: Date.now(), exp: Date.now() + ttl, data };
  if (writeJSON(CACHE_PREFIX + key, entry)) return;
  // Sin espacio: se borra lo caducado y, si no alcanza, toda la caché de Kairo (los favoritos y recientes no se tocan)
  sweepCache(false, true);
  if (writeJSON(CACHE_PREFIX + key, entry)) return;
  sweepCache(true);
  writeJSON(CACHE_PREFIX + key, entry);
}

export function sweepCache(all = false, expiredNow = false) {
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
      if (!entry || entry.exp + (expiredNow ? 0 : STALE_GRACE) < now) localStorage.removeItem(k);
    }
  } catch { /* nada */ }
}
