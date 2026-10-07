import { ApiError, get, request } from "./client";
import { compactMatch } from "../lib/lol";

// Endpoints de League of Legends del backend de Kairo (server/routes/lol.js y gameRouter.js).
// Todas las rutas reciben ?region=la1|la2|na1|euw1|kr|br1.
const MIN = 60_000;
const TTL = {
  account: 10 * MIN,
  summoner: 3 * MIN,
  ranked: 3 * MIN,
  matchIds: 2 * MIN,
  match: 7 * 24 * 60 * MIN,   // una partida terminada no cambia nunca
  history: 10 * MIN,
  mastery: 10 * MIN,
  live: 20_000,
  leaderboard: 10 * MIN,
};

export const MATCH_PAGE_FIRST = 20;
export const MATCH_PAGE_MORE = 10;

const enc = encodeURIComponent;

/** { puuid, gameName, tagLine } — devuelve también `at` (cuándo se obtuvo) */
export const getAccount = (gameName, tagLine, region, force) =>
  request(`/lol/account/${enc(gameName)}/${enc(tagLine)}`, { params: { region }, ttl: TTL.account, persist: true, force });

/** { profileIconId, summonerLevel, ... } */
export const getSummoner = (puuid, region, force) =>
  request(`/lol/summoner/${puuid}`, { params: { region }, ttl: TTL.summoner, persist: true, force });

/**
 * Solo el ícono de perfil (para listas como la clasificación). Cambia muy poco, así que se guarda 12 h: volver a la
 * portada no repite las consultas.
 */
export const getProfileIconId = (puuid, region) =>
  get(`/lol/summoner/${puuid}`, { params: { region }, ttl: 12 * 60 * MIN, persist: true, version: "icon", map: s => s.profileIconId ?? null });

/** Entradas de league-v4: [{ queueType, tier, rank, leaguePoints, wins, losses }] */
export const getRanked = (puuid, region, force) =>
  get(`/lol/ranked/${puuid}`, { params: { region }, ttl: TTL.ranked, persist: true, force });

/** Fotos diarias de rango: [{ day, solo: { tier, rank, lp, wins, losses, score } | null, flex }] */
export const getRankHistory = (puuid, region, force) =>
  get(`/lol/history/${puuid}`, { params: { region, days: 30 }, ttl: TTL.history, persist: true, force, map: r => r.snapshots || [] });

/** { score, top: [{ championId, level, points, lastPlayTime }] } */
export const getMastery = (puuid, region, force) =>
  get(`/lol/mastery/${puuid}`, { params: { region, count: 10 }, ttl: TTL.mastery, persist: true, force });

/**
 * IDs de partidas. `queue` (420, 440, 450…) se manda al backend como ?queue=; si el backend todavía no lo soporta lo
 * ignora y devuelve todas, y quien llama filtra en local (ver useMatches).
 */
export const getMatchIds = (puuid, region, { start = 0, count = MATCH_PAGE_FIRST, queue = null, force = false } = {}) =>
  get(`/lol/matches/${puuid}`, { params: { region, start, count, queue }, ttl: TTL.matchIds, persist: true, force });

/** Una partida, ya compactada (ver compactMatch). Subir MATCH_FORMAT al cambiar compactMatch. */
const MATCH_FORMAT = 4;   // 3: insignias de la última partida · 4: ícono, daño recibido, guardianes y objetivos por equipo
export const getMatch = (matchId, region) =>
  get(`/lol/match/${matchId}`, { params: { region }, ttl: TTL.match, persist: true, map: compactMatch, version: MATCH_FORMAT });

/** Varias partidas en orden; las que fallan se omiten (la primera que falle por límite se informa) */
export async function getMatches(ids, region) {
  const results = await Promise.allSettled(ids.map(id => getMatch(id, region)));
  const matches = results.filter(r => r.status === "fulfilled").map(r => r.value);
  const failed = results.find(r => r.status === "rejected");
  if (!matches.length && failed) throw failed.reason;
  return { matches, failed: results.length - matches.length };
}

/** Rotación semanal gratuita: { free: [championId], newPlayers: [championId] } */
export const getRotation = region =>
  get("/lol/rotation", { params: { region }, ttl: 60 * MIN, persist: true });

/** Partida en curso: { inGame: false } o { inGame: true, queueId, mapId, startTime, bans, participants } */
export const getLive = (puuid, region, force) =>
  get(`/lol/live/${puuid}`, { params: { region }, ttl: TTL.live, force });

/**
 * Clasificación: [{ puuid, gameName, tagLine, leaguePoints, wins, losses }].
 * opts: tier (challenger|grandmaster|master), queue (RANKED_SOLO_5x5|RANKED_FLEX_SR), start y limit (paginación).
 * Si el backend no tiene el endpoint (ROUTE_NOT_FOUND) devuelve null y la web muestra "Disponible pronto".
 */
export async function getLeaderboard(region, limit = 10, { tier = "challenger", queue = "RANKED_SOLO_5x5", start = 0 } = {}) {
  try {
    // Si el backend no pudo traer el Riot ID de alguien (Riot limitó las consultas), la lista se muestra pero no se
    // guarda: la próxima visita la vuelve a pedir en vez de dejar jugadores sin nombre durante 10 minutos
    return await get("/lol/leaderboard", {
      params: { region, queue, limit, tier: tier === "challenger" ? undefined : tier, start: start || undefined },
      ttl: TTL.leaderboard,
      persist: true,
      cacheIf: rows => Array.isArray(rows) && rows.every(r => r.gameName),
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404 && e.code === "ROUTE_NOT_FOUND") return null;
    throw e;
  }
}

/**
 * Datos para las etiquetas de la partida en vivo: { inGame, players: { [puuid]: { champion, position, top, totalPoints,
 * championsPlayed } | null } }. Opcional: si el backend no lo tiene, devuelve null y la partida se ve sin etiquetas.
 */
export async function getLiveInsights(puuid, region) {
  try {
    return await get(`/lol/live/${puuid}/insights`, { params: { region }, ttl: 5 * MIN });
  } catch {
    return null;
  }
}

/** Línea de tiempo de una partida: { puuids, frames: [{ t, gold[], xp[], cs[] }], events } o null si no está */
export async function getTimeline(matchId, region) {
  try {
    return await get(`/lol/match/${matchId}/timeline`, { params: { region }, ttl: TTL.match, persist: true });
  } catch {
    return null;
  }
}

/**
 * Estado del servidor de LoL de una región (mantenimientos e incidencias, con el título en español):
 * { name, maintenances: [{ id, status, title }], incidents: [{ id, severity, title }] }. null si no se pudo consultar.
 */
export async function getServerStatus(region) {
  try {
    return await get("/lol/status", { params: { region, lang: "es" }, ttl: 5 * MIN });
  } catch {
    return null;
  }
}

/**
 * Build de los Challenger con un campeón (objetos, runas, hechizos, posición): null si todavía no hay partidas suyas
 * o si el backend no tiene la ruta.
 */
export async function getBuild(championId) {
  try {
    return await get(`/lol/builds/${championId}`, { ttl: 20 * MIN, persist: true });
  } catch {
    return null;
  }
}

/** Campeones del parche más reciente en Challenger: { patch, matches, champions: [{ championId, games, wins, position }] } */
export async function getBuildsMeta() {
  try {
    return await get("/lol/builds", { ttl: 20 * MIN, persist: true });
  } catch {
    return null;
  }
}
