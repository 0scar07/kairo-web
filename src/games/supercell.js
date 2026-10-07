// Brawl Stars, Clash Royale y Clash of Clans (API oficial de Supercell a través del backend de Kairo).
// Misma lógica que la app (src/utils/supercell.js y src/games/*/utils.js).
import { get } from "../api/client";

const MIN = 60_000;

// "#2pp0" -> "2PP0" (Supercell trata la O como cero)
export const tagOf = raw => String(raw || "").trim().replace(/^#/, "").toUpperCase().replace(/O/g, "0");
export const isTag = raw => /^[0289PYLQGRJCUV]{3,14}$/.test(tagOf(raw));

// Los nombres de clanes y clubes traen códigos de color del juego ("<c9>Win</c>"): se quitan
export const cleanName = s => String(s || "").replace(/<\/?c\d*>/g, "").trim();

// "20240102T130405.000Z" -> milisegundos
export function parseBattleTime(value) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(String(value || ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : Date.now();
}

// "gemGrab" -> "Gem Grab"
export const humanize = s =>
  String(s || "").replace(/([a-z])([A-Z])(?=[a-z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase());

// "SHELLY" -> "Shelly"
export const titleCase = s => String(s || "").toLowerCase().replace(/(^|[\s-])(\w)/g, (_, a, b) => a + b.toUpperCase());

const ROLES = { leader: "Líder", coLeader: "Colíder", admin: "Veterano", elder: "Veterano", member: "Miembro" };
export const clanRole = role => ROLES[role] || null;

// ─── API ─────────────────────────────────────────────────────────────────
export const getPlayer = (game, tag, force) =>
  get(`/${game}/player/${tagOf(tag)}`, { ttl: MIN, persist: true, force });

export const getBattles = (game, tag, force) =>
  get(`/${game}/battles/${tagOf(tag)}`, { ttl: 30_000, force, map: r => r.items || [] });

/**
 * Mejores jugadores de cada juego (ranking oficial). Brawl Stars acepta además country ("co", "mx"… o "global")
 * y brawler (id) para el ranking de un país o de un brawler.
 */
export const getTop = (game, limit = 10, { country, brawler } = {}) =>
  get(`/${game}/top`, {
    params: { limit, country: country && country !== "global" ? country : brawler ? "global" : undefined, brawler },
    ttl: 10 * MIN, persist: true, map: r => r.items || [],
  });

/** Club (Brawl Stars) o clan (Clash Royale, Clash of Clans): { club, war } */
export const getClub = (game, tag, force) =>
  get(`/${game}/club/${tagOf(tag)}`, { ttl: 2 * MIN, persist: true, force });

/** Brawlers con sus habilidades estelares y gadgets (cambian con cada actualización del juego: 1 día) */
export const getBrawlers = () =>
  get("/brawlstars/brawlers", { ttl: 24 * 60 * MIN, persist: true, map: r => (r.items || []).sort((a, b) => a.id - b.id) });

export const clubPath = (game, tag) => `/juegos/${game}/club/${tagOf(tag)}`;
export const brawlerPath = id => `/juegos/brawlstars/brawlers/${id}`;

/** Países para los rankings: los de habla hispana primero y luego los grandes, con su nombre en español */
const COUNTRY_CODES = ["co", "mx", "ar", "cl", "pe", "ve", "ec", "bo", "uy", "py", "es", "us", "br", "gt", "cr", "do", "pa", "hn", "sv", "ni"];
let regionNames = null;
try { regionNames = new Intl.DisplayNames(["es"], { type: "region" }); } catch { /* navegador viejo */ }
export const COUNTRIES = [
  { code: "global", name: "Mundial" },
  ...COUNTRY_CODES.map(code => ({ code, name: regionNames?.of(code.toUpperCase()) || code.toUpperCase() })),
];

// ─── Brawl Stars ─────────────────────────────────────────────────────────
// Imágenes de Brawlify (CDN comunitario con los íconos del juego; la API de Supercell no trae imágenes), como la app
export const brawlerIcon = id => `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
export const bsProfileIcon = id => `https://cdn.brawlify.com/profile-icons/regular/${id}.png`;
export const brawlerPortrait = id => `https://cdn.brawlify.com/brawlers/portraits/${id}.png`;
export const starPowerIcon = id => `https://cdn.brawlify.com/star-powers/borderless/${id}.png`;
export const gadgetIcon = id => `https://cdn.brawlify.com/gadgets/borderless/${id}.png`;
export const clubBadge = id => (id ? `https://cdn.brawlify.com/club-badges/regular/${id}.png` : null);

/** Una batalla del registro de Brawl Stars: modos por equipos traen `result`; Showdown trae `rank` (puesto) */
export function bsBattleView(item, myTag) {
  const b = item.battle || {};
  const teams = b.teams || null;
  const players = teams ? teams.flat() : b.players || [];
  const me = players.find(p => tagOf(p.tag) === myTag);
  let label, tone, win = null;
  if (b.result) {
    win = b.result === "victory" ? true : b.result === "defeat" ? false : null;
    label = b.result === "victory" ? "Victoria" : b.result === "defeat" ? "Derrota" : "Empate";
    tone = win === true ? "win" : win === false ? "loss" : "draw";
  } else if (b.rank != null) {
    const groups = teams ? teams.length : players.length;
    // Si la API informa el cambio de trofeos, manda: se gana trofeos solo en la mitad de arriba
    win = typeof b.trophyChange === "number" ? b.trophyChange > 0 : b.rank <= Math.ceil(groups / 2);
    label = `${b.rank}.º lugar`;
    tone = b.rank === 1 ? "gold" : win ? "win" : "loss";
  } else {
    label = "Partida";
    tone = "draw";
  }
  return {
    label, tone, win,
    resultBased: Boolean(b.result),
    brawler: me?.brawler || null,
    mode: humanize(b.mode || item.event?.mode),
    map: item.event?.map || null,
    trophyChange: typeof b.trophyChange === "number" ? b.trophyChange : null,
    time: parseBattleTime(item.battleTime),
  };
}

// ─── Clash Royale ────────────────────────────────────────────────────────
// Nivel como lo muestra el juego: la API cuenta desde el máximo de la rareza (comunes 16, épicas 11…)
export const displayLevel = card => (card.level || 0) + Math.max(0, 16 - (card.maxLevel || 16));
export const cardIcon = card => card?.iconUrls?.medium || null;
export function averageElixir(deck) {
  const costs = (deck || []).map(c => c.elixirCost).filter(n => typeof n === "number");
  return costs.length ? (costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(1) : null;
}
const CR_KINDS = {
  PvP: "Escalera", pathOfLegend: "Senda de leyendas", challenge: "Desafío", tournament: "Torneo", friendly: "Amistoso",
  clanMate: "Amistoso de clan", boatBattle: "Batalla naval", riverRacePvP: "Guerra fluvial", riverRaceDuel: "Guerra fluvial: duelo",
  riverRaceDuelColosseum: "Guerra fluvial: coliseo", trail: "Camino", casual1v1: "Casual 1v1", casual2v2: "Casual 2v2",
  clanWarWarDay: "Guerra de clanes",
};
/** Una batalla de Clash Royale: el resultado sale de las coronas (team[0] contra opponent[0]) */
export function crBattleView(item) {
  const me = item.team?.[0] || {};
  const rival = item.opponent?.[0] || {};
  const mine = me.crowns ?? 0, theirs = rival.crowns ?? 0;
  const win = mine > theirs ? true : mine < theirs ? false : null;
  return {
    win,
    label: win === true ? "Victoria" : win === false ? "Derrota" : "Empate",
    tone: win === true ? "win" : win === false ? "loss" : "draw",
    score: `${mine} - ${theirs}`,
    rival: rival.name || "Rival",
    kind: CR_KINDS[item.type] || humanize(item.type),
    trophyChange: typeof me.trophyChange === "number" ? me.trophyChange : null,
    deck: me.cards || [],
    time: parseBattleTime(item.battleTime),
  };
}
