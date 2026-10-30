/**
 * Central balance configuration. Every tunable number that is not part of a
 * specific content entry (a rank, an item, a business...) lives here so the
 * economy can be rebalanced without touching game logic or UI.
 */
export const ECONOMY = {
  /** Base money per click before any multiplier. */
  baseClick: 1,
  /** Price growth per owned unit of a business (classic incremental curve). */
  businessCostGrowth: 1.15,
  /** Each social rank reached adds this fraction to all income (additive). */
  rankIncomeBonus: 0.02,
  /** Each unlocked achievement adds this fraction to all income (additive). */
  achievementIncomeBonus: 0.01,
  /** Each owned object adds this fraction to all income (collection bonus). */
  collectionIncomeBonus: 0.01,

  click: {
    critChance: 0.03,
    critMultiplier: 7,
    /** Clicks within this window keep the combo alive (ms). */
    comboWindowMs: 900,
    /** Each combo step adds this much to the click multiplier... */
    comboStep: 0.01,
    /** ...up to this many steps. */
    comboMaxSteps: 50,
    /** Chance per click to stumble on a tiny opportunity (small bonus). */
    luckyFindChance: 0.006,
    luckyFindSecondsOfIncome: 20,
  },

  offline: {
    /** Fraction of normal income earned while away. */
    efficiency: 0.6,
    /** Maximum hours of offline income credited. */
    capHours: 8,
    /** Minimum absence before we show the summary (seconds). */
    minSecondsForSummary: 60,
  },

  opportunity: {
    /** Seconds between golden opportunities (random within range). */
    minDelay: 70,
    maxDelay: 170,
    /** Seconds it stays on screen. */
    lifetime: 13,
    cashSecondsOfIncome: 90,
    cashMoneyFraction: 0.12,
    frenzyMultiplier: 3,
    frenzySeconds: 30,
    clickFrenzyMultiplier: 7,
    clickFrenzySeconds: 15,
  },

  events: {
    /** First event cannot fire before this many seconds of play. */
    firstEventAfter: 120,
    minCooldown: 150,
    maxCooldown: 320,
  },

  prestige: {
    /** Minimum rank index required to prestige (Millionaire). */
    minRankIndex: 31,
    /** Reputation = floor((earnedThisLife / divisor) ^ exponent). */
    divisor: 1e6,
    exponent: 1 / 3,
    /** Each reputation level adds this fraction to all income and clicks. */
    reputationBonus: 0.04,
  },

  /** Bonus rewards (missions, events, abilities) never exceed this fraction of the life's net worth. */
  rewardCapFraction: 0.08,

  autosaveSeconds: 10,
  tickRate: 10,
} as const;

/** Business upgrade tiers: [owned threshold, cost multiplier of base cost]. Each doubles that business. */
export const BUSINESS_UPGRADE_TIERS: ReadonlyArray<readonly [number, number]> = [
  [1, 10],
  [10, 100],
  [25, 2000],
  [50, 2e5],
  [100, 2e7],
  [150, 2e9],
  [200, 2e11],
  [250, 2e13],
  [300, 2e15],
];

/** Owning this many units of one business doubles its output (milestones). */
export const BUSINESS_MILESTONES = [100, 200, 300, 400, 500];

/**
 * Main pacing lever: business tier N earns raw income × this factor. Early
 * tiers stay generous so the first minutes feel fast; later tiers are scaled
 * down so the exponential mid-game does not skip whole social classes.
 * Tune with `npm run simulate`.
 */
export const tierIncomeScale = (tier: number) => Math.max(0.1, Math.pow(0.55, tier));
