import { readJSON, writeJSON } from "./storage";

// Regiones de la web. `slug` va en la URL (/lol/lan/...), `id` es la plataforma de Riot que entiende el backend.
export const REGIONS = [
  { slug: "lan", id: "la1",  label: "LAN", name: "Latinoamérica Norte" },
  { slug: "las", id: "la2",  label: "LAS", name: "Latinoamérica Sur" },
  { slug: "na",  id: "na1",  label: "NA",  name: "Norteamérica" },
  { slug: "euw", id: "euw1", label: "EUW", name: "Europa Oeste" },
  { slug: "kr",  id: "kr",   label: "KR",  name: "Corea" },
  { slug: "br",  id: "br1",  label: "BR",  name: "Brasil" },
];

export const DEFAULT_REGION = REGIONS[0];

export const regionBySlug = slug => REGIONS.find(r => r.slug === String(slug || "").toLowerCase()) || null;
export const regionById = id => REGIONS.find(r => r.id === id) || null;

// Última región usada en el buscador (la usan el buscador y la clasificación de la portada)
const REGION_PREF = "kairo:region";
export const savedRegion = () => regionBySlug(readJSON(REGION_PREF)) || DEFAULT_REGION;
export const saveRegion = slug => writeJSON(REGION_PREF, slug);

// ─── Riot ID en la URL: "Nombre-TAG" ─────────────────────────────────────
// El tag es alfanumérico, así que se separa por el ÚLTIMO guion (el nombre sí puede tener guiones o espacios).

export function parseRiotId(text) {
  const value = String(text || "").trim();
  const i = value.lastIndexOf("#");
  if (i <= 0 || i === value.length - 1) return null;
  const gameName = value.slice(0, i).trim();
  const tagLine = value.slice(i + 1).trim();
  return gameName && tagLine ? { gameName, tagLine } : null;
}

export const riotIdSlug = (gameName, tagLine) => `${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;

export function parseRiotIdSlug(slug) {
  const value = String(slug || "");
  const i = value.lastIndexOf("-");
  if (i <= 0 || i === value.length - 1) return null;
  // React Router ya entrega el parámetro decodificado; se decodifica otra vez por si llega crudo
  const decode = s => { try { return decodeURIComponent(s); } catch { return s; } };
  return { gameName: decode(value.slice(0, i)), tagLine: decode(value.slice(i + 1)) };
}

export const profilePath = (regionSlug, gameName, tagLine) => `/lol/${regionSlug}/${riotIdSlug(gameName, tagLine)}`;
export const livePath = (regionSlug, gameName, tagLine) => `${profilePath(regionSlug, gameName, tagLine)}/en-vivo`;

// El ID de una partida empieza con su plataforma ("LA1_123", "KR_456"): de ahí sale la región
export const regionOfMatchId = matchId => regionById(String(matchId || "").split("_")[0].toLowerCase());

/** Página de una partida. `who` = jugador a resaltar ({ gameName, tagLine }), opcional */
export const matchPath = (matchId, who) =>
  `/lol/partida/${encodeURIComponent(matchId)}${who?.gameName ? `?jugador=${riotIdSlug(who.gameName, who.tagLine)}` : ""}`;

/** Comparar: cada jugador como "region/Nombre-TAG" */
export const playerKey = (regionSlug, gameName, tagLine) => `${regionSlug}/${riotIdSlug(gameName, tagLine)}`;
export function parsePlayerKey(value) {
  const [slug, ...rest] = String(value || "").split("/");
  const region = regionBySlug(slug);
  const id = parseRiotIdSlug(rest.join("/"));
  return region && id ? { region, ...id } : null;
}
export const comparePath = (a, b) => {
  const q = new URLSearchParams();
  if (a) q.set("a", a);
  if (b) q.set("b", b);
  const s = q.toString();
  return `/lol/comparar${s ? `?${s}` : ""}`;
};

// ─── Multi-búsqueda ──────────────────────────────────────────────────────
/**
 * Riot IDs de un texto pegado del lobby ("Faker#KR1 se unió a la sala", "joined the lobby"…) o de una lista separada
 * por comas o líneas. Sin repetidos (sin importar mayúsculas) y como mucho `max`.
 */
export function parseLobby(text, max = 10) {
  const out = [];
  const seen = new Set();
  const re = /([^\n\r,;#]{1,40}?)\s*#\s*([\p{L}\p{N}]{2,5})(?![\p{L}\p{N}])/gu;
  for (const m of String(text || "").matchAll(re)) {
    // El nombre es lo que queda pegado al #: se quitan palabras de mensajes anteriores en la misma línea
    const gameName = m[1].replace(/^.*(?:sala|lobby|chat)\s*[.:]?\s*/i, "").trim();
    const tagLine = m[2].trim();
    const key = `${gameName}#${tagLine}`.toLowerCase();
    if (!gameName || seen.has(key)) continue;
    seen.add(key);
    out.push({ gameName, tagLine });
    if (out.length >= max) break;
  }
  return out;
}

export const multiPath = (regionSlug, players) =>
  `/lol/multi?region=${regionSlug}&jugadores=${players.map(p => riotIdSlug(p.gameName, p.tagLine)).join(",")}`;
