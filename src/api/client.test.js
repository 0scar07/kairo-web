import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./client";

// fetch simulado: devuelve el JSON pedido y cuenta las llamadas
function mockFetch(body) {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => body, headers: new Map() }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("request y la caché", () => {
  it("guarda la respuesta durante el ttl", async () => {
    const fetch = mockFetch([{ gameName: "Faker" }]);
    await request("/prueba/ok", { ttl: 60_000 });
    await request("/prueba/ok", { ttl: 60_000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("no guarda una respuesta que cacheIf rechaza (se vuelve a pedir)", async () => {
    const fetch = mockFetch([{ gameName: "Faker" }, { gameName: null }]);
    const cacheIf = rows => rows.every(r => r.gameName);
    const first = await request("/prueba/incompleta", { ttl: 60_000, cacheIf });
    await request("/prueba/incompleta", { ttl: 60_000, cacheIf });
    expect(first.data).toHaveLength(2);   // igual se usa
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("force ignora lo guardado", async () => {
    const fetch = mockFetch({ ok: 1 });
    await request("/prueba/force", { ttl: 60_000 });
    await request("/prueba/force", { ttl: 60_000, force: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("sin conexión", () => {
  // localStorage mínimo en memoria (las pruebas corren en Node)
  function memoryStorage() {
    const map = new Map();
    return {
      getItem: k => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: k => map.delete(k),
      key: i => [...map.keys()][i] ?? null,
      get length() { return map.size; },
    };
  }

  it("devuelve la última copia guardada aunque haya caducado", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    // Copia caducada hace un minuto, dentro del margen de 7 días
    localStorage.setItem("kc:/prueba/offline", JSON.stringify({ at: 1, exp: Date.now() - 60_000, data: { name: "guardado" } }));
    vi.stubGlobal("navigator", { onLine: false });
    const fetch = mockFetch({ name: "nuevo" });
    const res = await request("/prueba/offline", { ttl: 60_000, persist: true });
    expect(res).toMatchObject({ data: { name: "guardado" }, stale: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sin copia guardada informa que no hay conexión", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("navigator", { onLine: false });
    mockFetch({});
    await expect(request("/prueba/offline-vacio", { ttl: 60_000, persist: true })).rejects.toMatchObject({ code: "OFFLINE" });
  });
});
