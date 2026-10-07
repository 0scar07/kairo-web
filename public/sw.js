// Service worker de Kairo Web: permite instalar la web y abrirla sin conexión.
//   - Páginas: primero la red; sin conexión, la última copia de la app (index.html).
//   - Archivos de la app (/assets/*, con hash en el nombre): de la caché, porque nunca cambian.
//   - Imágenes de Data Dragon y de los CDN de los juegos: de la caché mientras se actualizan por detrás.
//   - Datos del backend: NO pasan por aquí; la web guarda lo último en localStorage (src/api/client.js).
const VERSION = "kairo-v2";
const SHELL = `${VERSION}-shell`;
const IMAGES = `${VERSION}-img`;
const MAX_IMAGES = 300;
const SCOPE = new URL(self.registration.scope);
const INDEX = new URL("./", SCOPE).href;

const IMAGE_HOSTS = [
  "ddragon.leagueoflegends.com",
  "cdn.brawlify.com",
  "cdn.cloudflare.steamstatic.com",
  "www.opendota.com",
  "api-assets.clashroyale.com",
  "api-assets.clashofclans.com",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll([INDEX, new URL("manifest.webmanifest", SCOPE).href])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Deja la caché de imágenes en MAX_IMAGES (borra las más viejas)
async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await cache.delete(k);
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Navegación (abrir o recargar una página de la web)
  if (request.mode === "navigate" && url.href.startsWith(SCOPE.href)) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(SHELL).then(c => c.put(INDEX, res.clone()));
          return res;
        })
        .catch(() => caches.match(INDEX)),
    );
    return;
  }

  // Archivos de la app con hash: caché primero
  if (url.origin === SCOPE.origin && url.pathname.startsWith(`${SCOPE.pathname}assets/`)) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(request, copy)); }
        return res;
      })),
    );
    return;
  }

  // Imágenes y fuentes de los CDN (y las de public/): la copia guardada al instante, actualizada por detrás
  const isPublicAsset = url.origin === SCOPE.origin && /\.(png|webp|jpg|svg|woff2?)$/.test(url.pathname);
  if (IMAGE_HOSTS.includes(url.hostname) || isPublicAsset) {
    event.respondWith(
      caches.open(IMAGES).then(async cache => {
        const hit = await cache.match(request);
        const network = fetch(request).then(res => {
          // Las respuestas "opaque" (sin CORS) también se guardan: son imágenes
          if (res.ok || res.type === "opaque") cache.put(request, res.clone()).then(() => trim(cache));
          return res;
        }).catch(() => hit);
        return hit || network;
      }),
    );
  }
});

// ─── Avisos en el navegador (Web Push, ver src/lib/webPush.js) ────────────
// El servidor manda { title, body, url (relativa a la web), tag }
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || "Kairo", {
    body: data.body || "",
    icon: new URL("pwa/icon-192.png", SCOPE).href,
    badge: new URL("favicon-32.png", SCOPE).href,
    tag: data.tag || "kairo",
    data: { url: new URL(data.url || "", SCOPE).href },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || SCOPE.href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const tab = tabs.find(t => t.url.startsWith(SCOPE.href));
    if (tab) { await tab.focus(); return tab.navigate(url).catch(() => self.clients.openWindow(url)); }
    return self.clients.openWindow(url);
  })());
});
