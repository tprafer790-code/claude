import type { GameState } from '../game/state';

/**
 * Short-term goals. Missions form a permanent chain: the next three unclaimed
 * missions are always visible. Rewards are paid in seconds of income (with a
 * minimum so early missions still feel meaningful).
 */
export interface MissionDef {
  id: string;
  text: string;
  progress: (s: GameState) => [number, number];
  rewardSeconds: number;
  rewardMin: number;
}

const own = (s: GameState, id: string) => s.businesses[id] ?? 0;
const total = (s: GameState) => Object.values(s.businesses).reduce((a, b) => a + b, 0);
const earned = (s: GameState) => s.earnedThisLife.toNumber();

export const MISSIONS: MissionDef[] = [
  { id: 'm_click10', text: 'Scavenge 10 times', progress: (s) => [s.stats.totalClicks, 10], rewardSeconds: 0, rewardMin: 10 },
  { id: 'm_cans1', text: 'Start Can Collecting', progress: (s) => [own(s, 'cans'), 1], rewardSeconds: 10, rewardMin: 15 },
  { id: 'm_gloves', text: 'Buy the Fingerless Gloves upgrade', progress: (s) => [s.upgrades.cu_gloves ? 1 : 0, 1], rewardSeconds: 20, rewardMin: 25 },
  { id: 'm_earn100', text: 'Earn your first $100', progress: (s) => [Math.min(earned(s), 100), 100], rewardSeconds: 30, rewardMin: 30 },
  { id: 'm_item1', text: 'Buy your first object', progress: (s) => [Object.keys(s.items).length, 1], rewardSeconds: 30, rewardMin: 40 },
  { id: 'm_rank3', text: 'Get promoted to Professional Beggar', progress: (s) => [s.highestRankEver, 3], rewardSeconds: 45, rewardMin: 60 },
  { id: 'm_cans10', text: 'Own 10 Can Collecting', progress: (s) => [own(s, 'cans'), 10], rewardSeconds: 60, rewardMin: 80 },
  { id: 'm_busk5', text: 'Own 5 Street Busking', progress: (s) => [own(s, 'busking'), 5], rewardSeconds: 60, rewardMin: 150 },
  { id: 'm_mattress', text: 'Become a Mattress Owner', progress: (s) => [s.highestRankEver, 4], rewardSeconds: 60, rewardMin: 200 },
  { id: 'm_opp1', text: 'Grab a golden opportunity (watch the street!)', progress: (s) => [s.stats.opportunitiesClicked, 1], rewardSeconds: 90, rewardMin: 200 },
  { id: 'm_odd5', text: 'Own 5 Odd Jobs', progress: (s) => [own(s, 'odd_jobs'), 5], rewardSeconds: 90, rewardMin: 500 },
  { id: 'm_stage2', text: 'Reach the Working Class', progress: (s) => [s.highestRankEver, 8], rewardSeconds: 120, rewardMin: 1000 },
  { id: 'm_event1', text: 'Make a decision in a random event', progress: (s) => [s.stats.eventsSeen, 1], rewardSeconds: 90, rewardMin: 500 },
  { id: 'm_ability', text: 'Use the Double Shift ability', progress: (s) => [s.counters.abilities_used ?? 0, 1], rewardSeconds: 90, rewardMin: 500 },
  { id: 'm_biz50', text: 'Own 50 businesses in total', progress: (s) => [total(s), 50], rewardSeconds: 120, rewardMin: 2000 },
  { id: 'm_delivery10', text: 'Own 10 Delivery Gigs', progress: (s) => [own(s, 'delivery'), 10], rewardSeconds: 150, rewardMin: 5000 },
  { id: 'm_combo1', text: 'Discover an object combination', progress: (s) => [Object.keys(s.discoveredCombos).length, 1], rewardSeconds: 180, rewardMin: 5000 },
  { id: 'm_stage3', text: 'Reach the Lower Middle Class', progress: (s) => [s.highestRankEver, 16], rewardSeconds: 180, rewardMin: 20000 },
  { id: 'm_secret1', text: 'Discover a secret (try poking things)', progress: (s) => [Object.keys(s.secrets).length, 1], rewardSeconds: 180, rewardMin: 10000 },
  { id: 'm_apartment', text: 'Buy a Small Apartment', progress: (s) => [s.items.small_apartment ? 1 : 0, 1], rewardSeconds: 180, rewardMin: 30000 },
  { id: 'm_night10', text: 'Own 10 Night Shift Jobs', progress: (s) => [own(s, 'night_shift'), 10], rewardSeconds: 240, rewardMin: 1e5 },
  { id: 'm_stage4', text: 'Reach the Middle Class', progress: (s) => [s.highestRankEver, 23], rewardSeconds: 240, rewardMin: 1e5 },
  { id: 'm_truck5', text: 'Own 5 Food Trucks', progress: (s) => [own(s, 'food_truck'), 5], rewardSeconds: 300, rewardMin: 5e5 },
  { id: 'm_items10', text: 'Own 10 objects', progress: (s) => [Object.keys(s.items).length, 10], rewardSeconds: 300, rewardMin: 5e5 },
  { id: 'm_millionaire', text: 'Become a Millionaire', progress: (s) => [s.highestRankEver, 31], rewardSeconds: 300, rewardMin: 1e5 },
  { id: 'm_prestige1', text: 'Reinvent yourself (Prestige)', progress: (s) => [s.prestige.count, 1], rewardSeconds: 600, rewardMin: 1e4 },
  { id: 'm_rentals25', text: 'Own 25 Rental Flats', progress: (s) => [own(s, 'rentals'), 25], rewardSeconds: 600, rewardMin: 1e7 },
  { id: 'm_billionaire', text: 'Become a Billionaire', progress: (s) => [s.highestRankEver, 38], rewardSeconds: 600, rewardMin: 1e8 },
  { id: 'm_combo5', text: 'Discover 5 object combinations', progress: (s) => [Object.keys(s.discoveredCombos).length, 5], rewardSeconds: 600, rewardMin: 1e6 },
  { id: 'm_secret5', text: 'Discover 5 secrets', progress: (s) => [Object.keys(s.secrets).length, 5], rewardSeconds: 600, rewardMin: 1e5 },
  { id: 'm_prestige3', text: 'Prestige 3 times', progress: (s) => [s.prestige.count, 3], rewardSeconds: 900, rewardMin: 1e5 },
  { id: 'm_island', text: 'Own a Private Island', progress: (s) => [s.items.private_island ? 1 : 0, 1], rewardSeconds: 900, rewardMin: 1e11 },
  { id: 'm_untouchable', text: 'Become The Untouchable', progress: (s) => [s.highestRankEver, 50], rewardSeconds: 1800, rewardMin: 1e16 },
  { id: 'm_final', text: 'Find out what is beyond the ladder', progress: (s) => [s.highestRankEver, 57], rewardSeconds: 3600, rewardMin: 1e26 },
];

/** Daily challenge templates (optional, no penalty for missing a day). */
export interface DailyDef {
  id: string;
  text: string;
  /** Reads the counter compared against the baseline stored at day start. */
  metric: (s: GameState) => number;
  target: number;
}

export const DAILIES: DailyDef[] = [
  { id: 'd_clicks', text: 'Click 500 times today', metric: (s) => s.stats.totalClicks, target: 500 },
  { id: 'd_opps', text: 'Grab 3 golden opportunities today', metric: (s) => s.stats.opportunitiesClicked, target: 3 },
  { id: 'd_events', text: 'Experience 3 random events today', metric: (s) => s.stats.eventsSeen, target: 3 },
  { id: 'd_biz', text: 'Buy 40 business units today', metric: (s) => s.stats.businessesBought, target: 40 },
  { id: 'd_crits', text: 'Land 15 critical clicks today', metric: (s) => s.stats.crits, target: 15 },
];
