// Genera el DOM semántico de los capítulos y la navegación desde la configuración.
import { brand } from '../config/brand.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderChapters(root) {
  const last = brand.chapters.length - 1;
  root.innerHTML = brand.chapters.map((c, i) => `
    <section class="chapter" id="${c.id}" data-index="${i}" data-layout="${c.layout || 'bl'}" aria-labelledby="t-${c.id}">
      <div class="chapter__stick">
        <div class="chapter__panel">
          <div class="chapter__meta">
            <span class="chapter__num" data-r="1" aria-hidden="true">${c.numeral}</span>
            <p class="eyebrow" data-r="1">${esc(c.eyebrow)}</p>
          </div>
          <${i === 0 ? 'h1' : 'h2'} class="display chapter__title" id="t-${c.id}">
            <span class="visually-hidden">${c.numeral}. ${esc(c.label)}: </span>
            ${c.title.map((l, k) => `<span class="line"><span data-r="${2 + k}">${esc(l)}</span></span>`).join('')}
          </${i === 0 ? 'h1' : 'h2'}>
          <p class="chapter__body" data-r="4">${esc(c.body)}</p>
          ${c.id === 'estancia' ? `<ul class="details-list" data-r="5" aria-label="Detalles de la casa">${brand.hotspots.map((h) => `<li><button type="button" data-hotspot="${h.id}" aria-expanded="false" aria-controls="detail">${esc(h.label)}</button></li>`).join('')}</ul>` : ''}
          ${i === last ? `<div class="final-cta" data-r="5"><a class="btn" href="#estancias">Explorar las estancias</a><a class="link final-cta__alt" href="#contacto">o solicitar información</a></div>` : ''}
          <p class="chapter__note" data-r="5">${esc(c.note)}</p>
        </div>
        ${i === 0 ? '<p class="scroll-cue" aria-hidden="true"><i></i>Desliza para recorrer</p>' : ''}
      </div>
    </section>`).join('');
  return [...root.querySelectorAll('.chapter')];
}

export function renderNav(rail, menuList) {
  const item = (c, i, cls) => `<li><button type="button" data-goto="${i}" class="${cls}">
      <span class="n">${c.numeral}</span>${cls === 'r' ? '<span class="tick" aria-hidden="true"></span><span class="lbl">' + esc(c.label) + '</span>' : '<span class="t">' + esc(c.label) + '</span>'}
    </button></li>`;
  rail.innerHTML = brand.chapters.map((c, i) => item(c, i, 'r')).join('');
  menuList.innerHTML = brand.chapters.map((c, i) => item(c, i, 'm')).join('');
  // Nombre accesible del raíl en móvil (sin etiqueta visible).
  rail.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-label', `Capítulo ${brand.chapters[i].numeral}: ${brand.chapters[i].label}`));
}

export function setCurrent(index) {
  document.querySelectorAll('[data-goto]').forEach((b) => {
    if (+b.dataset.goto === index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
}
