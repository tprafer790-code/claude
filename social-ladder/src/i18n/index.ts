import { en } from './en';
import { es } from './es';
import { applyContentLanguage } from './content';
import { setNumberStyle } from '../core/bignum';

export type Lang = 'en' | 'es';
export type StringKey = keyof typeof en;

const DICTS: Record<Lang, Partial<Record<StringKey, string>>> = { en, es };
let current: Lang = 'en';

export function setLanguage(lang: Lang) {
  current = lang;
  setNumberStyle(lang === 'es' ? 'es' : 'short');
  applyContentLanguage(lang);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function getLanguage(): Lang {
  return current;
}

/** Default for new players: Spanish if the browser prefers it. */
export function detectLanguage(): Lang {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/**
 * Translates an interface string. Missing Spanish entries fall back to English.
 * Game content (ranks, objects, events...) is translated separately in content.ts.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}
