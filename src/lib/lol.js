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
  1700: ["Arena", "Arena"], 1710: ["Arena", "Arena"], 1740: ["Arena", "Arena"], 1750: ["Arena", "Arena"],
};

export const queueShort = id => QUEUES[id]?.[0] || "Otro modo";
export const queueLong = id => QUEUES[id]?.[1] || "Otro modo";

const MAPS = { 11: "La Grieta del Invocador", 12: "Abismo de los Lamentos", 21: "Nexus Blitz", 30: "Arena" };
export const mapName = id => MAPS[id] || "Mapa especial";

// Filtros del historial (pestañas sobre el perfil). `queues` son las colas que se dejan al filtrar en local; `queue`
// se manda al backend (?queue=) solo cuando el filtro es de una sola cola (la API de Riot acepta una).
export const QUEUE_FILTERS = [
  { key: "all", label: "Todo", queue: null, queues: null },
  { key: "solo", label: "Solo/Duo", queue: 420, queues: [420] },
  { key: "flex", label: "Flex", queue: 440, queues: [440] },
  { key: "aram", label: "ARAM", queue: null, queues: [450, 2400] },   // ARAM y ARAM: Caos
  { key: "arena", label: "Arena", queue: null, queues: [1700, 1710, 1740, 1750] },
];

export const matchesFilter = (filter, match) => !filter?.queues || filter.queues.includes(match.queueId);

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
  // En Arena los equipos son parejas (playerSubteamId) y el resultado es el puesto final
  const arena = info.gameMode === "CHERRY";
  return {
    id: m.metadata?.matchId,
    arena,
    queueId: info.queueId,
    mapId: info.mapId,
    creation: info.gameCreation,
    start: info.gameStartTimestamp || info.gameCreation,
    end: info.gameEndTimestamp || null,
    // gameDuration viene en segundos desde el parche 11.20 (antes en ms)
    duration: info.gameEndTimestamp ? info.gameDuration : Math.round((info.gameDuration || 0) / 1000),
    // Objetivos de cada equipo (página de la partida)
    teams: (info.teams || []).map(t => ({
      teamId: t.teamId,
      win: Boolean(t.win),
      objectives: Object.fromEntries(Object.entries(t.objectives || {}).map(([k, v]) => [k, v?.kills || 0])),
    })),
    participants: (info.participants || []).map(p => ({
      puuid: p.puuid,
      gameName: p.riotIdGameName || p.summonerName || "",
      tagLine: p.riotIdTagline || "",
      championId: p.championId,
      championName: p.championName,
      icon: p.profileIcon ?? null,
      champLevel: p.champLevel,
      teamId: arena && p.playerSubteamId ? 1000 + p.playerSubteamId : p.teamId,
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
      taken: p.totalDamageTaken || 0,
      wards: p.wardsPlaced || 0,
      buildings: p.damageDealtToBuildings || 0,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map(i => i || 0),
      spells: [p.summoner1Id, p.summoner2Id],
      keystone: p.perks?.styles?.[0]?.selections?.[0]?.perk ?? null,
      secondary: p.perks?.styles?.[1]?.style ?? null,
      placement: p.subteamPlacement || p.placement || null,
      // Para las insignias de la última partida
      multikill: p.largestMultiKill || 0,
      firstBlood: Boolean(p.firstBloodKill),
      turrets: p.turretKills || 0,
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

const MULTIKILL = { 2: "Doble kill", 3: "Triple kill", 4: "Quadra kill", 5: "Pentakill" };

/**
 * Lo destacado de una partida para la tarjeta "Tu última partida": porción del daño del equipo y hasta 3 insignias,
 * de la más rara a la más común. Devuelve null si el jugador no está en la partida.
 */
export function matchHighlights(match, puuid) {
  const me = findMe(match, puuid);
  if (!me) return null;
  const team = match.participants.filter(p => p.teamId === me.teamId);
  const teamDamage = team.reduce((s, p) => s + p.damage, 0);
  const minutes = match.duration / 60;
  const badges = [];
  if (!me.remake) {
    if (me.multikill >= 3) badges.push({ key: "multi", label: MULTIKILL[Math.min(me.multikill, 5)], tone: "gold" });
    if (me.deaths === 0 && me.kills + me.assists > 0) badges.push({ key: "deathless", label: "Sin morir", tone: "brand" });
    if (team.length > 1 && me.damage > 0 && me.damage >= Math.max(...team.map(p => p.damage))) badges.push({ key: "damage", label: "Más daño del equipo", tone: "red" });
    if (team.length > 1 && me.kills > 0 && me.kills >= Math.max(...team.map(p => p.kills))) badges.push({ key: "kills", label: "Más kills del equipo", tone: "red" });
    if (me.firstBlood) badges.push({ key: "fb", label: "Primera sangre", tone: "red" });
    if (me.multikill === 2) badges.push({ key: "double", label: MULTIKILL[2], tone: "blue" });
    if (me.turrets >= 2) badges.push({ key: "turrets", label: `${me.turrets} torres`, tone: "blue" });
    if (minutes > 0 && me.cs / minutes >= 8) badges.push({ key: "cs", label: `${(me.cs / minutes).toFixed(1)} CS/min`, tone: "brand" });
  }
  return {
    me,
    damageShare: teamDamage > 0 ? Math.round((me.damage / teamDamage) * 100) : 0,
    csMin: minutes > 0 ? me.cs / minutes : 0,
    kp: killParticipation(match, me),
    badges: badges.slice(0, 3),
  };
}

/** Racha actual (victorias o derrotas seguidas desde la partida más reciente, sin contar remakes) */
export function currentStreak(matches, puuid) {
  let win = null, count = 0;
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake) continue;
    if (win === null) win = me.win;
    if (me.win !== win) break;
    count++;
  }
  return win === null ? null : { win, count };
}

/**
 * Con quién juega: los compañeros de equipo que se repiten en las partidas cargadas (2 o más), con las partidas y
 * victorias juntos. Ordenados por partidas y, a igualdad, por winrate. Sin remakes.
 */
export function teammates(matches, puuid, min = 2) {
  const by = new Map();
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake) continue;
    for (const p of m.participants) {
      if (p.puuid === puuid || p.teamId !== me.teamId || !p.puuid) continue;
      const s = by.get(p.puuid) || { puuid: p.puuid, gameName: p.gameName, tagLine: p.tagLine, icon: p.icon ?? null, games: 0, wins: 0, last: 0 };
      s.games++;
      if (me.win) s.wins++;
      // Nombre e ícono de la partida más reciente
      if ((m.start || 0) > s.last) Object.assign(s, { last: m.start || 0, gameName: p.gameName || s.gameName, tagLine: p.tagLine || s.tagLine, icon: p.icon ?? s.icon });
      by.set(p.puuid, s);
    }
  }
  return [...by.values()]
    .filter(s => s.games >= min)
    .map(s => ({ ...s, wr: Math.round((s.wins / s.games) * 100) }))
    .sort((a, b) => b.games - a.games || b.wr - a.wr);
}

/**
 * Promedios de un jugador en una lista de partidas (para Comparar): winrate, KDA, participación y valores por minuto.
 * null si no hay partidas válidas.
 */
export function averages(matches, puuid) {
  const base = summarize(matches, puuid);
  if (!base) return null;
  let cs = 0, damage = 0, gold = 0, vision = 0, minutes = 0, deaths = 0;
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake) continue;
    cs += me.cs; damage += me.damage; gold += me.gold; vision += me.vision; deaths += me.deaths;
    minutes += m.duration / 60;
  }
  const per = v => (minutes > 0 ? v / minutes : 0);
  return { ...base, csMin: per(cs), dmgMin: per(damage), goldMin: per(gold), visionMin: per(vision), deathsAvg: deaths / base.games };
}

/** Partidas que aparecen en las dos listas: cuántas jugaron en el mismo equipo y cuántas en contra (y quién ganó) */
export function sharedMatches(listA, puuidA, listB, puuidB) {
  const all = new Map([...listA, ...listB].map(m => [m.id, m]));
  const out = { together: 0, togetherWins: 0, against: 0, aWins: 0, matches: [] };
  for (const m of all.values()) {
    const a = findMe(m, puuidA), b = findMe(m, puuidB);
    if (!a || !b || a.remake) continue;
    out.matches.push(m);
    if (a.teamId === b.teamId) { out.together++; if (a.win) out.togetherWins++; } else { out.against++; if (a.win) out.aWins++; }
  }
  return out;
}

/** Diferencia de oro azul − rojo en cada minuto. teamOf: índice de jugador -> 100 | 200 */
export function goldDiff(frames, teamOf) {
  return frames.map(f => ({
    t: f.t,
    diff: f.gold.reduce((s, g, i) => s + (teamOf[i] === 100 ? g : teamOf[i] === 200 ? -g : 0), 0),
  }));
}

/** Color del KDA como en op.gg: 5+ dorado, 4+ azul, 3+ verde; el resto, normal */
export const kdaTone = v => (v >= 5 ? "kda-5" : v >= 4 ? "kda-4" : v >= 3 ? "kda-3" : "");

// ─── Roles ───────────────────────────────────────────────────────────────
export const ROLES = [
  { key: "TOP", label: "Superior" },
  { key: "JUNGLE", label: "Jungla" },
  { key: "MIDDLE", label: "Central" },
  { key: "BOTTOM", label: "Inferior" },
  { key: "UTILITY", label: "Soporte" },
];

/** Partidas por rol (solo cuentan las que traen posición: Grieta del Invocador, sin remakes) */
export function roleStats(matches, puuid) {
  const counts = Object.fromEntries(ROLES.map(r => [r.key, 0]));
  let total = 0;
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.remake || !(me.position in counts)) continue;
    counts[me.position]++;
    total++;
  }
  return { total, roles: ROLES.map(r => ({ ...r, games: counts[r.key], share: total ? counts[r.key] / total : 0 })) };
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
export const placementLabel = n => (n ? `${n}.º lugar` : "");

export const positionName = pos => POSITIONS[pos] || "";
