import { describe, expect, it } from 'vitest';
import { Decimal } from '../src/core/bignum';
import { GameEngine } from '../src/game/engine';
import { deserialize, serialize } from '../src/game/persistence';
import { CHESTS, LOGIN_DAYS, prevDay, weekElapsed, weekOf } from '../src/data/retention';

function makeEngine(rand: number | (() => number) = 0.99) {
  let t = new Date('2026-10-28T12:00:00').getTime();
  const clock = { advance: (ms: number) => (t += ms) };
  const engine = new GameEngine(undefined, { now: () => t, random: typeof rand === 'number' ? () => rand : rand });
  return { engine, clock };
}

describe('dates', () => {
  it('finds the Monday of a week and the previous day', () => {
    expect(weekOf('2026-10-28')).toBe('2026-10-26');
    expect(weekOf('2026-11-01')).toBe('2026-10-26');
    expect(weekOf('2026-11-02')).toBe('2026-11-02');
    expect(prevDay('2026-11-01')).toBe('2026-10-31');
    expect(prevDay('2026-03-01')).toBe('2026-02-28');
  });
});

describe('daily login streak', () => {
  it('climbs one day at a time, wraps after 7 and resets after a missed day', () => {
    const { engine } = makeEngine();
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'];
    const seen: number[] = [];
    for (const d of days) {
      engine.ensureLogin(d);
      seen.push(engine.state.login.pendingDay);
      expect(engine.claimLogin()).toBe(true);
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
    engine.ensureLogin('2026-10-08');
    expect(engine.claimLogin()).toBe(false);
    engine.ensureLogin('2026-10-10');
    expect(engine.state.login.pendingDay).toBe(1);
    expect(engine.state.login.bestStreak).toBe(7);
  });

  it('pays money, and chests on days 3, 5 and 7', () => {
    const { engine } = makeEngine();
    const chestsByDay = LOGIN_DAYS.map((d) => d.chest ?? null);
    expect(chestsByDay).toEqual([null, null, 'common', null, 'rare', null, 'legendary']);
    engine.ensureLogin('2026-10-01');
    const before = engine.state.money;
    engine.claimLogin();
    expect(engine.state.money.gt(before)).toBe(true);
    engine.state.login = { lastDate: '2026-10-02', streak: 6, pendingDay: 0, bestStreak: 6 };
    engine.ensureLogin('2026-10-03');
    engine.claimLogin();
    expect(engine.state.chests.legendary).toBe(1);
  });
});

describe('chests', () => {
  it('drop over play time and from clicks', () => {
    const { engine } = makeEngine();
    engine.state.chests.nextIn = 1;
    engine.tick(2);
    expect(engine.chestCount()).toBe(1);
    expect(engine.state.chests.nextIn).toBeGreaterThanOrEqual(CHESTS.dropMin);
    const { engine: lucky } = makeEngine(0);
    lucky.click();
    expect(lucky.chestCount()).toBe(1);
    expect(lucky.state.chests.legendary).toBe(1);
  });

  it('open best first and pay a prize', () => {
    const { engine } = makeEngine(0);
    engine.state.earnedThisLife = new Decimal(1e6);
    engine.state.businesses.cans = 10;
    engine.dropChest('time', 'common');
    engine.dropChest('time', 'rare');
    const before = engine.state.money;
    const r = engine.openChest();
    expect(r?.rarity).toBe('rare');
    expect(r?.prize).toBe('cash');
    expect(engine.state.money.gt(before)).toBe(true);
    expect(engine.chestCount()).toBe(1);
    expect(engine.state.chests.opened).toBe(1);
    engine.openChest();
    expect(engine.openChest()).toBeNull();
  });

  it('cap the permanent legendary bonus and the pile size', () => {
    const { engine } = makeEngine(0.99);
    for (let i = 0; i < 30; i++) {
      engine.state.chests.legendary = 1;
      engine.openChest();
    }
    expect(engine.state.chests.bonus).toBe(CHESTS.legendaryBonusCap);
    const income = engine.derived.incomeMult;
    engine.state.chests.bonus = 0;
    engine.changed();
    expect(engine.derived.incomeMult).toBeLessThan(income);
    for (let i = 0; i < 20; i++) engine.dropChest('time', 'common');
    expect(engine.state.chests.common).toBe(CHESTS.maxHeld);
  });
});

describe('weekly league', () => {
  it('ranks you among 19 rivals and climbs as you bank income', () => {
    const { engine, clock } = makeEngine();
    engine.ensureDaily('2026-10-28');
    expect(engine.state.league.week).toBe('2026-10-26');
    expect(engine.leaguePosition()).toBe(20);
    clock.advance(86400000);
    const rows = engine.leagueTable('wealth');
    expect(rows).toHaveLength(20);
    expect(rows.filter((r) => r.me)).toHaveLength(1);
    const low = engine.leaguePosition();
    engine.earn(engine.state.league.ref.mul(100));
    expect(engine.leaguePosition()).toBeLessThan(low);
    expect(engine.leaguePosition()).toBe(1);
  });

  it('pays last week prizes and starts afresh on Monday', () => {
    const { engine, clock } = makeEngine();
    engine.ensureDaily('2026-10-28');
    engine.earn(engine.state.league.ref.mul(1000));
    engine.changeStatus(-20, false);
    engine.tick(0.1);
    clock.advance(6 * 86400000);
    engine.ensureDaily('2026-11-03');
    const r = engine.state.league.lastResult!;
    expect(r.week).toBe('2026-10-26');
    expect(r.wealth).toBe(1);
    expect(r.chests[0]).toBe('legendary');
    expect(engine.state.chests.legendary).toBe(1);
    expect(engine.state.league.week).toBe('2026-11-02');
    expect(engine.state.league.earned.eq(0)).toBe(true);
  });

  it('measures the week from when you joined', () => {
    const monday = new Date('2026-10-26T00:00:00').getTime();
    expect(weekElapsed('2026-10-26', monday + 3.5 * 86400000)).toBeCloseTo(0.5);
    expect(weekElapsed('2026-10-26', monday + 3.5 * 86400000, monday + 3.5 * 86400000)).toBe(0);
  });
});

describe('next unlock and offline', () => {
  it('points at the next thing to unlock, hidden until close', () => {
    const { engine } = makeEngine();
    const u = engine.nextUnlock()!;
    expect(u.rank).toBeGreaterThan(engine.state.rankIndex);
    expect(u.fraction).toBeGreaterThanOrEqual(0);
    expect(u.reveal).toBe(false);
  });

  it('names the business that worked for you and leaves a chest after 2 h away', () => {
    const { engine, clock } = makeEngine();
    engine.state.businesses.cans = 3;
    engine.changed();
    const saved = engine.now();
    clock.advance(3 * 3600 * 1000);
    const s = engine.applyOffline(saved)!;
    expect(s.topBusiness).toBe('cans');
    expect(s.chest).toBe(true);
    expect(engine.chestCount()).toBe(1);
  });

  it('keeps chests, streak and league through saves and reinvention', () => {
    const { engine } = makeEngine();
    engine.ensureDaily('2026-10-28');
    engine.dropChest('time', 'rare');
    engine.state.chests.bonus = 0.1;
    engine.earn(new Decimal(12345));
    const back = deserialize(serialize(engine.state));
    expect(back.chests.rare).toBe(1);
    expect(back.league.earned.toNumber()).toBeCloseTo(12345);
    expect(back.league.ref.gt(0)).toBe(true);
    expect(back.login.streak).toBe(1);
  });
});
