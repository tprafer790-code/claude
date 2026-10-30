/**
 * Status points, rivals and the mystery safe: the hooks that make each step
 * of the climb feel contested and full of surprises.
 */

/** Status ranges from -50 to +50 within a life (in half points). */
export const STATUS_MIN = -50;
export const STATUS_MAX = 50;
/** At or below this status, people attack you in the street. */
export const STATUS_DANGER = -10;
/** Reaching the minimum status sends you to jail: back to the start of the life. */
export const STATUS_JAIL = -50;

/**
 * Promotion requirement multiplier for a status value. Good status makes each
 * rank cheaper; bad status makes it much more expensive.
 */
export function statusReqMult(status: number): number {
  if (status >= 0) return Math.max(0.6, 1 - 0.012 * status);
  return Math.min(3, 1 + 0.06 * -status);
}

/** Losing status pays this many seconds of income per point (dirty money)... */
export const STATUS_LOSS_SECONDS = 150;
/** ...and gaining it brings donations worth this many seconds per point. */
export const STATUS_GAIN_SECONDS = 90;

export interface StatusTitle {
  id: string;
  /** Lowest status that earns this title. */
  min: number;
  name: string;
}

export const STATUS_TITLES: StatusTitle[] = [
  { id: 'jailbird', min: -50, name: 'Future Inmate' },
  { id: 'pariah', min: -30, name: 'Public Enemy' },
  { id: 'shady', min: -10, name: 'Shady Character' },
  { id: 'gossip', min: -3, name: 'Neighbourhood Gossip' },
  { id: 'nobody', min: 0, name: 'Nobody' },
  { id: 'decent', min: 3, name: 'Decent Person' },
  { id: 'respected', min: 10, name: 'Respected' },
  { id: 'icon', min: 25, name: 'National Icon' },
];

export function statusTitle(status: number): StatusTitle {
  let out = STATUS_TITLES[0];
  for (const st of STATUS_TITLES) if (status >= st.min) out = st;
  return out;
}

/** Health: street attacks while your status is in the gutter. */
export const HEALTH = {
  max: 100,
  /** Seconds between attacks at the danger threshold (faster as status drops). */
  attackEvery: [25, 50] as const,
  damage: [8, 20] as const,
  /** Slow recovery per second while status is above the danger threshold. */
  regenPerSec: 0.2,
  /** Healing costs this fraction of your cash, or at least this many seconds of income. */
  healCashFraction: 0.4,
  healMinSeconds: 300,
  /** Knocked out: the hospital keeps this fraction of your cash. */
  hospitalCashFraction: 0.25,
} as const;

export interface AttackDef {
  id: string;
  text: string;
}

export const ATTACKS: AttackDef[] = [
  { id: 'slipper', text: 'A neighbour throws a slipper at you. With precision.' },
  { id: 'handbag', text: 'A grandmother hits you with her handbag. It is full of coins.' },
  { id: 'egg', text: 'Someone throws an egg at you. Free range, at least.' },
  { id: 'baguette', text: 'A baker hits you with a day-old baguette. It is basically a club.' },
  { id: 'cane', text: 'A pensioner whacks you with his cane and blames the government.' },
  { id: 'influencer', text: 'An influencer slaps the back of your neck for a video. 2 million views.' },
];

/**
 * Rivals: someone is always just ahead of you. Overtaking one pays out and
 * the next, richer rival appears. Their wealth grows on its own, so idling
 * lets them escape.
 */
export interface RivalDef {
  id: string;
  name: string;
  desc: string;
}

export const RIVALS: RivalDef[] = [
  { id: 'brother_in_law', name: 'Your Brother-in-Law Borja', desc: 'Explains the economy at every family dinner.' },
  { id: 'neighbour', name: 'The Neighbour from 3B', desc: 'Has a bigger balcony and lets you know it.' },
  { id: 'ex', name: 'Your Ex', desc: 'Posts holiday photos only when you are watching.' },
  { id: 'crypto_cousin', name: 'The Crypto Cousin', desc: 'Bought early. Will not stop saying so.' },
  { id: 'influencer', name: 'The Marbella Influencer', desc: 'Lives on a rented yacht and borrowed filters.' },
  { id: 'banker', name: 'The Banker Who Denied Your Loan', desc: 'Still has your file. Still laughing.' },
  { id: 'sheikh', name: 'The Sheikh', desc: 'Buys football clubs the way you buy gum.' },
  { id: 'tech_baron', name: 'Elon Musgo', desc: 'Wants to sell you a ticket to Mars. One way.' },
  { id: 'old_money', name: 'The Duchess', desc: 'Her family was rich before money was invented.' },
  { id: 'god', name: 'God', desc: 'Technically owns everything. For now.' },
];

/** Rival wealth growth per second, as a fraction of your un-buffed income. */
export const RIVAL_GROWTH = 0.85;
/** A new rival starts this many times richer than you. */
export const RIVAL_LEAD = 1.8;

/** Clicks needed to crack the mystery safe the n-th time (0-based). */
export function vaultClicks(opened: number): number {
  return Math.min(1500, Math.round(250 * Math.pow(1.3, opened)));
}

export interface VaultPrize {
  id: string;
  chance: number;
  text: string;
}

export const VAULT_PRIZES: VaultPrize[] = [
  { id: 'cash', chance: 40, text: 'Stacks of cash!' },
  { id: 'frenzy', chance: 22, text: 'A golden calculator: income ×3 for 45s!' },
  { id: 'hands', chance: 18, text: 'Diamond gloves: clicks ×5 for 20s!' },
  { id: 'status', chance: 12, text: 'Compromising photos of a minister: +1 status.' },
  { id: 'jackpot', chance: 5, text: 'JACKPOT! A Swiss account nobody remembers!' },
  { id: 'egg', chance: 3, text: 'An empty chocolate egg. With a note: "Ha."' },
];
