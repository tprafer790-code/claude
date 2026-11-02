// Prueba de humo con Playwright (Chromium):
//  1. Carga sin errores en todas las resoluciones que exige CrazyGames.
//  2. Ciclo del SDK: init → gameplayStart → gameplayStop en pausas → midgame al final.
//  3. Bot que juega una partida completa y mide fotogramas con carga máxima de enemigos.
//  4. Funciona sin SDK (dominio ajeno / bloqueador).
// Uso: node tests/smoke.mjs   (sirve la carpeta del juego en un puerto local)
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Playwright se carga con require para usar también la instalación global si existe.
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOCK = fs.readFileSync(path.join(ROOT, "tests", "mock-sdk.js"), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

let failures = 0;
const check = (ok, msg) => {
  console.log((ok ? "  ✔ " : "  ✘ ") + msg);
  if (!ok) failures++;
};

const browser = await chromium.launch();

async function openGame(viewport, { sdk = "mock", init = "" } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/crazygames-sdk|ERR_|Failed to load/.test(m.text()) && errors.push(m.text()));
  if (init) await page.addInitScript(init);
  await page.route("https://sdk.crazygames.com/**", (route) =>
    sdk === "mock"
      ? route.fulfill({ contentType: "text/javascript", body: MOCK })
      : route.abort()
  );
  await page.goto(BASE);
  await page.waitForFunction(() => window.LW && window.LW.debug && window.LW.debug.state === "play");
  return { page, errors };
}

// 1. Resoluciones exigidas (escritorio, pantalla completa, móvil, tableta y vertical)
console.log("Resoluciones");
const sizes = [
  [907, 510], [1216, 684], [1077, 606], [821, 462],
  [1366, 768], [1920, 1080], [1536, 864], [1280, 720],
  [800, 450], [1080, 607], [450, 800],
];
for (const [w, h] of sizes) {
  const { page, errors } = await openGame({ width: w, height: h });
  await page.waitForTimeout(400);
  const scroll = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  check(errors.length === 0 && scroll[0] <= w && scroll[1] <= h, `${w}x${h} carga sin errores ni desbordamiento`);
  if (w === 800) await page.screenshot({ path: path.join(ROOT, "tests", "out-800x450.png") });
  await page.close();
}

// 2. Ciclo del SDK
console.log("SDK");
{
  const { page, errors } = await openGame({ width: 1216, height: 684 }, { init: "window.__locale='es-ES'" });
  let calls = await page.evaluate(() => window.__sdkCalls.slice());
  check(calls[0] === "init" && calls.includes("loadingStart") && calls.includes("loadingStop"), "init y eventos de carga");
  check(calls.includes("gameplayStart"), "gameplayStart al entrar directamente en la partida");
  check(await page.evaluate(() => document.documentElement.lang === "es"), "idioma tomado de systemInfo (es)");
  await page.keyboard.press("KeyP");
  calls = await page.evaluate(() => window.__sdkCalls.slice());
  check(calls[calls.length - 1] === "gameplayStop" && (await page.evaluate(() => LW.debug.state)) === "paused", "pausa → gameplayStop");
  await page.keyboard.press("KeyP");
  calls = await page.evaluate(() => window.__sdkCalls.slice());
  check(calls[calls.length - 1] === "gameplayStart", "reanudar → gameplayStart");
  // forzar fin de partida (victoria) y comprobar midgame y pantalla de resultados
  await page.evaluate(() => LW.debug.skipTo(299.9));
  await page.waitForFunction(() => LW.debug.state === "results", null, { timeout: 8000 });
  calls = await page.evaluate(() => window.__sdkCalls.slice());
  check(calls.includes("requestAd:midgame") && calls.includes("adStarted:midgame"), "anuncio midgame al terminar la partida");
  check(calls.includes("happytime"), "happytime en la victoria");
  check(calls.includes("data.setItem"), "progreso guardado con el módulo Data");
  check(await page.evaluate(() => getComputedStyle(document.getElementById("rewardBtn")).display === "none"),
    "botón recompensado oculto mientras ENABLE_REWARDED=false (Basic Launch)");
  check(await page.evaluate(() => LW.debug.save.nectar > 0), "néctar acumulado");
  await page.click("#toHomeBtn");
  check(await page.evaluate(() => LW.debug.state === "home"), "pantalla de mejoras sin anuncio");
  check(await page.evaluate(() => LW.debug.save.missions.length === 3 && LW.debug.save.night === 2), "3 misiones activas y noche 2 desbloqueada tras la victoria");
  for (const tab of ["moths", "missions", "upgrades"]) {
    await page.click(`[data-tab="${tab}"]`);
    check(await page.evaluate(() => document.querySelectorAll("#shop .item").length > 0), `pestaña ${tab} con contenido`);
  }
  const before = (await page.evaluate(() => window.__sdkCalls.filter((c) => c === "requestAd:midgame").length));
  await page.click("#playBtn");
  const after = (await page.evaluate(() => window.__sdkCalls.filter((c) => c === "requestAd:midgame").length));
  check(before === after && (await page.evaluate(() => LW.debug.state)) === "play", "botón Jugar no lanza anuncio");
  check(errors.length === 0, "sin errores de consola: " + errors.join(" | "));
  await page.close();
}

// 2b. Anuncio recompensado (configuración Full Launch): recompensa solo si el anuncio termina
console.log("Recompensado");
for (const mode of ["finish", "error"]) {
  const init = `window.__adMode='${mode}'; Object.defineProperty(window,'LW_CONFIG',{value:{rewarded:true},writable:false});`;
  const { page, errors } = await openGame({ width: 800, height: 450 }, { init });
  await page.evaluate(() => LW.debug.skipTo(299.9));
  await page.waitForFunction(() => LW.debug.state === "results", null, { timeout: 8000 });
  if (mode === "finish") await page.screenshot({ path: path.join(ROOT, "tests", "out-results.png") });
  const before = await page.evaluate(() => LW.debug.save.nectar);
  const earned = await page.evaluate(() => LW.debug.run.earned);
  check(await page.isVisible("#rewardBtn"), `botón recompensado visible (${mode})`);
  await page.click("#rewardBtn");
  await page.waitForFunction(() => document.getElementById("rewardBtn").style.display === "none", null, { timeout: 4000 });
  const after = await page.evaluate(() => LW.debug.save.nectar);
  if (mode === "finish") check(after === before + earned, "adFinished → néctar duplicado");
  else check(after === before, "adError → sin recompensa");
  check(errors.length === 0, "sin errores: " + errors.join(" | "));
  if (mode === "finish") {
    await page.click("#toHomeBtn");
    await page.screenshot({ path: path.join(ROOT, "tests", "out-home.png") });
  }
  await page.close();
}

// 3. Bot jugando: estabilidad y rendimiento con carga máxima
console.log("Partida con bot");
{
  const { page, errors } = await openGame({ width: 1366, height: 768 });
  await page.evaluate(() => LW.debug.setSeed(12345));
  // el bot persigue el rocío más cercano y, si no hay, describe círculos; elige siempre la primera carta
  await page.evaluate(() => {
    let a = 0;
    window.__bot = setInterval(() => {
      const st = LW.debug.state;
      if (st === "levelup") document.querySelector("#cards .card").click();
      if (st !== "play") return;
      const g = LW.debug.nearestGem();
      a += 0.15;
      if (g && Math.hypot(g.dx, g.dy) > 5) {
        const d = Math.hypot(g.dx, g.dy);
        LW.debug.setInput([g.dx / d, g.dy / d]);
      } else LW.debug.setInput([Math.cos(a), Math.sin(a)]);
    }, 150);
  });
  await page.waitForTimeout(20000);
  await page.evaluate(() => clearInterval(window.__bot));
  await page.waitForFunction(() => LW.debug.state === "levelup", null, { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(ROOT, "tests", "out-levelup.png") });
  await page.evaluate(() => {
    window.__bot = setInterval(() => {
      if (LW.debug.state === "levelup") document.querySelector("#cards .card").click();
    }, 150);
  });
  const mid = await page.evaluate(() => ({ t: LW.debug.run.time, lvl: LW.debug.run.level, kills: LW.debug.run.kills, st: LW.debug.state }));
  check(mid.t > 15 && mid.kills > 10 && mid.lvl >= 2, `progreso tras 20 s: tiempo ${mid.t.toFixed(1)} s, nivel ${mid.lvl}, bajas ${mid.kills}`);
  // salto al tramo final (máximo de enemigos) y medición de fotogramas
  await page.evaluate(() => { LW.debug.run.player.hp = 1e6; LW.debug.run.player.maxHp = 1e6; LW.debug.skipTo(265); });
  await page.waitForTimeout(6000);
  const load = await page.evaluate(() => new Promise((res) => {
    const samples = [];
    let last = performance.now();
    function f(now) {
      samples.push(now - last);
      last = now;
      if (samples.length < 240) requestAnimationFrame(f);
      else res({ samples, state: LW.debug.state, time: LW.debug.run.time, enemies: LW.debug.enemies, bullets: LW.debug.bullets, quality: LW.debug.perf.quality });
    }
    requestAnimationFrame(f);
  }));
  const sorted = load.samples.slice().sort((a, b) => a - b);
  const avg = load.samples.reduce((a, b) => a + b, 0) / load.samples.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`    estado ${load.state} t=${load.time.toFixed(1)}, enemigos ${load.enemies}, proyectiles ${load.bullets}, media ${avg.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, calidad ${load.quality}`);
  check(load.enemies > 150, "carga alta de enemigos en el tramo final");
  check(avg < 25, "media de fotograma < 25 ms en Chromium sin GPU con carga máxima");
  check(errors.length === 0, "sin errores durante la partida: " + errors.join(" | "));
  await page.screenshot({ path: path.join(ROOT, "tests", "out-final-swarm.png") });
  await page.close();
}

// 3b. Novedades de jugabilidad: impulso, enemigos nuevos, objetos, evoluciones y ajustes
console.log("Novedades");
{
  const { page, errors } = await openGame({ width: 1280, height: 720 });
  const r = await page.evaluate(() => {
    const D = LW.debug, out = {};
    D.setSeed(7);
    D.setInput([0, 0]);
    D.clearEnemies();
    D.run.time = 30;
    // impulso: avanza, da invulnerabilidad y tiene recarga
    const p = D.run.player;
    p.dx = 1; p.dy = 0;
    const x0 = p.x;
    out.dash = D.dash();
    D.spawn("brute", 30, 0);
    const hp0 = p.hp;
    D.step(8);
    out.dashMoved = p.x - x0;
    out.dashNoDamage = p.hp === hp0;
    out.dashCd = D.dash() === false;
    D.clearEnemies();
    // escupidor: dispara esporas
    p.hp = p.maxHp;
    const sp = D.spawn("spitter", 300, 0);
    sp.hp = sp.maxHp = 1e6; // que no lo disipen antes de disparar
    for (let i = 0; i < 300 && D.orbs === 0 && D.state === "play"; i++) D.step(1);
    out.orbs = D.orbs;
    out.state = D.state;
    D.clearEnemies();
    return out;
  });
  check(r.dash && r.dashMoved > 40, `impulso desplaza a la polilla (${r.dashMoved.toFixed(0)} u)`);
  check(r.dashNoDamage, "impulso sin daño al atravesar un enemigo");
  check(r.dashCd, "impulso con recarga");
  check(r.orbs > 0, `el escupidor lanza esporas (${r.orbs}, ${r.state})`);
  const r2 = await page.evaluate(() => {
    const D = LW.debug, out = {};
    D.clearEnemies();
    D.setInput([0, 0]);
    const p = D.run.player;
    // gemelo: alcanzado por el pulso hasta disiparse, deja 3 polillas
    D.spawn("splitter", 60, 0);
    D.run.weapons.pulse = 5;
    for (let i = 0; i < 400 && D.enemies < 3 && D.state === "play"; i++) { p.hp = p.maxHp; D.step(1); }
    out.split = D.enemies;
    D.clearEnemies();
    // objetos
    p.hp = 20;
    const picked = D.run.itemsPicked;
    D.dropItem("moon", 5, 0);
    D.step(2);
    out.healed = p.hp > 40;
    out.picked = D.run.itemsPicked - picked;
    // evoluciones: arma al 5 + pasiva al 2 → carta de evolución
    D.run.weapons.bolt = 5;
    D.run.passives.lens = 2;
    out.evoOpt = D.options().some((o) => o.kind === "evo" && o.id === "bolt");
    // amanecer
    D.run.time = 285;
    D.step(1);
    out.dawn = D.dawn;
    return out;
  });
  check(r2.split >= 3, `el gemelo se divide al disiparse (${r2.split} enemigos)`);
  check(r2.healed && r2.picked === 1, "la flor de luna cura y cuenta como objeto");
  check(r2.evoOpt, "carta de evolución disponible con arma al 5 y pasiva al 2");
  check(r2.dawn > 0.6, `el amanecer aclara la pantalla (${r2.dawn})`);
  // ajustes en la pausa
  await page.keyboard.press("KeyP");
  await page.click("#musicBtn");
  await page.click("#shakeBtn");
  const set = await page.evaluate(() => ({ m: LW.debug.save.musicOff, s: LW.debug.save.shakeOff, txt: document.getElementById("musicBtn").textContent }));
  check(set.m === true && set.s === true && /Off|No/.test(set.txt), "ajustes de música y temblor se guardan");
  check(errors.length === 0, "sin errores: " + errors.join(" | "));
  await page.close();
}

// 4. Sin SDK (bloqueado): el juego debe ser plenamente jugable
console.log("Sin SDK");
{
  const { page, errors } = await openGame({ width: 800, height: 450 }, { sdk: "blocked" });
  await page.evaluate(() => LW.debug.skipTo(299.9));
  await page.waitForFunction(() => LW.debug.state === "results", null, { timeout: 8000 });
  check(true, "partida completa y resultados sin SDK");
  check(errors.length === 0, "sin errores sin SDK: " + errors.join(" | "));
  await page.close();
}

// Tamaño del paquete
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (["tests", "docs", "node_modules", "dist"].includes(f) || f.startsWith(".")) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (!/\.(md|json)$/.test(f)) files.push(p);
  }
})(ROOT);
const bytes = files.reduce((s, f) => s + fs.statSync(f).size, 0);
console.log(`Paquete: ${files.length} archivos, ${(bytes / 1024).toFixed(1)} KB`);
check(bytes < 20 * 1024 * 1024 && files.length < 1500, "dentro de los límites (≤ 20 MB portada móvil, ≤ 1500 archivos)");

await browser.close();
server.close();
console.log(failures ? `\n${failures} comprobaciones fallidas` : "\nTodas las comprobaciones superadas");
process.exit(failures ? 1 : 0);
