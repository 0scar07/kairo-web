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
