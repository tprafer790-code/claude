import { ECONOMY } from '../config/economy';
import { BUSINESSES, BUSINESS_BY_ID } from '../data/businesses';
import { COMBOS } from '../data/combos';
import { ITEM_BY_ID } from '../data/items';
import { RANKS } from '../data/ranks';
import { STAGE_BY_ID } from '../data/stages';
import { LOYALTY_BONUS, OKUPA_INCOME, OKUPA_NOTICE_PENALTY, PARTY_BY_ID, phaseForStage, SUBSIDY_INFLATION, SUBSIDY_INFLATION_CAP } from '../data/parties';
import { SECRET_BY_ID } from '../data/secrets';
import { UPGRADE_BY_ID } from '../data/upgrades';
import { BUSINESS_MILESTONES } from '../config/economy';
import type { Effect } from '../data/types';
import { Decimal } from '../core/bignum';
import type { GameState } from './state';

/** Every number the game needs that is computed from state. Recomputed on change. */
export interface Derived {
  incomePerSec: Decimal;
  /** Income per second of each business (after all multipliers). */
  businessIncome: Record<string, Decimal>;
  /** Total multiplier applied to each business (for tooltips). */
  businessMult: Record<string, number>;
  incomeMult: number;
  clickMult: number;
  /** Money per click before crit/combo. */
  clickValue: Decimal;
  clickIpsPercent: number;
  critChance: number;
  comboMax: number;
  offlineCapHours: number;
  offlineEfficiency: number;
  opportunityRate: number;
  costDiscount: number;
  /** Multiplier on every price (businesses, upgrades, objects). */
  priceMult: number;
  eventRate: number;
  assistantClicksPerSec: number;
  /** Additive bonus breakdown (for the stats panel). */
  breakdown: { ranks: number; achievements: number; collection: number; reputation: number; lifestyleIncome: number; lifestyleClick: number };
}

/**
 * Collects all effects currently active. Object (item) effects are returned
 * separately because their income/click multipliers stack additively as a
 * single "lifestyle" bonus, which keeps dozens of objects from compounding
 * into runaway growth.
 */
export function activeEffects(s: GameState): { general: Effect[]; items: Effect[] } {
  const out: Effect[] = [];
  const items: Effect[] = [];
  for (const id in s.upgrades) {
    const u = UPGRADE_BY_ID[id];
    if (u) out.push(...u.effects);
  }
  const equippedIds = new Set(Object.values(s.equipped));
  for (const id in s.items) {
    const it = ITEM_BY_ID[id];
    if (!it) continue;
    if (it.slot && !equippedIds.has(id)) continue;
    items.push(...it.effects);
  }
  for (const c of COMBOS) {
    if (c.items.every((i) => s.items[i])) out.push(...c.effects);
  }
  for (const id in s.secrets) {
    const sec = SECRET_BY_ID[id];
    if (sec?.effects) out.push(...sec.effects);
  }
  for (let i = 0; i <= s.rankIndex && i < RANKS.length; i++) {
    const b = RANKS[i].bonus;
    if (b) out.push(...b);
  }
  for (const le of s.lifeEffects) out.push(le.effect);
  out.push(...governmentEffects(s));
  return { general: out, items };
}

/** Effects of the party in government for the current social class. */
export function governmentEffects(s: GameState): Effect[] {
  const g = s.government;
  const out: Effect[] = [];
  // Inflation from aid outlives the government that handed it out.
  if (g.subsidies > 0) out.push({ kind: 'priceMult', value: 1 + SUBSIDY_INFLATION * Math.min(g.subsidies, SUBSIDY_INFLATION_CAP) });
  const party = g.party ? PARTY_BY_ID[g.party] : null;
  if (!party) return out;
  const phase = phaseForStage(STAGE_BY_ID[RANKS[s.rankIndex].stage].index);
  out.push(...party.phases[phase].effects);
  if (g.mandates > 1) out.push({ kind: 'incomeMult', value: 1 + LOYALTY_BONUS * (g.mandates - 1) });
  if (g.okupa) out.push({ kind: 'incomeMult', value: OKUPA_INCOME - OKUPA_NOTICE_PENALTY * g.notices }, { kind: 'offlineCapHours', value: 4 });
  return out;
}

export function perk(s: GameState, id: string): number {
  return s.prestige.perks[id] ?? 0;
}

export function computeDerived(s: GameState, now: number, includeBuffs = true): Derived {
  const { general, items } = activeEffects(s);
  let lifestyleIncome = 1;
  let lifestyleClick = 1;
  const effects: Effect[] = [...general];
  for (const e of items) {
    if (e.kind === 'incomeMult') lifestyleIncome += e.value - 1;
    else if (e.kind === 'clickMult') lifestyleClick += e.value - 1;
    else effects.push(e);
  }
  let incomeMult = lifestyleIncome;
  let clickMult = lifestyleClick;
  let critChance = ECONOMY.click.critChance;
  let comboMax = ECONOMY.click.comboMaxSteps;
  let offlineCapHours = ECONOMY.offline.capHours + 4 * perk(s, 'dream_shift');
  let offlineEfficiency = ECONOMY.offline.efficiency + 0.1 * perk(s, 'deep_sleep');
  let opportunityRate = Math.pow(0.9, perk(s, 'lucky_star'));
  let costDiscount = 1 - 0.05 * perk(s, 'bargain_hunter');
  let clickIpsPercent = 0;
  let priceMult = 1;
  const bizMult: Record<string, number> = {};

  for (const e of effects) {
    switch (e.kind) {
      case 'incomeMult': incomeMult *= e.value; break;
      case 'clickMult': clickMult *= e.value; break;
      case 'businessMult': bizMult[e.business] = (bizMult[e.business] ?? 1) * e.value; break;
      case 'critChance': critChance += e.value; break;
      case 'offlineCapHours': offlineCapHours += e.value; break;
      case 'offlineEfficiency': offlineEfficiency += e.value; break;
      case 'comboMax': comboMax += e.value; break;
      case 'opportunityRate': opportunityRate *= e.value; break;
      case 'clickIpsPercent': clickIpsPercent += e.value; break;
      case 'costDiscount': costDiscount *= e.value; break;
      case 'priceMult': priceMult *= e.value; break;
    }
  }

  const rankBonusPer = ECONOMY.rankIncomeBonus + 0.01 * perk(s, 'fast_climber');
  const breakdown = {
    ranks: s.rankIndex * rankBonusPer,
    achievements: Object.keys(s.achievements).length * ECONOMY.achievementIncomeBonus,
    collection: Object.keys(s.items).length * ECONOMY.collectionIncomeBonus,
    reputation: s.prestige.reputation * ECONOMY.prestige.reputationBonus,
    lifestyleIncome: lifestyleIncome - 1,
    lifestyleClick: lifestyleClick - 1,
  };
  const additive = 1 + breakdown.ranks + breakdown.achievements + breakdown.collection;
  const repMult = 1 + breakdown.reputation;
  const schoolMult = 1 + 0.25 * perk(s, 'business_school');
  const handsMult = Math.pow(2, perk(s, 'golden_hands'));

  let buffIncome = 1;
  let buffClick = 1;
  if (includeBuffs) {
    for (const b of s.buffs) {
      if (b.endsAt <= now) continue;
      if (b.target === 'income') buffIncome *= b.mult;
      else buffClick *= b.mult;
    }
  }

  const totalIncomeMult = incomeMult * additive * repMult * schoolMult * buffIncome;
  const totalClickMult = clickMult * repMult * handsMult * buffClick;

  const businessIncome: Record<string, Decimal> = {};
  const businessMult: Record<string, number> = {};
  let ips = new Decimal(0);
  for (const b of BUSINESSES) {
    const owned = s.businesses[b.id] ?? 0;
    let m = bizMult[b.id] ?? 1;
    for (const ms of BUSINESS_MILESTONES) if (owned >= ms) m *= 2;
    businessMult[b.id] = m;
    if (owned <= 0) continue;
    const inc = new Decimal(b.baseIncome).mul(owned).mul(m).mul(totalIncomeMult);
    businessIncome[b.id] = inc;
    ips = ips.add(inc);
  }

  const clickValue = new Decimal(ECONOMY.baseClick).mul(totalClickMult).add(ips.mul(clickIpsPercent));

  return {
    incomePerSec: ips,
    businessIncome,
    businessMult,
    incomeMult: totalIncomeMult,
    clickMult: totalClickMult,
    clickValue,
    clickIpsPercent,
    critChance: Math.min(critChance, 0.5),
    comboMax,
    offlineCapHours,
    offlineEfficiency: Math.min(offlineEfficiency, 1),
    opportunityRate: Math.max(opportunityRate, 0.3),
    costDiscount: Math.max(costDiscount, 0.5) * priceMult,
    priceMult,
    eventRate: 1 + 0.15 * perk(s, 'event_magnet'),
    assistantClicksPerSec: perk(s, 'assistant'),
    breakdown,
  };
}

/** Cost of buying `qty` units of a business given current ownership. */
export function businessCost(s: GameState, id: string, qty: number, discount: number): Decimal {
  const b = BUSINESS_BY_ID[id];
  const owned = s.businesses[id] ?? 0;
  return Decimal.sumGeometricSeries(qty, new Decimal(b.baseCost).mul(discount), ECONOMY.businessCostGrowth, owned);
}

/** How many units of a business can be afforded right now. */
export function businessAffordable(s: GameState, id: string, discount: number): number {
  const b = BUSINESS_BY_ID[id];
  const owned = s.businesses[id] ?? 0;
  const n = Decimal.affordGeometricSeries(s.money, new Decimal(b.baseCost).mul(discount), ECONOMY.businessCostGrowth, owned);
  return Math.max(0, Math.floor(n.toNumber()));
}
