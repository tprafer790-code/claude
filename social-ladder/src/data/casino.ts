/**
 * Casino: scratch cards and roulette. Every game costs a big slice of your
 * cash and a status point (gambling is not a good look), and some outcomes
 * sink your status further. Below the minimum status you are banned.
 */
export const CASINO = {
  /** A scratch card costs this fraction of your cash... */
  scratchCashFraction: 0.3,
  /** ...or at least this many seconds of income. */
  scratchMinSeconds: 60,
  /** Status lost on every game. */
  statusCost: 1,
  /** Roulette stakes as fractions of your cash. */
  stakes: [0.1, 0.25, 0.5],
} as const;

export interface ScratchPrize {
  id: string;
  chance: number;
  /** Payout as a multiple of the card price. */
  mult: number;
  /** Status change on top of the entry cost. */
  status: number;
  /** Symbol that appears three times (null: no winning line). */
  symbol: string | null;
}

export const SCRATCH_SYMBOLS = ['🍋', '💰', '👑', '💎', '👮', '🐷'];

export const SCRATCH_PRIZES: ScratchPrize[] = [
  { id: 'nothing', chance: 45, mult: 0, status: 0, symbol: null },
  { id: 'refund', chance: 22, mult: 1.5, status: 0, symbol: '🍋' },
  { id: 'triple', chance: 15, mult: 3, status: 0, symbol: '💰' },
  { id: 'status', chance: 8, mult: 1, status: 2, symbol: '👑' },
  { id: 'jackpot', chance: 5, mult: 10, status: 0, symbol: '💎' },
  { id: 'fine', chance: 5, mult: 0, status: -2, symbol: '👮' },
];

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
