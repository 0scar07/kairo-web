// Vista previa de los enlaces (WhatsApp, Discord, X…): GitHub Pages no ejecuta código, así que al construir se crea una
// copia de index.html por cada página conocida (campeones, juegos y páginas fijas) con su título, descripción e imagen.
// Cada una va en ruta/index.html (no ruta.html: lol/campeones también es carpeta de los campeones); GitHub Pages la
// sirve y la SPA arranca igual que siempre. Los perfiles de jugadores (infinitos)
// usan la vista previa general de index.html.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DD = "https://ddragon.leagueoflegends.com";
const GAMES = [
  ["lol", "League of Legends"], ["tft", "TFT"], ["brawlstars", "Brawl Stars"], ["clashroyale", "Clash Royale"],
  ["clashofclans", "Clash of Clans"], ["dota2", "Dota 2"], ["fortnite", "Fortnite"], ["apex", "Apex Legends"], ["pubg", "PUBG"],
];

const escape = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Cambia título, descripción e imagen de la página (las etiquetas existen en index.html) */
export function withMeta(html, { title, description, image, url }) {
  const t = escape(title), d = escape(description), i = escape(image), u = escape(url);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${d}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${t}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${d}"`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${i}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${u}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${t}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${d}"`)
    .replace(/(<meta name="twitter:image" content=")[^"]*"/, `$1${i}"`);
}

async function champions() {
  try {
    const [version] = await (await fetch(`${DD}/api/versions.json`)).json();
    const json = await (await fetch(`${DD}/cdn/${version}/data/es_MX/champion.json`)).json();
    return Object.values(json.data).map(c => ({ id: c.id, name: c.name, title: c.title }));
  } catch (e) {
    console.warn(`prerender: sin lista de campeones (${e.message}); solo páginas fijas`);
    return [];
  }
}

/** Escribe dist/<ruta>/index.html para cada página; devuelve cuántas */
export async function prerender({ dist, site }) {
  const template = readFileSync(resolve(dist, "index.html"), "utf8");
  const image = `${site}og.jpg`;
  const base = {
    title: "Kairo · Estadísticas de tus juegos",
    description: "Busca cualquier jugador de League of Legends, Brawl Stars, Clash Royale, Clash of Clans o Dota 2 y mira su rango, su historial y su partida en vivo.",
    image,
    url: site,
  };
  // La portada y el respaldo de rutas (404.html) con la vista previa general y la imagen con dirección completa
  writeFileSync(resolve(dist, "index.html"), withMeta(template, base));
  writeFileSync(resolve(dist, "404.html"), withMeta(template, base));

  const pages = [
    ["lol/campeones", "Campeones de League of Legends · Kairo", "Los campeones de LoL con sus habilidades, aspectos, historia y la build de los Challenger."],
    ["lol/clasificacion", "Clasificación de LoL · Kairo", "Los mejores jugadores Challenger, Gran Maestro y Maestro de LAN, LAS, NA, EUW, KR y BR."],
    ["lol/multi", "Multi-búsqueda · Kairo", "Pega el chat del lobby y mira a todos tus compañeros de una vez: rango, forma reciente y campeones."],
    ["lol/comparar", "Comparar jugadores · Kairo", "Dos jugadores de LoL cara a cara: rango, KDA, roles, campeones en común y si se han cruzado."],
    ["favoritos", "Favoritos · Kairo", "Tus jugadores favoritos y quién está jugando ahora."],
    ["juegos", "Juegos · Kairo", "Estadísticas de 9 juegos en un solo lugar."],
    ["juegos/brawlstars/brawlers", "Brawlers de Brawl Stars · Kairo", "Todos los brawlers con sus gadgets, habilidades estelares y los mejores jugadores con cada uno."],
    ["juegos/dota2/heroes", "Héroes de Dota 2 · Kairo", "Winrate y partidas de cada héroe de Dota 2 por medalla."],
    ...GAMES.map(([id, name]) => [`juegos/${id}`, `${name} · Kairo`, `Busca a cualquier jugador de ${name} y mira su perfil y sus estadísticas en Kairo.`]),
  ].map(([path, title, description]) => ({ path, title, description, image }));

  for (const c of await champions()) {
    pages.push({
      path: `lol/campeones/${c.id}`,
      title: `${c.name}, ${c.title} · Kairo`,
      description: `Habilidades, aspectos, historia y la build de los Challenger de ${c.name} en Kairo.`,
      image: `${DD}/cdn/img/champion/splash/${c.id}_0.jpg`,
    });
  }

  for (const p of pages) {
    const file = resolve(dist, p.path, "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, withMeta(template, { ...p, url: `${site}${p.path}` }));
  }
  return pages.length;
}
