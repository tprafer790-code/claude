import { ABILITIES } from '../data/abilities';
import { ACHIEVEMENTS } from '../data/achievements';
import { BUSINESS_BY_ID, BUSINESSES } from '../data/businesses';
import { COMBOS } from '../data/combos';
import { EVENTS } from '../data/events';
import { ITEMS, SLOTS } from '../data/items';
import { DAILIES, MISSIONS } from '../data/missions';
import { PERKS } from '../data/perks';
import { RANKS } from '../data/ranks';
import { SECRETS } from '../data/secrets';
import { STAGES } from '../data/stages';
import { UPGRADES } from '../data/upgrades';
import type { Lang } from './index';
import { CONTENT_ES, PERK_DESC_ES, BUSINESS_UPGRADE_ES } from './content.es';

/**
 * Content translation. Game data stays authored in English; every translatable
 * string is addressed by a stable path such as `ranks.mattress_owner.desc` or
 * `events.found_wallet.choices.0.outcomes.1.text`. Applying a language rewrites
 * the strings in place, so the engine and UI keep reading plain data.
 * Missing translations fall back to English.
 */
const TEXT_KEYS = new Set(['name', 'desc', 'title', 'text', 'label', 'hint', 'bonusText', 'tagline', 'action', 'actionHint']);

type Node = Record<string, unknown> | unknown[];

const SOURCES: Record<string, unknown[]> = {
  stages: STAGES,
  ranks: RANKS,
  businesses: BUSINESSES,
  // Business ×2 upgrades are generated from business data and relabelled below.
  upgrades: UPGRADES.filter((u) => !u.business),
  items: ITEMS,
  slots: SLOTS,
  combos: COMBOS,
  secrets: SECRETS,
  events: EVENTS,
  achievements: ACHIEVEMENTS,
  missions: MISSIONS,
  dailies: DAILIES,
  perks: PERKS,
  abilities: ABILITIES,
};

interface Slot {
  owner: Record<string, unknown> | unknown[];
  key: string | number;
  original: string;
}

function walk(node: unknown, path: string, out: Map<string, Slot>) {
  if (Array.isArray(node)) {
    node.forEach((el, i) => {
      const id = el && typeof el === 'object' && 'id' in el && typeof (el as { id: unknown }).id === 'string' ? (el as { id: string }).id : String(i);
      walk(el, `${path}.${id}`, out);
    });
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && TEXT_KEYS.has(k)) out.set(`${path}.${k}`, { owner: obj, key: k, original: v });
    else if (k === 'upgradeNames' && Array.isArray(v)) v.forEach((s, i) => out.set(`${path}.${k}.${i}`, { owner: v as Node, key: i, original: s as string }));
    else if (v && typeof v === 'object') walk(v, `${path}.${k}`, out);
  }
}

let slots: Map<string, Slot> | null = null;
const perkOriginals = new Map(PERKS.map((p) => [p.id, p.desc]));
const upgradeOriginals = new Map(UPGRADES.filter((u) => u.business).map((u) => [u.id, { name: u.name, desc: u.desc }]));

/** Every translatable path with its English source text. */
export function contentPaths(): Map<string, string> {
  if (!slots) {
    slots = new Map();
    for (const [name, list] of Object.entries(SOURCES)) walk(list, name, slots);
  }
  return new Map([...slots].map(([p, s]) => [p, s.original]));
}

let applied: Lang = 'en';

export function applyContentLanguage(lang: Lang) {
  if (lang === applied) return;
  contentPaths();
  const dict = lang === 'es' ? CONTENT_ES : {};
  for (const [path, s] of slots!) (s.owner as Record<string | number, unknown>)[s.key] = dict[path] ?? s.original;

  for (const p of PERKS) p.desc = (lang === 'es' && PERK_DESC_ES[p.id]) || perkOriginals.get(p.id)!;

  for (const u of UPGRADES) {
    if (!u.business) continue;
    const orig = upgradeOriginals.get(u.id)!;
    if (lang !== 'es') {
      u.name = orig.name;
      u.desc = orig.desc;
      continue;
    }
    const b = BUSINESS_BY_ID[u.business.id];
    const tier = Number(u.id.slice(u.id.lastIndexOf('_') + 1));
    u.name = b.upgradeNames[tier] ?? `${b.name}: ${BUSINESS_UPGRADE_ES.generic[(tier - b.upgradeNames.length) % BUSINESS_UPGRADE_ES.generic.length]}`;
    u.desc = BUSINESS_UPGRADE_ES.desc(b.name);
  }
  applied = lang;
}
