import { describe, expect, it } from "vitest";
import { formatCode, mergeFavorites } from "./sync";

const fav = (gameName, addedAt, extra = {}) => ({ region: "kr", gameName, tagLine: "KR1", addedAt, ...extra });
const key = name => `kr:${name}#kr1`.toLowerCase();

describe("sincronización de favoritos", () => {
  it("une los de los dos dispositivos sin repetir y conserva los datos más completos", () => {
    const { favorites } = mergeFavorites([fav("Faker", 10, { puuid: "p1" })], [fav("faker", 5), fav("Zeus", 20)], [], [], 100);
    expect(favorites.map(f => f.gameName)).toEqual(["Zeus", "Faker"]);
    expect(favorites[1]).toMatchObject({ puuid: "p1", addedAt: 5 });
  });

  it("un quitado en otro dispositivo se quita aquí, pero no si se volvió a agregar después", () => {
    const removed = [{ key: key("Faker"), at: 50 }];
    expect(mergeFavorites([fav("Faker", 10)], [], [], removed, 100).favorites).toEqual([]);
    expect(mergeFavorites([fav("Faker", 60)], [], [], removed, 100).favorites).toHaveLength(1);
  });

  it("los quitados viejos caducan y se queda el más reciente por jugador", () => {
    const day = 24 * 60 * 60_000;
    const { removed } = mergeFavorites([], [], [{ key: "a", at: 1 }, { key: "b", at: 70 * day }], [{ key: "b", at: 80 * day }], 90 * day);
    expect(removed).toEqual([{ key: "b", at: 80 * day }]);
  });

  it("formatCode agrupa de a 4", () => {
    expect(formatCode("ABCDEFGHJKMN")).toBe("ABCD-EFGH-JKMN");
  });
});
