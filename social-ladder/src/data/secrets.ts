import type { Effect } from './types';

/**
 * Secret registry. Add a new secret by appending an entry; the engine checks
 * triggers generically. Discovered secrets are permanent (kept on prestige)
 * and their effects apply in every future life.
 */
export type SecretTrigger =
  /** Click a scene object `count` times. */
  | { type: 'interact'; target: string; count: number }
  /** Type a word on the keyboard (anywhere in the game). */
  | { type: 'typed'; word: string }
  /** Evaluated by name in game/secrets.ts (time, inventory, behaviour...). */
  | { type: 'custom'; check: string };

export interface SecretDef {
  id: string;
  name: string;
  desc: string;
  hint: string;
  trigger: SecretTrigger;
  effects?: Effect[];
  grantItem?: string;
  /** Instant money reward in seconds of income (min $50). */
  rewardSeconds?: number;
}

export const SECRETS: SecretDef[] = [
  { id: 'pigeon_diplomacy', name: 'Pigeon Diplomacy', trigger: { type: 'interact', target: 'pigeon', count: 7 }, grantItem: 'rubber_duck', desc: 'You fed the pigeon seven times. The pigeon council has granted you the Rubber Duck of Destiny.', hint: 'The pigeons respect persistence.' },
  { id: 'storm_drain', name: 'Something Shiny', trigger: { type: 'interact', target: 'drain', count: 5 }, grantItem: 'ancient_coin', desc: 'You fished something out of the storm drain. It is old. It is round. It is yours.', hint: 'Not everything that glints in the gutter is trash.' },
  { id: 'bench_key', name: 'Under the Bench', trigger: { type: 'interact', target: 'bench', count: 5 }, grantItem: 'mystery_key', desc: 'Taped under the bench: a brass key. What does it open?', hint: 'Look under things. Especially benches.' },
  { id: 'sky_gazer', name: 'Sky Gazer', trigger: { type: 'interact', target: 'sky', count: 10 }, effects: [{ kind: 'incomeMult', value: 1.05 }], desc: 'You stopped to look at the sky. Ten times. Perspective: +5% income forever.', hint: 'Look up once in a while.' },
  { id: 'personal_space', name: 'Personal Space', trigger: { type: 'interact', target: 'hero', count: 25 }, effects: [{ kind: 'clickMult', value: 1.05 }], desc: 'Stop poking him. Fine, have +5% click power. Forever.', hint: 'He is ticklish.' },
  { id: 'cat_person', name: 'Cat Person', trigger: { type: 'interact', target: 'cat', count: 20 }, effects: [{ kind: 'critChance', value: 0.01 }], desc: 'You petted the cat twenty times. She tolerated it. +1% crit forever.', hint: 'Some companions want attention. Lots of it.' },
  { id: 'spelled_it_out', name: 'Spelled It Out', trigger: { type: 'typed', word: 'ladder' }, effects: [{ kind: 'clickMult', value: 1.1 }], desc: 'You typed the name of the game. Clicks ×1.1 forever.', hint: 'Say the magic word. Type it, actually.' },
  { id: 'manifesting', name: 'Manifesting', trigger: { type: 'typed', word: 'rich' }, rewardSeconds: 0, desc: 'You typed "rich" and received exactly $50. Manifesting works. Slightly.', hint: 'Just say what you want. Type it.' },
  { id: 'night_thoughts', name: '3 A.M. Thoughts', trigger: { type: 'custom', check: 'nightOwl' }, effects: [{ kind: 'offlineEfficiency', value: 0.05 }], desc: 'Playing at 3 a.m.? Sleep is for people without empires. +5 points offline efficiency.', hint: 'Some things only happen in the small hours.' },
  { id: 'patience', name: 'Patience Pays', trigger: { type: 'custom', check: 'patience' }, effects: [{ kind: 'incomeMult', value: 1.05 }], desc: 'Ten minutes without clicking, game open. Your money worked while you watched. +5% income forever.', hint: 'Sometimes the best move is no move.' },
  { id: 'jackpot', name: 'Jackpot, Kind Of', trigger: { type: 'custom', check: 'lucky777' }, effects: [{ kind: 'critChance', value: 0.01 }], desc: 'You clicked with exactly $777 in your pocket. +1% crit forever.', hint: 'Three lucky digits in your pocket.' },
  { id: 'minimalist', name: 'Minimalist Millionaire', trigger: { type: 'custom', check: 'minimalist' }, effects: [{ kind: 'incomeMult', value: 1.1 }], desc: 'You became a Millionaire still sleeping on the cardboard mattress. Respect. +10% income forever.', hint: 'Reach seven digits without upgrading your bed.' },
  { id: 'street_smart', name: 'Street Smart', trigger: { type: 'custom', check: 'streetSmart' }, effects: [{ kind: 'incomeMult', value: 1.05 }], desc: 'You refused three suspicious deals. Nobody fools you. +5% income forever.', hint: 'If it sounds too good to be true...' },
  { id: 'from_nothing', name: 'From Nothing', trigger: { type: 'custom', check: 'nobody' }, effects: [{ kind: 'incomeMult', value: 1.05 }], desc: 'You called yourself Nobody. Nobody is climbing the ladder. +5% income forever.', hint: 'Who are you? Maybe nobody.' },
  { id: 'the_key_fits', name: 'The Key Fits', trigger: { type: 'custom', check: 'keyFits' }, effects: [{ kind: 'incomeMult', value: 1.25 }], desc: 'The brass key opened a door on your private island. Inside: a smaller box, with a note: "You made it." +25% income forever.', hint: 'An old key, a faraway door.' },
  { id: 'speed_demon', name: 'Caffeinated', trigger: { type: 'custom', check: 'speed' }, effects: [{ kind: 'comboMax', value: 10 }], desc: 'Fifteen clicks in a single second. Combo cap +10 forever.', hint: 'Faster. Faster!' },
  { id: 'loyal_customer', name: 'Loyal Customer', trigger: { type: 'custom', check: 'loyal' }, rewardSeconds: 600, desc: 'You came back on three different days. Have ten minutes of income on the house.', hint: 'Come back tomorrow. And the day after.' },
];

export const SECRET_BY_ID: Record<string, SecretDef> = Object.fromEntries(SECRETS.map((s) => [s.id, s]));
