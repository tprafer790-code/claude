import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import { fmt } from '../src/core/bignum';
import { afterAll, describe, expect, it } from 'vitest';
import { BUSINESS_BY_ID } from '../src/data/businesses';
import { PERKS } from '../src/data/perks';
import { RANKS } from '../src/data/ranks';
import { UPGRADE_BY_ID } from '../src/data/upgrades';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { setLanguage } from '../src/i18n';
import { contentPaths } from '../src/i18n/content';
import { CONTENT_ES, PERK_DESC_ES } from '../src/i18n/content.es';

describe('Spanish translation', () => {
  afterAll(() => setLanguage('en'));

  it('covers every interface string', () => {
    expect(Object.keys(en).filter((k) => !(k in es))).toEqual([]);
  });

  it('covers every content string, with no stale keys', () => {
    const paths = contentPaths();
    expect([...paths.keys()].filter((p) => !CONTENT_ES[p])).toEqual([]);
    expect(Object.keys(CONTENT_ES).filter((p) => !paths.has(p))).toEqual([]);
    expect(PERKS.filter((p) => !PERK_DESC_ES[p.id]).map((p) => p.id)).toEqual([]);
  });

  it('keeps numbers from the English text', () => {
    // Guards against translating "×3 for 45s" as something with different values.
    const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.').replace(/^(\d+)\.(\d{3})$/, '$1$2')).sort();
    const mismatched = [...contentPaths()].filter(([p, enText]) => CONTENT_ES[p] && !CONTENT_ES[p].includes('{amount}') && nums(enText).join() !== nums(CONTENT_ES[p]).join());
    expect(mismatched.map(([p]) => p)).toEqual([]);
  });

  it('switches content both ways', () => {
    setLanguage('es');
    expect(RANKS[0].name).toBe('Residente de Cartón');
    expect(UPGRADE_BY_ID.bu_cans_0.name).toBe(BUSINESS_BY_ID.cans.upgradeNames[0]);
    expect(UPGRADE_BY_ID.bu_cans_0.desc).toContain('Recogida de Latas');
    expect(ACHIEVEMENT_BY_ID.wealth_7.desc).toBe('Gana $1mM en total (todas las vidas).');
    expect(fmt(1.5e12)).toBe('1,5B');
    setLanguage('en');
    expect(RANKS[0].name).toBe('Cardboard Resident');
    expect(ACHIEVEMENT_BY_ID.wealth_7.desc).toBe('Earn $1B in total (all lives).');
    expect(fmt(1.5e12)).toBe('1.5T');
    expect(UPGRADE_BY_ID.bu_cans_0.desc).toBe('Can Collecting income ×2');
  });
});
