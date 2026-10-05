// Capturas reales del recorrido con Chromium headless (WebGL por SwiftShader).
// Uso: node scripts/shoot.mjs <url> <salida> [ancho] [alto] [extra-query]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [url = 'http://localhost:4173/', out = 'docs/estudio/proyecto/capturas', W = '1440', H = '900', extra = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = +W < 800;
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
page.setDefaultTimeout(400000);
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(url + (extra ? `?${extra}` : ''), { waitUntil: 'load' });
await page.waitForFunction(() => window.__silva || document.body.classList.contains('is-static'), null, { timeout: 240000 });
const loadMs = Date.now() - t0;
const info = await page.evaluate(() => window.__silva ? { ...window.__silva.engine.stats } : { static: true });
console.log('carga', loadMs, 'ms', JSON.stringify(info));
const tag = `${W}`;
const shots = JSON.parse(process.env.SHOTS || '[["descubrimiento",2],["umbral",5],["estancia",8],["apertura",10],["llegada",13]]');
for (const [name, key, sub = 0.5] of shots) {
  await page.evaluate(([k, s]) => {
    const S = window.__silva; const seg = S.journey.segments.find((x) => x.i === k && x.type === 'hold');
    const u = seg.a + (seg.b - seg.a) * s;
    window.scrollTo(0, S.scrollToU(u)); S.state.uCur = u;
  }, [key, sub]);
  await page.waitForTimeout(400);
  // Fija la cámara en la posición exacta (el renderizado por software es lento y
  // la amortiguación tardaría muchos fotogramas en alcanzar el objetivo).
  await page.evaluate(() => { const S = window.__silva; S.state.uCur = S.state.uTarget; S.state.freeze = true; });
  // espera dos fotogramas completos en la posición fijada
  const f0 = await page.evaluate(() => window.__silva.engine.stats.frames);
  await page.waitForFunction((f) => window.__silva.engine.stats.frames >= f + 2, f0, { timeout: 400000, polling: 500 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  await page.evaluate(() => { window.__silva.state.freeze = false; });
  console.log('captura', name);
}
const st = await page.evaluate(() => window.__silva?.engine.stats);
console.log('stats', JSON.stringify(st));
console.log(logs.filter((l) => !l.includes('GPU stall')).slice(0, 30).join('\n'));
await browser.close();
