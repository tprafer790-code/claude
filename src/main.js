// Orquestación: capítulos HTML + escena 3D + navegación + modos alternativos.
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/geist-mono/400.css';
import './styles/main.css';
import { brand } from './config/brand.js';
import { KEYS } from './journey/keys.js';
import { Journey } from './journey/path.js';
import { renderChapters, renderNav, setCurrent } from './ui/chapters.js';
import { initContact } from './ui/contact.js';
import { initRooms } from './ui/rooms.js';
import { createAmbience } from './ui/audio.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const journey = new Journey(KEYS);            // misma tabla que usa el motor
const UNIT = () => innerHeight * 0.78;        // px de scroll por unidad de recorrido

// ---------- Contenido y navegación ----------
document.querySelectorAll('[data-brand-name]').forEach((n) => { if (!n.getAttribute('aria-label')) n.textContent = brand.name; });
document.querySelectorAll('[data-brand-descriptor]').forEach((n) => (n.textContent = brand.descriptor));
document.querySelectorAll('[data-brand-location]').forEach((n) => (n.textContent = `${brand.locationLabel} · ${brand.coordinates}`));
const chapters = renderChapters($('journey'));
renderNav($('rail'), $('menu-chapters'));
const contact = initContact();
initRooms(contact);

// Altura de cada capítulo proporcional a su longitud de recorrido.
const stillKey = brand.chapters.map((_, i) => KEYS.findIndex((k) => k.ch === i && k.still));
function layout() {
  const cs = journey.chapterStart;
  chapters.forEach((el, i) => {
    let units = cs[i + 1] - cs[i];
    if (i === chapters.length - 1) units += 0.6; // margen para leer la llamada final
    el.style.height = `${Math.round(units * UNIT() + (i === chapters.length - 1 ? innerHeight * 0.4 : 0))}px`;
  });
}
layout();

const journeyTop = () => $('journey').getBoundingClientRect().top + scrollY;
const scrollToU = (u) => journeyTop() + u * UNIT();
const uFromScroll = () => Math.max(0, Math.min(journey.total, (scrollY - journeyTop()) / UNIT()));

// ---------- Estado ----------
const state = {
  mode: 'loading',                 // 'live' | 'reduced' | 'static'
  uTarget: 0, uCur: 0, chapter: -1,
  pointer: [0, 0], pointerT: [0, 0],
  detail: null, blend: 0, blendTarget: 0, detailU: 0,
  stillKey: stillKey[0], dirty: true,
};
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = prefersReduced.matches || params.has('reduced');
$('motion-toggle').checked = reduced;

// ---------- Capítulo activo ----------
function updateChapter(u) {
  let c = journey.chapterAt(u);
  const afterJourney = scrollY > journeyTop() + $('journey').offsetHeight - innerHeight * 0.5;
  chapters.forEach((el, i) => el.classList.toggle('is-active', i === c && !afterJourney));
  if (c !== state.chapter) {
    state.chapter = c; setCurrent(c);
    ambience.setMix(Math.min(1, c / 4));
    if (state.mode === 'reduced') cutTo(() => { state.stillKey = stillKey[c]; state.dirty = true; });
    if (state.mode === 'static') showStill(c);
  }
}

// Fundido a negro breve: corte cinematográfico que conserva la orientación.
let cutting = false;
function cutTo(fn) {
  if (cutting) { fn(); return; }
  cutting = true; $('cut').classList.add('is-on');
  setTimeout(() => { fn(); requestAnimationFrame(() => { $('cut').classList.remove('is-on'); cutting = false; }); }, 320);
}

function goToChapter(i) {
  closeMenu();
  const target = scrollToU(journey.keyCenter(stillKey[i]));
  const far = Math.abs(i - state.chapter) > 1;
  if (state.mode === 'live' && far) {
    cutTo(() => { window.scrollTo(0, target); state.uTarget = state.uCur = uFromScroll(); });
  } else {
    window.scrollTo({ top: target, behavior: state.mode === 'live' && !reduced ? 'smooth' : 'auto' });
  }
  // Foco al encabezado del capítulo para lectores de pantalla y teclado.
  const h = chapters[i].querySelector('h1, h2');
  h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (b) goToChapter(+b.dataset.goto);
});

// ---------- Menú ----------
const menu = $('menu'), menuBtn = $('menu-btn');
function openMenu() { menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menu.querySelector('button').focus(); }
function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus({ preventScroll: true }); }
menuBtn.addEventListener('click', openMenu);
menu.addEventListener('click', (e) => { if (e.target === menu || e.target.closest('[data-close-menu]')) closeMenu(); });
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
  if (e.key === 'Tab') { // trampa de foco
    const f = [...menu.querySelectorAll('button, a, input')]; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------- Sonido (siempre voluntario) ----------
const ambience = createAmbience();
async function setSound(on) {
  if (on) await ambience.enable(); else ambience.disable();
  $('sound-btn').setAttribute('aria-pressed', String(on));
  $('sound-btn').setAttribute('aria-label', `Sonido ambiente: ${on ? 'activado' : 'desactivado'}`);
  $('sound-toggle').checked = on;
}
$('sound-btn').addEventListener('click', () => setSound($('sound-btn').getAttribute('aria-pressed') !== 'true'));
$('sound-toggle').addEventListener('change', (e) => setSound(e.target.checked));

// ---------- Movimiento reducido ----------
function applyMotion() {
  document.body.classList.toggle('reduce-motion', reduced);
  if (state.mode === 'live' || state.mode === 'reduced') {
    state.mode = reduced ? 'reduced' : 'live';
    state.stillKey = stillKey[Math.max(0, state.chapter)];
    state.dirty = true;
  }
}
$('motion-toggle').addEventListener('change', (e) => { reduced = e.target.checked; applyMotion(); });
prefersReduced.addEventListener?.('change', (e) => { reduced = e.matches; $('motion-toggle').checked = reduced; applyMotion(); });

// ---------- Detalles (hotspots) ----------
const detail = $('detail');
let detailOpener = null;
function openDetail(id, opener) {
  const h = brand.hotspots.find((x) => x.id === id);
  state.detail = h; state.blendTarget = 1; state.detailU = state.uTarget; state.dirty = true;
  if (state.mode === 'reduced') state.blend = 1;
  $('detail-kind').textContent = h.kind;
  $('detail-title').textContent = h.label;
  $('detail-body').textContent = h.body;
  $('detail-specs').innerHTML = h.specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  detail.hidden = false;
  document.querySelectorAll(`[data-hotspot]`).forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.hotspot === id)));
  detailOpener = opener || null;
  $('detail-title').setAttribute('tabindex', '-1'); $('detail-title').focus({ preventScroll: true });
}
function closeDetail(returnFocus = true) {
  if (!state.detail) return;
  state.blendTarget = 0; state.dirty = true;
  if (state.mode === 'reduced') { state.blend = 0; state.detail = null; }
  detail.hidden = true;
  document.querySelectorAll('[data-hotspot]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (returnFocus && detailOpener) detailOpener.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-hotspot]');
  if (b) { state.detail?.id === b.dataset.hotspot && !detail.hidden ? closeDetail() : openDetail(b.dataset.hotspot, b); }
});
$('detail-close').addEventListener('click', () => closeDetail());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !detail.hidden) closeDetail(); });

// Marcadores sobre la escena.
const hotspotLayer = $('hotspots');
hotspotLayer.innerHTML = brand.hotspots.map((h) => `<button class="hotspot" type="button" data-hotspot="${h.id}" aria-expanded="false" aria-controls="detail" tabindex="-1"><span class="tip">${h.label}</span><span class="visually-hidden">${h.label}</span></button>`).join('');
const markers = [...hotspotLayer.children];

// ---------- Modo estático (sin WebGL o por elección) ----------
function enterStatic(reason) {
  state.mode = 'static';
  document.body.classList.add('is-static');
  const stage = $('still-stage');
  stage.innerHTML = brand.chapters.map((c) => `<picture><source media="(max-aspect-ratio: 1/1)" srcset="renders/${c.id}-v.webp" /><img src="renders/${c.id}.webp" alt="" /></picture>`).join('');
  showStill(Math.max(0, state.chapter));
  hideLoader();
  console.info(`[SILVA] Versión estática: ${reason}`);
}
function showStill(i) {
  $('still-stage').querySelectorAll('img').forEach((img, k) => img.classList.toggle('is-on', k === i));
}

// ---------- Carga ----------
function hideLoader() {
  $('loader').classList.add('is-done');
  $('loader').setAttribute('aria-busy', 'false');
}
$('loader-skip').addEventListener('click', () => enterStatic('elegida por el visitante'));

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

let engine = null;
async function boot() {
  await document.fonts.ready;
  if (params.has('static') || !webglAvailable()) { enterStatic(params.has('static') ? 'parámetro ?static' : 'WebGL no disponible'); return; }
  try {
    const { createEngine, detectQuality } = await import('./scene/engine.js');
    const q = detectQuality();
    engine = await createEngine($('scene'), q, (p, label) => {
      $('loader-bar').style.transform = `scaleX(${p})`;
      $('loader-pct').textContent = Math.round(p * 100);
      $('loader-label').textContent = label;
    });
  } catch (err) {
    console.error(err);
    enterStatic('error al iniciar la escena');
    return;
  }
  if (state.mode === 'static') return; // el visitante eligió la versión sin 3D durante la carga
  state.mode = reduced ? 'reduced' : 'live';
  document.body.classList.toggle('reduce-motion', reduced);
  state.uTarget = state.uCur = uFromScroll();
  state.stillKey = stillKey[Math.max(0, state.chapter)];
  hideLoader();
  window.__silva = { engine, state, journey, goToChapter, openDetail, closeDetail, scrollToU, keyCenter: (i) => journey.keyCenter(i) };
}

// ---------- Bucle ----------
let last = performance.now();
const tmp = {};
const reveal = chapters.map(() => 0);
const markerOpacity = brand.hotspots.map(() => 0);
// Revelado del texto: sube con el tiempo mientras el capítulo está activo y baja
// deprisa al salir. Independiente de la tasa de fotogramas de la escena.
function animateText(dt) {
  chapters.forEach((el, i) => {
    const on = el.classList.contains('is-active');
    const next = on ? Math.min(1.6, reveal[i] + dt * (reduced ? 3 : 1.15)) : Math.max(0, reveal[i] - dt * 4);
    if (next !== reveal[i]) { reveal[i] = next; el.style.setProperty('--rv', next.toFixed(3)); }
    el.toggleAttribute('data-hidden', next === 0 && !on);
  });
}
function loop(now) {
  const raw = Math.min(1, (now - last) / 1000); last = now;
  const dt = Math.min(0.1, raw);
  state.uTarget = uFromScroll();
  updateChapter(state.uTarget);
  animateText(raw);
  if (!engine) { requestAnimationFrame(loop); return; }

  if (state.mode === 'live') {
    // Amortiguación: la cámara sigue al scroll sin bloquearlo.
    if (state.freeze) state.uCur = state.uTarget;
    else state.uCur += (state.uTarget - state.uCur) * (1 - Math.exp(-dt * 4.2));
    state.pointer[0] += (state.pointerT[0] - state.pointer[0]) * (1 - Math.exp(-dt * 2));
    state.pointer[1] += (state.pointerT[1] - state.pointer[1]) * (1 - Math.exp(-dt * 2));
    state.blend += (state.blendTarget - state.blend) * (1 - Math.exp(-raw * 2.6));
    if (state.detail && Math.abs(state.uTarget - state.detailU) > 0.35) closeDetail(false);
    if (state.blendTarget === 0 && state.blend < 0.002) state.detail = null;
    engine.frame(state.uCur, { pointer: state.pointer, override: state.detail?.view, blend: state.blend });
    placeMarkers(true);
  } else if (state.mode === 'reduced') {
    if (state.dirty) {
      engine.frame(0, { keyPose: state.stillKey, still: true, override: state.detail?.view, blend: state.detail ? 1 : 0 });
      state.dirty = false;
      placeMarkers(false);
    }
  }
  requestAnimationFrame(loop);
}

function placeMarkers(live) {
  const k = engine.journey.locate(live ? state.uCur : journey.keyCenter(state.stillKey));
  const near = KEYS[k.k]?.hotspots && (k.seg.type === 'hold' || k.f < 0.15) && state.blend < 0.3;
  markers.forEach((m, i) => {
    const h = brand.hotspots[i];
    let vis = false;
    if (near) {
      engine.project(h.position, tmp);
      m.style.transform = `translate3d(${tmp.x}px, ${tmp.y}px, 0)`;
      vis = tmp.visible;
    }
    markerOpacity[i] = live && !reduced ? markerOpacity[i] + ((vis ? 1 : 0) - markerOpacity[i]) * 0.25 : (vis ? 1 : 0);
    m.style.opacity = markerOpacity[i].toFixed(3);
    m.classList.toggle('is-visible', vis);
    m.tabIndex = vis ? 0 : -1;
    m.style.pointerEvents = vis ? 'auto' : 'none';
  });
}

addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || reduced) return;
  state.pointerT[0] = (e.clientX / innerWidth) * 2 - 1;
  state.pointerT[1] = (e.clientY / innerHeight) * 2 - 1;
});
addEventListener('resize', () => { layout(); engine?.resize(); state.dirty = true; });
addEventListener('scroll', () => { if (state.mode !== 'live') updateChapter(uFromScroll()); }, { passive: true });

if (params.has('capture')) document.body.classList.add('capture');
updateChapter(uFromScroll());
requestAnimationFrame(loop);
boot();
