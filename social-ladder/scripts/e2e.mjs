// Smoke test against the production build.
// Usage: npm run build && npx vite preview --port 4173 & npm run e2e
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright is resolved via require so a globally installed copy (NODE_PATH) also works.
const { chromium } = createRequire(import.meta.url)('playwright');

const URL = process.env.E2E_URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? 'e2e-screens';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();

async function run(name, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  await page.goto(URL);
  await page.waitForSelector('.big-button', { timeout: 15000 });
  await page.waitForTimeout(1500);

  for (let i = 0; i < 60; i++) await page.locator('.big-button').click();
  const money = await page.evaluate(() => window.__socialLadder.engine.state.money.toString());
  if (!(Number(money) > 0)) throw new Error(`[${name}] clicking produced no money (${money})`);

  // Critical click: the play viewport shakes briefly and returns exactly to rest.
  await page.evaluate(() => { const seq = [0, 0.99]; window.__socialLadder.engine.random = () => (seq.length ? seq.shift() : 0.99); });
  await page.locator('.big-button').click();
  const shaking = await page.evaluate(() => document.querySelector('.play').getAnimations().length);
  await page.waitForTimeout(250);
  const rest = await page.evaluate(() => getComputedStyle(document.querySelector('.play')).transform);
  if (shaking < 1 || rest !== 'none') throw new Error(`[${name}] crit shake wrong (running=${shaking}, after=${rest})`);
  // Reduced motion: no shake.
  await page.evaluate(() => { const e = window.__socialLadder.engine; e.state.settings.reducedMotion = true; e.random = () => 0; e.changed(); });
  await page.locator('.big-button').click();
  const reduced = await page.evaluate(() => document.querySelector('.play').getAnimations().length);
  if (reduced !== 0) throw new Error(`[${name}] shake ran with reduced motion on`);
  await page.evaluate(() => { const e = window.__socialLadder.engine; e.state.settings.reducedMotion = false; e.random = Math.random; e.changed(); });

  // Buy the first business.
  await page.evaluate(() => window.__socialLadder.engine.buyBusiness('cans', 1));
  const owned = await page.evaluate(() => Object.values(window.__socialLadder.engine.state.businesses).reduce((a, b) => a + b, 0));
  await page.screenshot({ path: `${OUT}/${name}-play.png` });

  // Visit every tab.
  const tabs = page.locator('.tabs button');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/${name}-tab${i}.png` });
  }

  // Persistence across reload.
  await page.evaluate(() => window.__socialLadder.saveNow());
  const before = await page.evaluate(() => window.__socialLadder.engine.state.stats.totalClicks);
  await page.reload();
  await page.waitForSelector('.big-button');
  const after = await page.evaluate(() => window.__socialLadder.engine.state.stats.totalClicks);
  if (after !== before) throw new Error(`[${name}] save did not survive reload (${before} → ${after})`);

  // Horizontal overflow check.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) errors.push(`[${name}] horizontal overflow of ${overflow}px`);

  console.log(`${name}: money=${money} businessesOwned=${owned} clicks=${after} tabs=${n} overflow=${overflow}`);
  await page.close();
}

try {
  await run('desktop', { width: 1366, height: 800 });
  await run('mobile', { width: 390, height: 844 });
} finally {
  await browser.close();
}

if (errors.length) {
  console.error('Errors:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('E2E OK');
