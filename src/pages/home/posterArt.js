// Arte de los pósters de la portada. Solo se usa arte con permiso explícito para proyectos de fans:
//   - League of Legends: splash de Lux de Data Dragon (política «Legal Jibber Jabber» de Riot). El personaje sin fondo
//     se generó con rembg (scripts/poster-art.py) y está en public/games/.
//   - El resto de juegos, mientras no haya una fuente permitida, usa el fondo gráfico propio (color del juego y su
//     logo), sin personaje.
// charHeight: alto de la capa del personaje en % del alto de la tarjeta (más de 100 = sobresale por arriba) y
// charLeft/charRight: margen lateral del recorte en % del ancho. Salen del
// mismo script, así el personaje encaja exacto con el fondo.
export const POSTER_ART = {
  lol: { bg: "lol-bg.webp", char: "lol-char.webp", charHeight: 128.3, charLeft: 14.2, charRight: 14.2 },
};
