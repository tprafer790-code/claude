import { en } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';
export type StringKey = keyof typeof en;

const DICTS: Record<Lang, Partial<Record<StringKey, string>>> = { en, es };
let current: Lang = 'en';

export function setLanguage(lang: Lang) {
  current = lang;
  document.documentElement.lang = lang;
}

/**
 * Translates an interface string. Missing Spanish entries fall back to English.
 * Game content (rank names, objects, events) is English-only for now; content
 * files are structured so a parallel `es` content map can be added per id.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}
