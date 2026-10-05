// Auditoría automática de accesibilidad (axe-core, WCAG 2.1 A/AA) en la versión
// estática a 390 y 1440 px, con menú y diálogo abiertos. Complementa la revisión manual.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const base = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let total = 0;
const run = async (page, label) => {
  await page.addScriptTag({ content: axe });
  const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations
    .map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ej: v.nodes.slice(0, 2).map((x) => x.target.join(' ')) })));
  total += r.length;
  console.log(`${label}: ${r.length} incumplimientos`); r.forEach((v) => console.log('  ', v.impact, v.id, v.n, JSON.stringify(v.ej)));
};
for (const w of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(base + '?static'); await page.waitForSelector('body.is-static'); await page.waitForTimeout(800);
  await run(page, `Página ${w}px`);
  await page.click('#menu-btn'); await run(page, `Menú abierto ${w}px`); await page.keyboard.press('Escape');
  await page.click('[data-room="suite-bosque"]'); await run(page, `Diálogo de estancia ${w}px`);
  await page.close();
}
await browser.close();
process.exit(total ? 1 : 0);
