import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Los estilos base van antes que App: los de cada página (importados en App) deben poder sobrescribirlos
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";

// Misma base que vite.config.js ("/kairo-web/" en GitHub Pages, "/" en la raíz de un dominio)
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
