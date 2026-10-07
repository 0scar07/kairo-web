import { useSyncExternalStore } from "react";
import { API_URL } from "./config";
import { readJSON, writeJSON } from "./storage";
import { getFavorites, subscribeFavorites } from "./library";
import { regionBySlug } from "./regions";

// Avisos en el navegador (Web Push): este navegador se registra en el backend como un dispositivo más (platform "web")
// y el vigilante del servidor le avisa cuando un favorito de LoL entra en partida o termina, aunque la pestaña esté
// cerrada. Necesita el service worker (public/sw.js) y que el servidor tenga claves VAPID.
const STATE_KEY = "kairo:webpush";

let state = readJSON(STATE_KEY, null);   // { deviceId, secret } | null
const listeners = new Set();
const setState = next => { state = next; writeJSON(STATE_KEY, next); listeners.forEach(fn => fn()); };
export const useWebPush = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);

export const webPushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function call(method, path, body, auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state) headers.Authorization = `Device ${state.deviceId}.${state.secret}`;
  const res = await fetch(`${API_URL}/devices${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status, code: data.code });
  return data;
}

// Solo los favoritos de LoL con puuid: es lo que el vigilante sabe revisar
const lolFavorites = () => getFavorites()
  .filter(f => f.puuid && regionBySlug(f.region))
  .map(f => ({ puuid: f.puuid, region: regionBySlug(f.region).id, riotId: `${f.gameName}#${f.tagLine}` }));

const keyBytes = base64 => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  return navigator.serviceWorker.ready;
}

/** Pide permiso, se suscribe y registra este navegador con los favoritos de LoL */
export async function enableWebPush() {
  if (!webPushSupported()) throw new Error("Este navegador no permite avisos");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Hay que permitir las notificaciones para recibir los avisos");
  const { publicKey } = await call("GET", "/webpush-key", null, false);
  const reg = await registration();
  let sub;
  try {
    sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  } catch (e) {
    // "Registration failed - push service error": el navegador no llega a su servicio de avisos (Brave con los avisos
    // de Google apagados, Opera, o una VPN o bloqueador que filtra fcm.googleapis.com)
    if (e.name === "AbortError" || /push service/i.test(e.message)) {
      throw new Error("Tu navegador no pudo conectarse a su servicio de avisos. En Brave, activa «Usar los servicios de Google para mensajes push» en brave://settings/privacy y reinícialo. Si usas VPN o un bloqueador, páusalo, o prueba en Chrome o Edge.");
    }
    throw e;
  }
  const { deviceId, secret } = await call("POST", "", {
    platform: "web",
    webPush: sub.toJSON(),
    favorites: lolFavorites(),
    settings: { locale: "es", quiet: { utcOffsetMinutes: -new Date().getTimezoneOffset() } },
  }, false);
  setState({ deviceId, secret });
}

/** Da de baja este navegador */
export async function disableWebPush() {
  try { await call("DELETE", "/me"); } catch { /* ya no existía */ }
  try { (await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription())?.unsubscribe(); } catch { /* nada */ }
  setState(null);
}

/** Notificación de prueba (como la de "entró en partida") */
export const testWebPush = () => call("POST", "/me/test", { type: "live_start" });

/** Mantiene al día en el servidor la lista de favoritos de este navegador */
export function startWebPushSync() {
  let timer = null;
  const sync = () => {
    if (!state) return;
    call("PUT", "/me/favorites", { favorites: lolFavorites() }).catch(e => {
      if (e.status === 401) setState(null);   // el servidor lo dio de baja (permiso retirado)
    });
  };
  const unsubscribe = subscribeFavorites(() => { clearTimeout(timer); timer = setTimeout(sync, 1500); });
  sync();
  return () => { clearTimeout(timer); unsubscribe(); };
}
