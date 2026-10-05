import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const q = process.argv[2] || '';
await page.goto('http://localhost:4173/?capture&' + q);
await page.waitForFunction(() => window.__silva, null, { timeout: 120000 });
for (const k of [2, 5, 8]) {
  await page.evaluate((k) => { const S = window.__silva; const u = S.keyCenter(k); window.scrollTo(0, S.scrollToU(u)); S.state.freeze = true; }, k);
  const f0 = await page.evaluate(() => window.__silva.engine.stats.frames);
  await page.waitForTimeout(8000);
  const f1 = await page.evaluate(() => window.__silva.engine.stats.frames);
  console.log(q, 'clave', k, ((8000 / Math.max(1, f1 - f0)) | 0), 'ms/fotograma');
}
await browser.close();
