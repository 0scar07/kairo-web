// Juegos (además de LoL) que ya tienen búsqueda y perfil en la web: cómo se busca, cómo se carga un jugador y qué
// muestra la cabecera. El cuerpo del perfil está en cada módulo (SupercellProfiles.jsx, …).
import { BrawlStarsBody, ClashOfClansBody, ClashRoyaleBody } from "./SupercellProfiles";
import { bsProfileIcon, cleanName, getBattles, getPlayer, isTag, tagOf } from "./supercell";

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
};

export const hasProfiles = game => Boolean(PROFILES[game]);
export const gameProfilePath = (game, id) => `/juegos/${game}/jugador/${encodeURIComponent(id)}`;
