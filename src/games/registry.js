// Juegos (además de LoL) que ya tienen búsqueda y perfil en la web: cómo se busca, cómo se carga un jugador y qué
// muestra la cabecera. El cuerpo del perfil está en cada módulo (SupercellProfiles.jsx, …).
import { BrawlStarsBody, ClashOfClansBody, ClashRoyaleBody } from "./SupercellProfiles";
import { bsProfileIcon, cleanName, getBattles, getPlayer, isTag, tagOf } from "./supercell";
import { Dota2Body } from "./Dota2Profile";
import * as dota from "./dota2";

// Club (Brawl Stars) o clan (Clash Royale, Clash of Clans) del jugador, para el botón de su página
const clubOf = (game, p) => {
  const c = game === "brawlstars" ? p.club : p.clan;
  return c?.tag ? { tag: c.tag, label: game === "brawlstars" ? "Ver club" : "Ver clan" } : null;
};

const supercell = (game, { battles, avatar, subtitle }) => ({
  // La búsqueda es por #TAG
  parse: text => (isTag(text) ? tagOf(text) : null),
  invalidHint: "Escribe el #TAG del jugador (lo ves en su perfil dentro del juego), por ejemplo #2PP0.",
  load: async (id, force) => {
    const [player, list] = await Promise.all([
      getPlayer(game, id, force),
      battles ? getBattles(game, id, force).catch(() => []) : Promise.resolve([]),
    ]);
    return { player, battles: list };
  },
  header: data => ({
    name: data.player.name,
    tag: `#${tagOf(data.player.tag)}`,
    avatar: avatar?.(data.player) || null,
    subtitle: subtitle(data.player),
    club: clubOf(game, data.player),
  }),
});

export const PROFILES = {
  brawlstars: {
    ...supercell("brawlstars", {
      battles: true,
      avatar: p => (p.icon?.id ? bsProfileIcon(p.icon.id) : null),
      subtitle: p => (p.club?.name ? `Club ${cleanName(p.club.name)}` : "Sin club"),
    }),
    Body: BrawlStarsBody,
  },
  clashroyale: {
    ...supercell("clashroyale", {
      battles: true,
      avatar: p => p.currentFavouriteCard?.iconUrls?.medium || null,
      subtitle: p => (p.clan?.name ? `Clan ${cleanName(p.clan.name)}` : "Sin clan"),
    }),
    Body: ClashRoyaleBody,
  },
  clashofclans: {
    ...supercell("clashofclans", {
      battles: false,
      avatar: p => p.league?.iconUrls?.medium || null,
      subtitle: p => [p.league?.name, p.clan?.name ? `Clan ${cleanName(p.clan.name)}` : "Sin clan"].filter(Boolean).join(" · "),
    }),
    Body: ClashOfClansBody,
  },
  dota2: {
    // Por ID de cuenta o Steam64; si se escribe un nombre, se busca y se elige de una lista (los nombres se repiten)
    parse: text => (dota.isAccountId(text) ? String(text).trim() : null),
    search: async text => (await dota.searchPlayers(String(text).trim())).map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, sub: p.lastMatch ? `Última partida: ${new Date(p.lastMatch).toLocaleDateString("es")}` : `ID ${p.id}`,
    })),
    invalidHint: "Escribe al menos 2 letras del nombre de Steam o el ID de la cuenta.",
    load: async (id, force) => {
      const [player, heroes] = await Promise.all([dota.getPlayer(id, force), dota.getHeroes().catch(() => ({}))]);
      return { player, heroes };
    },
    header: data => ({
      name: data.player.profile.name,
      tag: `ID ${data.player.id}`,
      avatar: data.player.profile.avatar,
      subtitle: dota.rankLabel(data.player.rankTier, data.player.leaderboardRank),
    }),
    Body: Dota2Body,
  },
};

export const hasProfiles = game => Boolean(PROFILES[game]);
export const gameProfilePath = (game, id) => `/juegos/${game}/jugador/${encodeURIComponent(id)}`;
