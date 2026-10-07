// Clash of Clans: progreso de héroes, equipo, tropas, hechizos, máquinas de asedio y mascotas contra su nivel máximo.
// La API trae todo mezclado en `troops`: las máquinas de asedio y las mascotas se separan por nombre, y las supertropas
// se omiten (son mejoras temporales de una tropa normal y siempre figuran en nivel 1).

const SIEGE = new Set(["Wall Wrecker", "Battle Blimp", "Stone Slammer", "Siege Barracks", "Log Launcher", "Flame Flinger", "Battle Drill", "Troop Launcher"]);
const PETS = new Set(["L.A.S.S.I", "Electro Owl", "Mighty Yak", "Unicorn", "Frosty", "Diggy", "Poison Lizard", "Phoenix", "Spirit Fox", "Angry Jelly", "Sneezy", "Greedy Raven"]);
const SUPER = new Set([
  "Super Barbarian", "Super Archer", "Super Wall Breaker", "Super Giant", "Sneaky Goblin", "Super Miner", "Rocket Balloon",
  "Inferno Dragon", "Super Valkyrie", "Super Witch", "Ice Hound", "Super Bowler", "Super Dragon", "Super Wizard", "Super Minion",
  "Super Hog Rider", "Super Yeti",
]);

const GROUPS = [
  { key: "heroes", label: "Héroes" },
  { key: "equipment", label: "Equipo de héroes" },
  { key: "troops", label: "Tropas" },
  { key: "spells", label: "Hechizos" },
  { key: "siege", label: "Máquinas de asedio" },
  { key: "pets", label: "Mascotas" },
  { key: "builder", label: "Base del constructor" },
];

const item = x => ({ name: x.name, level: x.level || 0, maxLevel: x.maxLevel || x.level || 0 });

/** Grupos con sus elementos, cuántos están al máximo y el % de niveles conseguidos. Omite los grupos vacíos. */
export function cocProgress(player) {
  const troops = player?.troops || [];
  const home = troops.filter(t => t.village === "home" && !SUPER.has(t.name));
  const lists = {
    heroes: (player?.heroes || []).filter(h => h.village === "home"),
    equipment: player?.heroEquipment || [],
    troops: home.filter(t => !SIEGE.has(t.name) && !PETS.has(t.name)),
    spells: player?.spells || [],
    siege: home.filter(t => SIEGE.has(t.name)),
    pets: home.filter(t => PETS.has(t.name)),
    builder: [...troops.filter(t => t.village === "builderBase"), ...(player?.heroes || []).filter(h => h.village === "builderBase")],
  };
  return GROUPS.map(g => {
    const items = lists[g.key].map(item);
    const levels = items.reduce((s, x) => s + x.level, 0);
    const max = items.reduce((s, x) => s + x.maxLevel, 0);
    const done = items.filter(x => x.level >= x.maxLevel).length;
    // 100% solo si todo está al máximo (41 de 42 redondearía a 100)
    const pct = !max ? 0 : done === items.length ? 100 : Math.min(99, Math.round((levels / max) * 100));
    return { ...g, items, done, total: items.length, pct };
  }).filter(g => g.total > 0);
}
