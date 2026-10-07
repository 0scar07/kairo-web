// Tarjetas para compartir como imagen (1080 × 1350, el formato vertical de Instagram y WhatsApp), dibujadas en un canvas
// en el navegador. Las imágenes de Data Dragon permiten CORS; se piden con un parámetro propio para no reutilizar la
// copia sin CORS que guarda el service worker para las <img> normales.
import { championIcon, championName, championSplash, itemIcon, profileIcon } from "./ddragon";
import { findMe, formatDuration, formatNumber, kdaValue, killParticipation, queueLong, rankLabel, tierColor, winrate } from "./lol";

const W = 1080, H = 1350;
const C = { bg: "#0A0F0D", surface: "rgba(17,24,21,.86)", border: "rgba(255,255,255,.08)", text: "#E8F0EC", text2: "#9AADA4", brand: "#35E0A1", win: "#4FC97A", loss: "#E05555", gold: "#E8B65A" };
const BASE = import.meta.env.BASE_URL;
const SITE = "kairo-web.osky7470.workers.dev";

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    const remote = /^https?:/.test(src) && !src.startsWith(location.origin);
    if (remote) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);   // sin esa imagen la tarjeta se dibuja igual
    img.src = remote ? `${src}${src.includes("?") ? "&" : "?"}kc=card` : src;
  });
}

async function fonts() {
  try {
    await Promise.all(["700 64px Sora", "600 32px Sora", "500 28px Inter", "700 28px Inter"].map(f => document.fonts.load(f)));
  } catch { /* se usa la fuente del sistema */ }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, r = 28) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function image(ctx, img, x, y, w, h, r = 0) {
  if (!img) return;
  ctx.save();
  if (r) { roundRect(ctx, x, y, w, h, r); ctx.clip(); }
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/** Imagen de fondo que cubre todo, oscurecida hacia abajo */
function background(ctx, img) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  if (img) {
    const scale = Math.max(W / img.width, (H * 0.62) / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(img, (W - w) / 2, 0, w, h);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(10,15,13,.35)");
  g.addColorStop(0.42, "rgba(10,15,13,.82)");
  g.addColorStop(0.62, C.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.15, 0, 0, W * 0.15, 0, W * 0.9);
  glow.addColorStop(0, "rgba(53,224,161,.16)");
  glow.addColorStop(1, "rgba(53,224,161,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function text(ctx, value, x, y, { size = 28, weight = 500, color = C.text, font = "Inter", align = "left", max } = {}) {
  ctx.font = `${weight} ${size}px ${font}, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  let s = String(value ?? "");
  if (max) while (s.length > 1 && ctx.measureText(s).width > max) s = `${s.slice(0, -2)}…`;
  ctx.fillText(s, x, y);
  return ctx.measureText(s).width;
}

async function brand(ctx, logo) {
  image(ctx, logo, 64, 60, 64, 64, 16);
  text(ctx, "KAIRO", 146, 106, { size: 34, weight: 700, font: "Sora" });
  text(ctx, SITE, W - 64, 104, { size: 24, color: C.text2, align: "right" });
}

/** Píldoras de resultado de las últimas partidas */
function formPips(ctx, results, x, y, w) {
  const n = results.length || 1, gap = 8, pw = (w - gap * (n - 1)) / n;
  results.forEach((r, i) => {
    roundRect(ctx, x + i * (pw + gap), y, pw, 34, 7);
    ctx.fillStyle = r === "win" ? C.win : r === "loss" ? C.loss : "#4A5A53";
    ctx.fill();
  });
}

function stat(ctx, label, value, x, y, color = C.text) {
  text(ctx, label.toUpperCase(), x, y, { size: 20, weight: 700, color: C.text2 });
  text(ctx, value, x, y + 50, { size: 42, weight: 700, font: "Sora", color });
}

function toBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

/** Tarjeta del perfil: rango, forma reciente, KDA y campeones más jugados */
export async function profileCard({ account, summoner, solo, region, matches, champs }) {
  await fonts();
  const puuid = account.puuid;
  const top = champs[0];
  const splash = top ? championSplash(top.championId, top.championName) : null;
  const [bg, logo, icon, emblem, ...champImgs] = await Promise.all([
    loadImage(splash?.wide),
    loadImage(`${BASE}logo.png`),
    loadImage(profileIcon(summoner.profileIconId)),
    loadImage(solo ? `${BASE}ranks/${solo.tier.toLowerCase()}.png` : null),
    ...champs.slice(0, 3).map(c => loadImage(championIcon(c.championId, c.championName))),
  ]);
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = canvas.getContext("2d");
  background(ctx, bg);
  await brand(ctx, logo);

  // Identidad
  image(ctx, icon, 64, 300, 168, 168, 36);
  roundRect(ctx, 64, 300, 168, 168, 36); ctx.strokeStyle = solo ? tierColor(solo.tier) : C.border; ctx.lineWidth = 5; ctx.stroke();
  text(ctx, account.gameName, 262, 378, { size: 72, weight: 700, font: "Sora", max: W - 330 });
  text(ctx, `#${account.tagLine} · ${region.label} · Nivel ${summoner.summonerLevel}`, 266, 432, { size: 30, color: C.text2 });

  // Rango
  panel(ctx, 64, 520, W - 128, 210);
  if (emblem) image(ctx, emblem, 96, 548, 176, 154);
  const tierColorValue = solo ? tierColor(solo.tier) : C.text2;
  text(ctx, solo ? rankLabel(solo.tier, solo.rank) : "Sin clasificar", 300, 610, { size: 56, weight: 700, font: "Sora", color: tierColorValue.startsWith("var") ? C.gold : tierColorValue });
  text(ctx, solo ? `${solo.leaguePoints} LP · Solo/Dúo` : "Solo/Dúo", 302, 662, { size: 30, color: C.text2 });
  if (solo) {
    const wr = winrate(solo.wins, solo.losses);
    text(ctx, `${wr}%`, W - 100, 618, { size: 56, weight: 700, font: "Sora", align: "right", color: wr >= 50 ? C.win : C.loss });
    text(ctx, `${solo.wins}V ${solo.losses}D`, W - 100, 662, { size: 28, align: "right", color: C.text2 });
  }

  // Forma reciente
  panel(ctx, 64, 760, W - 128, 300);
  const recent = matches.slice(0, 20);
  let wins = 0, games = 0, k = 0, d = 0, a = 0, kp = 0;
  const results = recent.map(m => {
    const me = findMe(m, puuid);
    if (!me || me.remake) return "remake";
    games++; if (me.win) wins++;
    k += me.kills; d += me.deaths; a += me.assists; kp += killParticipation(m, me);
    return me.win ? "win" : "loss";
  });
  text(ctx, `ÚLTIMAS ${recent.length} PARTIDAS`, 100, 820, { size: 22, weight: 700, color: C.text2 });
  formPips(ctx, results, 100, 846, W - 200);
  const kda = kdaValue(k, d, a);
  stat(ctx, "Winrate", games ? `${Math.round((wins / games) * 100)}%` : "—", 100, 950, games && wins / games >= 0.5 ? C.win : C.loss);
  stat(ctx, "KDA", games ? (kda === Infinity ? "Perfecto" : kda.toFixed(2)) : "—", 400, 950, C.brand);
  stat(ctx, "Participación", games ? `${Math.round(kp / games)}%` : "—", 680, 950);

  // Campeones
  text(ctx, "CAMPEONES MÁS JUGADOS", 64, 1118, { size: 22, weight: 700, color: C.text2 });
  champs.slice(0, 3).forEach((c, i) => {
    const x = 64 + i * 328;
    panel(ctx, x, 1140, 304, 130, 24);
    image(ctx, champImgs[i], x + 20, 1160, 90, 90, 18);
    text(ctx, championName(c.championId, c.championName), x + 126, 1196, { size: 28, weight: 700, max: 160 });
    text(ctx, `${c.wr}% · ${c.games} ${c.games === 1 ? "partida" : "partidas"}`, x + 126, 1236, { size: 22, color: c.wr >= 50 ? C.win : C.loss });
  });
  text(ctx, "Estadísticas de Kairo · No respaldado por Riot Games", W / 2, 1316, { size: 20, color: "#5F7068", align: "center" });
  return toBlob(canvas);
}

/** Tarjeta de una partida: campeón, resultado, K/D/A y estadísticas */
export async function matchCard({ match, me }) {
  await fonts();
  const splash = championSplash(me.championId, me.championName);
  const [bg, logo, icon, ...items] = await Promise.all([
    loadImage(splash?.wide),
    loadImage(`${BASE}logo.png`),
    loadImage(championIcon(me.championId, me.championName)),
    ...me.items.slice(0, 6).map(id => loadImage(itemIcon(id))),
  ]);
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = canvas.getContext("2d");
  background(ctx, bg);
  await brand(ctx, logo);
  const result = me.remake ? "Remake" : me.win ? "Victoria" : "Derrota";
  const color = me.remake ? C.text2 : me.win ? C.win : C.loss;
  const champ = championName(me.championId, me.championName);
  const minutes = match.duration / 60;

  // Resultado
  roundRect(ctx, 64, 480, 220, 58, 29); ctx.fillStyle = color; ctx.fill();
  text(ctx, result.toUpperCase(), 174, 520, { size: 26, weight: 700, align: "center", color: C.bg });
  text(ctx, `${queueLong(match.queueId)} · ${formatDuration(match.duration)}`, 310, 520, { size: 28, color: C.text2, max: W - 380 });
  image(ctx, icon, 64, 572, 140, 140, 30);
  text(ctx, champ, 230, 640, { size: 76, weight: 700, font: "Sora", max: W - 300 });
  text(ctx, `${me.gameName}${me.tagLine ? `#${me.tagLine}` : ""}`, 232, 694, { size: 30, color: C.text2, max: W - 300 });

  // K/D/A
  panel(ctx, 64, 750, W - 128, 200);
  ctx.font = "700 112px Sora, system-ui, sans-serif";
  const parts = [[String(me.kills), C.text], [" / ", "#5F7068"], [String(me.deaths), C.loss], [" / ", "#5F7068"], [String(me.assists), C.text]];
  const total = parts.reduce((s, [t]) => s + ctx.measureText(t).width, 0);
  let x = W / 2 - total / 2;
  for (const [t, c] of parts) { text(ctx, t, x, 878, { size: 112, weight: 700, font: "Sora", color: c }); x += ctx.measureText(t).width; }
  const kda = kdaValue(me.kills, me.deaths, me.assists);
  text(ctx, kda === Infinity ? "KDA perfecto" : `${kda.toFixed(2)} KDA`, W / 2, 926, { size: 30, align: "center", color: C.brand });

  // Estadísticas
  const stats = [
    ["CS", `${me.cs} (${minutes ? (me.cs / minutes).toFixed(1) : 0})`],
    ["Daño", formatNumber(me.damage)],
    ["Oro", formatNumber(me.gold)],
    ["Participación", `${killParticipation(match, me)}%`],
  ];
  stats.forEach(([label, value], i) => {
    const sx = 64 + i * 244;
    panel(ctx, sx, 980, 224, 140, 24);
    text(ctx, label.toUpperCase(), sx + 24, 1026, { size: 19, weight: 700, color: C.text2 });
    text(ctx, value, sx + 24, 1084, { size: 36, weight: 700, font: "Sora", max: 184 });
  });
  items.forEach((img, i) => {
    if (!img) { roundRect(ctx, 64 + i * 108, 1150, 92, 92, 18); ctx.fillStyle = "#17201C"; ctx.fill(); return; }
    image(ctx, img, 64 + i * 108, 1150, 92, 92, 18);
  });
  const date = new Date(match.start).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  text(ctx, date, W - 64, 1210, { size: 26, color: C.text2, align: "right" });
  text(ctx, "Estadísticas de Kairo · No respaldado por Riot Games", W / 2, 1316, { size: 20, color: "#5F7068", align: "center" });
  return toBlob(canvas);
}
