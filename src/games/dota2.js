// Dota 2 vía OpenDota (backend de Kairo: server/routes/dota2.js). Misma lógica que la app (src/games/dota2/).
// Imágenes: héroes y avatares del CDN de Steam (Valve) y medallas de OpenDota, como la app.
import { get } from "../api/client";

const MIN = 60_000;
const HERO_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const MEDAL_CDN = "https://www.opendota.com/assets/images/dota2/rank_icons";

/** Héroes (id -> { name interno, label }). Cambian poco: se guardan un día. */
export const getHeroes = () =>
  get("/dota2/heroes", { ttl: 24 * 60 * MIN, persist: true, map: r => Object.fromEntries((r.items || []).map(h => [h.id, h])) });

export const searchPlayers = q => get("/dota2/search", { params: { q }, ttl: 2 * MIN, map: r => r.items || [] });
export const getPlayer = (id, force) => get(`/dota2/player/${encodeURIComponent(id)}`, { ttl: 2 * MIN, persist: true, force });

/** Detalle de una partida (los 10 jugadores con objetos y la ventaja de oro) */
export const getMatch = id => get(`/dota2/match/${encodeURIComponent(id)}`, { ttl: 24 * 60 * MIN, persist: true });

/** Objetos: id -> { key, name, cost } (1 día) */
export const getItems = () => get("/dota2/items", { ttl: 24 * 60 * MIN, persist: true, map: r => r.items || {} });

/** Héroes con partidas y victorias por medalla (brackets[0] = Heraldo … [7] = Inmortal) y en partidas pro (1 h) */
export const getHeroStats = () => get("/dota2/herostats", { ttl: 60 * MIN, persist: true, map: r => r.items || [] });
export const MEDAL_NAMES = ["Heraldo", "Guardián", "Cruzado", "Arconte", "Leyenda", "Ancestral", "Divino", "Inmortal"];
export const heroImageByName = name => `${HERO_CDN}/${name}.png`;

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items";
export const itemIcon = (items, id) => (id && items?.[id] ? `${ITEM_CDN}/${items[id].key}.png` : null);
export const itemName = (items, id) => items?.[id]?.name || "";
export const matchPath = id => `/juegos/dota2/partida/${id}`;

export const heroIcon = (heroes, id) => (heroes?.[id] ? `${HERO_CDN}/icons/${heroes[id].name}.png` : null);
export const heroImage = (heroes, id) => (heroes?.[id] ? `${HERO_CDN}/${heroes[id].name}.png` : null);
export const heroName = (heroes, id) => heroes?.[id]?.label || `Héroe #${id}`;

// game_mode de OpenDota (nombres del propio juego)
const MODES = {
  1: "All Pick", 2: "Captains Mode", 3: "Random Draft", 4: "Single Draft", 5: "All Random", 12: "Least Played",
  13: "Limited Heroes", 16: "Captains Draft", 17: "Balanced Draft", 18: "Ability Draft", 20: "All Random Deathmatch",
  21: "1v1 Mid", 22: "All Draft", 23: "Turbo", 24: "Mutation",
};
export const modeLabel = (gameMode, lobbyType) => (lobbyType === 7 ? "Clasificatoria" : MODES[gameMode] || "Otro modo");

// rank_tier: decena = medalla (1 Heraldo … 8 Inmortal), unidad = estrellas
const MEDALS = { 1: "Heraldo", 2: "Guardián", 3: "Cruzado", 4: "Arconte", 5: "Leyenda", 6: "Ancestral", 7: "Divino", 8: "Inmortal" };
export function medalOf(rankTier) {
  if (!rankTier) return null;
  return { medal: Math.floor(rankTier / 10), stars: rankTier % 10 };
}
export function rankLabel(rankTier, leaderboardRank) {
  const m = medalOf(rankTier);
  if (!m || !MEDALS[m.medal]) return "Sin rango";
  if (m.medal === 8) return leaderboardRank ? `Inmortal #${leaderboardRank}` : "Inmortal";
  return m.stars ? `${MEDALS[m.medal]} ${m.stars}` : MEDALS[m.medal];
}
export const medalIcon = m => (m && m.medal >= 1 && m.medal <= 8 ? `${MEDAL_CDN}/rank_icon_${m.medal}.png` : null);
export const starIcon = m => (m && m.medal < 8 && m.stars > 0 ? `${MEDAL_CDN}/rank_star_${m.stars}.png` : null);

/** "105248644" (ID de cuenta) o "76561198065514372" (Steam64) */
export const isAccountId = text => /^\d{3,20}$/.test(String(text || "").trim());
