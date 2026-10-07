import { describe, expect, it } from "vitest";
import { comparePath, livePath, matchPath, parsePlayerKey, parseRiotId, parseRiotIdSlug, playerKey, profilePath, regionById, regionBySlug, regionOfMatchId, riotIdSlug } from "./regions";

describe("parseRiotId", () => {
  it("separa nombre y tag por el último #", () => {
    expect(parseRiotId("Faker#KR1")).toEqual({ gameName: "Faker", tagLine: "KR1" });
    expect(parseRiotId("  Hide on bush # KR1 ")).toEqual({ gameName: "Hide on bush", tagLine: "KR1" });
  });

  it("rechaza textos sin tag o sin nombre", () => {
    expect(parseRiotId("Faker")).toBeNull();
    expect(parseRiotId("Faker#")).toBeNull();
    expect(parseRiotId("#KR1")).toBeNull();
    expect(parseRiotId("")).toBeNull();
  });
});

describe("Riot ID en la URL", () => {
  it("ida y vuelta con espacios, guiones y caracteres no latinos", () => {
    for (const [name, tag] of [["Hide on bush", "KR1"], ["Ana-Lu", "LAN"], ["抖音武器王安逸", "上单全能王"], ["T1 Eclipse", "2009"]]) {
      expect(parseRiotIdSlug(riotIdSlug(name, tag))).toEqual({ gameName: name, tagLine: tag });
    }
  });

  it("acepta el parámetro ya decodificado por React Router", () => {
    expect(parseRiotIdSlug("Hide on bush-KR1")).toEqual({ gameName: "Hide on bush", tagLine: "KR1" });
  });

  it("no se rompe con un % suelto", () => {
    expect(parseRiotIdSlug("100%-LAN")).toEqual({ gameName: "100%", tagLine: "LAN" });
  });

  it("arma las rutas de perfil y en vivo", () => {
    expect(profilePath("kr", "Hide on bush", "KR1")).toBe("/lol/kr/Hide%20on%20bush-KR1");
    expect(livePath("lan", "Noctis", "LAN")).toBe("/lol/lan/Noctis-LAN/en-vivo");
  });
});

describe("regiones", () => {
  it("traduce slug de la URL a plataforma de Riot", () => {
    expect(regionBySlug("LAN").id).toBe("la1");
    expect(regionBySlug("euw").id).toBe("euw1");
    expect(regionById("br1").slug).toBe("br");
    expect(regionBySlug("xx")).toBeNull();
  });
});

describe("partidas y comparar", () => {
  it("saca la región del ID de partida", () => {
    expect(regionOfMatchId("LA1_123")?.slug).toBe("lan");
    expect(regionOfMatchId("KR_9")?.slug).toBe("kr");
    expect(regionOfMatchId("JP1_9")).toBeNull();
  });

  it("arma la ruta de la partida con el jugador resaltado", () => {
    expect(matchPath("KR_1")).toBe("/lol/partida/KR_1");
    expect(matchPath("KR_1", { gameName: "Hide on bush", tagLine: "KR1" })).toBe("/lol/partida/KR_1?jugador=Hide%20on%20bush-KR1");
  });

  it("codifica y lee jugadores para Comparar", () => {
    const key = playerKey("kr", "Hide on bush", "KR1");
    expect(parsePlayerKey(key)).toMatchObject({ gameName: "Hide on bush", tagLine: "KR1", region: { slug: "kr" } });
    expect(parsePlayerKey("xx/Faker-KR1")).toBeNull();
    expect(comparePath(key)).toBe(`/lol/comparar?a=${encodeURIComponent(key)}`);
    expect(comparePath()).toBe("/lol/comparar");
  });
});
