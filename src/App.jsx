import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Live from "./pages/Live";
import { ComingSoon, NotFound } from "./pages/Misc";
import { probe } from "./api/server";
import { ensureDDragon } from "./lib/ddragon";
import { sweepCache } from "./lib/storage";
import "./styles/components.css";
import "./styles/home.css";
import "./styles/profile.css";
import "./styles/live.css";

// Al cambiar de página se vuelve arriba (salvo al ir atrás/adelante, que el navegador restaura)
function ScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => { if (type !== "POP") window.scrollTo(0, 0); }, [pathname, type]);
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
        <Route path="/lol/:region/:riotId" element={<Profile />} />
        <Route path="/lol/:region/:riotId/en-vivo" element={<Live />} />
        <Route path="/juegos" element={<ComingSoon />} />
        <Route path="/juegos/:game" element={<ComingSoon />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
