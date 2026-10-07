import { describe, expect, it } from "vitest";
import { liveTags } from "./liveTags";

const insight = (points, position, totalPoints) => ({ champion: points == null ? null : { level: 7, points }, position, totalPoints, top: [], championsPlayed: 30 });
const keys = tags => tags.map(t => t.key);

describe("etiquetas de la partida en vivo", () => {
  it("primera vez, OTP, main, top 3 y poca experiencia según la maestría", () => {
    expect(keys(liveTags(insight(null, null, 500_000), null, "Jinx"))).toEqual(["first"]);
    expect(liveTags(insight(null, null, 1), null, "Jinx")[0].label).toBe("Primera vez con Jinx");
    expect(keys(liveTags(insight(400_000, 1, 800_000), null, "Jinx"))).toEqual(["otp"]);
    expect(keys(liveTags(insight(200_000, 1, 2_000_000), null, "Jinx"))).toEqual(["main"]);
    expect(keys(liveTags(insight(90_000, 2, 2_000_000), null, "Jinx"))).toEqual(["top3"]);
    expect(keys(liveTags(insight(4_000, 40, 2_000_000), null, "Jinx"))).toEqual(["few"]);
    expect(keys(liveTags(insight(30_000, 12, 2_000_000), null, "Jinx"))).toEqual([]);   // nada destacable
  });

  it("suma 1 M de maestría y las marcas del rango, sin pasar de 3", () => {
    const tags = liveTags(insight(1_200_000, 1, 2_000_000), { wins: 70, losses: 30, hotStreak: true, veteran: true }, "Yasuo");
    expect(keys(tags)).toEqual(["otp", "million", "streak"]);
    expect(tags[1].label).toBe("1.2 M de maestría");
  });

  it("winrate alto o bajo solo con suficientes partidas", () => {
    expect(keys(liveTags(null, { wins: 30, losses: 10 }, "X"))).toEqual(["wr-high"]);
    expect(keys(liveTags(null, { wins: 15, losses: 25 }, "X"))).toEqual(["wr-low"]);
    expect(keys(liveTags(null, { wins: 9, losses: 1 }, "X"))).toEqual(["new"]);
    expect(liveTags(null, null, "X")).toEqual([]);
  });
});
