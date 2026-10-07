import { useSyncExternalStore } from "react";

// Web instalable (PWA): registro del service worker (public/sw.js), botón "Instalar" y estado de la conexión.

let installEvent = null;     // beforeinstallprompt guardado hasta que el usuario pulse "Instalar"
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/** Registra el service worker (solo en producción: en desarrollo guardaría módulos viejos) */
export function setupPwa() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; notify(); });
  window.addEventListener("appinstalled", () => { installEvent = null; notify(); });
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* sin SW la web funciona igual */ });
    });
  }
}

/** true si el navegador ofrece instalar la web (Chrome, Edge, Android) */
export const useCanInstall = () => useSyncExternalStore(subscribe, () => Boolean(installEvent), () => false);

/** Abre el diálogo de instalación del navegador */
export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice.catch(() => ({ outcome: "dismissed" }));
  installEvent = null;
  notify();
  return outcome === "accepted";
}

/** false sin conexión a internet */
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
