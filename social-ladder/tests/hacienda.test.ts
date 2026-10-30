import { describe, expect, it } from 'vitest';
import { Decimal } from '../src/core/bignum';
import { GameEngine } from '../src/game/engine';
import { deserialize, serialize } from '../src/game/persistence';
import { HACIENDA, inspectionChance, inspectionLevel } from '../src/data/hacienda';
import { PARTIES, PARTY_BY_ID } from '../src/data/parties';

/** The engine caches derived stats; tests poke state directly, so refresh them. */
const refresh = (e: GameEngine) => (e as unknown as { invalidate(): void }).invalidate();

function makeEngine(rand = 0.99) {
  let t = 1_000_000_000_000;
  const clock = { advance: (ms: number) => (t += ms) };
  const engine = new GameEngine(undefined, { now: () => t, random: () => rand });
  return { engine, clock };
}

/** An engine with a business running under the given government. */
function withIncome(party = 'pesoe', rand = 0.99) {
  const made = makeEngine(rand);
  made.engine.vote(party);
  made.engine.state.businesses.cans = 50;
  refresh(made.engine);
  return made;
}

describe('parties', () => {
  it('has six parties, each with tax rules and balanced happenings', () => {
    expect(PARTIES.map((p) => p.id)).toEqual(['pesoe', 'podremos', 'pox', 'pepe', 'restar', 'd22']);
    for (const p of PARTIES) {
      expect(p.phases).toHaveLength(3);
      expect(p.tax.rate.every((r) => r > 0 && r < 0.5)).toBe(true);
      const tone = (h: (typeof p.happenings)[number]) => Math.sign(h.money ?? 0) + Math.sign(h.status ?? 0) + (h.buff ? (h.buff.mult >= 1 ? 1 : -1) : 0);
      expect(p.happenings.filter((h) => tone(h) > 0).length).toBe(3);
      expect(p.happenings.filter((h) => tone(h) < 0).length).toBe(3);
    }
  });

  it('runs happenings that pay or cost', () => {
    const { engine } = withIncome('restar');
    engine.state.money = new Decimal(1e6);
    engine.happen(PARTY_BY_ID.restar, 'inheritance');
    expect(engine.state.money.gt(1e6)).toBe(true);
    const mid = engine.state.money;
    engine.happen(PARTY_BY_ID.restar, 'clock_in');
    expect(engine.state.money.lt(mid)).toBe(true);
    engine.happen(PARTY_BY_ID.d22, 'signatures');
    expect(engine.state.buffs.some((b) => b.id === 'hap_signatures' && b.mult < 1)).toBe(true);
  });

  it('fires a happening every couple of minutes of government', () => {
    const { engine } = withIncome('pox');
    const seen: string[] = [];
    engine.onEvent((e) => e.type === 'happening' && seen.push(e.text));
    for (let i = 0; i < 200; i++) engine.tick(1);
    expect(seen.length).toBeGreaterThan(0);
  });

  it('gives Democracia 22 accountability meetings with status', () => {
    const { engine } = withIncome('d22');
    engine.state.government.perkIn = 0.5;
    engine.tick(1);
    expect(engine.state.status).toBe(0.5);
    expect(engine.state.buffs.some((b) => b.id === 'townhall')).toBe(true);
  });

  it('gives RESTAR a universal-inheritance aid that inflates prices', () => {
    const { engine } = withIncome('restar');
    expect(engine.requestAid()).toBe(true);
    expect(engine.state.government.subsidies).toBe(1);
  });
});

describe('treasury', () => {
  it('taxes passive income at the government rate when honest', () => {
    const { engine } = withIncome('pesoe');
    const gross = engine.derived.incomePerSec.mul(10);
    const before = engine.state.money;
    engine.tick(10);
    const net = engine.state.money.sub(before).toNumber();
    expect(net).toBeCloseTo(gross.toNumber() * (1 - PARTY_BY_ID.pesoe.tax.rate[0]), 3);
    expect(engine.state.tax.hidden.toNumber()).toBe(0);
  });

  it('evading keeps everything, hides the tax and raises the risk', () => {
    const { engine } = withIncome('pesoe');
    expect(engine.setTaxMode('evade')).toBe(true);
    const gross = engine.derived.incomePerSec.mul(10);
    const before = engine.state.money;
    engine.tick(10);
    expect(engine.state.money.sub(before).toNumber()).toBeCloseTo(gross.toNumber(), 3);
    expect(engine.state.tax.hidden.toNumber()).toBeCloseTo(gross.toNumber() * PARTY_BY_ID.pesoe.tax.rate[0], 3);
    expect(engine.state.tax.risk).toBeCloseTo(3);
  });

  it('locks tax engineering until the middle class', () => {
    const { engine } = withIncome();
    expect(engine.setTaxMode('engineering')).toBe(false);
    expect(engine.state.tax.mode).toBe('honest');
  });

  it('pays the honest a refund and status', () => {
    const { engine } = withIncome('pepe');
    engine.state.tax.refundIn = 1;
    engine.state.tax.paid = new Decimal(1000);
    const before = engine.state.money;
    engine.tick(1.5);
    expect(engine.state.money.sub(before).toNumber()).toBeGreaterThan(300);
    expect(engine.state.status).toBe(HACIENDA.refundStatus);
  });

  it('punishes by risk: surcharge, fine with frozen accounts, tax crime', () => {
    expect(inspectionLevel(10)).toBe('minor');
    expect(inspectionLevel(50)).toBe('grave');
    expect(inspectionLevel(90)).toBe('crime');
    expect(inspectionChance(0, 1)).toBe(0);
    expect(inspectionChance(100, 1.6)).toBeGreaterThan(inspectionChance(100, 0.6));

    const { engine } = withIncome('pesoe');
    engine.state.money = new Decimal(1e6);
    engine.state.tax.hidden = new Decimal(1000);
    engine.state.tax.risk = 50;
    engine.inspect();
    expect(engine.state.money.toNumber()).toBe(1e6 - 2000);
    expect(engine.state.status).toBe(HACIENDA.status.grave);
    expect(engine.state.buffs.some((b) => b.id === 'embargo')).toBe(true);
    expect(engine.state.tax.hidden.toNumber()).toBe(0);
  });

  it('can send a tax criminal to prison', () => {
    const { engine } = withIncome('pesoe', 0.1);
    const jailed: string[] = [];
    engine.onEvent((e) => e.type === 'jail' && jailed.push(e.reason));
    engine.state.money = new Decimal(1e6);
    engine.state.tax.hidden = new Decimal(1000);
    engine.state.tax.risk = 95;
    engine.inspect();
    expect(jailed).toEqual(['tax']);
    expect(engine.state.counters.jail).toBe(1);
    expect(engine.state.businesses.cans).toBeUndefined();
  });

  it('inspects evaders sooner or later', () => {
    const { engine } = withIncome('d22', 0.05);
    engine.setTaxMode('evade');
    let caught = 0;
    engine.onEvent((e) => e.type === 'inspection' && caught++);
    for (let i = 0; i < 400 && !caught; i++) engine.tick(1);
    expect(caught).toBe(1);
  });

  it('lets you regularise with a surcharge, or 10% under the PEPE amnesty', () => {
    const { engine } = withIncome('pesoe');
    engine.state.money = new Decimal(1e6);
    engine.state.tax.hidden = new Decimal(1000);
    engine.state.tax.risk = 60;
    expect(engine.regularizeCost().toNumber()).toBe(1200);
    expect(engine.regularize()).toBe(true);
    expect(engine.state.tax.risk).toBe(0);
    expect(engine.state.money.toNumber()).toBe(1e6 - 1200);

    engine.state.government.party = 'pepe';
    engine.state.rankIndex = 40;
    refresh(engine);
    engine.state.tax.hidden = new Decimal(1000);
    expect(engine.amnestyOpen()).toBe(engine.phase() === 2);
    if (engine.amnestyOpen()) expect(engine.regularizeCost().toNumber()).toBe(100);
  });

  it('lets old debts prescribe after a clean spell', () => {
    const { engine } = withIncome('pox');
    engine.state.tax.hidden = new Decimal(1);
    for (let i = 0; i < HACIENDA.prescriptionSeconds + 5; i++) engine.tick(1);
    expect(engine.state.tax.hidden.toNumber()).toBe(0);
  });

  it('saves and loads the treasury', () => {
    const { engine } = withIncome();
    engine.setTaxMode('evade');
    engine.state.tax.hidden = new Decimal('1e40');
    const loaded = deserialize(serialize(engine.state));
    expect(loaded.tax.mode).toBe('evade');
    expect(loaded.tax.hidden.toString()).toBe(new Decimal('1e40').toString());
  });
});
