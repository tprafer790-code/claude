/**
 * The Treasury ("Hacienda"). Passive income pays income tax at the governing
 * party's rate. The player picks how honest to be:
 *
 * - honest: pays everything, gets a yearly tax refund and a little status.
 * - engineering: pays half through shell companies (from the middle class on).
 * - evade: pays nothing; the unpaid tax piles up as "hidden" debt and the
 *   risk meter climbs. Inspections become likelier the higher the risk, and
 *   the punishment depends on the risk when they catch you: a 50% surcharge,
 *   a 100% fine, or a tax crime (150% fine, big status loss and a chance of
 *   prison, which ends the life like the status jail).
 *
 * Numbers follow the real Spanish scheme loosely: penalties of 50–150% of the
 * unpaid tax, a 20% late surcharge for voluntary regularisation, 10% for the
 * 2012-style amnesty, and prescription after "4 years" (4 minutes here).
 */
export type TaxMode = 'honest' | 'engineering' | 'evade';

export const TAX_MODES: TaxMode[] = ['honest', 'engineering', 'evade'];

/** Fraction of the tax actually paid in each mode. */
export const TAX_PAID: Record<TaxMode, number> = { honest: 1, engineering: 0.5, evade: 0 };
/** Risk added per second of play in each mode (honest lowers it). */
export const TAX_RISK_PER_SEC: Record<TaxMode, number> = { honest: -0.4, engineering: 0.12, evade: 0.3 };
/** Shell companies need a social class with a lawyer: phase 1 or later. */
export const ENGINEERING_MIN_PHASE = 1;

export const HACIENDA = {
  /** Rate before anyone has voted. */
  defaultRate: 0.2,
  /** Seconds between inspection checks. */
  checkEvery: 45,
  /** Chance per check at 100% risk (scaled by risk^1.5 and party zeal). */
  maxChance: 0.5,
  /** No inspection for hidden tax below this many seconds of income. */
  minHiddenSeconds: 5,
  /** Honest taxpayers: refund of this share of the tax paid... */
  refundShare: 0.3,
  /** ...every this many seconds, plus this much status. */
  refundEvery: 300,
  refundStatus: 0.5,
  /** Voluntary regularisation surcharge, and PEPE's amnesty rate. */
  regularizeSurcharge: 0.2,
  amnestyRate: 0.1,
  /** Honest play at zero risk for this long wipes old hidden tax. */
  prescriptionSeconds: 240,
  /** Risk thresholds for the three kinds of punishment. */
  graveAt: 40,
  crimeAt: 80,
  /** Fine as a multiple of the hidden tax (on top of paying it). */
  fine: { minor: 0.5, grave: 1, crime: 1.5 },
  status: { minor: -1, grave: -3, crime: -6 },
  /** Grave inspections freeze accounts: income multiplier and seconds. */
  embargo: { mult: 0.6, seconds: 30 },
  /** Chance that a tax crime ends in prison. */
  prisonChance: 0.3,
  /** Status lost per unpaid share of the fine (seizure). */
  seizureStatus: -2,
} as const;

export type InspectionLevel = 'minor' | 'grave' | 'crime';

export function inspectionLevel(risk: number): InspectionLevel {
  if (risk >= HACIENDA.crimeAt) return 'crime';
  if (risk >= HACIENDA.graveAt) return 'grave';
  return 'minor';
}

/** Chance that a check turns into an inspection. */
export function inspectionChance(risk: number, zeal: number): number {
  return Math.min(0.95, Math.pow(Math.max(0, Math.min(100, risk)) / 100, 1.5) * HACIENDA.maxChance * zeal);
}
