'use strict';

/**
 * TESTPILOT - Fase 1, Paso 1
 *
 *   1. Carga de .env
 *   2. Navegador: Chromium + Stealth + emulacion iPhone 13 (firma verificada)
 *   3. Set-of-Mark: marcas numeradas sobre los elementos interactivos visibles
 *   4. Interprete de acciones JSON (sin eval / Function / child_process)
 *
 *   5. Self-healing: si una accion falla, el planificador recibe la captura
 *      marcada y devuelve un nuevo array JSON, que se guarda en el archivo.
 *      Planificador = Claude (claude.js) o, sin clave de API, simulado (mock.js).
 *   6. Informe HTML auto-contenido al terminar (report.js).
 *
 * Uso:  node init.js [url] [ruta-acciones.json] [--goal "objetivo de la prueba"]
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. ENTORNO
// ---------------------------------------------------------------------------
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  goal: process.env.TEST_GOAL || '',
  maxHeals: Number(process.env.MAX_HEALS) || 5,
  targetUrl: process.env.TARGET_URL || 'https://example.com',
  headless: String(process.env.HEADLESS || 'false').toLowerCase() === 'true',
  chromiumPath: process.env.CHROMIUM_PATH || undefined,
  outputDir: path.join(__dirname, 'output'),
  actionTimeout: 10000,
  networkIdleTimeout: 15000,
};

// ---------------------------------------------------------------------------
// 2. NAVEGADOR: STEALTH + IPHONE 13
// ---------------------------------------------------------------------------
const { chromium } = require('playwright-extra');
const { devices } = require('playwright');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const DEVICE_NAME = 'iPhone 13';
const DEVICE = devices[DEVICE_NAME];

const stealth = StealthPlugin();
// Estas evasiones fabrican una identidad de Chrome de ESCRITORIO. Con un
// perfil de iPhone producirian una firma contradictoria (UA de Safari iOS con
// window.chrome, vendor "Google Inc." o un UA reescrito), que es justo lo que
// detecta un anti-bot. Se desactivan; el resto de evasiones sigue activo.
[
  'user-agent-override',
  'navigator.vendor',
  'chrome.app',
  'chrome.csi',
  'chrome.loadTimes',
  'chrome.runtime',
].forEach((evasion) => stealth.enabledEvasions.delete(evasion));
chromium.use(stealth);

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    executablePath: CONFIG.chromiumPath,
  });

  // Se pasan de forma explicita todos los campos de la firma del dispositivo.
  // No se usa "...DEVICE" porque incluye defaultBrowserType ("webkit"), que no
  // es una opcion valida de newContext().
  const context = await browser.newContext({
    userAgent: DEVICE.userAgent,
    viewport: DEVICE.viewport,
    deviceScaleFactor: DEVICE.deviceScaleFactor,
    isMobile: DEVICE.isMobile,
    hasTouch: DEVICE.hasTouch,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  });

  // Propiedades de navigator coherentes con un iPhone real.
  await context.addInitScript(() => {
    const define = (name, value) => {
      try {
        Object.defineProperty(Navigator.prototype, name, { get: () => value, configurable: true });
      } catch (_) { /* propiedad no redefinible: se ignora */ }
    };
    define('platform', 'iPhone');
    define('vendor', 'Apple Computer, Inc.');
    define('maxTouchPoints', 5);
    define('userAgentData', undefined); // Safari no expone Client Hints
    try { delete window.chrome; } catch (_) { /* no eliminable */ } // Safari no tiene window.chrome
  });

  context.setDefaultTimeout(CONFIG.actionTimeout);
  const page = await context.newPage();
  return { browser, context, page };
}

/** Comprueba que lo que ve la pagina coincide EXACTAMENTE con el perfil pedido. */
async function verifyFingerprint(page) {
  const seen = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    width: window.innerWidth,
    height: window.innerHeight,
    deviceScaleFactor: window.devicePixelRatio,
    platform: navigator.platform,
    vendor: navigator.vendor,
    webdriver: navigator.webdriver,
    maxTouchPoints: navigator.maxTouchPoints,
    hasWindowChrome: typeof window.chrome !== 'undefined',
  }));

  const expected = {
    userAgent: DEVICE.userAgent,
    width: DEVICE.viewport.width,
    height: DEVICE.viewport.height,
    deviceScaleFactor: DEVICE.deviceScaleFactor,
    platform: 'iPhone',
    vendor: 'Apple Computer, Inc.',
  };

  const mismatches = Object.keys(expected)
    .filter((key) => seen[key] !== expected[key])
    .map((key) => `${key}: esperado "${expected[key]}", obtenido "${seen[key]}"`);
  if (seen.webdriver) mismatches.push('navigator.webdriver esta activo (stealth no aplicado)');

  return { ok: mismatches.length === 0, mismatches, seen };
}

/** networkidle con limite: hay paginas (analitica, websockets) que nunca quedan en reposo. */
async function settle(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: CONFIG.networkIdleTimeout });
  } catch (_) {
    console.warn('[aviso] networkidle no alcanzado en el tiempo limite; se continua.');
  }
}

// ---------------------------------------------------------------------------
// 3. SET-OF-MARK
// ---------------------------------------------------------------------------
// Todo lo que hay dentro de estas dos funciones se ejecuta DENTRO de la pagina.
// Es codigo fijo de este archivo, nunca generado por el LLM.

function somClearInPage() {
  const layer = document.getElementById('__testpilot_som__');
  if (layer) layer.remove();
  document.querySelectorAll('[data-testpilot-id]').forEach((el) => el.removeAttribute('data-testpilot-id'));
}

function somDrawInPage() {
  const LAYER_ID = '__testpilot_som__';
  const ATTR = 'data-testpilot-id';
  const QUERY = 'a, button, input, select, [role="button"]';

  const previous = document.getElementById(LAYER_ID);
  if (previous) previous.remove();
  document.querySelectorAll('[' + ATTR + ']').forEach((el) => el.removeAttribute(ATTR));

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  function isVisible(el, rect) {
    if (rect.width < 4 || rect.height < 4) return false;
    // Solo lo que cae dentro del viewport: es lo unico que sale en la captura.
    if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= vh || rect.left >= vw) return false;
    if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    if (el.tagName === 'INPUT' && el.type === 'hidden') return false;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      if (parseFloat(style.opacity) === 0) return false;
    }
    return true;
  }

  function isUnique(selector) {
    try { return document.querySelectorAll(selector).length === 1; } catch (_) { return false; }
  }

  // Selector CSS estable (sirve tambien en ejecuciones futuras). Orden de
  // preferencia: atributos de test > id > name > ruta estructural.
  function buildSelector(el) {
    const tag = el.tagName.toLowerCase();
    for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-qa']) {
      const value = el.getAttribute(attr);
      if (value) {
        const sel = '[' + attr + '="' + CSS.escape(value) + '"]';
        if (isUnique(sel)) return sel;
      }
    }
    if (el.id) {
      const sel = '#' + CSS.escape(el.id);
      if (isUnique(sel)) return sel;
    }
    const name = el.getAttribute('name');
    if (name) {
      const sel = tag + '[name="' + CSS.escape(name) + '"]';
      if (isUnique(sel)) return sel;
    }
    const parts = [];
    for (let node = el; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
      if (node.id && isUnique('#' + CSS.escape(node.id))) {
        parts.unshift('#' + CSS.escape(node.id));
        break;
      }
      const nodeTag = node.tagName.toLowerCase();
      let index = 1;
      for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (sib.tagName === node.tagName) index++;
      }
      parts.unshift(nodeTag + ':nth-of-type(' + index + ')');
    }
    const sel = parts.join(' > ');
    return isUnique(sel) ? sel : null;
  }

  const layer = document.createElement('div');
  layer.id = LAYER_ID;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:absolute;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;' +
    'pointer-events:none;z-index:2147483647;';

  // El desplazamiento se suma a getBoundingClientRect() para trabajar en
  // coordenadas de documento: las marcas no se descuadran aunque haya scroll.
  // Si <html> tuviera un transform/posicionamiento que mueva el origen, se
  // corrige con el desfase medido de la propia capa.
  document.documentElement.appendChild(layer);
  const origin = layer.getBoundingClientRect();
  const originX = origin.left + window.scrollX; // posicion de la capa en el documento (normalmente 0)
  const originY = origin.top + window.scrollY;

  const marks = {};
  let counter = 0;

  for (const el of document.querySelectorAll(QUERY)) {
    const rect = el.getBoundingClientRect();
    if (!isVisible(el, rect)) continue;

    counter++;
    const id = String(counter);
    el.setAttribute(ATTR, id);

    const box = document.createElement('div');
    box.style.cssText =
      'position:absolute;box-sizing:border-box;pointer-events:none;margin:0;padding:0;' +
      'border:3px solid #ff0000;background:transparent;z-index:2147483647;' +
      'left:' + (rect.left + window.scrollX - originX) + 'px;' +
      'top:' + (rect.top + window.scrollY - originY) + 'px;' +
      'width:' + rect.width + 'px;height:' + rect.height + 'px;';

    const label = document.createElement('div');
    label.textContent = id;
    label.style.cssText =
      // Encima del recuadro para no tapar el texto del elemento; si no hay
      // sitio (elemento pegado al borde superior), dentro de la esquina.
      'position:absolute;left:-3px;top:' + (rect.top >= 18 ? -20 : -3) + 'px;margin:0;padding:1px 4px;' +
      'background:#000000;color:#ffff00;font:bold 13px/15px Arial,Helvetica,sans-serif;' +
      'white-space:nowrap;pointer-events:none;z-index:2147483647;';
    box.appendChild(label);
    layer.appendChild(box);

    const text = (el.innerText || el.value || el.getAttribute('aria-label') ||
      el.getAttribute('placeholder') || el.getAttribute('title') || '')
      .replace(/\s+/g, ' ').trim().slice(0, 80);

    marks[id] = {
      selector: buildSelector(el),               // estable entre ejecuciones (puede ser null)
      fallbackSelector: '[' + ATTR + '="' + id + '"]', // valido solo para este marcado
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || null,
      role: el.getAttribute('role') || null,
      text: text,
    };
  }

  return marks;
}

/** Dibuja las marcas y devuelve el diccionario { idVisual: { selector, ... } }. */
async function injectSetOfMark(page) {
  return page.evaluate(somDrawInPage);
}

async function clearSetOfMark(page) {
  await page.evaluate(somClearInPage).catch(() => {});
}

/** Captura SOLO del viewport, en JPEG y Base64 (nunca fullPage). */
async function captureViewport(page, saveAs) {
  const buffer = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
  if (saveAs) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    fs.writeFileSync(path.join(CONFIG.outputDir, saveAs), buffer);
  }
  return buffer.toString('base64');
}

/** Marcado + captura + diccionario: el paquete que recibira el LLM. */
async function observe(page, saveAs) {
  const marks = await injectSetOfMark(page);
  const screenshotBase64 = await captureViewport(page, saveAs);
  return { marks, screenshotBase64, url: page.url() };
}

// ---------------------------------------------------------------------------
// 4. INTERPRETE DE ACCIONES JSON
// ---------------------------------------------------------------------------
// Formato de cada accion:
//   { "action": "click",  "id_visual": "12" }
//   { "action": "fill",   "selector": "#email", "value": "a@b.es" }
//   { "action": "fill",   "frame": "iframe[name^='__privateStripeFrame']",
//                         "selector": "input[name='cardnumber']", "value": "4242..." }
// Solo se ejecuta lo que figura en esta lista blanca. Una accion desconocida
// se trata como un fallo, nunca se interpreta como codigo.

const SCROLL_STEP = 500;

const ACTION_HANDLERS = {
  goto: async ({ page, action }) => {
    requireFields(action, ['url']);
    await page.goto(action.url, { waitUntil: 'domcontentloaded' });
  },
  click: async ({ target }) => { await target.click(); },
  fill: async ({ target, action }) => {
    requireFields(action, ['value']);
    await target.fill(String(action.value));
  },
  select: async ({ target, action }) => {
    requireFields(action, ['value']);
    await target.selectOption(String(action.value));
  },
  press: async ({ page, target, action }) => {
    requireFields(action, ['key']);
    if (target) await target.press(String(action.key));
    else await page.keyboard.press(String(action.key));
  },
  scroll: async ({ page, action }) => {
    const sign = action.direction === 'up' ? -1 : 1;
    const amount = Number.isFinite(Number(action.amount)) ? Number(action.amount) : SCROLL_STEP;
    // scrollBy es inmediato; mouse.wheel se aplica con retraso y el marcado
    // posterior fotografiaba la pagina antes de que terminara de moverse.
    await page.evaluate((dy) => window.scrollBy(0, dy), sign * amount);
  },
  wait: async ({ page, action }) => {
    await page.waitForTimeout(Math.min(Number(action.ms) || 1000, 30000));
  },
};

const NEEDS_TARGET = new Set(['click', 'fill', 'select']);

function requireFields(action, fields) {
  for (const field of fields) {
    if (action[field] === undefined || action[field] === null) {
      throw new Error(`La accion "${action.action}" requiere el campo "${field}".`);
    }
  }
}

/** Traduce id_visual / selector (+ frame opcional) a un Locator de Playwright. */
function resolveTarget(page, action, marks) {
  let selector = action.selector;
  if (!selector && action.id_visual !== undefined) {
    const mark = marks[String(action.id_visual)];
    if (!mark) throw new Error(`El id_visual "${action.id_visual}" no existe en el marcado actual.`);
    selector = mark.selector || mark.fallbackSelector;
  }
  if (!selector) return null;

  // Iframes (Stripe, Redsys...): frameLocator atraviesa iframes cross-origin
  // de forma nativa. "frame" admite un selector o una lista para anidados.
  let scope = page;
  if (action.frame) {
    const frames = Array.isArray(action.frame) ? action.frame : [action.frame];
    for (const frameSelector of frames) scope = scope.frameLocator(String(frameSelector));
  }
  return scope.locator(selector).first();
}

/**
 * Ejecuta el array de acciones. Si una falla: captura el error, vuelve a
 * marcar y fotografiar la pagina y llama a onFailure(contexto).
 *   - onFailure devuelve un array -> sustituye a las acciones pendientes.
 *   - onFailure devuelve otra cosa -> la ejecucion se detiene.
 * onExhausted(contexto) se llama igual cuando la lista se agota sin fallos,
 * para que el planificador pueda continuar un plan parcial.
 */
async function runActions(page, actions, options = {}) {
  const { onFailure = null, onExhausted = null, maxHeals = 3 } = options;
  if (!Array.isArray(actions)) throw new Error('El archivo de acciones debe contener un array JSON.');

  let queue = actions.slice();
  let marks = options.marks || (await injectSetOfMark(page));
  const done = [];
  let heals = 0;

  while (true) {
    if (queue.length === 0) {
      // Plan agotado: si hay planificador, se le pregunta si queda algo.
      if (!onExhausted || heals >= maxHeals) break;
      heals++;
      const observation = await observe(page, `estado-${Date.now()}.jpg`);
      marks = observation.marks;
      const next = await onExhausted({ done, pending: [], ...observation });
      if (!Array.isArray(next) || next.length === 0) break;
      queue = next.slice();
      continue;
    }

    const action = queue[0];
    try {
      if (!action || typeof action !== 'object' || Array.isArray(action)) {
        throw new Error('Cada accion debe ser un objeto JSON.');
      }
      const handler = Object.prototype.hasOwnProperty.call(ACTION_HANDLERS, action.action)
        ? ACTION_HANDLERS[action.action]
        : null;
      if (!handler) throw new Error(`Accion no permitida: "${action.action}".`);

      const target = resolveTarget(page, action, marks);
      if (!target && NEEDS_TARGET.has(action.action)) {
        throw new Error(`La accion "${action.action}" requiere "id_visual" o "selector".`);
      }

      // Las marcas se retiran antes de actuar para no interferir con la pagina.
      await clearSetOfMark(page);
      await handler({ page, action, target });
      await settle(page);

      // En el historial se guarda el selector estable en lugar del id_visual,
      // que solo era valido para el marcado de ese instante.
      const mark = action.selector ? null : marks[String(action.id_visual)];
      if (mark && mark.selector) {
        const { id_visual: _omit, ...rest } = action;
        done.push({ ...rest, selector: mark.selector });
      } else {
        done.push(action);
      }
      queue.shift();
      console.log(`[ok]    ${JSON.stringify(action)}`);

      // La pagina ha podido cambiar: los id_visual se recalculan.
      marks = await injectSetOfMark(page);
    } catch (error) {
      const message = String((error && error.message) || error).split('\n')[0];
      console.error(`[fallo] ${JSON.stringify(action)} -> ${message}`);

      let observation = null;
      try {
        observation = await observe(page, `fallo-${Date.now()}.jpg`);
        marks = observation.marks;
      } catch (captureError) {
        console.error(`[fallo] No se pudo capturar el estado: ${captureError.message}`);
      }

      const failure = {
        failedAction: action,
        error: message,
        done,
        pending: queue.slice(),
        ...(observation || {}),
      };

      if (!onFailure || heals >= maxHeals) return { ok: false, done, failure, heals };

      heals++;
      const healed = await onFailure(failure);
      if (!Array.isArray(healed)) return { ok: false, done, failure, heals };
      queue = healed.slice();
    }
  }

  return { ok: true, done, failure: null, heals };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const positional = [];
  let goal = CONFIG.goal;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--goal') goal = argv[++i] || '';
    else positional.push(argv[i]);
  }
  return {
    url: positional[0] || CONFIG.targetUrl,
    actionsFile: path.resolve(positional[1] || path.join(__dirname, 'actions.json')),
    goal: goal.trim(),
  };
}

function saveActions(file, actions) {
  fs.writeFileSync(file, JSON.stringify(actions, null, 2) + '\n');
  console.log(`[json]  ${path.basename(file)} actualizado (${actions.length} acciones).`);
}

async function main() {
  const { url, actionsFile, goal } = parseArgs(process.argv.slice(2));
  // Con objetivo hay planificador. Sin clave de API se usa el simulado (mock.js),
  // que no llama a ninguna API; con clave, Claude (claude.js).
  const plannerEnabled = Boolean(goal);
  const simulated = !CONFIG.apiKey;
  const plannerName = simulated ? 'mock' : 'claude';

  // Todo lo que necesita el informe se va anotando aqui durante la ejecucion.
  const run = {
    url,
    goal,
    device: DEVICE_NAME,
    mode: !plannerEnabled ? 'sin planificador' : simulated ? 'simulado' : 'real',
    model: CONFIG.model,
    actionsFile,
    startedAt: new Date(),
    finishedAt: null,
    status: 'fallo',
    summary: '',
    done: [],
    failed: null,
    pending: [],
    plannerLog: [],
    screenshotBase64: null,
  };
  let writeReport = true;
  let browser = null;
  let page = null;

  try {
    ({ browser, page } = await launchBrowser());
    console.log(`Dispositivo: ${DEVICE_NAME} | headless: ${CONFIG.headless}`);
    console.log(`Abriendo:    ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    const fingerprint = await verifyFingerprint(page);
    console.log('Firma vista por la pagina:', fingerprint.seen);
    if (!fingerprint.ok) {
      throw new Error('La firma no coincide con el dispositivo:\n  - ' + fingerprint.mismatches.join('\n  - '));
    }
    console.log('Firma movil verificada.');
    console.log(`Titulo:      ${await page.title()}`);

    const observation = await observe(page, 'som.jpg');
    fs.writeFileSync(path.join(CONFIG.outputDir, 'som-map.json'), JSON.stringify(observation.marks, null, 2));
    console.log(`Set-of-Mark: ${Object.keys(observation.marks).length} elementos -> output/som.jpg y output/som-map.json`);

    const hasFile = fs.existsSync(actionsFile);
    if (!hasFile && !goal) {
      console.log('Sin archivo de acciones ni objetivo (--goal): solo se ha generado el marcado.');
      writeReport = false; // no ha habido prueba: no hay nada que informar
      run.status = 'exito';
      return;
    }
    if (!plannerEnabled) console.log('Planificador: inactivo (no se ha indicado --goal). Se ejecuta el guion tal cual.');
    else if (simulated) console.log('Planificador: SIMULADO (ANTHROPIC_API_KEY vacia). No se llama a ninguna API.');
    else console.log(`Planificador: Claude (modelo ${CONFIG.model})`);

    // Consulta al planificador y deja el archivo JSON al dia. Devuelve el
    // array de acciones pendientes, o null si hay que detenerse.
    let finished = false; // el planificador ha declarado el objetivo cumplido
    let planChanged = false;
    const askPlanner = async (context) => {
      const { requestPlan } = require(simulated ? './mock.js' : './claude.js');
      const trigger = context.failedAction ? 'fallo' : (context.done || []).length ? 'continuar' : 'inicial';
      let plan;
      try {
        plan = await requestPlan({
          model: CONFIG.model,
          goal,
          url: context.url || page.url(),
          marks: context.marks || {},
          screenshotBase64: context.screenshotBase64,
          done: context.done || [],
          failure: context.failedAction ? context : null,
        });
      } catch (error) {
        console.error(`[${plannerName}] ${error.message}`);
        run.plannerLog.push({ trigger, status: 'error', reason: error.message });
        return null;
      }
      run.plannerLog.push({ trigger, status: plan.status, reason: plan.reason });
      if (plan.status === 'done') { finished = true; return []; }
      if (plan.status === 'blocked') return null;
      planChanged = true;
      saveActions(actionsFile, [...(context.done || []), ...plan.actions]);
      return plan.actions;
    };

    let actions;
    if (hasFile) {
      actions = JSON.parse(fs.readFileSync(actionsFile, 'utf8'));
    } else {
      console.log('Sin archivo de acciones: se pide el plan inicial al planificador.');
      actions = await askPlanner({ ...observation, done: [] });
      if (!actions) throw new Error('No se pudo obtener un plan inicial.');
    }

    const result = await runActions(page, actions, {
      marks: observation.marks,
      maxHeals: CONFIG.maxHeals,
      onFailure: plannerEnabled ? askPlanner : null,
      // Con archivo propio y sin fallos no se consulta al planificador: se respeta el guion.
      onExhausted: plannerEnabled && !hasFile ? askPlanner : null,
    });

    // Al terminar, el archivo queda con lo realmente ejecutado y selectores estables.
    if (result.ok && planChanged) saveActions(actionsFile, result.done);

    run.done = result.done;
    if (!result.ok) {
      const failure = result.failure;
      run.failed = { action: failure.failedAction, error: failure.error };
      run.pending = failure.pending.slice(1); // la primera pendiente es la que ha fallado
      run.screenshotBase64 = failure.screenshotBase64 || null;
      run.summary = `La prueba se detuvo en el paso ${result.done.length + 1}: ${failure.error}`;
      console.log(`Detenido en: ${JSON.stringify(failure.failedAction)} (${failure.error})`);
    } else if (plannerEnabled && !hasFile && !finished) {
      run.summary = `Se ejecutaron ${result.done.length} pasos sin errores, pero el planificador no confirmó que el objetivo se haya cumplido (límite de ${CONFIG.maxHeals} consultas o bloqueo).`;
      console.log(`Acciones ejecutadas: ${result.done.length}, pero el planificador no ha confirmado el objetivo.`);
    } else {
      run.status = 'exito';
      run.summary = `Se completaron los ${result.done.length} pasos de la prueba` +
        (finished ? ' y el planificador confirmó el objetivo.' : '.') +
        (result.heals && planChanged ? ' Se reparó automáticamente al menos un paso.' : '');
      console.log(`Acciones completadas: ${result.done.length}${finished ? ' - objetivo confirmado por el planificador.' : ''}`);
    }
  } catch (error) {
    // Error critico: fuera del interprete (navegador, navegacion, firma, JSON ilegible...).
    run.status = 'fallo';
    run.summary = `Error crítico: ${error.message}`;
    console.error(`ERROR: ${error.message}`);
  } finally {
    // Captura para el informe si aun no hay ninguna (exito, o error critico).
    if (writeReport && !run.screenshotBase64 && page) {
      try {
        await clearSetOfMark(page);
        run.screenshotBase64 = await captureViewport(page);
      } catch (_) { /* la pagina ya no esta disponible */ }
    }
    if (browser) await browser.close().catch(() => {});

    if (writeReport) {
      run.finishedAt = new Date();
      try {
        const { generateReport } = require('./report.js');
        const file = generateReport(run, CONFIG.outputDir);
        console.log(`Informe:     ${path.relative(process.cwd(), file)}`);
      } catch (error) {
        console.error(`No se pudo generar el informe: ${error.message}`);
      }
    }
    process.exitCode = run.status === 'exito' ? 0 : 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  CONFIG,
  launchBrowser,
  verifyFingerprint,
  settle,
  injectSetOfMark,
  clearSetOfMark,
  captureViewport,
  observe,
  runActions,
};
