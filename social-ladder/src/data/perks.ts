import type { IconId } from './types';

/** Permanent upgrades bought with Legacy Points (earned by prestige). */
export interface PerkDef {
  id: string;
  name: string;
  desc: (level: number) => string;
  icon: IconId;
  maxLevel: number;
  cost: (level: number) => number;
}

export const PERKS: PerkDef[] = [
  { id: 'seed_money', name: 'Seed Money', icon: 'coin', maxLevel: 4, cost: (l) => [2, 8, 30, 120][l], desc: (l) => `Start each life with ${['$0', '$1K', '$100K', '$10M', '$1B'][l]}.` },
  { id: 'business_school', name: 'Business School', icon: 'book', maxLevel: 10, cost: (l) => Math.round(3 * Math.pow(1.8, l)), desc: (l) => `All income ×${(1 + 0.25 * l).toFixed(2)} (+0.25 per level).` },
  { id: 'golden_hands', name: 'Golden Hands', icon: 'cursor', maxLevel: 10, cost: (l) => Math.round(2 * Math.pow(1.8, l)), desc: (l) => `Clicks ×${Math.pow(2, l)} (×2 per level).` },
  { id: 'assistant', name: 'Personal Assistant', icon: 'tools', maxLevel: 5, cost: (l) => [10, 25, 60, 150, 400][l], desc: (l) => `An assistant clicks for you ${l} time${l === 1 ? '' : 's'} per second (no crits or combos).` },
  { id: 'dream_shift', name: 'Dream Shift', icon: 'moon', maxLevel: 4, cost: (l) => [3, 8, 20, 50][l], desc: (l) => `Offline cap +${4 * l}h.` },
  { id: 'deep_sleep', name: 'Deep Sleep', icon: 'mattress', maxLevel: 4, cost: (l) => [4, 10, 25, 60][l], desc: (l) => `Offline efficiency +${10 * l} points.` },
  { id: 'lucky_star', name: 'Lucky Star', icon: 'star', maxLevel: 3, cost: (l) => [5, 15, 45][l], desc: (l) => `Opportunities ${10 * l}% more often.` },
  { id: 'fast_climber', name: 'Fast Climber', icon: 'trophy', maxLevel: 3, cost: (l) => [8, 25, 75][l], desc: (l) => `Each rank gives +${l}% extra income.` },
  { id: 'bargain_hunter', name: 'Bargain Hunter', icon: 'card', maxLevel: 4, cost: (l) => [5, 12, 30, 75][l], desc: (l) => `Businesses ${5 * l}% cheaper.` },
  { id: 'event_magnet', name: 'Event Magnet', icon: 'scroll', maxLevel: 3, cost: (l) => [6, 18, 54][l], desc: (l) => `Random events ${15 * l}% more often.` },
];

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export const SEED_MONEY = [0, 1e3, 1e5, 1e7, 1e9];
