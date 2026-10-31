// Utilidades mínimas de DOM sin dependencias.
import { sfx } from '../audio/audio';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Botón con sonido; nunca depende de pasar el ratón por encima. */
export function btn(label: string | Node, onClick: () => void, opts: { cls?: string; disabled?: boolean; title?: string; key?: string; aria?: string } = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${opts.cls ?? ''}`.trim(), type: 'button', disabled: opts.disabled, title: opts.title, 'aria-label': opts.aria, 'data-key': opts.key });
  if (opts.key) b.append(h('span', { class: 'key', 'aria-hidden': 'true' }, opts.key));
  b.append(typeof label === 'string' ? h('span', { class: 'lbl' }, label) : label);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled || document.body.classList.contains('input-blocked')) return;
    sfx.click();
    onClick();
  });
  return b;
}

export function svgEl(markup: string, cls = ''): HTMLElement {
  const d = h('div', { class: cls });
  d.innerHTML = markup;
  return d;
}

export function clear(el: Element): void { while (el.firstChild) el.removeChild(el.firstChild); }

export function wait(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

/** Enfoca el primer control útil para que el teclado funcione sin ratón. */
export function focusFirst(root: Element): void {
  for (const sel of ['[data-autofocus]', '.choice:not([disabled])', '.btn.primary:not([disabled])', 'button:not([disabled])']) {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) { el.focus({ preventScroll: true }); return; }
  }
}
