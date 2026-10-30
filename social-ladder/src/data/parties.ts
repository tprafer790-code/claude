import type { Effect } from './types';

/**
 * Parody political parties. The player votes when a life starts and again
 * every ten minutes of play. Each party helps or hurts in a
 * different phase of the climb, so every one is a viable strategy:
 * PESOE, Podremos and RESTAR front-load help, POX pays off late, PEPE is
 * steady and Democracia 22 rewards honest taxpayers. Each one also runs the
 * Treasury its own way (tax rate and inspection zeal).
 *
 * Phases: 0 = early (Survival → Lower middle), 1 = mid (Middle, Wealth),
 * 2 = late (Extreme wealth and beyond).
 */
export type PartyPerkKind =
  /** Eviction notice for the squatted flat (each one stresses income a bit). */
  | 'notice'
  /** A parade closes your street: temporary income penalty. */
  | 'parade'
  /** Envelope of undeclared cash, with a chance of a scandal (status loss). */
  | 'envelope'
  /** A patriotic sinecure pays out. */
  | 'kickback'
  /** Democracia 22: report to the neighbours (a little status, a slower afternoon). */
  | 'townhall';

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

/**
 * Absurd things that happen while a party governs, at random every couple of
 * minutes. `money` is seconds of income (negative = you pay), `status` is
 * status points, `buff` a temporary multiplier.
 */
export interface PartyHappening {
  id: string;
  text: string;
  money?: number;
  status?: number;
  buff?: { target: 'income' | 'click'; mult: number; seconds: number };
}

/** How each government runs the Treasury (see data/hacienda.ts). */
export interface PartyTax {
  /** Income tax rate per political phase. */
  rate: [number, number, number];
  /** Multiplies the chance of a tax inspection. */
  inspect: number;
}

export interface PartyDef {
  id: string;
  name: string;
  /** Short campaign slogan. */
  desc: string;
  color: string;
  phases: [PartyPhase, PartyPhase, PartyPhase];
  /** Left-wing governments hand out aid on request (each one raises prices). */
  aid?: { label: string; seconds: [number, number, number] };
  /** Escalating eviction notices (Podremos only). */
  notices?: { id: string; text: string }[];
  tax: PartyTax;
  happenings: PartyHappening[];
}

export const PARTIES: PartyDef[] = [
  {
    id: 'pesoe', name: 'PESOE', color: '#e3262f',
    desc: 'A social shield for everyone. The bill, too.',
    aid: { label: 'Minimum vital income', seconds: [60, 40, 25] },
    tax: { rate: [0.2, 0.25, 0.3], inspect: 1.2 },
    happenings: [
      { id: 'roundabout', text: 'Three ministers open the same roundabout three times. You are hired as an extra.', money: 45 },
      { id: 'culture', text: 'Culture voucher: €400 for culture. You buy a bobblehead of Goya.', money: 30 },
      { id: 'fruit_vat', text: 'VAT on fruit is cut. A melon now presides over your desk.', buff: { target: 'click', mult: 2, seconds: 15 } },
      { id: 'commission', text: 'A committee to investigate the investigating committee summons you as a witness.', buff: { target: 'income', mult: 0.6, seconds: 20 } },
      { id: 'u_turn', text: 'The minister says the opposite of yesterday. Your accountant gets seasick.', money: -20 },
      { id: 'appointment', text: 'Online appointment system down: three weeks to renew your ID.', buff: { target: 'income', mult: 0.7, seconds: 25 } },
    ],
    phases: [
      { title: 'Social Shield', text: 'Ask for aid whenever you like. Each aid also pushes every price up 3%.', effects: [{ kind: 'incomeMult', value: 1.25 }, { kind: 'clickMult', value: 1.25 }] },
      { title: 'Minimum Vital Income', text: 'Smaller aid, same inflation. The middle class pays for the party.', effects: [{ kind: 'incomeMult', value: 1.1 }] },
      { title: 'Make the Rich Pay', text: 'You are the rich now. Taxes bite, but the Treasury lets you sleep easy.', effects: [{ kind: 'incomeMult', value: 0.85 }, { kind: 'offlineEfficiency', value: 0.15 }] },
    ],
  },
  {
    id: 'podremos', name: 'Podremos', color: '#7b2fa3',
    desc: 'Yes we can (squat).',
    aid: { label: 'Basic income', seconds: [45, 35, 25] },
    tax: { rate: [0.15, 0.3, 0.4], inspect: 1.4 },
    happenings: [
      { id: 'assembly', text: 'Six-hour neighbourhood assembly to rename the street. You win by attrition.', status: 1 },
      { id: 'bbq', text: 'Social housing with a pool (purely by chance). You are invited to the barbecue.', money: 40 },
      { id: 'good_strike', text: 'A feel-good general strike: your staff come back super motivated.', buff: { target: 'click', mult: 2, seconds: 20 } },
      { id: 'split', text: 'The party splits into four and every faction asks you for a membership fee.', money: -25 },
      { id: 'debate', text: 'A debate on whether your business is "problematic" eats your whole afternoon.', buff: { target: 'income', mult: 0.6, seconds: 20 } },
      { id: 'purge', text: 'Internal purge: someone denounces you in a Telegram group.', status: -0.5 },
    ],
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
    tax: { rate: [0.22, 0.15, 0.08], inspect: 0.6 },
    happenings: [
      { id: 'bulls', text: 'Free bullfight in the village: your merchandise sells out.', money: 40 },
      { id: 'gibraltar', text: 'Gibraltar is reconquered (on a map). Patriotic rush.', buff: { target: 'click', mult: 2, seconds: 15 } },
      { id: 'ham', text: 'Tax cut on cured ham: you invest in Iberian pigs.', money: 30 },
      { id: 'good_spaniard', text: 'They ask for your "good Spaniard card" at the door of your own business.', buff: { target: 'income', mult: 0.6, seconds: 20 } },
      { id: 'anglicisms', text: 'Ban on anglicisms: your "Start-up" sign must now say "Empresa emergente". Sign painter.', money: -20 },
      { id: 'horses', text: 'A horse parade down the high street leaves gifts on your shop window.', status: -0.5 },
    ],
    phases: [
      { title: 'Cuts and Flags', text: 'No aid, tariffs on everything (+15% prices), fewer opportunities and parades that close your street.', effects: [{ kind: 'incomeMult', value: 0.8 }, { kind: 'priceMult', value: 1.15 }, { kind: 'opportunityRate', value: 1.3 }], perk: { kind: 'parade', every: 80, label: 'Military parade', text: 'A parade closes your street. Income halved for 15s.' } },
      { title: 'Fiscal Reconquest', text: 'Taxes drop for those who already have something. That is you now.', effects: [{ kind: 'incomeMult', value: 1.25 }, { kind: 'priceMult', value: 0.95 }] },
      { title: 'Patriotic Tax Haven', text: 'Zero taxes for the elite, cheap everything and a cosy sinecure.', effects: [{ kind: 'incomeMult', value: 1.5 }, { kind: 'priceMult', value: 0.85 }, { kind: 'critChance', value: 0.03 }], perk: { kind: 'kickback', every: 90, seconds: 60, label: 'Patriotic sinecure', text: 'Your foundation "for traditional values" pays its dividend.' } },
    ],
  },
  {
    id: 'pepe', name: 'PEPE', color: '#1f6fd8',
    desc: 'Management, management... and envelopes.',
    tax: { rate: [0.2, 0.18, 0.15], inspect: 0.8 },
    happenings: [
      { id: 'airport', text: 'An airport with no planes opens. You get the bar concession.', money: 50 },
      { id: 'box', text: 'Invited to a VIP box at the stadium. Contacts!', status: 1 },
      { id: 'early_bird', text: 'Income-tax cut for early risers. You click at 6 a.m.', buff: { target: 'click', mult: 2, seconds: 15 } },
      { id: 'hard_drives', text: 'Hard drives smashed with a hammer: your business papers are gone.', money: -25 },
      { id: 'plasma', text: 'The president appears on a TV screen. Nobody understands anything.', buff: { target: 'income', mult: 0.7, seconds: 20 } },
      { id: 'm_dot', text: 'A certain "M. Dot" appears in your accounts. You have no idea who that is.', status: -0.5 },
    ],
    phases: [
      { title: 'And You More', text: 'Not much changes. Now and then an envelope of cash appears. 25% of them end in scandal.', effects: [{ kind: 'incomeMult', value: 1.05 }], perk: { kind: 'envelope', every: 75, seconds: 40, label: 'Envelope', text: 'An envelope with no sender and a lot of cash.' } },
      { title: 'Housing Bubble', text: 'Bricks, cranes and roundabouts: income ×1.3 and prices 10% lower.', effects: [{ kind: 'incomeMult', value: 1.3 }, { kind: 'priceMult', value: 0.9 }], perk: { kind: 'envelope', every: 75, seconds: 50, label: 'Envelope', text: 'An envelope from a construction friend.' } },
      { title: 'Tax Amnesty', text: 'Your money comes home with no questions. Great for income and for offline earnings.', effects: [{ kind: 'incomeMult', value: 1.15 }, { kind: 'offlineEfficiency', value: 0.2 }, { kind: 'offlineCapHours', value: 6 }], perk: { kind: 'envelope', every: 75, seconds: 60, label: 'Envelope', text: 'An envelope from Switzerland. With chocolates.' } },
    ],
  },
  {
    id: 'restar', name: 'RESTAR', color: '#e5007e',
    desc: 'We add everyone up. Then we subtract from your wallet.',
    aid: { label: 'Universal inheritance', seconds: [80, 50, 30] },
    tax: { rate: [0.15, 0.28, 0.38], inspect: 1.3 },
    phases: [
      { title: '37.5-Hour Week', text: 'Shorter working week, same salary: rested staff earn more, you click a bit less. €20,000 universal inheritance on request (it raises prices too).', effects: [{ kind: 'incomeMult', value: 1.2 }, { kind: 'clickMult', value: 0.9 }] },
      { title: 'Frozen Rents', text: 'Rents frozen and speculative purchases banned: objects 15% cheaper. The coalition meets very often.', effects: [{ kind: 'priceMult', value: 0.85 }, { kind: 'incomeMult', value: 0.95 }], perk: { kind: 'parade', every: 90, label: 'Coalition meeting', text: 'The 15 parties of the coalition meet to agree on the logo colour. Income halved for 15s.' } },
      { title: 'Big Inheritance Tax', text: 'Fortunes over a million pay solidarity. The 32-hour week makes every click count.', effects: [{ kind: 'incomeMult', value: 0.85 }, { kind: 'clickMult', value: 1.5 }] },
    ],
    happenings: [
      { id: 'inheritance', text: 'Universal inheritance: you turn 18... again. Money in the account.', money: 60 },
      { id: 'short_week', text: '37.5-hour week: your staff come back from the long weekend at full speed.', buff: { target: 'click', mult: 2, seconds: 20 } },
      { id: 'canteen', text: 'Free school canteens: you save on lunchboxes.', money: 25 },
      { id: 'logo', text: 'The coalition spends three days choosing the shade of the logo.', buff: { target: 'income', mult: 0.6, seconds: 25 } },
      { id: 'clock_in', text: 'You must clock in and out... of your own house.', money: -15 },
      { id: 'divide', text: 'The coalition splits: now there is RESTAR, DIVIDE and MULTIPLY.', status: -0.5 },
    ],
  },
  {
    id: 'd22', name: 'Democracia 22', color: '#0aa5a5',
    desc: 'We come to clean up Spain (and leave it sparkling).',
    tax: { rate: [0.12, 0.18, 0.22], inspect: 1.6 },
    phases: [
      { title: 'Collecting Signatures', text: 'They need 10,000 signatures and only run in two cities. No housing taxes for the young: objects 10% cheaper. Every so often you report to the neighbours.', effects: [{ kind: 'clickMult', value: 1.2 }, { kind: 'priceMult', value: 0.9 }], perk: { kind: 'townhall', every: 90, label: 'Fortnightly accountability', text: 'You explain your accounts to the neighbourhood. They clap. You lose the afternoon.' } },
      { title: 'Goodbye to 90% of Advisers', text: 'Advisers sacked in one go and merit everywhere: more income and cheaper businesses. Tax inspectors are everywhere too.', effects: [{ kind: 'incomeMult', value: 1.15 }, { kind: 'costDiscount', value: 0.92 }], perk: { kind: 'townhall', every: 90, label: 'Fortnightly accountability', text: 'Your neighbours want to see the receipts. All of them.' } },
      { title: 'Social Mobility', text: 'The ladder works again: a bit of everything and better offline earnings.', effects: [{ kind: 'incomeMult', value: 1.2 }, { kind: 'clickMult', value: 1.2 }, { kind: 'offlineEfficiency', value: 0.1 }] },
    ],
    happenings: [
      { id: 'adviser', text: 'They cut 90% of advisers: one ends up working for you for free.', money: 45 },
      { id: 'applause', text: 'Fortnightly accountability: the neighbours applaud you for filling in forms.', status: 1 },
      { id: 'tea', text: 'Five o\'clock tea, British style: City-level productivity.', buff: { target: 'click', mult: 2, seconds: 15 } },
      { id: 'two_cities', text: 'They only run in Madrid and Barcelona: your branch in Albacete hears nothing.', buff: { target: 'income', mult: 0.7, seconds: 20 } },
      { id: 'signatures', text: 'You spend the afternoon collecting signatures outside the supermarket.', buff: { target: 'income', mult: 0.6, seconds: 20 } },
      { id: 'ethics', text: 'Mandatory ethics code: you return the ham a supplier gave you.', money: -20 },
    ],
  },
];

export const PARTY_BY_ID: Record<string, PartyDef> = Object.fromEntries(PARTIES.map((p) => [p.id, p]));

/** Each consecutive mandate of the same party adds this to all income. */
export const LOYALTY_BONUS = 0.05;
/** Each aid received raises every price by this fraction... */
export const SUBSIDY_INFLATION = 0.03;
/** ...up to this many aids (+102%). */
export const SUBSIDY_INFLATION_CAP = 34;
/** Seconds between aid requests. */
export const AID_COOLDOWN = 60;
/** Right-wing governments remove one aid's worth of inflation this often (seconds). */
export const DEFLATION_EVERY = 60;
/** Seconds of play between elections. */
export const ELECTION_EVERY = 600;
/** Podremos: the squatted flat's income bonus, minus this per eviction notice. */
export const OKUPA_INCOME = 1.3;
export const OKUPA_NOTICE_PENALTY = 0.05;
/** Seconds of play between absurd happenings of the governing party. */
export const HAPPENING_EVERY: [number, number] = [100, 160];
/** Democracia 22's accountability meetings: status gained and income slowdown. */
export const TOWNHALL_STATUS = 0.5;
export const TOWNHALL_INCOME = 0.7;
/** PEPE: chance that an envelope becomes a scandal. */
export const ENVELOPE_SCANDAL_CHANCE = 0.25;

/** Political phase for a stage index (0–7). */
export function phaseForStage(stageIndex: number): 0 | 1 | 2 {
  if (stageIndex >= 5) return 2;
  if (stageIndex >= 3) return 1;
  return 0;
}
