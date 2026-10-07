// Etiquetas de cada jugador en la partida en vivo (estilo porofessor), a partir de su maestría con el campeón que juega
// (backend: /lol/live/:puuid/insights) y de su rango Solo/Dúo (marcas de Riot: hotStreak, veteran, freshBlood).
// Solo datos reales: si algo no se sabe, esa etiqueta no aparece.

const MAX_TAGS = 3;
const fmt = n => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".0", "")} M` : `${Math.round(n / 1000)} mil`);

/**
 * insight: { champion: { level, points } | null, position, top, totalPoints, championsPlayed } | null
 * ranked:  { wins, losses, hotStreak, veteran, freshBlood } | null
 * champName: nombre del campeón que juega
 * Devuelve [{ key, label, tone, title }] ordenadas por importancia (máx. 3). tone: gold | brand | red | blue | muted
 */
export function liveTags(insight, ranked, champName) {
  const tags = [];
  if (insight) {
    const c = insight.champion;
    const share = c && insight.totalPoints > 0 ? c.points / insight.totalPoints : 0;
    if (!c) {
      tags.push({ key: "first", label: `Primera vez con ${champName}`, tone: "red", title: "No tiene puntos de maestría con este campeón" });
    } else if (insight.position === 1 && share >= 0.4 && c.points >= 100_000) {
      tags.push({ key: "otp", label: "OTP", tone: "gold", title: `${champName} tiene el ${Math.round(share * 100)}% de toda su maestría (${fmt(c.points)} puntos)` });
    } else if (insight.position === 1) {
      tags.push({ key: "main", label: `Main de ${champName}`, tone: "gold", title: `Su campeón con más maestría (${fmt(c.points)} puntos)` });
    } else if (insight.position <= 3 && c.points >= 50_000) {
      tags.push({ key: "top3", label: `Top ${insight.position} de maestría`, tone: "brand", title: `${fmt(c.points)} puntos con ${champName}` });
    } else if (c.points < 10_000) {
      tags.push({ key: "few", label: `Poca experiencia con ${champName}`, tone: "red", title: `Solo ${c.points.toLocaleString("es")} puntos de maestría` });
    }
    if (c && c.points >= 1_000_000) tags.push({ key: "million", label: `${fmt(c.points)} de maestría`, tone: "gold", title: `${c.points.toLocaleString("es")} puntos con ${champName}` });
  }
  if (ranked) {
    const games = (ranked.wins || 0) + (ranked.losses || 0);
    const wr = games ? Math.round((ranked.wins / games) * 100) : null;
    if (ranked.hotStreak) tags.push({ key: "streak", label: "En racha", tone: "brand", title: "3 o más victorias seguidas en Solo/Dúo" });
    if (wr !== null && games >= 40 && wr >= 60) tags.push({ key: "wr-high", label: `${wr}% de victorias`, tone: "brand", title: `En ${games} partidas de Solo/Dúo esta temporada` });
    if (wr !== null && games >= 40 && wr <= 44) tags.push({ key: "wr-low", label: `${wr}% de victorias`, tone: "red", title: `En ${games} partidas de Solo/Dúo esta temporada` });
    if (ranked.freshBlood) tags.push({ key: "fresh", label: "Recién llegado a su liga", tone: "blue", title: "Subió hace poco a esta liga" });
    if (ranked.veteran) tags.push({ key: "veteran", label: "Veterano", tone: "muted", title: "100 o más partidas en su división" });
    if (games > 0 && games < 15) tags.push({ key: "new", label: "Pocas partidas de clasificatoria", tone: "muted", title: `${games} partidas de Solo/Dúo esta temporada` });
  }
  return tags.slice(0, MAX_TAGS);
}
