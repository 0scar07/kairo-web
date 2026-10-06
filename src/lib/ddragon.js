import { useEffect, useSyncExternalStore } from "react";
import { readJSON, writeJSON } from "./storage";

// Data Dragon (CDN público de Riot, sin key): imágenes de campeones, objetos, hechizos, runas e íconos de perfil.
// Las listas se guardan compactas por versión en localStorage.
const CDN = "https://ddragon.leagueoflegends.com";
const FALLBACK_VERSION = "16.19.1";
const LOCALE = "es_MX";
const VERSION_KEY = "kdd:version";
const VERSION_TTL = 6 * 60 * 60_000;

let version = readJSON(VERSION_KEY)?.v || FALLBACK_VERSION;
let champs = {};   // championId numérico -> { id: "MonkeyKing", name: "Wukong" }
let spells = {};   // id -> { image, name }
let perks = {};    // id de runa o de estilo -> { icon, name }
let items = {};    // id de objeto -> nombre
let ready = false;
let loading = null;

let tick = 0;
const listeners = new Set();
const notify = () => { tick++; listeners.forEach(fn => fn()); };

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data Dragon ${res.status}`);
  return res.json();
}

async function loadVersion() {
  const saved = readJSON(VERSION_KEY);
  if (saved && Date.now() - saved.at < VERSION_TTL) { version = saved.v; return; }
  try {
    const list = await getJSON(`${CDN}/api/versions.json`);
    version = list[0];
    writeJSON(VERSION_KEY, { v: version, at: Date.now() });
  } catch {
    if (saved) version = saved.v;
  }
}

async function loadList(name, url, compact) {
  const key = `kdd:${name}:${version}`;
  const cached = readJSON(key);
  if (cached) return cached;
  const data = compact(await getJSON(url));
  // Se borran las versiones anteriores de esta lista antes de guardar la nueva
  try {
    Object.keys(localStorage).filter(k => k.startsWith(`kdd:${name}:`) && k !== key).forEach(k => localStorage.removeItem(k));
  } catch { /* nada */ }
  writeJSON(key, data);
  return data;
}

async function load() {
  await loadVersion();
  const base = `${CDN}/cdn/${version}/data/${LOCALE}`;
  const [c, s, r, it] = await Promise.allSettled([
    loadList("champions", `${base}/champion.json`, json =>
      Object.fromEntries(Object.values(json.data).map(x => [x.key, { id: x.id, name: x.name }]))),
    loadList("spells", `${base}/summoner.json`, json =>
      Object.fromEntries(Object.values(json.data).map(x => [x.key, { image: x.image.full, name: x.name }]))),
    loadList("perks", `${base}/runesReforged.json`, json => {
      const out = {};
      json.forEach(style => {
        out[style.id] = { icon: style.icon, name: style.name };
        style.slots.forEach(slot => slot.runes.forEach(rune => { out[rune.id] = { icon: rune.icon, name: rune.name }; }));
      });
      return out;
    }),
    loadList("items", `${base}/item.json`, json =>
      Object.fromEntries(Object.entries(json.data).map(([id, x]) => [id, x.name]))),
  ]);
  if (c.status === "fulfilled") champs = c.value;
  if (s.status === "fulfilled") spells = s.value;
  if (r.status === "fulfilled") perks = r.value;
  if (it.status === "fulfilled") items = it.value;
  ready = true;
  notify();
}

/** Carga Data Dragon una sola vez; nunca falla (sin datos, las imágenes simplemente no aparecen). */
export function ensureDDragon() {
  if (!loading) loading = load().catch(() => { ready = true; notify(); });
  return loading;
}

/** Re-renderiza el componente cuando terminan de cargar las listas. */
export function useDDragon() {
  useEffect(() => { ensureDDragon(); }, []);
  useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => tick);
  return ready;
}

const img = path => `${CDN}/cdn/${version}/img/${path}`;

export const champion = id => champs[id] || null;
export const championName = (id, fallback = "") => champs[id]?.name || fallback;

/** Ícono de campeón por id numérico; si aún no está la lista, usa el nombre de la partida (casi siempre el id de imagen). */
export function championIcon(championId, championKey) {
  const key = champs[championId]?.id || championKey;
  return key ? img(`champion/${key}.png`) : null;
}

/**
 * Arte del campeón para el fondo de la cabecera del perfil (sin versión en la URL):
 * `wide` es el splash (1215 px), `narrow` el arte vertical de carga, mucho más liviano, para celulares.
 */
export function championSplash(championId, championKey) {
  const key = champs[championId]?.id || championKey;
  return key ? {
    wide: `${CDN}/cdn/img/champion/splash/${key}_0.jpg`,
    narrow: `${CDN}/cdn/img/champion/loading/${key}_0.jpg`,
  } : null;
}

export const itemIcon = id => (id ? img(`item/${id}.png`) : null);
export const itemName = id => items[id] || "";
export const profileIcon = id => (id || id === 0 ? img(`profileicon/${id}.png`) : null);
export const spellIcon = id => (spells[id] ? img(`spell/${spells[id].image}`) : null);
export const spellName = id => spells[id]?.name || "";
// Las imágenes de runas no llevan versión en la URL
export const perkIcon = id => (perks[id] ? `${CDN}/cdn/img/${perks[id].icon}` : null);
export const perkName = id => perks[id]?.name || "";
