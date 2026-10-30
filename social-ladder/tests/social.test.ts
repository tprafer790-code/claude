import { describe, expect, it } from 'vitest';
import { Decimal } from '../src/core/bignum';
import { GameEngine } from '../src/game/engine';
import { deserialize, serialize } from '../src/game/persistence';
import { RANKS } from '../src/data/ranks';
import { statusReqMult } from '../src/data/social';

function makeEngine(rand = 0.99) {
  let t = 1_000_000_000_000;
  const clock = { advance: (ms: number) => (t += ms) };
  const engine = new GameEngine(undefined, { now: () => t, random: () => rand });
  return { engine, clock };
}

describe('status', () => {
  it('makes promotions cheaper or dearer', () => {
    expect(statusReqMult(0)).toBe(1);
    expect(statusReqMult(-10)).toBeCloseTo(1.6);
    expect(statusReqMult(-50)).toBe(3);
    expect(statusReqMult(10)).toBeCloseTo(0.88);
    const { engine } = makeEngine();
    engine.changeStatus(-10);
    engine.state.earnedThisLife = new Decimal(RANKS[1].req).mul(1.2);
    engine.checkRanks();
    expect(engine.state.rankIndex).toBe(0);
    engine.changeStatus(10);
    engine.checkRanks();
    expect(engine.state.rankIndex).toBeGreaterThan(0);
  });

  it('pays out when it changes, and sends you to jail at -50', () => {
    const { engine } = makeEngine();
    engine.state.earnedThisLife = new Decimal(1e6);
    engine.state.businesses.cans = 5;
    const before = engine.state.money;
    engine.changeStatus(-2);
    expect(engine.state.money.gt(before)).toBe(true);
    const mid = engine.state.money;
    engine.changeStatus(1);
    expect(engine.state.money.gt(mid)).toBe(true);
    expect(engine.changeStatus(-100)).toBe(-49);
    expect(engine.casinoOpen()).toBe(false);
    engine.tick(0.1);
    expect(engine.state.status).toBe(0);
    expect(engine.state.businesses.cans).toBeUndefined();
    expect(engine.state.counters.jail).toBe(1);
  });

  it('lets people attack you at -10, and healing costs money', () => {
    const { engine } = makeEngine(0.5);
    engine.vote('pepe');
    engine.changeStatus(-12);
    engine.tick(40);
    expect(engine.state.health).toBeLessThan(100);
    expect(engine.derived.incomeMult).toBeLessThan(1.05 * 1.01);
    engine.state.money = new Decimal(1e6);
    expect(engine.heal()).toBe(true);
    expect(engine.state.health).toBe(100);
    expect(engine.state.money.lt(1e6)).toBe(true);
  });
});

describe('elections', () => {
  it('asks for a vote on a new life and every 10 minutes', () => {
    const { engine } = makeEngine();
    engine.vote('pox');
    engine.tick(599);
    expect(engine.state.pendingVote).toBe(false);
    engine.tick(2);
    expect(engine.state.pendingVote).toBe(true);
  });

  it('gives the squatter a home on a new social class', () => {
    const { engine } = makeEngine();
    expect(engine.state.pendingVote).toBe(true);
    expect(engine.vote('podremos')).toBe(true);
    expect(engine.state.government.okupa).toBe(true);
    expect(engine.state.pendingVote).toBe(false);
    const before = engine.state.money;
    for (const r of RANKS.slice(0, 9)) if (r.requiresItem) engine.state.items[r.requiresItem] = true;
    engine.state.earnedThisLife = new Decimal(RANKS[8].req);
    engine.checkRanks();
    expect(engine.state.government.okupa).toBe(false);
    expect(engine.state.money.gt(before)).toBe(true);
  });

  it('aid is a button for PESOE and Podremos, and raises prices', () => {
    const { engine, clock } = makeEngine();
    engine.vote('pesoe');
    const price = engine.itemPrice('cardboard_mattress');
    expect(engine.requestAid()).toBe(true);
    expect(engine.requestAid()).toBe(false); // cooldown
    expect(engine.state.government.subsidies).toBe(1);
    expect(engine.itemPrice('cardboard_mattress').gt(price)).toBe(true);
    clock.advance(61_000);
    expect(engine.requestAid()).toBe(true);
    engine.state.pendingVote = true;
    engine.vote('pepe');
    expect(engine.requestAid()).toBe(false);
    engine.tick(61);
    expect(engine.state.government.subsidies).toBe(1);
  });

  it('rewards loyal voters', () => {
    const { engine } = makeEngine();
    engine.vote('pepe');
    engine.state.pendingVote = true;
    engine.vote('pepe');
    expect(engine.state.government.mandates).toBe(2);
  });
});

describe('dilemmas', () => {
  it('pops up and resolves with status consequences', () => {
    const { engine } = makeEngine(0.01);
    engine.vote('pepe');
    engine.startDilemma('kidnap');
    expect(engine.state.pendingDilemma).toBe('kidnap');
    engine.resolveDilemma(true);
    expect(engine.state.status).toBe(-3);
    expect(engine.state.pendingDilemma).toBeNull();
  });

  it('answers NO by itself when the clock runs out', () => {
    const { engine } = makeEngine(0.01);
    engine.vote('pesoe');
    engine.startDilemma('kidnap');
    engine.tick(30);
    expect(engine.state.pendingDilemma).toBeNull();
    expect(engine.state.status).toBeGreaterThan(0);
  });
});

describe('romance', () => {
  it('fades to consequences: protection is safe, no protection may bring a child', () => {
    const { engine } = makeEngine(0.1);
    engine.startEncounter('lucia');
    engine.resolveEncounter('safe');
    expect(engine.state.family.pregnancyIn).toBe(0);
    engine.startEncounter('marta');
    engine.resolveEncounter('wild');
    expect(engine.state.family.pregnancyIn).toBeGreaterThan(0);
    engine.state.pendingVote = false;
    engine.state.money = new Decimal(1e5);
    engine.tick(91);
    expect(engine.state.family.children).toBe(1);
    engine.tick(121);
    expect(engine.state.money.lt(1e5)).toBe(true);
  });
});

describe('casino', () => {
  it('charges money and status, and pays only after the reveal', () => {
    const { engine } = makeEngine(0.5);
    engine.state.money = new Decimal(1000);
    const card = engine.playScratch();
    expect(card).not.toBeNull();
    expect(card!.grid).toHaveLength(9);
    expect(engine.state.status).toBe(-0.5);
    expect(engine.state.money.lt(1000)).toBe(true);
    const r = engine.spinRoulette('red', 0.5);
    expect(r).toBeNull(); // the scratch card is still being revealed
    engine.settleCasino();
    expect(engine.spinRoulette('red', 0.5)).not.toBeNull();
    expect(engine.state.status).toBeLessThanOrEqual(-1);
  });
});

describe('rival and safe', () => {
  it('pays out when you overtake your rival', () => {
    const { engine } = makeEngine();
    engine.tick(0.1);
    const worth = engine.state.rival.worth;
    engine.earn(worth.mul(2));
    engine.tick(0.1);
    expect(engine.state.rival.index).toBe(1);
  });

  it('opens the mystery safe after enough clicks', () => {
    const { engine } = makeEngine(0.5);
    const [, need] = engine.vaultProgress();
    for (let i = 0; i < need; i++) engine.click();
    expect(engine.state.vault.opened).toBe(1);
  });

  it('saves the new state', () => {
    const { engine } = makeEngine();
    engine.vote('pox');
    engine.changeStatus(2);
    engine.tick(0.1);
    const back = deserialize(serialize(engine.state));
    expect(back.government.party).toBe('pox');
    expect(back.status).toBe(2);
    expect(back.rival.worth.eq(engine.state.rival.worth)).toBe(true);
  });
});
