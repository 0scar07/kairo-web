import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Live from "./pages/Live";
import Favorites from "./pages/Favorites";
import GamePage from "./pages/GamePage";
import GameProfile from "./pages/GameProfile";
import Match from "./pages/Match";
import Compare from "./pages/Compare";
import Ladder from "./pages/Ladder";
import Multi from "./pages/Multi";
import GameCompare from "./pages/GameCompare";
import Club from "./pages/Club";
import { BrawlerList, BrawlerPage } from "./pages/Brawlers";
import DotaMatch from "./pages/DotaMatch";
import { ChampionList, ChampionPage } from "./pages/Champions";
import { ComingSoon, NotFound } from "./pages/Misc";
import { probe } from "./api/server";
import { ensureDDragon } from "./lib/ddragon";
import { sweepCache } from "./lib/storage";
import "./styles/components.css";
import "./styles/home.css";
import "./styles/profile.css";
import "./styles/live.css";
import "./styles/games.css";
import "./styles/match.css";
import "./styles/compare.css";
import "./styles/champions.css";
import "./styles/extras.css";

// Al cambiar de página se vuelve arriba (salvo al ir atrás/adelante, que el navegador restaura)
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (hash) {
      // La sección puede tardar un cuadro en existir (la página se acaba de montar)
      const id = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
      return () => cancelAnimationFrame(id);
    }
    if (type !== "POP") window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash, type]);
  return null;
}

export default function App() {
  useEffect(() => {
    probe();          // si el servidor está dormido, avisa enseguida
    ensureDDragon();
    sweepCache();
  }, []);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lol/partida/:matchId" element={<Match />} />
        <Route path="/lol/comparar" element={<Compare />} />
        <Route path="/lol/clasificacion" element={<Ladder />} />
        <Route path="/lol/multi" element={<Multi />} />
        <Route path="/lol/campeones" element={<ChampionList />} />
        <Route path="/lol/campeones/:key" element={<ChampionPage />} />
        <Route path="/lol/:region/:riotId" element={<Profile />} />
        <Route path="/lol/:region/:riotId/en-vivo" element={<Live />} />
        <Route path="/favoritos" element={<Favorites />} />
        <Route path="/juegos" element={<ComingSoon />} />
        <Route path="/juegos/:game" element={<GamePage />} />
        <Route path="/juegos/:game/jugador/:id" element={<GameProfile />} />
        <Route path="/juegos/:game/club/:tag" element={<Club />} />
        <Route path="/juegos/:game/comparar" element={<GameCompare />} />
        <Route path="/juegos/brawlstars/brawlers" element={<BrawlerList />} />
        <Route path="/juegos/brawlstars/brawlers/:id" element={<BrawlerPage />} />
        <Route path="/juegos/dota2/partida/:id" element={<DotaMatch />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
