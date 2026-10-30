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
    expect(statusReqMult(-3)).toBeCloseTo(1.36);
    expect(statusReqMult(10)).toBeCloseTo(0.65);
    const { engine } = makeEngine();
    engine.changeStatus(-3);
    engine.state.earnedThisLife = new Decimal(RANKS[1].req).mul(1.2);
    engine.checkRanks();
    expect(engine.state.rankIndex).toBe(0);
    engine.changeStatus(3);
    engine.checkRanks();
    expect(engine.state.rankIndex).toBeGreaterThan(0);
  });

  it('stays within its range', () => {
    const { engine } = makeEngine();
    expect(engine.changeStatus(-50)).toBe(-10);
    expect(engine.casinoOpen()).toBe(false);
  });
});

describe('elections', () => {
  it('asks for a vote on a new life and on a new social class', () => {
    const { engine } = makeEngine();
    expect(engine.state.pendingVote).toBe(true);
    expect(engine.vote('podremos')).toBe(true);
    expect(engine.state.government.okupa).toBe(true);
    expect(engine.state.pendingVote).toBe(false);
    const before = engine.state.money;
    for (const r of RANKS.slice(0, 9)) if (r.requiresItem) engine.state.items[r.requiresItem] = true;
    engine.state.earnedThisLife = new Decimal(RANKS[8].req);
    engine.checkRanks();
    expect(engine.state.pendingVote).toBe(true);
    expect(engine.state.government.okupa).toBe(false);
    expect(engine.state.money.gt(before)).toBe(true);
  });

  it('PESOE aid raises prices', () => {
    const { engine } = makeEngine();
    engine.vote('pesoe');
    const price = engine.itemPrice('cardboard_mattress');
    engine.tick(30);
    expect(engine.state.government.subsidies).toBe(1);
    expect(engine.itemPrice('cardboard_mattress').gt(price)).toBe(true);
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

describe('casino', () => {
  it('charges money and status, and pays only after the reveal', () => {
    const { engine } = makeEngine(0.5);
    engine.state.money = new Decimal(1000);
    const card = engine.playScratch();
    expect(card).not.toBeNull();
    expect(card!.grid).toHaveLength(9);
    expect(engine.state.status).toBe(-1);
    expect(engine.state.money.lt(1000)).toBe(true);
    const r = engine.spinRoulette('red', 0.5);
    expect(r).toBeNull(); // the scratch card is still being revealed
    engine.settleCasino();
    expect(engine.spinRoulette('red', 0.5)).not.toBeNull();
    expect(engine.state.status).toBeLessThanOrEqual(-2);
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
