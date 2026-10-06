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
