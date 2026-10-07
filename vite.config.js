import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prerender } from "./scripts/prerender.js";

// Ruta base de la web. GitHub Pages la sirve en https://0scar07.github.io/kairo-web/.
// En Cloudflare (Workers Builds pone WORKERS_CI y Pages pone CF_PAGES) va en la raíz; BASE_PATH lo fuerza a mano.
const onCloudflare = Boolean(process.env.WORKERS_CI || process.env.CF_PAGES);
const base = process.env.BASE_PATH || (onCloudflare ? "/" : "/kairo-web/");

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

// Dirección pública (para las imágenes de la vista previa de enlaces): SITE_URL, o la de Cloudflare o GitHub Pages
const site = (process.env.SITE_URL || (onCloudflare ? "https://kairo-web.osky7470.workers.dev/" : `https://0scar07.github.io${base}`)).replace(/\/?$/, "/");

// Vista previa de enlaces: una copia de index.html por página conocida con su título e imagen (scripts/prerender.js)
const linkPreviews = () => ({
  name: "link-previews",
  apply: "build",
  async closeBundle() {
    const n = await prerender({ dist: resolve(__dirname, "dist"), site });
    console.log(`vista previa de enlaces: ${n} páginas`);
  },
});

export default defineConfig({
  base,
  plugins: [react(), githubPagesFallback(), linkPreviews()],
  server: { port: 5173 },
});
