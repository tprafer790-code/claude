import { BUSINESS_UPGRADE_TIERS } from '../config/economy';
import { BUSINESSES } from './businesses';
import type { UpgradeDef } from './types';

const GENERIC_TIER_NAMES = ['Synergy Overdrive', 'Vertical Integration', 'Paradigm Shift', 'Quantum Efficiency'];

/** One x2 upgrade per business per tier, generated from data. */
const businessUpgrades: UpgradeDef[] = BUSINESSES.flatMap((b) =>
  BUSINESS_UPGRADE_TIERS.map(([owned, costMult], tier) => ({
    id: `bu_${b.id}_${tier}`,
    name: b.upgradeNames[tier] ?? `${b.name}: ${GENERIC_TIER_NAMES[(tier - b.upgradeNames.length) % GENERIC_TIER_NAMES.length]}`,
    desc: `${b.name} income ×2`,
    cost: b.baseCost * costMult,
    effects: [{ kind: 'businessMult' as const, business: b.id, value: 2 }],
    business: { id: b.id, owned },
    icon: b.icon,
  })),
);

const clickUpgrades: UpgradeDef[] = [
  { id: 'cu_gloves', name: 'Fingerless Gloves', desc: 'Clicks ×2. Warm palms, free fingertips.', cost: 100, effects: [{ kind: 'clickMult', value: 2 }], icon: 'cursor' },
  { id: 'cu_squint', name: 'Determined Squint', desc: 'Clicks ×2. You look like you mean business.', cost: 1000, effects: [{ kind: 'clickMult', value: 2 }], rankReq: 4, icon: 'cursor' },
  { id: 'cu_strap', name: 'Ergonomic Wrist Strap', desc: 'Clicks ×2. Carpal comfort for the career clicker.', cost: 25000, effects: [{ kind: 'clickMult', value: 2 }], rankReq: 11, icon: 'cursor' },
  { id: 'cu_mindset', name: 'Hustle Mindset', desc: 'Each click also earns 1% of your income per second.', cost: 1e5, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 16, icon: 'brain' },
  { id: 'cu_pitch', name: 'Elevator Pitch', desc: 'Each click also earns +1% of your income per second.', cost: 1e7, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 31, icon: 'brain' },
  { id: 'cu_handshake', name: 'Power Handshake', desc: 'Each click also earns +1% of your income per second.', cost: 1e9, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 38, icon: 'brain' },
  { id: 'cu_golden', name: 'Golden Fingertips', desc: 'Each click also earns +1% of your income per second.', cost: 1e11, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 42, icon: 'star' },
  { id: 'cu_desk', name: 'Executive Clicking Desk', desc: 'Each click also earns +1% of your income per second.', cost: 1e13, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 45, icon: 'star' },
  { id: 'cu_market', name: 'Invisible Hand', desc: 'Each click also earns +1% of your income per second. The market clicks with you.', cost: 1e15, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 48, icon: 'star' },
  { id: 'cu_divine', name: 'Tap of Destiny', desc: 'Each click also earns +1% of your income per second.', cost: 1e18, effects: [{ kind: 'clickIpsPercent', value: 0.01 }], rankReq: 51, icon: 'gem' },
];

const lifeUpgrades: UpgradeDef[] = [
  { id: 'lu_library', name: 'Library Card', desc: 'All income ×1.1. Free books, free WiFi, free warmth.', cost: 2500, effects: [{ kind: 'incomeMult', value: 1.1 }], rankReq: 8, icon: 'book' },
  { id: 'lu_finance_book', name: 'Read a Finance Book', desc: 'All income ×1.15. You skimmed chapter one twice.', cost: 60000, effects: [{ kind: 'incomeMult', value: 1.15 }], rankReq: 16, icon: 'book' },
  { id: 'lu_spreadsheets', name: 'Learn Spreadsheets', desc: 'All income ×1.2. Conditional formatting changed your life.', cost: 5e5, effects: [{ kind: 'incomeMult', value: 1.2 }], rankReq: 23, icon: 'chart' },
  { id: 'lu_accountant', name: 'Hire an Accountant', desc: 'All income ×1.25. She found money in your couch. Literally.', cost: 5e7, effects: [{ kind: 'incomeMult', value: 1.25 }], rankReq: 33, icon: 'scroll' },
  { id: 'lu_lawyers', name: 'Team of Tax Lawyers', desc: 'All income ×1.3. Loopholes are just doors with paperwork.', cost: 5e9, effects: [{ kind: 'incomeMult', value: 1.3 }], rankReq: 39, icon: 'scroll' },
  { id: 'lu_lobbyist', name: 'Friendly Lobbyist', desc: 'All income ×1.35. Laws are now written in your favorite font.', cost: 5e11, effects: [{ kind: 'incomeMult', value: 1.35 }], rankReq: 43, icon: 'key' },
  { id: 'lu_think_tank', name: 'Own a Think Tank', desc: 'All income ×1.4. They think. You profit.', cost: 5e14, effects: [{ kind: 'incomeMult', value: 1.4 }], rankReq: 47, icon: 'brain' },
  { id: 'lu_bargain', name: 'Haggling Masterclass', desc: 'Businesses 5% cheaper. Never pay the sticker price.', cost: 2e5, effects: [{ kind: 'costDiscount', value: 0.95 }], rankReq: 20, icon: 'card' },
  { id: 'lu_bulk', name: 'Bulk Buying Contracts', desc: 'Businesses 5% cheaper.', cost: 2e10, effects: [{ kind: 'costDiscount', value: 0.95 }], rankReq: 40, icon: 'card' },
  { id: 'lu_sleep', name: 'Actually Sleeping', desc: 'Offline income +20 points of efficiency. Rest is productive, it turns out.', cost: 3e4, effects: [{ kind: 'offlineEfficiency', value: 0.2 }], rankReq: 12, icon: 'mattress' },
  { id: 'lu_lucky', name: 'Lucky Socks', desc: '+2% critical click chance. Unwashed for luck.', cost: 1e4, effects: [{ kind: 'critChance', value: 0.02 }], rankReq: 10, icon: 'star' },
  { id: 'lu_rhythm', name: 'Click Rhythm Training', desc: 'Combo cap +50 steps.', cost: 3e6, effects: [{ kind: 'comboMax', value: 50 }], rankReq: 28, icon: 'cursor' },
];

export const UPGRADES: UpgradeDef[] = [...clickUpgrades, ...lifeUpgrades, ...businessUpgrades];
export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
