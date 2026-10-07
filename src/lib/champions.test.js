import { describe, expect, it } from "vitest";
import { burnText, championPath, cleanText, filterChampions, roleLabel } from "./champions";

describe("campeones", () => {
  it("cleanText quita las etiquetas de Data Dragon y separa párrafos", () => {
    const html = "Lanza un orbe que inflige <magicDamage>40 de daño mágico</magicDamage>.<br><br>Al volver, <status>ralentiza</status>&nbsp;un 30%.";
    expect(cleanText(html)).toEqual(["Lanza un orbe que inflige 40 de daño mágico.", "Al volver, ralentiza un 30%."]);
    expect(cleanText("")).toEqual([]);
  });

  it("burnText resume los valores por rango", () => {
    expect(burnText("8/7/6/5/4")).toBe("8 / 7 / 6 / 5 / 4");
    expect(burnText("60/60/60")).toBe("60");
    expect(burnText("0")).toBe("");
  });

  it("filtra por nombre sin tildes y por rol", () => {
    const list = [
      { id: "Ahri", name: "Ahri", title: "la zorra de nueve colas", tags: ["Mage", "Assassin"] },
      { id: "Nunu", name: "Nunu y Willump", title: "el niño y su yeti", tags: ["Tank"] },
    ];
    expect(filterChampions(list, "nino", null).map(c => c.id)).toEqual(["Nunu"]);
    expect(filterChampions(list, "", "Mage").map(c => c.id)).toEqual(["Ahri"]);
    expect(filterChampions(list, "", null)).toHaveLength(2);
  });

  it("nombres de rol y rutas", () => {
    expect(roleLabel("Marksman")).toBe("Tirador");
    expect(championPath("MonkeyKing")).toBe("/lol/campeones/MonkeyKing");
    expect(championPath("Ahri", "kr/Faker-KR1")).toBe("/lol/campeones/Ahri?jugador=kr%2FFaker-KR1");
  });
});
