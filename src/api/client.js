import { API_URL } from "../lib/config";
import { cacheRead, cacheWrite } from "../lib/storage";
import { markOk, probe, wake } from "./server";

// Error de la API con el formato del backend: { error, code, retryAfter }
export class ApiError extends Error {
  constructor(status, message, { code, retryAfter } = {}) {
    super(message);
    this.status = status;
    this.code = code || null;
    this.retryAfter = retryAfter || null;
  }
}

const REQUEST_TIMEOUT = 25_000;  // la cola del backend hacia Riot puede esperar hasta 20 s
const SLOW_MS = 4000;            // si tarda más, se mira si el servidor está dormido

const memory = new Map();        // clave -> { at, exp, data }
const inflight = new Map();      // clave -> promesa (dos componentes pidiendo lo mismo comparten la petición)

const buildUrl = (path, params) => {
  const url = new URL(API_URL + path);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  return url.toString();
};

// Un fallo de red, un timeout o un 502/503 sin JSON (la página del proxy de Render) = servidor caído o dormido
class WakeSignal extends Error {}

async function fetchOnce(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
  const slow = setTimeout(probe, SLOW_MS);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
  } catch {
    throw new WakeSignal();
  } finally {
    clearTimeout(timer);
    clearTimeout(slow);
  }

  const body = await res.json().catch(() => undefined);
  if (body === undefined && [502, 503, 504].includes(res.status)) throw new WakeSignal();
  markOk();
  if (!res.ok) {
    const retryAfter = body?.retryAfter || parseInt(res.headers.get("Retry-After"), 10) || null;
    throw new ApiError(res.status, body?.error || `Error ${res.status}`, { code: body?.code, retryAfter });
  }
  return body;
}

async function fetchWithWake(url) {
  try {
    return await fetchOnce(url);
  } catch (e) {
    if (!(e instanceof WakeSignal)) throw e;
    const awake = await wake();
    if (!awake) throw new ApiError(0, "No pudimos conectar con el servidor de Kairo. Revisa tu conexión e inténtalo de nuevo.", { code: "SERVER_DOWN" });
    try {
      return await fetchOnce(url);
    } catch (e2) {
      if (e2 instanceof WakeSignal) throw new ApiError(0, "El servidor de Kairo no responde. Inténtalo de nuevo en un momento.", { code: "SERVER_DOWN" });
      throw e2;
    }
  }
}

/**
 * GET al backend con caché.
 *   ttl: ms de caché (0 = sin caché) · persist: también en localStorage (sobrevive a recargar)
 *   force: ignora lo guardado (botón Actualizar) · map: transforma la respuesta antes de guardarla
 * Devuelve { data, at } (at = cuándo se obtuvo el dato).
 */
export async function request(path, { params, ttl = 0, persist = false, force = false, map } = {}) {
  const url = buildUrl(path, params);
  const key = url.slice(API_URL.length);

  if (!force && ttl > 0) {
    const hit = memory.get(key);
    if (hit && hit.exp > Date.now()) return { data: hit.data, at: hit.at };
    if (persist) {
      const stored = cacheRead(key);
      if (stored) { memory.set(key, stored); return { data: stored.data, at: stored.at }; }
    }
  }

  if (!force && inflight.has(key)) return inflight.get(key);

  const promise = fetchWithWake(url).then(raw => {
    const data = map ? map(raw) : raw;
    const at = Date.now();
    if (ttl > 0) {
      memory.set(key, { at, exp: at + ttl, data });
      if (persist) cacheWrite(key, data, ttl);
    }
    return { data, at };
  }).finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export const get = (path, opts) => request(path, opts).then(r => r.data);

// Mensaje para mostrar a partir de cualquier error
export function errorMessage(e) {
  if (!e) return "";
  if (e.code === "RATE_LIMITED" || e.code === "RATE_LIMITED_IP" || e.code === "BUSY") {
    return `Hay muchas consultas en este momento. Reintenta en ${e.retryAfter || 10} s.`;
  }
  return e.message || "Algo salió mal. Inténtalo de nuevo.";
}

export const isRateLimit = e => e?.status === 429;
