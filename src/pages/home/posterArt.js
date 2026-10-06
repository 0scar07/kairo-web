// Arte de los pósters de la portada. Solo se usa arte con permiso explícito para proyectos de fans:
//   - League of Legends y TFT: Data Dragon de Riot (política «Legal Jibber Jabber»). Lux sale de su splash recortado
//     con rembg (scripts/poster-art.py); Pengu y la arena de TFT, de scripts/poster-cutouts.py.
//   - Brawl Stars, Clash Royale y Clash of Clans: Fan Kit oficial de Supercell (fankit.supercell.com), bajo su Fan
//     Content Policy (el aviso que exige está en el footer). Generados con scripts/poster-cutouts.py.
//   - Fortnite, Apex Legends, Dota 2 y PUBG: sin fuente permitida por ahora; usan el fondo gráfico propio.
//
// Dos formas de colocar al personaje:
//   aligned: el recorte del MISMO splash que el fondo, alineado abajo y a la misma escala (encaja exacto).
//            charHeight = alto en % de la tarjeta (más de 100 = sobresale); charLeft/charRight = margen lateral en %.
//   free:    un render suelto. charWidth = ancho en % de la tarjeta, charBottom = dónde apoya (% desde abajo,
//            negativo = por debajo del borde, tapado por el degradado), charX = desplazamiento horizontal en %.
// Sin `bg`, el póster usa el fondo gráfico propio (color del juego y su logo).
export const POSTER_ART = {
  lol: { bg: "lol-bg.webp", char: "lol-char.webp", mode: "aligned", charHeight: 128.3, charLeft: 14.2, charRight: 14.2 },
  tft: { bg: "tft-bg.webp", char: "tft-char.webp", mode: "free", charWidth: 130, charBottom: 44, charX: 4 },
  brawlstars: { char: "brawlstars-char.webp", mode: "free", charWidth: 88, charBottom: -4, charX: 0 },
  clashroyale: { char: "clashroyale-char.webp", mode: "free", charWidth: 125, charBottom: -12, charX: 0 },
  clashofclans: { char: "clashofclans-char.webp", mode: "free", charWidth: 108, charBottom: -10, charX: 2 },
};
