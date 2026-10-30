/** Shared content types. All game content is data-driven and lives in src/data. */

export type Effect =
  /** Multiplies all passive income. */
  | { kind: 'incomeMult'; value: number }
  /** Multiplies money per click. */
  | { kind: 'clickMult'; value: number }
  /** Multiplies one business' output. */
  | { kind: 'businessMult'; business: string; value: number }
  /** Adds to critical click chance (0.01 = +1%). */
  | { kind: 'critChance'; value: number }
  /** Adds hours to the offline income cap. */
  | { kind: 'offlineCapHours'; value: number }
  /** Adds to offline efficiency (0.1 = +10 percentage points). */
  | { kind: 'offlineEfficiency'; value: number }
  /** Adds combo steps to the combo cap. */
  | { kind: 'comboMax'; value: number }
  /** Multiplies the delay between golden opportunities (0.9 = 10% more often). */
  | { kind: 'opportunityRate'; value: number }
  /** Adds a percentage of income/s to every click (0.01 = 1%). */
  | { kind: 'clickIpsPercent'; value: number }
  /** Multiplies business prices (0.95 = 5% cheaper). */
  | { kind: 'costDiscount'; value: number };

export type StageId =
  | 'survival'
  | 'working'
  | 'lowerMiddle'
  | 'middle'
  | 'wealth'
  | 'extreme'
  | 'absurd'
  | 'cosmic';

export interface StageDef {
  id: StageId;
  index: number;
  name: string;
  tagline: string;
  /** UI accent colors for this social class. */
  accent: string;
  accentDark: string;
  /** Verb shown on the main action button. */
  action: string;
  actionHint: string;
}

export interface RankDef {
  id: string;
  name: string;
  desc: string;
  /** Net worth (money earned this life) required. Stored as a string to allow huge values. */
  req: string;
  stage: StageId;
  /** Status symbol that must be owned to be promoted. */
  requiresItem?: string;
  /** Extra effects granted on top of the standard rank bonus. */
  bonus?: Effect[];
  bonusText?: string;
}

export type IconId =
  | 'can' | 'guitar' | 'tools' | 'backpack' | 'moon' | 'truck' | 'house' | 'store' | 'chart' | 'rocket'
  | 'tower' | 'ship' | 'bank' | 'tv' | 'planet' | 'island' | 'cloud' | 'crown' | 'gem' | 'mattress'
  | 'phone' | 'bike' | 'car' | 'jacket' | 'coffee' | 'laptop' | 'watch' | 'chair' | 'card' | 'cap'
  | 'book' | 'suit' | 'wine' | 'jet' | 'yacht' | 'art' | 'toilet' | 'satellite' | 'duck' | 'coin'
  | 'box' | 'star' | 'cursor' | 'brain' | 'key' | 'trophy' | 'lock' | 'pigeon' | 'cat' | 'scroll';

export interface BusinessDef {
  id: string;
  name: string;
  desc: string;
  icon: IconId;
  baseCost: number;
  baseIncome: number;
  /** Rank index required to see/buy it. */
  rankReq: number;
  /** Hidden until a secret/combo unlocks it. */
  secret?: boolean;
  upgradeNames: string[];
}

export type Slot = 'home' | 'ride' | 'outfit' | 'gadget' | 'accessory';

export type Rarity = 'common' | 'rare' | 'legendary' | 'secret';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: IconId;
  price: number;
  rankReq: number;
  /** Items with a slot only apply their effects while equipped. */
  slot?: Slot;
  effects: Effect[];
  rarity: Rarity;
  /** Not sold in the shop: obtained through events, secrets or combos. */
  unobtainableInShop?: boolean;
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  effects: Effect[];
  /** Requirements to appear in the shop. */
  rankReq?: number;
  business?: { id: string; owned: number };
  icon: IconId;
}
