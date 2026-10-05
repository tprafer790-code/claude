// Pruebas funcionales y de robustez (QA). Ejecuta recorridos esenciales en los
// modos estático, movimiento reducido y en vivo, y mide desbordamientos y consola.
// Uso: node scripts/qa.mjs [url]
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:4173/';
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'OK  ' : 'FALLO'} ${name}${detail ? ' — ' + detail : ''}`); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(q, vp = { width: 1440, height: 900 }, extra = {}) {
  const page = await browser.newPage({ viewport: vp, ...extra });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + q);
  return { page, errors };
}

// 1 · Modo estático: desbordamiento horizontal a 390/768/1440 y contenido
for (const w of [390, 768, 1440]) {
  const { page, errors } = await open('?static', { width: w, height: w < 500 ? 844 : 900 }, w < 500 ? { isMobile: true, hasTouch: true } : {});
  await page.waitForSelector('body.is-static');
  const over = await page.evaluate(() => {
    const W = document.documentElement.clientWidth; const bad = [];
    for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed' && !el.closest('.visually-hidden, .skip, .rail .lbl, .hotspot, .details-list')) bad.push(el.tagName + '.' + el.className); }
    return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) };
  });
  ok(`Sin desbordamiento horizontal a ${w}px (estático)`, over.sw <= over.W && over.bad.length === 0, JSON.stringify(over));
  const imgs = await page.evaluate(() => [...document.querySelectorAll('.still-stage img')].length);
  ok(`Versión estática con ${imgs} planos de capítulo a ${w}px`, imgs === 5);
  ok(`Consola sin errores (estático ${w}px)`, errors.length === 0, errors.join(' | '));
  await page.close();
}

// 2 · Teclado, menú, capítulos, formulario (estático, rápido)
{
  const { page, errors } = await open('?static');
  await page.waitForSelector('body.is-static');
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.textContent.trim());
  ok('Primer foco: enlace de salto', first.startsWith('Saltar'), first);
  await page.click('#menu-btn');
  ok('Menú se abre y enfoca', await page.evaluate(() => !document.getElementById('menu').hidden && document.getElementById('menu').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  ok('Esc cierra el menú y devuelve el foco', await page.evaluate(() => document.getElementById('menu').hidden && document.activeElement.id === 'menu-btn'));
  await page.click('#menu-btn');
  await page.click('#menu-chapters [data-goto="3"]');
  await page.waitForTimeout(600);
  const cur = await page.evaluate(() => ({ ch: document.querySelector('.chapter.is-active')?.id, focus: document.activeElement.id }));
  ok('Menú → capítulo IV navega y enfoca su título', cur.ch === 'apertura' && cur.focus === 't-apertura', JSON.stringify(cur));
  await page.click('.rail [data-goto="0"]');
  await page.waitForTimeout(600);
  ok('Raíl → capítulo I', await page.evaluate(() => document.querySelector('.chapter.is-active')?.id === 'descubrimiento'));
  // detalle desde la lista accesible
  await page.click('.rail [data-goto="2"]'); await page.waitForTimeout(600);
  await page.click('.details-list [data-hotspot="banera"]');
  const d = await page.evaluate(() => ({ open: !document.getElementById('detail').hidden, title: document.getElementById('detail-title').textContent, focus: document.activeElement.id }));
  ok('Detalle de la suite se abre con contenido y foco', d.open && d.title.includes('Bañera') && d.focus === 'detail-title', JSON.stringify(d));
  await page.keyboard.press('Escape');
  ok('Esc cierra el detalle y devuelve el foco', await page.evaluate(() => document.getElementById('detail').hidden && document.activeElement.dataset.hotspot === 'banera'));
  // estancias
  await page.click('[data-room="suite-agua"]');
  ok('Diálogo de estancia abre con datos', await page.evaluate(() => document.getElementById('room-dialog').open && document.getElementById('room-title').textContent === 'Suite Agua'));
  await page.keyboard.press('Escape');
  ok('Diálogo de estancia cierra con Esc', await page.evaluate(() => !document.getElementById('room-dialog').open));
  // formulario: errores
  await page.click('#contact-form button[type=submit]');
  const errs = await page.evaluate(() => [...document.querySelectorAll('[aria-invalid=true]')].map((e) => e.id));
  ok('Formulario vacío marca 3 errores y enfoca el primero', errs.length === 3 && (await page.evaluate(() => document.activeElement.id)) === 'f-name', errs.join(','));
  await page.fill('#f-name', 'Ana Prueba'); await page.fill('#f-email', 'ana@ejemplo.es'); await page.fill('#f-msg', 'Querríamos información para mayo.');
  await page.selectOption('#f-room', 'Suite Bosque');
  await page.evaluate(() => { window.__nav = []; const d = Object.getOwnPropertyDescriptor(Location.prototype, 'href'); });
  await page.click('#contact-form button[type=submit]');
  await page.waitForTimeout(300);
  const mail = await page.evaluate(() => ({ url: window.__silvaLastMailto || '', status: document.getElementById('form-status').textContent }));
  ok('Formulario válido prepara mailto con datos', mail.url.startsWith('mailto:') && decodeURIComponent(mail.url).includes('Suite Bosque') && decodeURIComponent(mail.url).includes('Ana Prueba'), mail.url.slice(0, 80));
  ok('Estado declara que no se ha enviado', /no se ha enviado/i.test(mail.status), mail.status.slice(0, 90));
  ok('Consola sin errores (recorridos estáticos)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// 3 · Movimiento reducido con WebGL: planos fijos, sin errores
{
  const { page, errors } = await open('?reduced&q=low', { width: 1280, height: 800 });
  await page.waitForFunction(() => window.__silva);
  const mode = await page.evaluate(() => ({ mode: window.__silva.state.mode, rm: document.body.classList.contains('reduce-motion') }));
  ok('Movimiento reducido activa planos fijos', mode.mode === 'reduced' && mode.rm, JSON.stringify(mode));
  await page.evaluate(() => window.__silva.goToChapter(4));
  await page.waitForFunction(() => window.__silva.state.stillKey === 13, null, { timeout: 30000 }).catch(() => {});
  const k = await page.evaluate(() => window.__silva.state.stillKey);
  ok('Salto a capítulo V usa el plano fijo final (clave 13)', k === 13, String(k));
  ok('Consola sin errores (movimiento reducido)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// 4 · Sin WebGL: forzar fallo de contexto
{
  const { page, errors } = await open('', { width: 1280, height: 800 });
  await page.close();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { HTMLCanvasElement.prototype.getContext = function () { return null; }; });
  const p2 = await ctx.newPage();
  await p2.goto(base);
  await p2.waitForSelector('body.is-static', { timeout: 20000 });
  ok('Sin WebGL: cae a la versión estática', true);
  await ctx.close();
}

// 5 · En vivo: carga, hotspots visibles en la suite, detalle con perspectiva
{
  const { page, errors } = await open('?q=low', { width: 1280, height: 800 });
  const t0 = Date.now();
  await page.waitForFunction(() => window.__silva);
  ok('Carga de la escena (SwiftShader, calidad baja)', true, `${Date.now() - t0} ms hasta escena lista`);
  await page.evaluate(() => { const S = window.__silva; window.scrollTo(0, S.scrollToU(S.keyCenter(8))); S.state.freeze = true; });
  const f0 = await page.evaluate(() => window.__silva.engine.stats.frames);
  await page.waitForFunction((f) => window.__silva.engine.stats.frames >= f + 2, f0, { polling: 500 });
  const vis = await page.evaluate(() => [...document.querySelectorAll('.hotspot.is-visible')].map((m) => m.dataset.hotspot));
  ok('Hotspots visibles en la suite', vis.length >= 2, vis.join(','));
  await page.evaluate(() => { window.__silva.state.freeze = false; window.__silva.openDetail('lino'); });
  await page.waitForTimeout(4000);
  const b = await page.evaluate(() => window.__silva.state.blend);
  ok('Detalle mueve la cámara a la perspectiva adicional', b > 0.3, `mezcla ${b.toFixed(2)}`);
  ok('Consola sin errores (en vivo)', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones superadas`);
process.exit(failed.length ? 1 : 0);
