import { describe, expect, it } from "vitest";
import { suggestions } from "./library";

const fav = (gameName, tagLine, extra = {}) => ({ region: "kr", gameName, tagLine, puuid: gameName, ...extra });
const recent = (gameName, tagLine, extra = {}) => ({ game: "lol", region: "kr", gameName, tagLine, ...extra });

describe("suggestions del buscador", () => {
  it("pone los favoritos primero y no repite jugadores", () => {
    const out = suggestions([fav("T1 Eclipse", "2009")], [recent("Hide on bush", "KR1"), recent("t1 eclipse", "2009")], "");
    expect(out.map(o => [o.gameName, o.favorite])).toEqual([["T1 Eclipse", true], ["Hide on bush", false]]);
  });

  it("filtra por lo escrito sin distinguir mayúsculas", () => {
    const out = suggestions([fav("T1 Eclipse", "2009")], [recent("Hide on bush", "KR1")], "BUSH");
    expect(out.map(o => o.gameName)).toEqual(["Hide on bush"]);
  });

  it("un favorito sin ícono ni rango los toma de su búsqueda reciente", () => {
    const out = suggestions([fav("Faker", "KR1")], [recent("Faker", "KR1", { iconId: 6, rank: "Challenger" })], "");
    expect(out[0]).toMatchObject({ favorite: true, iconId: 6, rank: "Challenger" });
  });

  it("ignora recientes de otros juegos y respeta el límite", () => {
    const many = Array.from({ length: 12 }, (_, i) => recent(`P${i}`, "KR"));
    expect(suggestions([], [{ ...recent("X", "Y"), game: "tft" }], "")).toEqual([]);
    expect(suggestions([], many, "")).toHaveLength(8);
  });

  it("distingue el mismo Riot ID en otra región", () => {
    const out = suggestions([fav("Faker", "KR1")], [{ ...recent("Faker", "KR1"), region: "euw" }], "");
    expect(out).toHaveLength(2);
  });
});
