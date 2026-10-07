// Los 9 juegos de Kairo. En esta versión de la web solo League of Legends tiene búsqueda; los demás tienen su página
// (hero y pósters) y la búsqueda llega pronto. searchHint = cómo se busca a un jugador de ese juego en la app.
export const GAMES = [
  { id: "lol", name: "League of Legends", short: "LoL", color: "var(--game-lol)", available: true },
  { id: "tft", name: "TFT", fullName: "Teamfight Tactics", short: "TFT", color: "var(--game-tft)", hex: "#0BC4E3", searchHint: "Nombre#TAG" },
  { id: "brawlstars", name: "Brawl Stars", short: "BS", color: "var(--game-brawlstars)", hex: "#FFCE1F", searchHint: "#TAG del jugador" },
  { id: "clashroyale", name: "Clash Royale", short: "CR", color: "var(--game-clashroyale)", hex: "#3F8CFF", searchHint: "#TAG del jugador" },
  { id: "clashofclans", name: "Clash of Clans", short: "CoC", color: "var(--game-clashofclans)", hex: "#79C942", searchHint: "#TAG del jugador" },
  { id: "dota2", name: "Dota 2", short: "D2", color: "var(--game-dota2)", hex: "#E4572E", searchHint: "Nombre o ID de Steam" },
  { id: "fortnite", name: "Fortnite", short: "FN", color: "var(--game-fortnite)", hex: "#A855F7", searchHint: "Nombre del jugador" },
  { id: "apex", name: "Apex Legends", short: "APX", color: "var(--game-apex)", hex: "#E23E57", searchHint: "Nombre del jugador" },
  { id: "pubg", name: "PUBG", fullName: "PUBG: Battlegrounds", short: "PUBG", color: "var(--game-pubg)", hex: "#F5A623", searchHint: "Nombre del jugador" },
];

export const gameById = id => GAMES.find(g => g.id === id) || null;
export const gamePath = game => (game.available ? "/" : `/juegos/${game.id}`);

// Juegos visibles en el menú superior (el resto va en "Más juegos")
export const NAV_GAMES = ["lol", "tft", "brawlstars", "clashroyale", "dota2"].map(gameById);
