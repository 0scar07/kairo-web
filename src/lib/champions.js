// Páginas de campeón: nombres de roles en español, limpieza de los textos de Data Dragon y rutas.

export const CHAMPION_ROLES = [
  { key: "Fighter", label: "Luchador" },
  { key: "Tank", label: "Tanque" },
  { key: "Mage", label: "Mago" },
  { key: "Assassin", label: "Asesino" },
  { key: "Marksman", label: "Tirador" },
  { key: "Support", label: "Soporte" },
];
const ROLE_ES = Object.fromEntries(CHAMPION_ROLES.map(r => [r.key, r.label]));
export const roleLabel = tag => ROLE_ES[tag] || tag;

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };

/**
 * Las descripciones de Data Dragon traen etiquetas propias (<magicDamage>, <status>, <br>…). Se quitan todas y los
 * saltos de línea separan párrafos: devuelve una lista de párrafos de texto plano.
 */
export function cleanText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(li|p)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m] ?? m)
    .split(/\n+/)
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** "8/7/6/5/4" -> "8 / 7 / 6 / 5 / 4"; si todos los rangos valen lo mismo, un solo número */
export function burnText(burn) {
  const parts = String(burn || "").split("/").filter(Boolean);
  if (!parts.length || parts.every(p => p === "0")) return "";
  return new Set(parts).size === 1 ? parts[0] : parts.join(" / ");
}

/** Ruta de la página de un campeón; `player` = clave "region/Nombre-TAG" para ver sus estadísticas con él */
export const championPath = (key, player) =>
  `/lol/campeones/${encodeURIComponent(key)}${player ? `?jugador=${encodeURIComponent(player)}` : ""}`;

/** Lista filtrada por texto (nombre o título, sin tildes) y por rol */
export function filterChampions(list, query, role) {
  const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = fold(query).trim();
  return list.filter(c => (!role || c.tags.includes(role)) && (!q || fold(c.name).includes(q) || fold(c.title).includes(q)));
}
