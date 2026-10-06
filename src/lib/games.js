// Los 9 juegos de Kairo. En esta versión de la web solo League of Legends está disponible.
export const GAMES = [
  { id: "lol", name: "League of Legends", short: "LoL", color: "var(--game-lol)", available: true },
  { id: "tft", name: "TFT", short: "TFT", color: "var(--game-tft)" },
  { id: "brawlstars", name: "Brawl Stars", short: "BS", color: "var(--game-brawlstars)" },
  { id: "clashroyale", name: "Clash Royale", short: "CR", color: "var(--game-clashroyale)" },
  { id: "clashofclans", name: "Clash of Clans", short: "CoC", color: "var(--game-clashofclans)" },
  { id: "dota2", name: "Dota 2", short: "D2", color: "var(--game-dota2)" },
  { id: "fortnite", name: "Fortnite", short: "FN", color: "var(--game-fortnite)" },
  { id: "apex", name: "Apex Legends", short: "APX", color: "var(--game-apex)" },
  { id: "pubg", name: "PUBG", short: "PUBG", color: "var(--game-pubg)" },
];

export const gameById = id => GAMES.find(g => g.id === id) || null;
export const gamePath = game => (game.available ? "/" : `/juegos/${game.id}`);

// Juegos visibles en el menú superior (el resto va en "Más juegos")
export const NAV_GAMES = ["lol", "tft", "brawlstars", "clashroyale", "dota2"].map(gameById);
