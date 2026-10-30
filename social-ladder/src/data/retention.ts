import { FAMILY } from '../edition';

/**
 * Reasons to come back: daily login streak, random chests and the weekly
 * league. Balance lives here; the engine applies it.
 */

export type ChestRarity = 'common' | 'rare' | 'legendary';
export const CHEST_RARITIES: ChestRarity[] = ['common', 'rare', 'legendary'];

/** Seven-day login calendar. Missing a day starts again at day 1. */
export const LOGIN_DAYS: { seconds: number; chest?: ChestRarity }[] = [
  { seconds: 300 },
  { seconds: 600 },
  { seconds: 600, chest: 'common' },
  { seconds: 1200 },
  { seconds: 1200, chest: 'rare' },
  { seconds: 1800 },
  { seconds: 3600, chest: 'legendary' },
];

export const CHESTS = {
  /** Play seconds between free chest drops. */
  dropMin: 150,
  dropMax: 330,
  /** Chance that any click drops a chest. */
  clickChance: 1 / 450,
  /** Odds of each rarity on a random drop (the rest is common). */
  rareChance: 0.21,
  legendaryChance: 0.04,
  /** Time away that leaves a chest in the letterbox. */
  offlineChestSeconds: 2 * 3600,
  /** Most chests you can hold of each rarity (keeps hoarding in check). */
  maxHeld: 9,
  /** Permanent income bonus from the rarest legendary prize (survives reinvention). */
  legendaryIncomeBonus: 0.05,
  legendaryBonusCap: 0.5,
};

export type ChestPrize =
  | { kind: 'cash'; seconds: number }
  | { kind: 'buff'; target: 'income' | 'click'; mult: number; seconds: number }
  | { kind: 'status'; points: number; seconds: number }
  | { kind: 'bonus' };

/** Prize table per rarity: [weight, prize]. */
export const CHEST_PRIZES: Record<ChestRarity, [number, ChestPrize][]> = {
  common: [
    [55, { kind: 'cash', seconds: 180 }],
    [30, { kind: 'buff', target: 'income', mult: 2, seconds: 60 }],
    [15, { kind: 'buff', target: 'click', mult: 3, seconds: 20 }],
  ],
  rare: [
    [45, { kind: 'cash', seconds: 900 }],
    [30, { kind: 'buff', target: 'income', mult: 3, seconds: 120 }],
    [25, { kind: 'status', points: 2, seconds: 300 }],
  ],
  legendary: [
    [45, { kind: 'cash', seconds: 3600 }],
    [30, { kind: 'buff', target: 'income', mult: 7, seconds: 180 }],
    [25, { kind: 'bonus' }],
  ],
};

// ——— Weekly league ———

export const LEAGUE = {
  size: 20,
  /** Weekly prize by final position in the wealth table. */
  rewards: [
    { upTo: 1, chest: 'legendary' as ChestRarity },
    { upTo: 3, chest: 'rare' as ChestRarity },
    { upTo: 10, chest: 'common' as ChestRarity },
  ],
  /** The worst status of the week also gets a prize. */
  villainChest: 'rare' as ChestRarity,
  /**
   * Bots' weekly totals in hours of your income: from a quarter of an hour
   * to 60 hours. Income grows exponentially, so "hours of income banked this
   * week" is the only yardstick that stays fair at every stage.
   */
  minFactor: 0.25,
  maxFactor: 60,
  /** The reference (one hour of your income) follows your income with this lag, so rivals catch up gradually after a big purchase. */
  refLagSeconds: 3600,
  refFloor: 100,
};

const CLASSIC_BOT_NAMES = [
  'PacoTiburón', 'LaDuquesa', 'ElBrokerDeVallecas', 'Marisa_Inversora', 'Chema1975', 'TíoGilito_ES', 'LaReinaDelBizum', 'ToniCriptos',
  'Concha_Lujo', 'Ramiro_Okupa', 'ElDelYate', 'Paquita_Influencer', 'JuanjoPelotazo', 'Merche_Mercadona', 'FranCuñado', 'LaLoliDeMarbella',
  'Borja_Mari', 'Cayetana_Real', 'ElNotas', 'Pili_Pilates', 'DonDinero', 'Manolo_Bombo', 'SoniaStartup', 'RafaRascas',
  'Encarni_Ahorra', 'ElPocero', 'Nachete_VIP', 'Vane_Viajes', 'Kiko_Tasador', 'Lupe_Lotería',
];

/** International handles for the family edition. */
const FAMILY_BOT_NAMES = [
  'SharkTank_Sam', 'TheDuchess', 'BrokerBob', 'Maria_Invests', 'Chad1999', 'PennyPincher', 'QueenOfCoupons', 'CryptoKev',
  'LuxuryLuna', 'Couchsurf_Ray', 'YachtGuy', 'InfluencerIvy', 'DealMaker_Dan', 'BargainBeth', 'UncleKnowItAll', 'MoneyMoe',
  'Lord_Lambo', 'Lady_Pearls', 'TheBigNotes', 'PilatesPia', 'MrDollar', 'BudgetBen', 'StartupSara', 'ScratchyRalph',
  'SavingsSue', 'PlumberPete', 'VIP_Vinnie', 'WanderlustVal', 'AppraiserAl', 'LuckyLou',
];

const BOT_NAMES = FAMILY ? FAMILY_BOT_NAMES : CLASSIC_BOT_NAMES;

/** Monday (local date, YYYY-MM-DD) of the week that contains `date`. */
export function weekOf(date: string): string {
  const d = new Date(date + 'T12:00:00');
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return isoDay(d);
}

/** Local date string of the day before `date`. */
export function prevDay(date: string): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return isoDay(d);
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Small deterministic PRNG so a week's rivals are the same on every load. */
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export interface LeagueBot {
  name: string;
  /** Final weekly total as a multiple of the reference. */
  factor: number;
  /** Lowest status this bot reaches during the week. */
  lowestStatus: number;
  /** Curve shape: <1 starts fast, >1 finishes strong. */
  pace: number;
}

/** The simulated rivals of a week (19 of them; you are the 20th). */
export function leagueBots(week: string, salt: number): LeagueBot[] {
  const rnd = mulberry(hash(week) ^ salt);
  const names = [...BOT_NAMES];
  const out: LeagueBot[] = [];
  for (let i = 0; i < LEAGUE.size - 1; i++) {
    const name = names.splice(Math.floor(rnd() * names.length), 1)[0];
    const logMin = Math.log(LEAGUE.minFactor);
    const logMax = Math.log(LEAGUE.maxFactor);
    const factor = Math.exp(logMin + ((i + rnd()) / (LEAGUE.size - 1)) * (logMax - logMin));
    const lowestStatus = Math.round((rnd() * 2 - 1) * 30 - (rnd() < 0.2 ? 15 : 0));
    out.push({ name, factor, lowestStatus: Math.max(-48, Math.min(40, lowestStatus)), pace: 0.6 + rnd() * 0.9 });
  }
  return out;
}

/** Share of a bot's weekly total earned after `elapsed` (0..1) of the week. */
export function botProgress(bot: LeagueBot, elapsed: number): number {
  return Math.pow(Math.max(0, Math.min(1, elapsed)), bot.pace);
}

/**
 * Fraction of the league week that has passed (Monday 00:00 local). Counts
 * from `joinedAt` when you joined mid-week, so late starters are not buried.
 */
export function weekElapsed(week: string, now: number, joinedAt = 0): number {
  const end = new Date(week + 'T00:00:00').getTime() + 7 * 86400000;
  const start = Math.max(end - 7 * 86400000, Math.min(joinedAt, end - 3600000));
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}
