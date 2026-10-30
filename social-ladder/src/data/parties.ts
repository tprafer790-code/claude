import type { Effect } from './types';

/**
 * Parody political parties. The player votes when a life starts and again
 * every time they reach a new social class. Each party helps or hurts in a
 * different phase of the climb, so every one is a viable strategy:
 * PESOE and Podremos front-load help, POX pays off late, PEPE is steady.
 *
 * Phases: 0 = early (Survival → Lower middle), 1 = mid (Middle, Wealth),
 * 2 = late (Extreme wealth and beyond).
 */
export type PartyPerkKind =
  /** Periodic government aid: money now, but prices rise a little each time. */
  | 'subsidy'
  /** Eviction notice for the squatted flat (each one stresses income a bit). */
  | 'notice'
  /** A parade closes your street: temporary income penalty. */
  | 'parade'
  /** Envelope of undeclared cash, with a chance of a scandal (status loss). */
  | 'envelope'
  /** A patriotic sinecure pays out. */
  | 'kickback';

export interface PartyPerk {
  kind: PartyPerkKind;
  /** Seconds of play between perks. */
  every: number;
  /** Seconds of income paid (subsidy, envelope, kickback). */
  seconds?: number;
  label: string;
  text: string;
}

export interface PartyPhase {
  title: string;
  text: string;
  effects: Effect[];
  perk?: PartyPerk;
}

export interface PartyDef {
  id: string;
  name: string;
  /** Short campaign slogan. */
  desc: string;
  color: string;
  phases: [PartyPhase, PartyPhase, PartyPhase];
  /** Escalating eviction notices (Podremos only). */
  notices?: { id: string; text: string }[];
}

export const PARTIES: PartyDef[] = [
  {
    id: 'pesoe', name: 'PESOE', color: '#e3262f',
    desc: 'A social shield for everyone. The bill, too.',
    phases: [
      { title: 'Social Shield', text: 'Aid rains on the poor. Every aid also nudges all prices up 3%.', effects: [{ kind: 'incomeMult', value: 1.25 }, { kind: 'clickMult', value: 1.25 }], perk: { kind: 'subsidy', every: 60, seconds: 45, label: 'Government aid', text: 'A subsidy lands in your account. Prices rise 3%.' } },
      { title: 'Minimum Vital Income', text: 'Smaller aid, same inflation. The middle class pays for the party.', effects: [{ kind: 'incomeMult', value: 1.1 }], perk: { kind: 'subsidy', every: 75, seconds: 30, label: 'Government aid', text: 'Another aid arrives. Prices rise 3%.' } },
      { title: 'Make the Rich Pay', text: 'You are the rich now. Taxes bite, but the Treasury lets you sleep easy.', effects: [{ kind: 'incomeMult', value: 0.85 }, { kind: 'offlineEfficiency', value: 0.15 }] },
    ],
  },
  {
    id: 'podremos', name: 'Podremos', color: '#7b2fa3',
    desc: 'Yes we can (squat).',
    phases: [
      { title: 'Squatted Flat', text: 'A free flat if you have no home yet. Eviction notices keep coming until you reach a new social class and buy your own.', effects: [{ kind: 'clickMult', value: 1.2 }], perk: { kind: 'notice', every: 70, label: 'Eviction notice', text: 'The owner wants the flat back.' } },
      { title: 'Public Housing', text: 'Cooperatives everywhere: businesses 15% cheaper.', effects: [{ kind: 'costDiscount', value: 0.85 }, { kind: 'incomeMult', value: 1.05 }] },
      { title: 'Wealth Tax', text: 'The assembly taxes your fortune, but the workers click with passion.', effects: [{ kind: 'incomeMult', value: 0.8 }, { kind: 'clickMult', value: 1.6 }] },
    ],
    notices: [
      { id: 'n1', text: 'Notice 1: the owner politely asks you to leave. You politely ignore it.' },
      { id: 'n2', text: 'Notice 2: a judge has your name. You change the doorbell label.' },
      { id: 'n3', text: 'Notice 3: a cousin of the owner "from a security company" walks past. Twice.' },
      { id: 'n4', text: 'Notice 4: they cut the water. You shower at the gym you never paid for.' },
      { id: 'n5', text: 'Final notice: a van with tinted windows parks outside. Climb faster.' },
    ],
  },
  {
    id: 'pox', name: 'POX', color: '#4fae2a',
    desc: 'For the homeland (and for your wallet, later).',
    phases: [
      { title: 'Cuts and Flags', text: 'No aid, tariffs on everything (+15% prices), fewer opportunities and parades that close your street.', effects: [{ kind: 'incomeMult', value: 0.8 }, { kind: 'priceMult', value: 1.15 }, { kind: 'opportunityRate', value: 1.3 }], perk: { kind: 'parade', every: 80, label: 'Military parade', text: 'A parade closes your street. Income halved for 15s.' } },
      { title: 'Fiscal Reconquest', text: 'Taxes drop for those who already have something. That is you now.', effects: [{ kind: 'incomeMult', value: 1.25 }, { kind: 'priceMult', value: 0.95 }] },
      { title: 'Patriotic Tax Haven', text: 'Zero taxes for the elite, cheap everything and a cosy sinecure.', effects: [{ kind: 'incomeMult', value: 1.5 }, { kind: 'priceMult', value: 0.85 }, { kind: 'critChance', value: 0.03 }], perk: { kind: 'kickback', every: 90, seconds: 60, label: 'Patriotic sinecure', text: 'Your foundation "for traditional values" pays its dividend.' } },
    ],
  },
  {
    id: 'pepe', name: 'PEPE', color: '#1f6fd8',
    desc: 'Management, management... and envelopes.',
    phases: [
      { title: 'And You More', text: 'Not much changes. Now and then an envelope of cash appears. 25% of them end in scandal.', effects: [{ kind: 'incomeMult', value: 1.05 }], perk: { kind: 'envelope', every: 75, seconds: 40, label: 'Envelope', text: 'An envelope with no sender and a lot of cash.' } },
      { title: 'Housing Bubble', text: 'Bricks, cranes and roundabouts: income ×1.3 and prices 10% lower.', effects: [{ kind: 'incomeMult', value: 1.3 }, { kind: 'priceMult', value: 0.9 }], perk: { kind: 'envelope', every: 75, seconds: 50, label: 'Envelope', text: 'An envelope from a construction friend.' } },
      { title: 'Tax Amnesty', text: 'Your money comes home with no questions. Great for income and for offline earnings.', effects: [{ kind: 'incomeMult', value: 1.15 }, { kind: 'offlineEfficiency', value: 0.2 }, { kind: 'offlineCapHours', value: 6 }], perk: { kind: 'envelope', every: 75, seconds: 60, label: 'Envelope', text: 'An envelope from Switzerland. With chocolates.' } },
    ],
  },
];

export const PARTY_BY_ID: Record<string, PartyDef> = Object.fromEntries(PARTIES.map((p) => [p.id, p]));

/** Each consecutive mandate of the same party adds this to all income. */
export const LOYALTY_BONUS = 0.05;
/** PESOE: each aid received raises every price by this fraction... */
export const SUBSIDY_INFLATION = 0.03;
/** ...up to this many aids. */
export const SUBSIDY_INFLATION_CAP = 20;
/** Podremos: the squatted flat's income bonus, minus this per eviction notice. */
export const OKUPA_INCOME = 1.3;
export const OKUPA_NOTICE_PENALTY = 0.05;
/** PEPE: chance that an envelope becomes a scandal. */
export const ENVELOPE_SCANDAL_CHANCE = 0.25;

/** Political phase for a stage index (0–7). */
export function phaseForStage(stageIndex: number): 0 | 1 | 2 {
  if (stageIndex >= 5) return 2;
  if (stageIndex >= 3) return 1;
  return 0;
}
