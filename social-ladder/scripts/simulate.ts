/**
 * Headless balance simulation. A greedy bot plays the real engine and reports
 * how long each rank takes. Usage: npm run simulate -- [hours] [clicksPerSec]
 */
import { Decimal, fmt, fmtDuration } from '../src/core/bignum';
import { GameEngine } from '../src/game/engine';
import { RANKS } from '../src/data/ranks';
import { ITEMS } from '../src/data/items';
import { computeDerived } from '../src/game/derive';

const hours = Number(process.argv[2] ?? 6);
const cps = Number(process.argv[3] ?? 4);
const prestigeAt = process.argv[4] ? Number(process.argv[4]) : Infinity;
let t = Date.UTC(2026, 0, 1, 12);
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const e = new GameEngine(undefined, { now: () => t, random: rand });
const sources: Record<string, number> = {};
if (process.env.DBG) { const o = e.earn.bind(e); e.earn = (a) => { const k = (new Error().stack!.split('\n')[2].trim().match(/GameEngine\.(\w+)/) ?? [])[1] ?? '?'; sources[k] = (sources[k] ?? 0) + a.toNumber(); o(a); }; }
e.onEvent((ev) => {
  if (ev.type === 'promotion') console.log(`${fmtDuration((t - start) / 1000).padStart(8)}  rank ${String(ev.to).padStart(2)} ${RANKS[ev.to].name.padEnd(30)} ips ${fmt(e.derived.incomePerSec, 1)}`);
  if (ev.type === 'opportunitySpawn' && rand() < 0.6) setTimeout0.push(() => e.collectOpportunity(ev.id));
  if (ev.type === 'prestige') console.log(`${fmtDuration((t - start) / 1000).padStart(8)}  PRESTIGE +${ev.gained} reputation`);
});
const setTimeout0: (() => void)[] = [];
const start = t;

function gainOf(apply: () => void): number {
  const before = e.derived.incomePerSec.add(e.derived.clickValue.mul(cps)).toNumber();
  const snap = JSON.stringify({ u: e.state.upgrades, i: e.state.items, b: e.state.businesses, q: e.state.equipped });
  apply();
  const after = computeDerived(e.state, t).incomePerSec.add(computeDerived(e.state, t).clickValue.mul(cps)).toNumber();
  const o = JSON.parse(snap);
  e.state.upgrades = o.u; e.state.items = o.i; e.state.businesses = o.b; e.state.equipped = o.q;
  e.changed();
  return after - before;
}

function shop() {
  for (let guard = 0; guard < 50; guard++) {
    const options: { score: number; cost: Decimal; buy: () => boolean }[] = [];
    const next = e.nextRank();
    if (next?.requiresItem && !e.state.items[next.requiresItem]) {
      const it = ITEMS.find((i) => i.id === next.requiresItem)!;
      if (e.state.rankIndex >= it.rankReq) options.push({ score: 1e-12, cost: new Decimal(it.price), buy: () => e.buyItem(it.id) });
    }
    for (const b of e.visibleBusinesses()) {
      const cost = e.businessCost(b.id, 1);
      const g = gainOf(() => { e.state.businesses[b.id] = (e.state.businesses[b.id] ?? 0) + 1; });
      if (g > 0) options.push({ score: cost.toNumber() / g, cost, buy: () => e.buyBusiness(b.id, 1) });
    }
    for (const u of e.availableUpgrades()) {
      const g = gainOf(() => { e.state.upgrades[u.id] = true; });
      options.push({ score: g > 0 ? u.cost / g : u.cost / 1e-9, cost: new Decimal(u.cost), buy: () => e.buyUpgrade(u.id) });
    }
    for (const it of e.shopItems()) {
      if (e.state.items[it.id] || e.state.rankIndex < it.rankReq) continue;
      const g = gainOf(() => { e.state.items[it.id] = true; if (it.slot) e.state.equipped[it.slot] = it.id; });
      if (g > 0) options.push({ score: it.price / g, cost: new Decimal(it.price), buy: () => e.buyItem(it.id) });
    }
    if (!options.length) return;
    options.sort((a, b) => a.score - b.score);
    const best = options[0];
    if (e.state.money.lt(best.cost)) return; // save up for the best option
    if (!best.buy()) return;
  }
}

const totalSeconds = hours * 3600;
for (let sec = 0; sec < totalSeconds; sec++) {
  for (let c = 0; c < cps; c++) { t += 1000 / cps; e.click(); }
  e.tick(1);
  setTimeout0.splice(0).forEach((f) => f());
  if (e.state.pendingEvent) { if (!e.resolveEvent(0)) e.resolveEvent(e.state.pendingEvent ? 1 : 0); }
  for (const a of e.availableAbilities()) e.useAbility(a.id);
  for (const m of e.visibleMissions()) e.claimMission(m.id);
  if (sec % 2 === 0) shop();
  if (e.state.rankIndex >= prestigeAt && e.canPrestige() && e.prestigeGain() >= Math.max(5, e.state.prestige.reputation)) {
    e.prestige();
    for (const p of ['golden_hands', 'business_school', 'seed_money', 'assistant', 'business_school', 'golden_hands']) e.buyPerk(p);
  }
}
console.log(`\nAfter ${hours}h at ${cps} clicks/s: rank ${e.state.rankIndex} (${RANKS[e.state.rankIndex].name}), net worth $${fmt(e.state.earnedThisLife)}, ips $${fmt(e.derived.incomePerSec)}, achievements ${Object.keys(e.state.achievements).length}, reputation if prestiged now: +${e.prestigeGain()}`);
if (process.env.DBG) {
  const d = e.derived;
  console.log('incomeMult', d.incomeMult, 'clickMult', d.clickMult, 'breakdown', d.breakdown);
  for (const id in e.state.businesses) console.log(id, e.state.businesses[id], 'mult', d.businessMult[id], fmt(d.businessIncome[id] ?? 0));
  console.log('clickValue', fmt(d.clickValue), 'clickIps%', d.clickIpsPercent, 'base click', fmt(e.baseDerived.clickValue));
  console.log('sources', Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, fmt(v)])));
  console.log('upgrades', Object.keys(e.state.upgrades).length, 'items', Object.keys(e.state.items).length, 'lifeEffects', e.state.lifeEffects.length);
}
