// Datos y cálculos de League of Legends (misma lógica que la app: src/games/lol/utils.js y history.js)

// ─── Colas y mapas ───────────────────────────────────────────────────────
const QUEUES = {
  0: ["Personalizada", "Partida personalizada"],
  400: ["Normal", "Normal (reclutamiento)"], 430: ["Normal", "Normal (a ciegas)"], 490: ["Normal", "Partida rápida"],
  480: ["Swiftplay", "Swiftplay"],
  420: ["Solo/Duo", "Clasificatoria Solo/Duo"],
  440: ["Flex 5v5", "Clasificatoria Flex 5v5"],
  450: ["ARAM", "ARAM"], 720: ["ARAM Clash", "ARAM Clash"], 2400: ["ARAM", "ARAM: Caos"],
  700: ["Clash", "Clash"],
  830: ["Vs. IA", "Cooperativo vs. IA"], 840: ["Vs. IA", "Cooperativo vs. IA"], 850: ["Vs. IA", "Cooperativo vs. IA"],
  870: ["Vs. IA", "Cooperativo vs. IA"], 880: ["Vs. IA", "Cooperativo vs. IA"], 890: ["Vs. IA", "Cooperativo vs. IA"],
  900: ["URF", "URF"], 1010: ["URF", "URF"], 1900: ["URF", "URF"],
  1020: ["Un solo campeón", "Un solo campeón"],
  1300: ["Nexus Blitz", "Nexus Blitz"],
  1400: ["Libro de hechizos", "Libro de hechizos definitivo"],
  1700: ["Arena", "Arena"], 1710: ["Arena", "Arena"],
};

export const queueShort = id => QUEUES[id]?.[0] || "Otro modo";
export const queueLong = id => QUEUES[id]?.[1] || "Otro modo";

const MAPS = { 11: "La Grieta del Invocador", 12: "Abismo de los Lamentos", 21: "Nexus Blitz", 30: "Arena" };
export const mapName = id => MAPS[id] || "Mapa especial";

// Filtros del historial: id de cola que se manda al backend (?queue=) y se usa para filtrar en local
export const QUEUE_FILTERS = [
  { key: "all", label: "Todas", queue: null },
  { key: "solo", label: "Solo/Duo", queue: 420 },
  { key: "flex", label: "Flex", queue: 440 },
  { key: "aram", label: "ARAM", queue: 450 },
];

// ─── Rangos ──────────────────────────────────────────────────────────────
export const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const TIER_ES = {
  IRON: "Hierro", BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", PLATINUM: "Platino", EMERALD: "Esmeralda",
  DIAMOND: "Diamante", MASTER: "Maestro", GRANDMASTER: "Gran Maestro", CHALLENGER: "Challenger",
};
const TIER_COLOR = {
  IRON: "#9A8F8A", BRONZE: "#C0855C", SILVER: "#AEB9C2", GOLD: "#E2B85A", PLATINUM: "#7FD1C4", EMERALD: "#35E0A1",
  DIAMOND: "#7FB0FF", MASTER: "#C77DFF", GRANDMASTER: "#FF7A7A", CHALLENGER: "#E8B65A",
};
const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
const DIVISIONS = { IV: 0, III: 1, II: 2, I: 3 };

export const tierName = tier => TIER_ES[tier] || "Sin clasificar";
export const tierColor = tier => TIER_COLOR[tier] || "var(--text-2)";
export const isApex = tier => APEX.has(tier);

/** "Esmeralda II", "Maestro" (sin división en los niveles altos) */
export const rankLabel = (tier, rank) => (!tier ? "Sin clasificar" : isApex(tier) ? tierName(tier) : `${tierName(tier)} ${rank || ""}`.trim());

/** "E2", "P1", "M" para la insignia corta */
export function rankShort(tier, rank) {
  if (!tier) return "—";
  // Plata y Platino empiezan igual: Plata usa "Pl"
  const letter = { SILVER: "Pl", GRANDMASTER: "GM", CHALLENGER: "C" }[tier] || tierName(tier)[0];
  return isApex(tier) ? letter : `${letter}${4 - (DIVISIONS[rank] ?? 0)}`;
}

/** Puntaje continuo (igual que server/lib/rank.js): 400 por nivel, 100 por división y el LP encima. */
export function rankScore(tier, rank, lp) {
  const t = TIERS.indexOf(tier);
  if (t < 0) return null;
  if (t >= 7) return 2800 + (lp || 0);
  return t * 400 + (DIVISIONS[rank] ?? 0) * 100 + (lp || 0);
}

/** Puntaje -> "Esmeralda III" (para el rango medio de un equipo) */
export function rankFromScore(score) {
  if (!Number.isFinite(score)) return null;
  if (score >= 2800) return tierName("MASTER");
  const t = Math.max(0, Math.floor(score / 400));
  const div = Math.floor((score % 400) / 100);
  return `${tierName(TIERS[t])} ${["IV", "III", "II", "I"][div]}`;
}

export const winrate = (wins, losses) => (wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null);

// ─── Partidas ────────────────────────────────────────────────────────────
export const csOf = p => (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

/** KDA numérico; Infinity si no hay muertes */
export const kdaValue = (k, d, a) => (d === 0 ? (k + a > 0 ? Infinity : 0) : (k + a) / d);
export const kdaText = (k, d, a) => {
  const v = kdaValue(k, d, a);
  return v === Infinity ? "Perfecto" : v.toFixed(2);
};

/**
 * Deja de la respuesta de match-v5 solo lo que usa la web (~3 KB en vez de ~60 KB) para poder guardarla en
 * localStorage. Las partidas terminadas no cambian, así que se pueden guardar mucho tiempo.
 */
export function compactMatch(m) {
  const info = m.info || {};
  return {
    id: m.metadata?.matchId,
    queueId: info.queueId,
    mapId: info.mapId,
    creation: info.gameCreation,
    start: info.gameStartTimestamp || info.gameCreation,
    end: info.gameEndTimestamp || null,
    // gameDuration viene en segundos desde el parche 11.20 (antes en ms)
    duration: info.gameEndTimestamp ? info.gameDuration : Math.round((info.gameDuration || 0) / 1000),
    participants: (info.participants || []).map(p => ({
      puuid: p.puuid,
      gameName: p.riotIdGameName || p.summonerName || "",
      tagLine: p.riotIdTagline || "",
      championId: p.championId,
      championName: p.championName,
      champLevel: p.champLevel,
      teamId: p.teamId,
      position: p.teamPosition || p.individualPosition || "",
      win: Boolean(p.win),
      remake: Boolean(p.gameEndedInEarlySurrender),
      kills: p.kills || 0,
      deaths: p.deaths || 0,
      assists: p.assists || 0,
      cs: csOf(p),
      damage: p.totalDamageDealtToChampions || 0,
      gold: p.goldEarned || 0,
      vision: p.visionScore || 0,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map(i => i || 0),
      spells: [p.summoner1Id, p.summoner2Id],
      keystone: p.perks?.styles?.[0]?.selections?.[0]?.perk ?? null,
      secondary: p.perks?.styles?.[1]?.style ?? null,
      placement: p.placement || p.subteamPlacement || null,
    })),
  };
}

export const findMe = (match, puuid) => match?.participants?.find(p => p.puuid === puuid) || null;

export const teamKills = (match, teamId) =>
  match.participants.filter(p => p.teamId === teamId).reduce((s, p) => s + p.kills, 0);

/** Participación en kills: (K + A) / kills del equipo */
export function killParticipation(match, me) {
  const total = teamKills(match, me.teamId);
  return total > 0 ? Math.round(((me.kills + me.assists) / total) * 100) : 0;
}

/** Resumen de una lista de partidas: victorias, derrotas, KDA medio y participación media (sin remakes). */
export function summarize(matches, puuid) {
  let wins = 0, losses = 0, k = 0, d = 0, a = 0, kp = 0, games = 0;
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake) continue;
    games++;
    if (me.win) wins++; else losses++;
    k += me.kills; d += me.deaths; a += me.assists;
    kp += killParticipation(m, me);
  }
  if (!games) return null;
  return {
    games, wins, losses,
    wr: Math.round((wins / games) * 100),
    kda: kdaValue(k, d, a),
    kp: Math.round(kp / games),
  };
}

/** Estadísticas por campeón de las partidas cargadas (la API de Riot no da estadísticas de temporada). */
export function championStats(matches, puuid) {
  const by = new Map();
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake) continue;
    const s = by.get(me.championId) || { championId: me.championId, championName: me.championName, games: 0, wins: 0, k: 0, d: 0, a: 0, cs: 0, minutes: 0, damage: 0 };
    s.games++;
    if (me.win) s.wins++;
    s.k += me.kills; s.d += me.deaths; s.a += me.assists;
    s.cs += me.cs; s.minutes += m.duration / 60; s.damage += me.damage;
    by.set(me.championId, s);
  }
  return [...by.values()]
    .map(s => ({
      ...s,
      wr: Math.round((s.wins / s.games) * 100),
      kda: kdaValue(s.k, s.d, s.a),
      avgK: s.k / s.games, avgD: s.d / s.games, avgA: s.a / s.games,
      csMin: s.minutes > 0 ? s.cs / s.minutes : 0,
      avgDamage: Math.round(s.damage / s.games),
    }))
    .sort((x, y) => y.games - x.games || y.wr - x.wr);
}

export const formatKda = v => (v === Infinity ? "Perfecto" : `${v.toFixed(2)} : 1`);

// ─── Tiempo ──────────────────────────────────────────────────────────────
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

export function timeAgo(ms, now = Date.now()) {
  if (!ms) return "";
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "hace 1 mes" : months < 12 ? `hace ${months} meses` : `hace más de un año`;
}

export const formatNumber = n => new Intl.NumberFormat("es-MX").format(Math.round(n || 0)).replace(/,/g, " ");

const POSITIONS = { TOP: "Superior", JUNGLE: "Jungla", MIDDLE: "Central", BOTTOM: "Inferior", UTILITY: "Soporte" };
export const positionName = pos => POSITIONS[pos] || "";
