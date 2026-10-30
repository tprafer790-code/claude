import type { GameState } from '../game/state';
import { COMBOS } from './combos';
import { ITEMS } from './items';
import { RANKS } from './ranks';
import { SECRETS } from './secrets';
import { STAGES } from './stages';
import type { IconId } from './types';

export type AchievementCategory = 'wealth' | 'social' | 'clicking' | 'objects' | 'business' | 'exploration' | 'secrets' | 'prestige' | 'events';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  category: AchievementCategory;
  icon: IconId;
  /** Hidden achievements show as ??? until unlocked. */
  hidden?: boolean;
  check: (s: GameState) => boolean;
}

const WEALTH_NAMES = [
  [100, 'Pocket Change'], [1e3, 'Four Digits'], [1e4, 'Savings Account'], [1e5, 'Emergency Fund'],
  [1e6, 'Seven Figures'], [1e7, 'Eight Figures'], [1e8, 'Nine Figures'], [1e9, 'Ten Figures'],
  [1e11, 'Generational'], [1e13, 'Economic Weather'], [1e15, 'Quadrillionaire'], [1e18, 'Quintillionaire'],
  [1e21, 'Numbers Lose Meaning'], [1e24, 'Septillionaire'], [1e27, 'Infinite Pockets'],
] as const;

const wealth: AchievementDef[] = WEALTH_NAMES.map(([n, name], i) => ({
  id: `wealth_${i}`, name, category: 'wealth', icon: 'coin',
  desc: `Earn $${Number(n).toLocaleString('en-US', { notation: 'compact' })} in total (all lives).`,
  check: (s) => s.lifetimeEarned.gte(n),
}));

const social: AchievementDef[] = STAGES.slice(1).map((st) => {
  const firstRank = RANKS.findIndex((r) => r.stage === st.id);
  return {
    id: `stage_${st.id}`, name: `Welcome to ${st.name}`, category: 'social' as const, icon: 'trophy' as const,
    desc: `Reach the ${st.name} social class.`,
    check: (s: GameState) => s.highestRankEver >= firstRank,
  };
});
social.push(
  { id: 'rank_10', name: 'Climbing', category: 'social', icon: 'trophy', desc: 'Reach rank 10.', check: (s) => s.highestRankEver >= 10 },
  { id: 'rank_25', name: 'Halfway Up', category: 'social', icon: 'trophy', desc: 'Reach rank 25.', check: (s) => s.highestRankEver >= 25 },
  { id: 'rank_40', name: 'Thin Air', category: 'social', icon: 'trophy', desc: 'Reach rank 40.', check: (s) => s.highestRankEver >= 40 },
  { id: 'rank_top', name: 'Top Rung', category: 'social', icon: 'crown', desc: 'Reach the final rank.', hidden: true, check: (s) => s.highestRankEver >= RANKS.length - 1 },
);

const clicking: AchievementDef[] = ([[1, 'First Step'], [100, 'Warming Up'], [1000, "Clicker's Thumb"], [10000, 'Relentless'], [50000, 'Click Machine'], [250000, 'Human Metronome']] as const).map(([n, name]) => ({
  id: `clicks_${n}`, name, category: 'clicking' as const, icon: 'cursor' as const, desc: `Click ${n.toLocaleString('en-US')} times.`,
  check: (s: GameState) => s.stats.totalClicks >= n,
}));
clicking.push(
  { id: 'crit_1', name: 'Lucky Break', category: 'clicking', icon: 'star', desc: 'Land a critical click.', check: (s) => s.stats.crits >= 1 },
  { id: 'crit_250', name: 'Born Lucky', category: 'clicking', icon: 'star', desc: 'Land 250 critical clicks.', check: (s) => s.stats.crits >= 250 },
  { id: 'combo_50', name: 'In The Zone', category: 'clicking', icon: 'cursor', desc: 'Reach a 50-click combo.', check: (s) => s.stats.maxCombo >= 50 },
  { id: 'combo_100', name: 'Combo Maestro', category: 'clicking', icon: 'cursor', desc: 'Reach a 100-click combo.', check: (s) => s.stats.maxCombo >= 100 },
);

const shopItems = ITEMS.filter((i) => !i.unobtainableInShop);
const objects: AchievementDef[] = ([[1, 'First Possession'], [5, 'Accumulating'], [12, 'Collector'], [25, 'Hoarder'], [40, 'Museum Curator']] as const).map(([n, name]) => ({
  id: `items_${n}`, name, category: 'objects' as const, icon: 'box' as const, desc: `Own ${n} objects at the same time.`,
  check: (s: GameState) => Object.keys(s.items).length >= n,
}));
objects.push({ id: 'items_all', name: 'Own Everything', category: 'objects', icon: 'gem', desc: 'Own every object sold in the shop at once.', hidden: true, check: (s) => shopItems.every((i) => s.items[i.id]) });

const totalOwned = (s: GameState) => Object.values(s.businesses).reduce((a, b) => a + b, 0);
const business: AchievementDef[] = ([[1, 'Entrepreneur'], [25, 'Diversified'], [100, 'Employer'], [300, 'Tycoon'], [750, 'Conglomerate'], [1500, 'Monopoly Board']] as const).map(([n, name]) => ({
  id: `biz_${n}`, name, category: 'business' as const, icon: 'store' as const, desc: `Own ${n} business units in one life.`,
  check: (s: GameState) => totalOwned(s) >= n,
}));
business.push(
  { id: 'biz_cans_100', name: 'Recycling Royalty', category: 'business', icon: 'can', desc: 'Own 100 Can Collecting units.', check: (s) => (s.businesses.cans ?? 0) >= 100 },
  { id: 'biz_garage', name: 'Garage Legend', category: 'business', icon: 'laptop', desc: 'Buy the secret Garage Startup.', hidden: true, check: (s) => (s.businesses.garage_startup ?? 0) >= 1 },
);

const events: AchievementDef[] = [
  { id: 'event_1', name: 'Plot Twist', category: 'events', icon: 'scroll', desc: 'Experience a random event.', check: (s) => s.stats.eventsSeen >= 1 },
  { id: 'event_25', name: 'Eventful Life', category: 'events', icon: 'scroll', desc: 'Experience 25 events.', check: (s) => s.stats.eventsSeen >= 25 },
  { id: 'event_100', name: 'Main Character', category: 'events', icon: 'scroll', desc: 'Experience 100 events.', check: (s) => s.stats.eventsSeen >= 100 },
  { id: 'rare_1', name: 'Once in a Lifetime', category: 'events', icon: 'gem', desc: 'Experience a rare event.', hidden: true, check: (s) => s.stats.rareEventsSeen >= 1 },
  { id: 'opp_1', name: 'Opportunity Knocks', category: 'events', icon: 'star', desc: 'Grab a golden opportunity.', check: (s) => s.stats.opportunitiesClicked >= 1 },
  { id: 'opp_50', name: 'Always Ready', category: 'events', icon: 'star', desc: 'Grab 50 golden opportunities.', check: (s) => s.stats.opportunitiesClicked >= 50 },
  { id: 'opp_250', name: 'Opportunist', category: 'events', icon: 'star', desc: 'Grab 250 golden opportunities.', check: (s) => s.stats.opportunitiesClicked >= 250 },
  { id: 'honest', name: 'Honest Citizen', category: 'events', icon: 'card', desc: 'Return a lost wallet.', hidden: true, check: (s) => !!s.flags.wallet_returned },
];

const secrets: AchievementDef[] = [
  { id: 'secret_1', name: 'Curious', category: 'secrets', icon: 'key', desc: 'Discover a secret.', check: (s) => Object.keys(s.secrets).length >= 1 },
  { id: 'secret_5', name: 'Investigator', category: 'secrets', icon: 'key', desc: 'Discover 5 secrets.', check: (s) => Object.keys(s.secrets).length >= 5 },
  { id: 'secret_10', name: 'Conspiracy Board', category: 'secrets', icon: 'key', desc: 'Discover 10 secrets.', check: (s) => Object.keys(s.secrets).length >= 10 },
  { id: 'secret_all', name: 'Nothing Left Hidden', category: 'secrets', icon: 'gem', desc: 'Discover every secret.', hidden: true, check: (s) => SECRETS.every((x) => s.secrets[x.id]) },
  { id: 'combo_1', name: 'Synergy', category: 'exploration', icon: 'star', desc: 'Discover an object combination.', check: (s) => Object.keys(s.discoveredCombos).length >= 1 },
  { id: 'combo_6', name: 'Set Builder', category: 'exploration', icon: 'star', desc: 'Discover 6 object combinations.', check: (s) => Object.keys(s.discoveredCombos).length >= 6 },
  { id: 'combo_all', name: 'Master Combinator', category: 'exploration', icon: 'gem', desc: 'Discover every combination.', hidden: true, check: (s) => COMBOS.every((c) => s.discoveredCombos[c.id]) },
  { id: 'time_1h', name: 'Settling In', category: 'exploration', icon: 'watch', desc: 'Play for one hour.', check: (s) => s.stats.playSeconds >= 3600 },
  { id: 'time_10h', name: 'Regular', category: 'exploration', icon: 'watch', desc: 'Play for ten hours.', check: (s) => s.stats.playSeconds >= 36000 },
  { id: 'days_7', name: 'Weekly Visitor', category: 'exploration', icon: 'watch', desc: 'Open the game on 7 different days.', check: (s) => s.stats.daysPlayed.length >= 7 },
];

const prestige: AchievementDef[] = [
  { id: 'prestige_1', name: 'Reinvented', category: 'prestige', icon: 'crown', desc: 'Reinvent yourself (prestige) once.', check: (s) => s.prestige.count >= 1 },
  { id: 'prestige_5', name: 'Serial Reinventor', category: 'prestige', icon: 'crown', desc: 'Prestige 5 times.', check: (s) => s.prestige.count >= 5 },
  { id: 'prestige_20', name: 'Many Lives', category: 'prestige', icon: 'crown', desc: 'Prestige 20 times.', check: (s) => s.prestige.count >= 20 },
  { id: 'rep_100', name: 'Household Name', category: 'prestige', icon: 'crown', desc: 'Reach 100 Reputation.', check: (s) => s.prestige.reputation >= 100 },
  { id: 'rep_1000', name: 'Legend', category: 'prestige', icon: 'crown', desc: 'Reach 1,000 Reputation.', check: (s) => s.prestige.reputation >= 1000 },
];

export const ACHIEVEMENTS: AchievementDef[] = [...wealth, ...social, ...clicking, ...objects, ...business, ...events, ...secrets, ...prestige];
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
