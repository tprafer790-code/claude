// Genera los renders reales de la escena que usan la versión estática (sin WebGL)
// y las tarjetas de estancias: un plano fijo por capítulo, horizontal y vertical.
// Requiere `npm run build && npm run preview` en marcha.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173/';
const outDir = 'public/renders';
fs.mkdirSync(outDir, { recursive: true });
const chapters = ['descubrimiento', 'umbral', 'estancia', 'apertura', 'llegada'];
const stillKeys = [2, 5, 8, 10, 13];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, suffix] of [[1600, 900, ''], [720, 1280, '-v']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(600000);
  await page.goto(`${base}?capture&dpr=1&q=high`);
  await page.waitForFunction(() => window.__silva, null, { timeout: 300000 });
  for (let i = 0; i < chapters.length; i++) {
    await page.evaluate((k) => { const S = window.__silva; const u = S.keyCenter(k); window.scrollTo(0, S.scrollToU(u)); S.state.freeze = true; }, stillKeys[i]);
    const f0 = await page.evaluate(() => window.__silva.engine.stats.frames);
    await page.waitForFunction((f) => window.__silva.engine.stats.frames >= f + 2, f0, { polling: 500 });
    const png = `/tmp/claude-0/render-${chapters[i]}${suffix}.png`;
    await page.screenshot({ path: png });
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '82', `${outDir}/${chapters[i]}${suffix}.webp`]);
    console.log('render', chapters[i] + suffix);
  }
  await page.close();
}
await browser.close();
