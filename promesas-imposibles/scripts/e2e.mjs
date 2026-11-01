// Pruebas de humo de extremo a extremo con Playwright sobre la compilación de producción.
// Uso: npm run build && npm run build:poki && npm run e2e [-- --shots carpeta]
// Juega partidas completas a través de la interfaz (clics, toques y teclado) y comprueba
// iframe, móvil, tableta, almacenamiento bloqueado, bloqueador de anuncios, idioma y guardado.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shotDir = args.includes('--shots') ? resolve(args[args.indexOf('--shots') + 1]) : null;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

function serve(dir, port) {
  const p = spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' });
  return new Promise((res) => { p.stdout.on('data', (d) => { if (String(d).includes('Local')) res(p); }); setTimeout(() => res(p), 4000); });
}

const SETTINGS = (extra = {}) => JSON.stringify({ lang: 'es', volume: 0, muted: true, reducedMotion: true, textLarge: false, debateTimed: false, ...extra });

let rngState = 1;
const rnd = () => { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; };

/** Juega una partida completa eligiendo opciones al azar (con semilla) hasta el final. */
async function autoplay(page, { country = 'es', side = 0, cand = 0, maxSteps = 1500, input = 'click', shots = null, onStep = null } = {}) {
  const press = async (loc) => {
    if (input === 'tap') await loc.tap();
    else if (input === 'key') { const k = await loc.getAttribute('data-key'); if (k) await page.keyboard.press(k); else await loc.click(); }
    else await loc.click();
  };
  const seen = new Set();
  const snap = async (name) => { if (shots && !seen.has(name)) { seen.add(name); await page.screenshot({ path: `${shots}/${country}-${name}.png` }); } };
  await page.locator('.title-card .btn.primary').first().click();
  await page.locator('.setup .card.country .btn.primary').nth(['es', 'us', 'br'].indexOf(country)).click();
  await snap('candidatos');
  await page.locator('.setup .card.cand .btn.primary').nth(cand).click();
  await page.locator('.setup .card.side .btn.primary').nth(side).click();
  let steps = 0;
  const kinds = {};
  while (steps++ < maxSteps) {
    if (onStep) await onStep(steps);
    await page.waitForTimeout(15);
    const top = page.locator('.layer .panel').last();
    if (!(await top.count())) { await page.waitForTimeout(60); continue; }
    const cls = (await top.getAttribute('class')) ?? '';
    const kind = cls.split(' ').find((c) => !['panel', 'modal', 'scroll', 'wide'].includes(c)) ?? 'panel';
    kinds[kind] = (kinds[kind] ?? 0) + 1;
    await snap(kind);
    if (cls.includes('ending')) return { steps, kinds, ending: (await top.locator('h2').innerText()).trim() };
    if (cls.includes('title-card')) throw new Error('Volvió al menú inesperadamente');
    const skip = top.locator('.skip');
    if (await skip.count()) { await skip.click(); continue; }
    if (cls.includes('plan')) {
      const plus = top.locator('.plan-row .btn:not([disabled])', { hasText: '+' });
      while (await plus.count()) await plus.nth(Math.floor(rnd() * (await plus.count()))).click();
      await top.locator('.btn.primary').click();
      continue;
    }
    if (cls.includes('formation') || ((cls.includes('budget') || cls.includes('bill')) && (await top.locator('.nego').count()))) {
      const primary = top.locator('.btn.primary[data-key="1"]');
      if ((await primary.count()) && (await primary.isDisabled())) {
        // Concesiones que no se pueden pagar: retirarlas
        const on = top.locator('.tog.on');
        while (await on.count()) await on.first().click();
      } else if (rnd() < 0.7) {
        const togs = top.locator('.tog:not(.shady):not(.on)');
        const n = await togs.count();
        for (let i = 0; i < Math.min(3, n); i++) await togs.nth(Math.floor(rnd() * (await togs.count()))).click();
      }
    }
    const cands = top.locator('button[data-key]:not([disabled]):not(.ghost)');
    const n = await cands.count();
    if (!n) {
      const any = top.locator('button:not([disabled])').first();
      if (await any.count()) { await any.click(); continue; }
      await page.waitForTimeout(80);
      continue;
    }
    // En la agenda lateral, prioriza el hito y luego acciones; en lo demás, azar.
    const pick = cls.includes('agenda') && rnd() < 0.5 ? 0 : Math.floor(rnd() * n);
    await press(cands.nth(pick));
  }
  throw new Error(`Sin final tras ${maxSteps} pasos (${JSON.stringify(kinds)})`);
}

async function withPage(browser, opts, fn) {
  const ctx = await browser.newContext(opts.context ?? { viewport: { width: 1280, height: 720 } });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  if (opts.route) await opts.route(page);
  try { return await fn(page, errors, requests); } finally { await ctx.close(); }
}

const results = [];
function record(name, ok, detail) { results.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); }

const settingsInit = (extra, seed = 1000) => `window.__PI_SEED__ = ${seed}; try { localStorage.setItem('promesas-imposibles:settings', '${SETTINGS(extra)}'); } catch (e) {}`;

async function main() {
  const web = await serve('dist', 4173);
  const poki = await serve('dist-poki', 4174);
  const browser = await chromium.launch();
  const URL = 'http://localhost:4173/';
  const run = async (name, f) => { if (only && !name.includes(only)) return; try { await f(); } catch (e) { record(name, false, String(e).split('\n')[0]); } };

  // 1. Partidas completas en los tres países (ratón), con capturas opcionales
  for (const [i, country] of ['es', 'us', 'br'].entries()) {
    for (const side of [0, 1]) {
      await run(`partida completa ${country} ${side ? 'derecha' : 'izquierda'}`, () => withPage(browser, { init: settingsInit({}, 2000 + i * 10 + side) }, async (page, errors, reqs) => {
        rngState = 17 + i * 7 + side * 101;
        await page.goto(URL);
        const r = await autoplay(page, { country, side, cand: (i + side) % 4, shots: side === 0 ? shotDir : null });
        const external = reqs.filter((u) => !u.startsWith(URL) && !u.startsWith('data:'));
        record(`partida completa ${country} ${side ? 'derecha' : 'izquierda'}`, errors.length === 0 && external.length === 0, `${r.ending} · ${r.steps} pasos · pantallas ${Object.keys(r.kinds).join(',')}${errors.length ? ` · errores: ${errors.slice(0, 2).join(' | ')}` : ''}${external.length ? ` · peticiones externas: ${external.length}` : ''}`);
      }));
    }
  }

  // 2. Dentro de un iframe (como en el portal)
  await run('iframe', () => withPage(browser, { init: settingsInit() }, async (page, errors) => {
    await page.route('http://localhost:4173/host.html', (r) => r.fulfill({ contentType: 'text/html', body: `<html><body style="margin:0;height:2000px"><iframe id="g" src="${URL}" style="width:960px;height:540px;border:0"></iframe></body></html>` }));
    await page.goto('http://localhost:4173/host.html');
    const f = page.frameLocator('#g');
    await f.locator('.title-card .btn.primary').first().click();
    await f.locator('.setup .card.country .btn.primary').nth(1).click();
    await page.keyboard.press('ArrowDown');
    const scrolled = await page.evaluate(() => window.scrollY);
    record('iframe', errors.length === 0 && scrolled === 0, `scroll del anfitrión=${scrolled}${errors.length ? ` · ${errors[0]}` : ''}`);
  }));

  // 3. Móvil (vertical, táctil) y tableta (horizontal, táctil): partida completa con toques
  await run('móvil vertical táctil', () => withPage(browser, { init: settingsInit({}, 3003), context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } }, async (page, errors) => {
    rngState = 999;
    await page.goto(URL);
    const r = await autoplay(page, { country: 'br', input: 'tap', shots: shotDir ? `${shotDir}` : null, onStep: async (st) => { if (st === 30 && shotDir) await page.screenshot({ path: `${shotDir}/movil.png` }); } });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    record('móvil vertical táctil', errors.length === 0 && !overflow, `${r.ending} · ${r.steps} pasos · desbordamiento=${overflow}`);
  }));
  await run('tableta táctil', () => withPage(browser, { init: settingsInit({}, 3004), context: { viewport: { width: 1024, height: 768 }, hasTouch: true } }, async (page, errors) => {
    rngState = 4242;
    await page.goto(URL);
    const r = await autoplay(page, { country: 'us', input: 'tap', onStep: async (st) => { if (st === 40 && shotDir) await page.screenshot({ path: `${shotDir}/tableta.png` }); } });
    record('tableta táctil', errors.length === 0, `${r.ending} · ${r.steps} pasos`);
  }));

  // 4. Solo teclado
  await run('solo teclado', () => withPage(browser, { init: settingsInit({}, 3005) }, async (page, errors) => {
    rngState = 77;
    await page.goto(URL);
    const r = await autoplay(page, { country: 'es', input: 'key' });
    // Movimiento con flechas en el despacho o la sede
    record('solo teclado', errors.length === 0, `${r.ending} · ${r.steps} pasos`);
  }));
  await run('caminar con flechas', () => withPage(browser, { init: settingsInit() }, async (page, errors) => {
    await page.goto(URL);
    await page.keyboard.press('1'); // nueva partida
    await page.keyboard.press('1'); // España
    await page.keyboard.press('1'); // candidatura
    await page.keyboard.press('1'); // izquierda
    for (let i = 0; i < 300; i++) { const skip = page.locator('.skip'); if (await skip.count()) await skip.click(); else if (await page.locator('.choice[data-key="1"]').count()) await page.keyboard.press('1'); if (await page.locator('.agenda').count()) break; await page.waitForTimeout(20); }
    const x0 = await page.locator('.actor.is-player').evaluate((e) => e.getBoundingClientRect().x);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
    const x1 = await page.locator('.actor.is-player').evaluate((e) => e.getBoundingClientRect().x);
    record('caminar con flechas', errors.length === 0 && x1 > x0 + 5, `x ${Math.round(x0)} → ${Math.round(x1)}`);
  }));

  // 5. Sin almacenamiento (modo privado / cookies bloqueadas)
  await run('sin almacenamiento', () => withPage(browser, { init: `Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });` }, async (page, errors) => {
    rngState = 5;
    await page.goto(URL);
    const warn = await page.locator('.title-card .warn').count();
    const r = await autoplay(page, { country: 'us' });
    record('sin almacenamiento', errors.length === 0 && warn === 1, `aviso=${warn} · ${r.ending}`);
  }));

  // 6. Guardar, recargar y continuar (determinismo del estado)
  await run('guardar y continuar', () => withPage(browser, { init: settingsInit({}, 3006) }, async (page, errors) => {
    rngState = 31;
    await page.goto(URL);
    let snapshot = null;
    try {
      await autoplay(page, { country: 'es', maxSteps: 45, onStep: async (st) => { if (st === 40) snapshot = await page.evaluate(() => localStorage.getItem('promesas-imposibles:save')); } });
    } catch { /* se corta a propósito */ }
    await page.reload();
    const hasContinue = await page.locator('.title-card .btn.primary', { hasText: 'Continuar' }).count();
    await page.locator('.title-card .btn.primary').first().click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('promesas-imposibles:save') ?? '{}'));
    const before = JSON.parse(snapshot ?? '{}');
    const same = before.state && after.state && before.state.seed === after.state.seed;
    record('guardar y continuar', errors.length === 0 && hasContinue === 1 && same, `continuar=${hasContinue} · semilla conservada=${same} · fase=${after.state?.phase} ronda=${after.state?.round}`);
  }));

  // 7. Cambio de idioma en mitad de la partida
  await run('cambio de idioma', () => withPage(browser, { init: settingsInit() }, async (page, errors) => {
    await page.goto(URL);
    await page.locator('.title-card .btn.primary').first().click();
    await page.locator('.setup .card.country .btn.primary').first().click();
    await page.locator('.setup .card.cand .btn.primary').first().click();
    await page.locator('.setup .card.side .btn.primary').first().click();
    await page.keyboard.press('Escape');
    await page.locator('.overlay .btn', { hasText: 'Ajustes' }).click();
    await page.locator('.overlay .btn', { hasText: 'English' }).click();
    const txt = await page.locator('.overlay h2').innerText();
    await page.locator('.overlay .btn', { hasText: 'Close' }).click();
    const hud = await page.locator('.hud').innerText();
    record('cambio de idioma', errors.length === 0 && txt === 'Settings' && /Popularity/.test(hud), `título=${txt}`);
  }));

  // 8. Compilación Poki con el SDK bloqueado (bloqueador de anuncios) y sin red externa
  await run('poki con bloqueador', () => withPage(browser, { init: settingsInit({}, 3007), route: (p) => p.route(/poki\.com/, (r) => r.abort()) }, async (page, errors) => {
    rngState = 8;
    await page.goto('http://localhost:4174/');
    const r = await autoplay(page, { country: 'es', maxSteps: 1500 });
    const relevant = errors.filter((e) => !/poki|ERR_FAILED|Failed to load resource/i.test(e));
    record('poki con bloqueador', relevant.length === 0, `${r.ending}${relevant.length ? ` · ${relevant[0]}` : ''}`);
  }));
  // 9. Compilación Poki con un SDK simulado: gameplayStart/Stop y pausas solo en transiciones naturales.
  // Se prueban semillas hasta llegar al gobierno (las pausas solo existen entre rondas).
  await run('poki con SDK simulado', async () => {
    for (let seed = 1; seed <= 12; seed++) {
      const done = await withPage(browser, {
        init: settingsInit({}, seed) + `;window.__calls=[];window.PokiSDK={init:()=>Promise.resolve(),gameLoadingFinished:()=>__calls.push('loaded'),gameplayStart:()=>__calls.push('start'),gameplayStop:()=>__calls.push('stop'),commercialBreak:(f)=>{__calls.push('break');f&&f();return new Promise(r=>setTimeout(r,50));}};`,
        route: (p) => p.route(/poki\.com/, (r) => r.fulfill({ contentType: 'application/javascript', body: '/* stub */' })),
      }, async (page, errors) => {
        rngState = 9 + seed;
        await page.goto('http://localhost:4174/');
        const r = await autoplay(page, { country: 'us', side: 1 });
        if (!r.kinds.report || r.kinds.report < 3) return false;
        const calls = await page.evaluate(() => window.__calls);
        const breaks = calls.filter((c) => c === 'break').length;
        const ok = calls[0] === 'loaded' && calls.includes('start') && calls.includes('stop') && breaks >= 1;
        record('poki con SDK simulado', errors.length === 0 && ok, `semilla ${seed} · ${r.ending} · rondas ${r.kinds.report} · pausas=${breaks} · secuencia ${calls.filter((c, i) => c !== calls[i - 1]).join('→').slice(0, 120)}`);
        return true;
      });
      if (done) return;
    }
    record('poki con SDK simulado', false, 'ninguna semilla llegó al gobierno');
  });


  // 10. Historia de vivienda · la llamada: tiempo desde «Nueva partida» hasta que se registra la promesa,
  // en escritorio y en móvil, y captura del encuadre (manos y caras visibles).
  for (const [label, context] of [['escritorio', { viewport: { width: 1280, height: 720 } }], ['móvil', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]]) {
    await run(`vivienda: llamada de radio ${label}`, () => withPage(browser, { init: settingsInit({}, 1234), context }, async (page, errors) => {
      await page.goto(URL);
      const t0 = Date.now();
      await page.locator('.title-card .btn.primary').first().click();
      await page.locator('.setup .card.country .btn.primary').nth(0).click();
      await page.locator('.setup .card.cand .btn.primary').nth(1).click();
      await page.locator('.setup .card.side .btn.primary').nth(0).click();
      await page.locator('.dialog .choice').first().click();
      await page.waitForSelector('.dialog.call .choice');
      const nOpts = await page.locator('.dialog.call .choice').count();
      const actors = await page.locator('.actor.closeup').count();
      // Las dos figuras dentro de la pantalla y sin quedar tapadas por el diálogo (zona de manos y cara)
      const vis = await page.evaluate(() => {
        const dlg = document.querySelector('.dialog.call')?.getBoundingClientRect();
        return [...document.querySelectorAll('.actor.closeup')].map((a) => {
          const r = a.getBoundingClientRect();
          const inView = r.left >= -2 && r.right <= innerWidth + 2 && r.top >= -2;
          const face = { x: r.left + r.width / 2, y: r.top + r.height * 0.22 };
          const hands = { x: r.left + r.width / 2, y: r.top + r.height * 0.6 };
          const hidden = (pt) => !!dlg && pt.x > dlg.left && pt.x < dlg.right && pt.y > dlg.top && pt.y < dlg.bottom;
          return inView && !hidden(face) && !hidden(hands);
        });
      });
      if (shotDir) { await page.waitForTimeout(250); await page.screenshot({ path: `${shotDir}/vivienda-llamada-${label === 'móvil' ? 'movil' : 'escritorio'}.png` }); }
      await page.locator('.dialog.call .choice').nth(0).click();
      await page.waitForFunction(() => window.__PI_PROMISE_MS__ !== undefined);
      const wall = Date.now() - t0;
      const ms = await page.evaluate(() => window.__PI_PROMISE_MS__);
      await page.locator('.dialog .choice').first().click();
      await page.waitForSelector('.cork-note');
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('promesas-imposibles:save') ?? '{}'));
      const ok = errors.length === 0 && nOpts === 3 && actors === 2 && vis.every(Boolean) && save.state?.housing?.policy === 'rent_cap';
      record(`vivienda: llamada de radio ${label}`, ok, `opciones=${nOpts} · figuras visibles=${vis.join('/')} · promesa registrada a los ${ms} ms (reloj ${wall} ms, robot sin tiempo de lectura)${errors.length ? ` · ${errors[0]}` : ''}`);
    }));
  }

  // 11. Historia de vivienda · rendición de cuentas: se cargan partidas guardadas justo antes del debate de
  // reelección (npm run housing), se pulsa «Continuar» y se recorre el intercambio final.
  const hdir = resolve(root, 'test-results/housing');
  if (!existsSync(`${hdir}/es-full.json`)) spawnSync('npx', ['vite-node', 'scripts/housing-story.ts'], { cwd: root, stdio: 'inherit' });
  const exchanges = {};
  for (const name of ['es-full', 'es-negotiated', 'es-postpone', 'us-full', 'br-negotiated']) {
    await run(`vivienda: debate final ${name}`, () => withPage(browser, { init: settingsInit({}, 4000) }, async (page, errors) => {
      const file = readFileSync(`${hdir}/${name}.json`, 'utf8');
      const saved = JSON.parse(file);
      await page.addInitScript((f) => { if (!sessionStorage.getItem('pi-loaded')) { localStorage.setItem('promesas-imposibles:save', f); sessionStorage.setItem('pi-loaded', '1'); } }, file);
      await page.goto(URL);
      await page.locator('.title-card .btn.primary', { hasText: 'Continuar' }).click();
      await page.locator('.agenda .btn.primary[data-key="4"]').click();
      await page.locator('.dialog .choice').nth(1).click(); // debate sin reloj
      const lines = [];
      let defended = false, after = 0, reloaded = false;
      for (let i = 0; i < 14 && after < 2; i++) {
        const dlg = page.locator('.dialog').last();
        await dlg.locator('.choices.show .choice').first().waitFor();
        const kicker = (await dlg.locator('.kicker').count()) ? (await dlg.locator('.kicker').innerText()).trim() : '';
        const speaker = (await dlg.locator('.speaker b').count()) ? (await dlg.locator('.speaker b').innerText()).trim() : '';
        const text = (await dlg.locator('.dlg-text').innerText()).trim();
        const tape = (await dlg.locator('.tape').count()) ? (await dlg.locator('.tape').innerText()).replace(/\s+/g, ' ').trim() : '';
        const cls = (await dlg.getAttribute('class')) ?? '';
        const isDefense = /defiende tu gestión/i.test(kicker);
        const isCaller = /Lola|Denise|Rosângela/.test(speaker);
        const step = isDefense ? 'defensa' : tape ? 'grabacion' : cls.includes('whisper') ? 'susurro' : isCaller ? (defended ? 'respuesta' : 'oyente') : '';
        if (shotDir && step) await page.screenshot({ path: `${shotDir}/vivienda-${name}-${step}.png` });
        const choices = isDefense ? await dlg.locator('.choice .lbl').allInnerTexts() : [];
        lines.push({ speaker, kicker, text, tape, whisper: cls.includes('whisper'), choices });
        // Guardar y continuar a mitad del intercambio: se recarga justo antes de defenderse
        if (isDefense && !reloaded && name === 'es-negotiated') {
          reloaded = true;
          await page.reload();
          await page.locator('.title-card .btn.primary', { hasText: 'Continuar' }).click();
          await page.locator('.agenda .btn.primary[data-key="4"]').click();
          lines.push({ reload: true });
          continue;
        }
        if (defended) after++;
        await dlg.locator('.choices.show .choice').nth(isDefense ? Math.min(2, choices.length - 1) : 0).click();
        if (isDefense) defended = true;
      }
      const st = await page.evaluate(() => JSON.parse(localStorage.getItem('promesas-imposibles:save') ?? '{}').state);
      exchanges[name] = { outcome: st?.housing?.debate?.outcome, quote: saved.state.housing.quote.es, lines };
      const tapeOk = lines.some((l) => l.tape && l.tape.includes(saved.state.housing.quote.es));
      const callerOk = lines.some((l) => /Lola|Denise|Rosângela/.test(l.speaker ?? ''));
      const whisper = lines.some((l) => l.whisper);
      const ok = errors.length === 0 && defended && tapeOk && callerOk && !!st?.housing?.debate && (name !== 'es-negotiated' || reloaded);
      record(`vivienda: debate final ${name}`, ok, `desenlace=${st?.housing?.debate?.outcome} · grabación literal=${tapeOk} · vuelve la oyente=${callerOk} · susurro=${whisper}${reloaded ? ' · recargado y continuado a mitad' : ''}${errors.length ? ` · ${errors[0]}` : ''}`);
    }));
  }
  if (Object.keys(exchanges).length) writeFileSync(`${hdir}/intercambios-e2e.json`, JSON.stringify(exchanges, null, 2));

  // 12. Historia de vivienda en inglés: misma partida guardada, interfaz en inglés.
  await run('vivienda: debate final en inglés', () => withPage(browser, { init: settingsInit({ lang: 'en' }, 4001) }, async (page, errors) => {
    const file = readFileSync(`${hdir}/us-negotiated.json`, 'utf8');
    await page.addInitScript((f) => { if (!sessionStorage.getItem('pi-loaded')) { localStorage.setItem('promesas-imposibles:save', f); sessionStorage.setItem('pi-loaded', '1'); } }, file);
    await page.goto(URL);
    await page.locator('.title-card .btn.primary').first().click();
    await page.locator('.agenda .btn.primary[data-key="4"]').click();
    await page.locator('.dialog .choice').nth(1).click();
    const texts = [];
    for (let i = 0; i < 4; i++) {
      const dlg = page.locator('.dialog').last();
      await dlg.locator('.choices.show .choice').first().waitFor();
      texts.push((await dlg.innerText()).replace(/\s+/g, ' '));
      await dlg.locator('.choices.show .choice').first().click();
    }
    const joined = texts.join(' ');
    const english = /Recording|listener|rent/i.test(joined) && !/Grabación|alquiler|oyente/.test(joined);
    record('vivienda: debate final en inglés', errors.length === 0 && english, joined.slice(0, 160));
  }));

  await browser.close();
  web.kill(); poki.kill();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pruebas superadas`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
