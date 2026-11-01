// Auditoría de rendimiento con Chromium (Playwright + Chrome DevTools Protocol).
// Mide, en varios perfiles de dispositivo (con CPU ralentizada para simular móviles
// y Chromebooks de gama baja):
//  - tiempo hasta la partida jugable,
//  - tiempos de fotograma (media, p95, p99, % de fotogramas > 33 ms),
//  - coste de simulación y de dibujo por fotograma,
//  - memoria JS (crecimiento tras recolección de basura = fugas) y ritmo de asignación.
// Uso: node tests/perf.mjs [--quick]
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// Memoria residente (RSS) de todos los procesos del navegador, en MB: es lo que ocupa
// el juego en la RAM del equipo (incluye el propio Chromium, por lo que es una cota superior).
function browserRssMB() {
  try {
    const out = execSync("ps -eo rss=,args=", { encoding: "utf8" });
    let kb = 0;
    for (const line of out.split("\n")) {
      if (/chrom|headless_shell/i.test(line) && !/ps -eo/.test(line)) kb += parseInt(line, 10) || 0;
    }
    return kb / 1024;
  } catch (e) {
    return NaN;
  }
}

const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUICK = process.argv.includes("--quick");
const TYPES = { ".html": "text/html", ".js": "text/javascript" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const PROFILES = [
  { name: "Escritorio 1366×768", viewport: { width: 1366, height: 768 }, dpr: 1, cpu: 1, mobile: false, ram: 8, cores: 8 },
  { name: "Escritorio 1920×1080 pantalla completa", viewport: { width: 1920, height: 1080 }, dpr: 1, cpu: 1, mobile: false, ram: 8, cores: 8 },
  { name: "Chromebook 4 GB (CPU ×4)", viewport: { width: 1366, height: 768 }, dpr: 1, cpu: 4, mobile: false, ram: 4, cores: 4 },
  { name: "Móvil gama media 851×393 DPR 2,75 (CPU ×4)", viewport: { width: 851, height: 393 }, dpr: 2.75, cpu: 4, mobile: true, ram: 4, cores: 8 },
  { name: "Móvil gama baja 800×450 DPR 2 (CPU ×6)", viewport: { width: 800, height: 450 }, dpr: 2, cpu: 6, mobile: true, ram: 2, cores: 4 },
];

function stats(samples) {
  const s = samples.slice().sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  return {
    avg,
    p95: s[Math.floor(s.length * 0.95)],
    p99: s[Math.floor(s.length * 0.99)],
    over33: (100 * s.filter((x) => x > 33.4).length) / s.length,
    fps: 1000 / avg,
  };
}

async function measure(page, cdp, seconds) {
  // muestrea la memoria cada 100 ms mientras se registran los fotogramas
  const heap = [];
  const timer = setInterval(async () => {
    try {
      const m = await cdp.send("Runtime.getHeapUsage");
      heap.push(m.usedSize);
    } catch (e) {}
  }, 100);
  const res = await page.evaluate((secs) => new Promise((resolve) => {
    const samples = [];
    let last = performance.now();
    const end = last + secs * 1000;
    let maxEnemies = 0;
    function f(now) {
      samples.push(now - last);
      last = now;
      maxEnemies = Math.max(maxEnemies, LW.debug.enemies);
      if (now < end) requestAnimationFrame(f);
      else resolve({ samples, maxEnemies, upd: LW.debug.perf.updMs, ren: LW.debug.perf.renMs, quality: LW.debug.perf.quality, state: LW.debug.state });
    }
    requestAnimationFrame(f);
  }), seconds);
  clearInterval(timer);
  // ritmo de asignación ≈ suma de los incrementos de memoria entre muestras
  let alloc = 0;
  for (let i = 1; i < heap.length; i++) if (heap[i] > heap[i - 1]) alloc += heap[i] - heap[i - 1];
  res.allocMBs = alloc / 1048576 / seconds;
  res.stats = stats(res.samples.slice(5));
  return res;
}

const startBot = () => {
  let a = 0;
  window.__bot = setInterval(() => {
    const st = LW.debug.state;
    if (st === "levelup") { LW.debug.pickFirst(); return; }
    if (st !== "play") return;
    a += 0.15;
    const g = LW.debug.nearestGem();
    let v = [Math.cos(a), Math.sin(a)];
    if (g && Math.hypot(g.dx, g.dy) > 5) { const d = Math.hypot(g.dx, g.dy); v = [g.dx / d, g.dy / d]; }
    const av = LW.debug.avoid(110);
    v = [v[0] * 0.6 + av[0] * 2.5, v[1] * 0.6 + av[1] * 2.5];
    const d = Math.hypot(v[0], v[1]) || 1;
    LW.debug.setInput([v[0] / d, v[1] / d]);
  }, 100);
};

const browser = await chromium.launch();
const rows = [];
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
for (const prof of PROFILES.filter((p) => !ONLY || p.name.includes(ONLY))) {
  const ctx = await browser.newContext({ viewport: prof.viewport, deviceScaleFactor: prof.dpr, isMobile: prof.mobile, hasTouch: prof.mobile });
  const page = await ctx.newPage();
  // memoria y núcleos del equipo simulado (activa el modo de bajo consumo con ≤ 4 GB)
  await page.addInitScript(([ram, cores]) => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => ram });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores });
  }, [prof.ram, prof.cores]);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route("https://sdk.crazygames.com/**", (r) => r.abort());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
  await cdp.send("HeapProfiler.enable");
  const t0 = Date.now();
  await page.goto(BASE);
  await page.waitForFunction(() => window.LW && LW.debug && LW.debug.state === "play");
  const loadMs = Date.now() - t0;
  await page.evaluate(startBot);

  // Fase 1: inicio de partida (pocos enemigos)
  const early = await measure(page, cdp, QUICK ? 4 : 8);
  await cdp.send("HeapProfiler.collectGarbage");
  const heapA = (await cdp.send("Runtime.getHeapUsage")).usedSize;

  // Fase 2: tramo final (enemigos al máximo, dos jefes, todas las armas)
  await page.evaluate(() => {
    const r = LW.debug.run;
    r.player.hp = r.player.maxHp = 1e9;
    r.need = 1e12; // sin pantallas de subida de nivel durante la medición
    Object.keys(r.weapons).forEach((k) => (r.weapons[k] = 5));
    Object.keys(r.passives).forEach((k) => (r.passives[k] = 3));
    if (r.evo) Object.keys(r.evo).forEach((k) => (r.evo[k] = true)); // peor caso: todas las evoluciones
    LW.debug.skipTo(262);
  });
  await page.waitForTimeout(QUICK ? 3000 : 6000);
  const late = await measure(page, cdp, QUICK ? 6 : 12);
  await cdp.send("HeapProfiler.collectGarbage");
  const heapB = (await cdp.send("Runtime.getHeapUsage")).usedSize;

  // Fase 3: multitud máxima (solo el arma inicial: los enemigos llegan al tope de 340)
  await page.evaluate(() => {
    const r = LW.debug.run;
    Object.keys(r.weapons).forEach((k) => (r.weapons[k] = k === "bolt" ? 1 : 0));
    if (r.evo) Object.keys(r.evo).forEach((k) => (r.evo[k] = false));
    LW.debug.skipTo(275);
  });
  await page.waitForTimeout(QUICK ? 3000 : 5000);
  const crowd = await measure(page, cdp, QUICK ? 5 : 8);
  const rss = browserRssMB();

  rows.push({ prof, loadMs, early, late, crowd, heapA, heapB, rss, errors });
  const L = late.stats;
  console.log(`${prof.name}: carga ${loadMs} ms | inicio ${early.stats.fps.toFixed(0)} fps | final ${L.fps.toFixed(0)} fps, p95 ${L.p95.toFixed(1)} ms, >33ms ${L.over33.toFixed(1)} %, ` +
    `sim ${late.upd.toFixed(1)} ms, dibujo ${late.ren.toFixed(1)} ms, enemigos ${late.maxEnemies}, calidad ${late.quality}, ` +
    `multitud ${crowd.stats.fps.toFixed(0)} fps con ${crowd.maxEnemies} enemigos, heap ${(heapA / 1048576).toFixed(1)}→${(heapB / 1048576).toFixed(1)} MB, asignación ${late.allocMBs.toFixed(1)} MB/s, RAM navegador ${rss.toFixed(0)} MB, errores ${errors.length}`);
  await ctx.close();
}
await browser.close();
server.close();

const out = path.join(ROOT, "tests", "perf-results.json");
fs.writeFileSync(out, JSON.stringify(rows.map((r) => ({
  perfil: r.prof.name, cargaMs: r.loadMs,
  inicio: { fps: +r.early.stats.fps.toFixed(1), p95: +r.early.stats.p95.toFixed(1) },
  final: { fps: +r.late.stats.fps.toFixed(1), media: +r.late.stats.avg.toFixed(1), p95: +r.late.stats.p95.toFixed(1), p99: +r.late.stats.p99.toFixed(1), pct33: +r.late.stats.over33.toFixed(1),
    simMs: +r.late.upd.toFixed(2), dibujoMs: +r.late.ren.toFixed(2), enemigos: r.late.maxEnemies, calidad: r.late.quality, asignacionMBs: +r.late.allocMBs.toFixed(2) },
  multitud: { fps: +r.crowd.stats.fps.toFixed(1), p95: +r.crowd.stats.p95.toFixed(1), pct33: +r.crowd.stats.over33.toFixed(1), enemigos: r.crowd.maxEnemies, calidad: r.crowd.quality },
  heapMB: [+(r.heapA / 1048576).toFixed(2), +(r.heapB / 1048576).toFixed(2)], ramNavegadorMB: Math.round(r.rss), errores: r.errors,
})), null, 2));
console.log("Resultados en " + out);
