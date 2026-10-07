// Hero animado de cada juego (ver pages/home/HeroShowcase.jsx). Cada uno usa SOLO 2 personajes de su juego, centrados
// como pareja delante de la palabra, y ninguno repite a los de los pósters. El arte sale de scripts/hero-art.py
// (fuentes y permisos en ese archivo).
//
// word: palabra del logotipo · palette: colores del degradado (el último = el primero, para que el bucle no salte)
// pair: [izquierda, derecha]. h = alto en % del contenedor, gap = separación del centro en %, lift = cuánto se eleva
// del piso, dur = ritmo, delay = desfase, flip = mirar al otro lado, float = flota en vez de bailar.
// Los juegos sin arte con permiso (Dota 2, Fortnite, Apex, PUBG) tienen solo la palabra.

// Efecto de las letras: "foil" (relieve 3D holográfico) o "mosaic" (mosaicos de colores)
export const WORDMARK_EFFECT = "foil";

export const HEROES = {
  lol: {
    word: "KAIRO",
    palette: ["#35E0A1", "#0BC4E3", "#A855F7", "#7FB0FF", "#35E0A1"],
    pair: [
      { src: "hero/lol/zoe.webp", h: 66, gap: 1, lift: 6, dur: 4.2, delay: 0, float: true },
      { src: "hero/lol/seraphine.webp", h: 74, gap: 3, dur: 3, delay: -0.8, flip: true },
    ],
  },
  tft: {
    word: "TFT",
    palette: ["#0BC4E3", "#A855F7", "#F9C74F", "#0BC4E3"],
    pair: [
      { src: "hero/tft/poro.webp", h: 52, gap: 2, dur: 2.4, delay: -0.4 },
      { src: "hero/tft/chibijinx.webp", h: 66, gap: 1, dur: 2.7, delay: -1.3, flip: true },
    ],
  },
  brawlstars: {
    word: "BRAWL",
    palette: ["#FFCE1F", "#FF5DA2", "#3F8CFF", "#FFCE1F"],
    pair: [
      { src: "hero/brawlstars/shelly.webp", h: 64, gap: 2, dur: 2.6, delay: -0.6 },
      { src: "hero/brawlstars/poco.webp", h: 68, gap: 1, dur: 2.2, delay: 0, flip: true },
    ],
  },
  clashroyale: {
    word: "ROYALE",
    palette: ["#3F8CFF", "#FFCE1F", "#E23E57", "#3F8CFF"],
    pair: [
      { src: "hero/clashroyale/musketeer.webp", h: 62, gap: 1, dur: 2.8, delay: -0.7 },
      { src: "hero/clashroyale/archer.webp", h: 68, gap: 2, dur: 2.5, delay: -1.3, flip: true },
    ],
  },
  clashofclans: {
    word: "CLANS",
    palette: ["#79C942", "#FFCE1F", "#F5A623", "#79C942"],
    pair: [
      { src: "hero/clashofclans/wizard.webp", h: 62, gap: 2, dur: 2.7, delay: -0.5 },
      { src: "hero/clashofclans/archerqueen.webp", h: 68, gap: 1, dur: 2.9, delay: -1.6, flip: true },
    ],
  },
  dota2: { word: "DOTA 2", palette: ["#E4572E", "#B8231B", "#F5A623", "#E4572E"], pair: [] },
  fortnite: { word: "FORTNITE", palette: ["#A855F7", "#3F8CFF", "#FF5DA2", "#A855F7"], pair: [] },
  apex: { word: "APEX", palette: ["#E23E57", "#F5A623", "#FFD1D8", "#E23E57"], pair: [] },
  pubg: { word: "PUBG", palette: ["#F5A623", "#FFD27A", "#C77A2E", "#F5A623"], pair: [] },
};
