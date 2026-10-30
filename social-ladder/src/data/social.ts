/**
 * Status points, rivals and the mystery safe: the hooks that make each step
 * of the climb feel contested and full of surprises.
 */

/** Status ranges from -10 to +10 within a life. */
export const STATUS_MIN = -10;
export const STATUS_MAX = 10;

/**
 * Promotion requirement multiplier for a status value. Good status makes each
 * rank a little cheaper; bad status makes it much more expensive, so dirty
 * money has a real cost.
 */
export function statusReqMult(status: number): number {
  if (status >= 0) return Math.max(0.65, 1 - 0.035 * status);
  return Math.min(2.2, 1 + 0.12 * -status);
}

export interface StatusTitle {
  id: string;
  /** Lowest status that earns this title. */
  min: number;
  name: string;
}

export const STATUS_TITLES: StatusTitle[] = [
  { id: 'pariah', min: -10, name: 'Public Enemy' },
  { id: 'shady', min: -6, name: 'Shady Character' },
  { id: 'gossip', min: -2, name: 'Neighbourhood Gossip' },
  { id: 'nobody', min: 0, name: 'Nobody' },
  { id: 'decent', min: 2, name: 'Decent Person' },
  { id: 'respected', min: 5, name: 'Respected' },
  { id: 'icon', min: 8, name: 'National Icon' },
];

export function statusTitle(status: number): StatusTitle {
  let out = STATUS_TITLES[0];
  for (const st of STATUS_TITLES) if (status >= st.min) out = st;
  return out;
}

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
