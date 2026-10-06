import { describe, expect, it } from "vitest";
import {
  QUEUE_FILTERS, championStats, compactMatch, currentStreak, matchHighlights, formatDuration, kdaText, kdaTone, killParticipation, matchesFilter,
  queueLong, queueShort, rankFromScore, rankLabel, rankScore, rankShort, roleStats, summarize, timeAgo, winrate,
} from "./lol";

describe("rangos", () => {
  it("usa la misma escala que el backend (server/lib/rank.js)", () => {
    expect(rankScore("IRON", "IV", 0)).toBe(0);
    expect(rankScore("GOLD", "IV", 0)).toBe(1200);
    expect(rankScore("DIAMOND", "I", 99)).toBe(2799);
    expect(rankScore("MASTER", "I", 0)).toBe(2800);
    expect(rankScore("CHALLENGER", "I", 1500)).toBe(4300);
    expect(rankScore("UNKNOWN", "I", 10)).toBeNull();
  });

  it("convierte un puntaje medio en nombre de liga", () => {
    expect(rankFromScore(rankScore("EMERALD", "III", 50))).toBe("Esmeralda III");
    expect(rankFromScore(3000)).toBe("Maestro");
    expect(rankFromScore(NaN)).toBeNull();
  });

  it("nombres y abreviaturas en español", () => {
    expect(rankLabel("EMERALD", "II")).toBe("Esmeralda II");
    expect(rankLabel("GRANDMASTER", "I")).toBe("Gran Maestro");
    expect(rankLabel(null)).toBe("Sin clasificar");
    expect(rankShort("EMERALD", "II")).toBe("E2");
    expect(rankShort("PLATINUM", "I")).toBe("P1");
    expect(rankShort("SILVER", "IV")).toBe("Pl4");
    expect(rankShort("CHALLENGER", "I")).toBe("C");
  });

  it("winrate redondeado y null sin partidas", () => {
    expect(winrate(112, 98)).toBe(53);
    expect(winrate(0, 0)).toBeNull();
  });
});

describe("colas y tiempo", () => {
  it("nombra las colas conocidas y cae en «Otro modo»", () => {
    expect(queueShort(420)).toBe("Solo/Duo");
    expect(queueLong(440)).toBe("Clasificatoria Flex 5v5");
    expect(queueShort(1740)).toBe("Arena");
    expect(queueShort(99999)).toBe("Otro modo");
  });

  it("formatea duraciones y tiempos relativos", () => {
    expect(formatDuration(1694)).toBe("28:14");
    expect(formatDuration(3725)).toBe("1:02:05");
    const now = Date.parse("2026-10-06T12:00:00Z");
    expect(timeAgo(now - 30_000, now)).toBe("hace un momento");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("hace 3 h");
    expect(timeAgo(now - 26 * 3_600_000, now)).toBe("ayer");
    expect(timeAgo(now - 5 * 86_400_000, now)).toBe("hace 5 días");
  });

  it("KDA perfecto sin muertes", () => {
    expect(kdaText(9, 2, 11)).toBe("10.00");
    expect(kdaText(5, 0, 3)).toBe("Perfecto");
  });
});

// Participante de match-v5 con lo mínimo que usa compactMatch
const raw = (over = {}) => ({
  puuid: "me", riotIdGameName: "Noctis", riotIdTagline: "LAN", championId: 103, championName: "Ahri", champLevel: 16,
  teamId: 100, teamPosition: "MIDDLE", win: true, kills: 9, deaths: 2, assists: 11, totalMinionsKilled: 200,
  neutralMinionsKilled: 31, totalDamageDealtToChampions: 25000, goldEarned: 12000, visionScore: 20,
  item0: 3089, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340, summoner1Id: 4, summoner2Id: 14,
  perks: { styles: [{ style: 8100, selections: [{ perk: 8112 }] }, { style: 8000 }] },
  ...over,
});

const match = (participants, info = {}) => compactMatch({
  metadata: { matchId: "LA1_1" },
  info: { queueId: 420, mapId: 11, gameMode: "CLASSIC", gameCreation: 1, gameStartTimestamp: 2, gameEndTimestamp: 3, gameDuration: 1694, participants, ...info },
});

describe("compactMatch", () => {
  it("deja solo lo necesario", () => {
    const m = match([raw(), raw({ puuid: "ally", kills: 5, assists: 2 }), raw({ puuid: "enemy", teamId: 200, win: false })]);
    const me = m.participants[0];
    expect(m).toMatchObject({ id: "LA1_1", queueId: 420, duration: 1694, arena: false });
    expect(me).toMatchObject({ gameName: "Noctis", tagLine: "LAN", cs: 231, keystone: 8112, secondary: 8000, spells: [4, 14] });
    expect(me.items).toEqual([3089, 0, 0, 0, 0, 0, 3340]);
    expect(killParticipation(m, me)).toBe(Math.round((20 / 14) * 100));
  });

  it("convierte la duración antigua en milisegundos", () => {
    expect(match([raw()], { gameEndTimestamp: undefined, gameDuration: 1_694_000 }).duration).toBe(1694);
  });

  it("en Arena agrupa por pareja y guarda el puesto", () => {
    const m = match([
      raw({ playerSubteamId: 3, subteamPlacement: 1 }),
      raw({ puuid: "p2", playerSubteamId: 3, subteamPlacement: 1 }),
      raw({ puuid: "p3", playerSubteamId: 5, subteamPlacement: 4, win: false }),
    ], { gameMode: "CHERRY", queueId: 1740 });
    expect(m.arena).toBe(true);
    expect(m.participants.map(p => p.teamId)).toEqual([1003, 1003, 1005]);
    expect(m.participants[0].placement).toBe(1);
  });
});

describe("resúmenes", () => {
  const games = [
    match([raw({ win: true, kills: 10, deaths: 2, assists: 4 })]),
    match([raw({ win: false, kills: 2, deaths: 6, assists: 4, championId: 134, championName: "Syndra" })]),
    match([raw({ win: false, gameEndedInEarlySurrender: true })]),   // remake: no cuenta
  ];

  it("summarize ignora los remakes", () => {
    const s = summarize(games, "me");
    expect(s).toMatchObject({ games: 2, wins: 1, losses: 1, wr: 50 });
    expect(s.kda).toBeCloseTo(20 / 8);
  });

  it("championStats ordena por partidas jugadas", () => {
    const stats = championStats([...games, games[0]], "me");
    expect(stats.map(c => [c.championName, c.games, c.wr])).toEqual([["Ahri", 2, 100], ["Syndra", 1, 0]]);
  });

  it("devuelve null sin partidas del jugador", () => {
    expect(summarize(games, "otro")).toBeNull();
  });
});

describe("filtros de cola y roles", () => {
  const byKey = k => QUEUE_FILTERS.find(f => f.key === k);
  const q = queueId => ({ queueId });

  it("Todo deja pasar cualquier cola; ARAM incluye ARAM: Caos y Arena sus cuatro colas", () => {
    expect(matchesFilter(byKey("all"), q(1700))).toBe(true);
    expect(matchesFilter(byKey("aram"), q(450))).toBe(true);
    expect(matchesFilter(byKey("aram"), q(2400))).toBe(true);
    expect(matchesFilter(byKey("aram"), q(420))).toBe(false);
    expect([1700, 1710, 1740, 1750].every(id => matchesFilter(byKey("arena"), q(id)))).toBe(true);
  });

  it("solo se manda ?queue= al backend cuando el filtro es de una sola cola", () => {
    expect(QUEUE_FILTERS.filter(f => f.queue).map(f => f.key)).toEqual(["solo", "flex"]);
  });

  it("roleStats cuenta posiciones sin remakes ni partidas sin carril", () => {
    const games = [
      match([raw({ teamPosition: "MIDDLE" })]),
      match([raw({ teamPosition: "MIDDLE" })]),
      match([raw({ teamPosition: "UTILITY" })]),
      match([raw({ teamPosition: "", individualPosition: "" })], { queueId: 450 }),
      match([raw({ teamPosition: "TOP", gameEndedInEarlySurrender: true })]),
    ];
    const { total, roles } = roleStats(games, "me");
    expect(total).toBe(3);
    expect(Object.fromEntries(roles.map(r => [r.key, r.games]))).toEqual({ TOP: 0, JUNGLE: 0, MIDDLE: 2, BOTTOM: 0, UTILITY: 1 });
    expect(roles.find(r => r.key === "MIDDLE").share).toBeCloseTo(2 / 3);
  });

  it("colorea el KDA como op.gg", () => {
    expect([2.9, 3, 4.2, 5, Infinity].map(kdaTone)).toEqual(["", "kda-3", "kda-4", "kda-5", "kda-5"]);
  });
});

describe("última partida", () => {
  it("matchHighlights calcula la porción de daño y prioriza las insignias más raras", () => {
    const m = match([
      raw({ kills: 12, deaths: 0, assists: 5, largestMultiKill: 5, firstBloodKill: true, totalDamageDealtToChampions: 30000 }),
      raw({ puuid: "ally", kills: 3, totalDamageDealtToChampions: 10000 }),
      raw({ puuid: "enemy", teamId: 200, win: false }),
    ]);
    const h = matchHighlights(m, "me");
    expect(h.damageShare).toBe(75);
    expect(h.badges.map(b => b.label)).toEqual(["Pentakill", "Sin morir", "Más daño del equipo"]);   // máximo 3
  });

  it("un remake no tiene insignias y un jugador ajeno da null", () => {
    expect(matchHighlights(match([raw({ gameEndedInEarlySurrender: true })]), "me").badges).toEqual([]);
    expect(matchHighlights(match([raw()]), "otro")).toBeNull();
  });

  it("currentStreak cuenta desde la más reciente y salta los remakes", () => {
    const games = [
      match([raw({ win: true })]),
      match([raw({ win: false, gameEndedInEarlySurrender: true })]),
      match([raw({ win: true })]),
      match([raw({ win: false })]),
    ];
    expect(currentStreak(games, "me")).toEqual({ win: true, count: 2 });
    expect(currentStreak([], "me")).toBeNull();
  });
});
