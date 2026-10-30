import { afterAll, describe, expect, it } from 'vitest';
import { EDITION } from '../src/edition';
import { DILEMMAS } from '../src/data/dilemmas';
import { PARTIES } from '../src/data/parties';
import { PARTNERS } from '../src/data/romance';
import { SCRATCH_SYMBOLS } from '../src/data/casino';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { setLanguage, t, type StringKey } from '../src/i18n';
import { contentPaths } from '../src/i18n/content';
import { CONTENT_ES } from '../src/i18n/content.es';
import { FAMILY_CONTENT_EN, FAMILY_CONTENT_ES, FAMILY_UI_EN, FAMILY_UI_ES, FAMILY_UNUSED_UI } from '../src/i18n/family';
import { GameEngine } from '../src/game/engine';
import { createInitialState } from '../src/game/state';
import { deserialize, serialize } from '../src/game/persistence';

/** Words that must never reach a player of the family edition, in either language. */
const BANNED = [
  'PESOE', 'Podremos', 'POX', 'PEPE', 'RESTAR', 'Democracia', 'okup', 'squat', 'kidnap', 'secuestr', 'kidney', 'riñón',
  'casino', 'roulette', 'ruleta', 'croupier', 'gambl', 'apuest', 'lotter', 'loter', 'rasca y gana',
  'wine', 'vino', 'Musgo', 'Elon', 'Marbella', 'Gibraltar', 'Spain', 'España', 'Spaniard', 'Madrid', 'Barcelona', 'Goya',
  'd*mn', 'p*to', 'protection', 'protección', 'pregnan', 'embaraz', 'child support', 'pensión alimenticia',
];

const spanish = (path: string) => FAMILY_CONTENT_ES[path] ?? CONTENT_ES[path];

describe('family edition', () => {
  afterAll(() => setLanguage('en'));

  it('is built as the family edition', () => {
    expect(EDITION).toBe('family');
  });

  it('swaps the sensitive content for safe equivalents', () => {
    expect(PARTIES.map((p) => p.id)).toEqual(['pesoe', 'pox', 'pepe', 'd22']);
    expect(PARTIES.map((p) => p.name)).toEqual(['Plenty Party', 'Scissors Party', 'Same Old Party', 'Fresh Broom Party']);
    expect(DILEMMAS.map((d) => d.id)).not.toContain('kidnap');
    expect(DILEMMAS.map((d) => d.id)).not.toContain('kidney');
    expect(DILEMMAS.map((d) => d.id)).toEqual(expect.arrayContaining(['fat_wallet', 'chicken_suit']));
    expect(PARTNERS).toEqual([]);
    expect(SCRATCH_SYMBOLS).not.toContain('👮');
  });

  it('has Spanish for every content string, and every override has both languages', () => {
    const paths = contentPaths();
    expect([...paths.keys()].filter((p) => !spanish(p))).toEqual([]);
    expect(Object.keys(FAMILY_CONTENT_EN).filter((p) => !FAMILY_CONTENT_ES[p])).toEqual([]);
    expect(Object.keys(FAMILY_CONTENT_EN).filter((p) => !paths.has(p))).toEqual([]);
    expect(Object.keys(FAMILY_CONTENT_ES).filter((p) => !paths.has(p))).toEqual([]);
    expect(Object.keys(FAMILY_UI_EN).filter((k) => !(k in FAMILY_UI_ES))).toEqual([]);
  });

  it('keeps numbers from the English text in Spanish', () => {
    const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.').replace(/^(\d+)\.(\d{3})$/, '$1$2')).sort();
    const bad = [...contentPaths()].filter(([p, text]) => !spanish(p).includes('{amount}') && nums(text).join() !== nums(spanish(p)).join());
    expect(bad.map(([p]) => p)).toEqual([]);
    const badUi = Object.keys(FAMILY_UI_EN).filter((k) => nums(FAMILY_UI_EN[k as StringKey]!).join() !== nums(FAMILY_UI_ES[k as StringKey]!).join());
    expect(badUi).toEqual([]);
  });

  it('shows no banned word in any reachable text', () => {
    const hits: string[] = [];
    const scan = (where: string, text: string) => {
      // Matched at the start of a word, so "melon" does not count as "Elon".
      for (const w of BANNED) if (new RegExp(`(^|[^\\p{L}])${w.replace(/[*]/g, '\\*')}`, 'iu').test(text)) hits.push(`${where}: ${w}`);
    };
    for (const lang of ['en', 'es'] as const) {
      setLanguage(lang);
      for (const [p] of contentPaths()) scan(`${lang} ${p}`, lang === 'en' ? contentPaths().get(p)! : spanish(p));
      for (const k of Object.keys(lang === 'en' ? en : es) as StringKey[]) if (!FAMILY_UNUSED_UI.includes(k)) scan(`${lang} ui.${k}`, t(k));
    }
    expect(hits).toEqual([]);
  });

  it('never starts a date', () => {
    const engine = new GameEngine(createInitialState(0));
    engine.state.rankIndex = 20;
    engine.state.status = 20;
    for (let i = 0; i < 2000; i++) engine.tick(1);
    expect(engine.state.family.pending).toBeNull();
    expect(engine.state.family.children).toBe(0);
  });

  it('drops classic-only content from imported saves', () => {
    const state = createInitialState(0);
    state.government.party = 'podremos';
    state.pendingDilemma = 'kidnap';
    state.family.pending = 'lucia';
    const back = deserialize(serialize(state));
    expect(back.government.party).toBeNull();
    expect(back.pendingDilemma).toBeNull();
    expect(back.family.pending).toBeNull();
  });
});
