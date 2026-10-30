import { describe, expect, it } from 'vitest';
import { Decimal, fmt } from '../src/core/bignum';
import { ECONOMY } from '../src/config/economy';
import { GameEngine } from '../src/game/engine';
import { deserialize, exportSave, importSave, loadFrom, saveTo, serialize, SAVE_KEY, type KeyValueStore } from '../src/game/persistence';
import { RANKS, RANK_INDEX } from '../src/data/ranks';
import { ITEMS } from '../src/data/items';
import { BUSINESSES } from '../src/data/businesses';
import { EVENTS } from '../src/data/events';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { SECRETS } from '../src/data/secrets';
import { COMBOS } from '../src/data/combos';
import { HACIENDA } from '../src/data/hacienda';
import { UPGRADES } from '../src/data/upgrades';

function makeEngine(start = 1_000_000_000_000, rand = 0.99) {
  let t = start;
  const clock = { advance: (ms: number) => (t += ms) };
  const engine = new GameEngine(undefined, { now: () => t, random: () => rand });
  return { engine, clock };
}

class MemStore implements KeyValueStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe('number formatting', () => {
  it('formats small and large numbers', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(999)).toBe('999');
    expect(fmt(1000)).toBe('1K');
    expect(fmt(1234)).toBe('1.23K');
    expect(fmt(45_600_000)).toBe('45.6M');
    expect(fmt(1e9)).toBe('1B');
    expect(fmt(1e12)).toBe('1T');
    expect(fmt(0.45, 1)).toBe('0.5');
    expect(fmt(new Decimal('1e100'))).toMatch(/e100$/);
  });
  it('never shows rounding up past the real value', () => {
    expect(fmt(999_999)).toBe('999.9K');
  });
});

describe('content integrity', () => {
  it('has at least 50 ranks with increasing requirements and unique ids', () => {
    expect(RANKS.length).toBeGreaterThanOrEqual(50);
    const ids = new Set(RANKS.map((r) => r.id));
    expect(ids.size).toBe(RANKS.length);
    for (let i = 1; i < RANKS.length; i++) expect(new Decimal(RANKS[i].req).gt(RANKS[i - 1].req)).toBe(true);
  });
  it('every required status item exists and is purchasable before its rank', () => {
    for (const r of RANKS) {
      if (!r.requiresItem) continue;
      const item = ITEMS.find((i) => i.id === r.requiresItem);
      expect(item, r.requiresItem).toBeTruthy();
      expect(item!.rankReq).toBeLessThan(RANK_INDEX[r.id]);
      expect(item!.price).toBeLessThan(Number(r.req));
    }
  });
  it('references in combos, events, secrets and upgrades are valid', () => {
    const itemIds = new Set(ITEMS.map((i) => i.id));
    const bizIds = new Set(BUSINESSES.map((b) => b.id));
    for (const c of COMBOS) {
      c.items.forEach((i) => expect(itemIds.has(i), `${c.id}:${i}`).toBe(true));
      if (c.unlockBusiness) expect(bizIds.has(c.unlockBusiness)).toBe(true);
      if (c.grantItem) expect(itemIds.has(c.grantItem)).toBe(true);
    }
    for (const s of SECRETS) if (s.grantItem) expect(itemIds.has(s.grantItem)).toBe(true);
    const walk = (actions: { type: string; id?: string; outcomes?: { actions: unknown[] }[] }[]) => {
      for (const a of actions) {
        if (a.type === 'item') expect(itemIds.has(a.id!), a.id).toBe(true);
        if (a.type === 'delayed') a.outcomes!.forEach((o) => walk(o.actions as never));
      }
    };
    for (const e of EVENTS) e.choices.forEach((c) => c.outcomes.forEach((o) => walk(o.actions as never)));
    for (const u of UPGRADES) for (const ef of u.effects) if (ef.kind === 'businessMult') expect(bizIds.has(ef.business)).toBe(true);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('clicking and money', () => {
  it('earns base click value and tracks stats', () => {
    const { engine } = makeEngine();
    const r = engine.click();
    expect(r.amount.toNumber()).toBe(ECONOMY.baseClick);
    expect(engine.state.money.toNumber()).toBe(1);
    expect(engine.state.stats.totalClicks).toBe(1);
  });
  it('builds a combo for fast clicks and resets after the window', () => {
    const { engine, clock } = makeEngine();
    engine.click();
    clock.advance(100);
    const r2 = engine.click();
    expect(r2.combo).toBe(2);
    expect(r2.comboMult).toBeCloseTo(1 + ECONOMY.click.comboStep);
    clock.advance(ECONOMY.click.comboWindowMs + 1);
    expect(engine.click().combo).toBe(1);
  });
  it('critical clicks multiply the reward', () => {
    const { engine } = makeEngine(1e12, 0.0);
    const r = engine.click();
    expect(r.crit).toBe(true);
    expect(r.amount.gte(ECONOMY.click.critMultiplier)).toBe(true);
  });
});

describe('businesses and upgrades', () => {
  it('charges geometric prices and produces passive income', () => {
    const { engine } = makeEngine();
    engine.state.money = new Decimal(1000);
    expect(engine.businessCost('cans', 1).toNumber()).toBeCloseTo(15);
    expect(engine.buyBusiness('cans', 1)).toBe(true);
    expect(engine.businessCost('cans', 1).toNumber()).toBeCloseTo(15 * ECONOMY.businessCostGrowth);
    const ten = engine.businessCost('cans', 10).toNumber();
    let manual = 0;
    for (let i = 1; i <= 10; i++) manual += 15 * Math.pow(ECONOMY.businessCostGrowth, i);
    expect(ten).toBeCloseTo(manual, 4);
    const before = engine.state.money;
    engine.tick(10);
    // The Treasury takes its cut of passive income (honest by default, before any vote).
    expect(engine.state.money.sub(before).toNumber()).toBeCloseTo(BUSINESSES[0].baseIncome * 10 * (1 - HACIENDA.defaultRate), 5);
  });
  it('refuses purchases without money or rank', () => {
    const { engine } = makeEngine();
    expect(engine.buyBusiness('cans')).toBe(false);
    engine.state.money = new Decimal(1e30);
    expect(engine.buyBusiness('reality')).toBe(false);
  });
  it('buy max buys as many as affordable', () => {
    const { engine } = makeEngine();
    engine.state.money = new Decimal(500);
    const n = engine.resolveQty('cans', 'max');
    expect(engine.buyBusiness('cans', 'max')).toBe(true);
    expect(engine.state.businesses.cans).toBe(n);
    expect(engine.state.money.lt(engine.businessCost('cans', 1))).toBe(true);
  });
  it('business upgrades double that business', () => {
    const { engine } = makeEngine();
    engine.state.money = new Decimal(10000);
    engine.buyBusiness('cans', 1);
    const ipsBefore = engine.derived.incomePerSec.toNumber();
    expect(engine.buyUpgrade('bu_cans_0')).toBe(true);
    expect(engine.derived.incomePerSec.toNumber()).toBeCloseTo(ipsBefore * 2);
  });
});

describe('social ranks', () => {
  it('promotes on net worth and stops at missing status items', () => {
    const { engine } = makeEngine();
    const promos: number[] = [];
    engine.onEvent((e) => e.type === 'promotion' && promos.push(e.to));
    engine.earn(new Decimal(200));
    engine.checkRanks();
    // Rank 4 (Mattress Owner) requires the cardboard mattress.
    expect(engine.state.rankIndex).toBe(3);
    expect(engine.rankProgress().missingItem).toBe('cardboard_mattress');
    engine.state.money = new Decimal(1000);
    expect(engine.buyItem('cardboard_mattress')).toBe(true);
    expect(engine.state.rankIndex).toBe(4);
    expect(promos).toEqual([1, 2, 3, 4]);
  });
  it('rank bonuses increase income', () => {
    const { engine } = makeEngine();
    engine.state.businesses.cans = 10;
    engine.changed();
    const base = engine.derived.incomePerSec.toNumber();
    engine.state.rankIndex = 10;
    engine.changed();
    expect(engine.derived.incomePerSec.toNumber()).toBeGreaterThan(base);
  });
});

describe('items, slots and combos', () => {
  it('slot items only apply when equipped and auto-equip upgrades', () => {
    const { engine } = makeEngine();
    engine.state.rankIndex = 20;
    engine.state.money = new Decimal(1e7);
    engine.buyItem('broken_smartphone');
    expect(engine.state.equipped.gadget).toBe('broken_smartphone');
    engine.buyItem('used_laptop');
    expect(engine.state.equipped.gadget).toBe('used_laptop');
    engine.equip('broken_smartphone');
    expect(engine.state.equipped.gadget).toBe('broken_smartphone');
  });
  it('discovers combos and unlocks the secret business', () => {
    const { engine } = makeEngine();
    engine.state.rankIndex = 20;
    engine.state.money = new Decimal(1e7);
    ['used_laptop', 'cheap_coffee_machine', 'gaming_chair'].forEach((i) => engine.buyItem(i));
    expect(engine.state.discoveredCombos.garage_entrepreneur).toBeTruthy();
    expect(engine.isBusinessVisible('garage_startup')).toBe(true);
  });
});

describe('secrets', () => {
  it('typed and interaction secrets are discovered', () => {
    const { engine } = makeEngine();
    'xxladder'.split('').forEach((c) => engine.typeKey(c));
    expect(engine.state.secrets.spelled_it_out).toBeTruthy();
    for (let i = 0; i < 7; i++) engine.interact('pigeon');
    expect(engine.state.secrets.pigeon_diplomacy).toBeTruthy();
    expect(engine.state.items.rubber_duck).toBe(true);
  });
});

describe('events', () => {
  it('starts and resolves an event, then schedules the next one', () => {
    const { engine } = makeEngine(1e12, 0.1);
    engine.startRandomEvent('golden_hour');
    expect(engine.state.pendingEvent).toBe('golden_hour');
    expect(engine.resolveEvent(0)).toBe(true);
    expect(engine.state.pendingEvent).toBeNull();
    expect(engine.state.buffs.length).toBe(2);
    expect(engine.state.nextEventIn).toBeGreaterThan(0);
  });
  it('delayed outcomes resolve later', () => {
    const { engine, clock } = makeEngine(1e12, 0.1);
    engine.state.rankIndex = 10;
    engine.state.money = new Decimal(1e6);
    engine.startRandomEvent('stranger_investment');
    engine.resolveEvent(0);
    expect(engine.state.delayed.length).toBe(1);
    clock.advance(61_000);
    const before = engine.state.money;
    engine.tick(0.1);
    expect(engine.state.delayed.length).toBe(0);
    expect(engine.state.money.gt(before)).toBe(true);
  });
  it('cannot pick an option you cannot afford', () => {
    const { engine } = makeEngine(1e12, 0.1);
    engine.state.rankIndex = 20;
    engine.startRandomEvent('garage_sale');
    expect(engine.resolveEvent(0)).toBe(false);
    expect(engine.state.pendingEvent).toBe('garage_sale');
  });
});

describe('offline progress', () => {
  it('credits income with efficiency and cap', () => {
    const { engine, clock } = makeEngine();
    engine.state.businesses.cans = 100; // 10/s base (+ milestone x2 at 25/50/100 = x8)
    engine.changed();
    const ips = engine.derived.incomePerSec.toNumber();
    const saved = engine.now();
    clock.advance(3600 * 1000);
    const summary = engine.applyOffline(saved)!;
    expect(summary.creditedSeconds).toBe(3600);
    expect(summary.earned.toNumber()).toBeCloseTo(ips * 3600 * ECONOMY.offline.efficiency, 0);
    clock.advance(100 * 3600 * 1000);
    const capped = engine.applyOffline(engine.now() - 100 * 3600 * 1000)!;
    expect(capped.capped).toBe(true);
    expect(capped.creditedSeconds).toBe(ECONOMY.offline.capHours * 3600);
  });
  it('ignores clocks moving backwards', () => {
    const { engine } = makeEngine();
    engine.state.businesses.cans = 10;
    expect(engine.applyOffline(engine.now() + 1e9)).toBeNull();
    expect(engine.state.money.toNumber()).toBe(0);
  });
});

describe('prestige', () => {
  it('requires millionaire rank and resets the life but keeps permanent progress', () => {
    const { engine } = makeEngine();
    expect(engine.canPrestige()).toBe(false);
    engine.state.rankIndex = 40;
    engine.state.items.rubber_duck = true;
    engine.state.items.used_car = true;
    engine.state.secrets.sky_gazer = 1;
    engine.state.achievements.wealth_0 = 1;
    engine.state.businesses.cans = 50;
    engine.earn(new Decimal(1e12));
    expect(engine.canPrestige()).toBe(true);
    const gain = engine.prestigeGain();
    expect(gain).toBe(100);
    expect(engine.prestige()).toBe(true);
    const s = engine.state;
    expect(s.money.toNumber()).toBe(0);
    expect(s.rankIndex).toBe(0);
    expect(s.businesses.cans).toBeUndefined();
    expect(s.items.used_car).toBeUndefined();
    expect(s.items.rubber_duck).toBe(true);
    expect(s.secrets.sky_gazer).toBe(1);
    expect(s.prestige.reputation).toBe(100);
    expect(s.prestige.legacy).toBe(100);
    expect(s.prestige.count).toBe(1);
    expect(s.lifetimeEarned.gte(1e12)).toBe(true);
    // A second prestige right away gives nothing.
    s.rankIndex = 40;
    expect(engine.prestigeGain()).toBe(0);
  });
  it('perks cost legacy and apply', () => {
    const { engine } = makeEngine();
    engine.state.prestige.legacy = 100;
    const before = engine.derived.clickValue.toNumber();
    expect(engine.buyPerk('golden_hands')).toBe(true);
    expect(engine.derived.clickValue.toNumber()).toBeCloseTo(before * 2);
    expect(engine.state.prestige.legacy).toBe(98);
  });
});

describe('persistence', () => {
  it('round-trips state including huge numbers', () => {
    const { engine } = makeEngine();
    engine.state.money = new Decimal('1.5e250');
    engine.state.items.used_car = true;
    engine.state.businesses.cans = 12;
    const restored = deserialize(serialize(engine.state));
    expect(restored.money.eq(new Decimal('1.5e250'))).toBe(true);
    expect(restored.items.used_car).toBe(true);
    expect(restored.businesses.cans).toBe(12);
  });
  it('fills defaults for missing fields and survives export/import', () => {
    const restored = deserialize(JSON.stringify({ money: '42', rankIndex: 3 }));
    expect(restored.money.toNumber()).toBe(42);
    expect(restored.stats.totalClicks).toBe(0);
    const { engine } = makeEngine();
    engine.state.money = new Decimal(123);
    expect(importSave(exportSave(engine.state)).money.toNumber()).toBe(123);
  });
  it('falls back to the backup when the main save is corrupted', () => {
    const store = new MemStore();
    const { engine } = makeEngine();
    engine.state.money = new Decimal(5);
    saveTo(store, engine.state);
    engine.state.money = new Decimal(6);
    saveTo(store, engine.state);
    store.setItem(SAVE_KEY, '{corrupted');
    const loaded = loadFrom(store)!;
    expect(loaded.recovered).toBe(true);
    expect(loaded.state.money.toNumber()).toBe(5);
  });
});
