import { describe, expect, it } from "vitest";
import { cocProgress } from "./coc";

describe("progreso de Clash of Clans", () => {
  const player = {
    heroes: [{ name: "Barbarian King", level: 100, maxLevel: 110, village: "home" }, { name: "Battle Machine", level: 35, maxLevel: 35, village: "builderBase" }],
    troops: [
      { name: "Barbarian", level: 13, maxLevel: 13, village: "home" },
      { name: "Giant", level: 7, maxLevel: 14, village: "home" },
      { name: "Super Barbarian", level: 1, maxLevel: 9, village: "home" },
      { name: "Wall Wrecker", level: 2, maxLevel: 6, village: "home" },
      { name: "L.A.S.S.I", level: 10, maxLevel: 15, village: "home" },
      { name: "Raged Barbarian", level: 20, maxLevel: 20, village: "builderBase" },
    ],
    spells: [{ name: "Lightning Spell", level: 13, maxLevel: 13 }],
  };

  it("separa asedio, mascotas y constructor, y omite las supertropas", () => {
    const groups = Object.fromEntries(cocProgress(player).map(g => [g.key, g]));
    expect(groups.troops.items.map(i => i.name)).toEqual(["Barbarian", "Giant"]);
    expect(groups.siege.items.map(i => i.name)).toEqual(["Wall Wrecker"]);
    expect(groups.pets.items.map(i => i.name)).toEqual(["L.A.S.S.I"]);
    expect(groups.builder.items.map(i => i.name)).toEqual(["Raged Barbarian", "Battle Machine"]);
    expect(groups.equipment).toBeUndefined();   // grupo vacío
  });

  it("cuenta los que están al máximo y el porcentaje de niveles", () => {
    const troops = cocProgress(player).find(g => g.key === "troops");
    expect(troops).toMatchObject({ done: 1, total: 2, pct: 74 });   // (13 + 7) / (13 + 14)
  });
});
