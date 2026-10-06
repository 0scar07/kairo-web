import { useSyncExternalStore } from "react";
import { API_URL } from "../lib/config";

// Estado del backend. Render (plan gratis) duerme el servidor sin tráfico y tarda hasta un minuto en despertar:
// mientras tanto la web muestra "Despertando el servidor…" en vez de un error.
//   "unknown" | "ok" | "waking" | "down"
let state = "unknown";
const listeners = new Set();

function setState(next) {
  if (next === state) return;
  state = next;
  listeners.forEach(fn => fn());
}

export const useServerState = () => useSyncExternalStore(
  fn => { listeners.add(fn); return () => listeners.delete(fn); },
  () => state,
);

async function pingHealth(timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    return Boolean(body?.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Comprobación rápida: si /health no contesta en unos segundos, el servidor está despertando. */
export async function probe() {
  if (state === "waking") return;
  const ok = await pingHealth(3500);
  if (ok) setState("ok");
  else wake();
}

const WAKE_LIMIT_MS = 90_000;
let waking = null;

/** Espera a que el servidor despierte (consulta /health cada pocos segundos). true si despertó. */
export function wake() {
  if (waking) return waking;
  setState("waking");
  waking = (async () => {
    const until = Date.now() + WAKE_LIMIT_MS;
    while (Date.now() < until) {
      if (await pingHealth(10_000)) { setState("ok"); return true; }
      await new Promise(r => setTimeout(r, 3000));
    }
    setState("down");
    return false;
  })().finally(() => { waking = null; });
  return waking;
}

export const markOk = () => setState("ok");
