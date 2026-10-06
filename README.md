# Kairo Web

**Web publicada: <https://0scar07.github.io/kairo-web/>**

Versión web de [Kairo](https://github.com/0scar07/Kairo): busca jugadores de **League of Legends** y mira su rango, su historial y su partida en vivo, estilo op.gg / porofessor.gg.

Los demás juegos de Kairo (TFT, Brawl Stars, Clash Royale, Clash of Clans, Dota 2, Fortnite, Apex Legends y PUBG) aparecen como "Próximamente".

- React 18 + Vite 5 + React Router 6. CSS propio con los tokens del diseño (`src/styles/tokens.css`), sin librerías de UI.
- **Solo habla con el backend de Kairo** (`VITE_API_URL`). Nunca llama a Riot ni lleva API keys. Las imágenes de campeones, objetos, hechizos y runas salen de Data Dragon (CDN público de Riot).

## Páginas

| Ruta | Qué muestra |
|---|---|
| `/` | Buscador con región, chips de juegos, favoritos en partida, clasificación Challenger y búsquedas recientes |
| `/lol/:region/:Nombre-TAG` | Perfil: rango Solo/Duo y Flex, LP de 30 días, campeones, historial con filtros, detalle de partidas. Pestañas `?tab=campeones` y `?tab=maestria` |
| `/lol/:region/:Nombre-TAG/en-vivo` | Partida en curso: cola, mapa, cronómetro, bloqueos y los dos equipos con rango y winrate |
| `/juegos`, `/juegos/:juego` | Juegos que todavía no están en la web |

Regiones en la URL: `lan`, `las`, `na`, `euw`, `kr`, `br`. El Riot ID va como `Nombre-TAG` (se corta por el último guion), por ejemplo <https://0scar07.github.io/kairo-web/lol/kr/Hide%20on%20bush-KR1>. Los enlaces se pueden compartir y cargan directo.

Las rutas de la tabla son relativas a la base `/kairo-web/` (ver *Despliegue*).

## Correr en local

Requisitos: Node 18 o más nuevo.

```bash
npm install
cp .env.example .env     # y ajusta VITE_API_URL
npm run dev              # http://localhost:5173/kairo-web/
```

**Contra el backend local** (repo de Kairo, carpeta `server/`, con su propio `.env` con `RIOT_API_KEY`):

```bash
# terminal 1, en el repo de Kairo
cd server && npm install && npm start     # http://localhost:3000

# terminal 2, aquí
# .env -> VITE_API_URL=http://localhost:3000
npm run dev
```

**Contra el backend de producción**: `VITE_API_URL=https://kairo-api-nqts.onrender.com`. Para eso, el CORS del backend debe aceptar `http://localhost:5173` (si `CORS_ORIGINS` está vacío, acepta cualquier origen).

Si cambias `.env`, reinicia `npm run dev`: Vite lee las variables al arrancar.

## Comportamiento

- **Caché en el navegador**: cuenta 10 min, invocador y rango 3 min, IDs de partidas 2 min, historial de LP y maestría 10 min, clasificación 10 min. Las partidas terminadas se guardan 7 días, compactadas (unos 3 KB cada una) en `localStorage`. La partida en vivo solo se guarda 20 s, en memoria. **Actualizar** ignora la caché.
- **Servidor dormido** (Render gratis): si `/health` no contesta en unos segundos, aparece "Despertando el servidor…", se espera hasta 90 s y se reintenta la consulta.
- **Filtros de cola**: se manda `?queue=420|440|450` a `/lol/matches` y además se filtra en local por `queueId`. Mientras el backend no soporte el parámetro, el filtro funciona sobre las partidas cargadas.
- **Clasificación**: se pide `/lol/leaderboard`. Si responde `ROUTE_NOT_FOUND`, se muestra "Disponible pronto". Forma esperada: `[{ puuid, gameName, tagLine, leaguePoints, wins, losses }]`.
- **Favoritos y recientes**: en `localStorage` de este navegador, sin cuenta. Los favoritos en partida se revisan cada minuto con `/lol/live` (máximo 6).
- **Campeones**: calculados con las partidas cargadas ("últimas N partidas"). Riot no ofrece estadísticas por temporada.

## Despliegue

### GitHub Pages (actual)

Cada push a `main` ejecuta [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): `npm ci`, `npm run build` con `VITE_API_URL=https://kairo-api-nqts.onrender.com` y publicación de `dist/` con `actions/deploy-pages`. En *Settings → Pages* la fuente es **GitHub Actions**.

- La web vive en `/kairo-web/`: `base` en `vite.config.js` (el `basename` de React Router se toma de ahí) y los assets de `public/` usan `import.meta.env.BASE_URL`.
- GitHub Pages no reescribe rutas. Por eso el build copia `index.html` a `404.html`: al recargar un perfil o abrir un link directo, Pages sirve esa copia, la SPA arranca y muestra la página pedida. El build también crea `.nojekyll`.
- El backend debe aceptar el origen `https://0scar07.github.io` en CORS. Es el mismo origen que la PWA de la app.

### Cloudflare Pages (alternativa)

1. *Workers & Pages → Create → Pages → Connect to Git* y elige este repo.
2. Build command `npm run build`, output directory `dist`.
3. Variables de entorno: `VITE_API_URL=https://kairo-api-nqts.onrender.com` y **`BASE_PATH=/`** (la web queda en la raíz del dominio en vez de `/kairo-web/`).
4. Las rutas SPA funcionan al recargar gracias a `public/_redirects` (`/* /index.html 200`). En GitHub Pages ese archivo se ignora.
5. Agrega el dominio de Pages a `CORS_ORIGINS` del backend.

## Estructura

```
src/
  api/        client.js (fetch, caché, errores, servidor dormido) · server.js (/health) · lol.js (endpoints)
  lib/        ddragon.js · lol.js (colas, rangos, KDA, compactMatch) · regions.js · library.js (favoritos/recientes)
              storage.js · hooks.js · games.js · config.js
  components/ Layout (header, footer, aviso del servidor) · SearchForm · Icon (SVG) · ui (imágenes, emblemas, estados)
  pages/      Home · Profile (+ profile/) · Live · Misc (próximamente, 404)
  styles/     tokens · global · components · home · profile · live
public/       ranks/ (emblemas oficiales, los mismos de la app) · favicon.svg · _redirects
```

---

Kairo no está respaldada por Riot Games, Supercell, Valve, Epic Games, Electronic Arts ni KRAFTON. Todas las marcas pertenecen a sus dueños.
