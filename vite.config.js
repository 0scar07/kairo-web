import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Ruta base de la web. GitHub Pages la sirve en https://0scar07.github.io/kairo-web/.
// Para un dominio en la raíz (p. ej. Cloudflare Pages) se construye con BASE_PATH=/
const base = process.env.BASE_PATH || "/kairo-web/";

// GitHub Pages no tiene reescrituras de rutas: si se recarga /kairo-web/lol/..., sirve 404.html.
// Como 404.html es una copia de index.html, la SPA arranca y React Router muestra la página pedida.
// .nojekyll evita que Pages procese el sitio con Jekyll.
const githubPagesFallback = () => ({
  name: "github-pages-fallback",
  apply: "build",
  closeBundle() {
    const dist = resolve(__dirname, "dist");
    copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    writeFileSync(resolve(dist, ".nojekyll"), "");
  },
});

export default defineConfig({
  base,
  plugins: [react(), githubPagesFallback()],
  server: { port: 5173 },
});
