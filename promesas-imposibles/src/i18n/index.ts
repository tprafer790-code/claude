// Localización de la interfaz. El contenido narrativo vive en los datos como { es, en }.
// Si falta una clave o un idioma, se usa el inglés como respaldo.
import type { L, Lang } from '../core/types';
import { UI } from './strings';

let lang: Lang = 'es';
const listeners: (() => void)[] = [];

export function getLang(): Lang { return lang; }
export function setLang(l: Lang): void { lang = l; document.documentElement.lang = l; listeners.forEach((f) => f()); }
export function onLang(f: () => void): void { listeners.push(f); }

/** Traduce un texto localizado de los datos. */
export function tl(x: L | undefined | null, vars?: Record<string, string | number>): string {
  if (!x) return '';
  const raw = x[lang] || x.en || '';
  return vars ? fillVars(raw, vars) : raw;
}

/** Traduce una clave de interfaz. */
export function t(key: keyof typeof UI, vars?: Record<string, string | number>): string {
  const e = UI[key];
  if (!e) return String(key);
  return tl(e, vars);
}

function fillVars(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Formato numérico local (coma decimal en español). */
export function num(v: number, digits = 0): string {
  return v.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function signed(v: number, digits = 0): string { return (v > 0 ? '+' : v < 0 ? '−' : '±') + num(Math.abs(v), digits); }

export type UIKey = keyof typeof UI;
