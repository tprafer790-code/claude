import { detectLanguage } from '../i18n';
import { Decimal } from '../core/bignum';
import type { Effect, Slot } from '../data/types';
import type { EventOutcome } from '../data/events';

export const SAVE_VERSION = 1;

export interface Buff {
  id: string;
  label: string;
  target: 'income' | 'click';
  mult: number;
  endsAt: number;
}

export interface DelayedOutcome {
  id: string;
  at: number;
  label: string;
  eventTitle: string;
  outcomes: EventOutcome[];
}

export interface Settings {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  language: 'en' | 'es';
  playerName: string;
  reducedMotion: boolean;
}

export interface Stats {
  totalClicks: number;
  crits: number;
  maxCombo: number;
  eventsSeen: number;
  rareEventsSeen: number;
  opportunitiesClicked: number;
  itemsBought: number;
  businessesBought: number;
  bestLifeEarned: Decimal;
  playSeconds: number;
  /** Distinct calendar days the game was opened (YYYY-MM-DD), capped list. */
  daysPlayed: string[];
}

export interface DailyState {
  date: string;
  challengeId: string;
  baseline: number;
  claimed: boolean;
  streak: number;
  lastClaimDate: string;
}

export interface GameState {
  version: number;

  // ——— Current life (reset on prestige) ———
  money: Decimal;
  earnedThisLife: Decimal;
  rankIndex: number;
  businesses: Record<string, number>;
  upgrades: Record<string, true>;
  items: Record<string, true>;
  equipped: Partial<Record<Slot, string>>;
  lifeEffects: { effect: Effect; label: string }[];
  buffs: Buff[];
  delayed: DelayedOutcome[];
  lifeClicks: number;
  lifeStartedAt: number;
  abilityReadyAt: Record<string, number>;

  // ——— Permanent ———
  lifetimeEarned: Decimal;
  highestRankEver: number;
  achievements: Record<string, number>;
  secrets: Record<string, number>;
  secretProgress: Record<string, number>;
  discoveredCombos: Record<string, number>;
  unlockedBusinesses: Record<string, true>;
  flags: Record<string, true>;
  counters: Record<string, number>;
  missionsClaimed: Record<string, true>;
  prestige: {
    reputation: number;
    legacy: number;
    count: number;
    perks: Record<string, number>;
  };
  stats: Stats;
  daily: DailyState;

  // ——— Scheduling (play-time based) ———
  nextEventIn: number;
  nextOpportunityIn: number;
  pendingEvent: string | null;
  lastEventId: string;

  // ——— Meta ———
  createdAt: number;
  lastSavedAt: number;
  settings: Settings;
  tutorialDone: boolean;
  seenEvents: Record<string, number>;
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    money: new Decimal(0),
    earnedThisLife: new Decimal(0),
    rankIndex: 0,
    businesses: {},
    upgrades: {},
    items: {},
    equipped: {},
    lifeEffects: [],
    buffs: [],
    delayed: [],
    lifeClicks: 0,
    lifeStartedAt: now,
    abilityReadyAt: {},

    lifetimeEarned: new Decimal(0),
    highestRankEver: 0,
    achievements: {},
    secrets: {},
    secretProgress: {},
    discoveredCombos: {},
    unlockedBusinesses: {},
    flags: {},
    counters: {},
    missionsClaimed: {},
    prestige: { reputation: 0, legacy: 0, count: 0, perks: {} },
    stats: {
      totalClicks: 0,
      crits: 0,
      maxCombo: 0,
      eventsSeen: 0,
      rareEventsSeen: 0,
      opportunitiesClicked: 0,
      itemsBought: 0,
      businessesBought: 0,
      bestLifeEarned: new Decimal(0),
      playSeconds: 0,
      daysPlayed: [],
    },
    daily: { date: '', challengeId: '', baseline: 0, claimed: false, streak: 0, lastClaimDate: '' },

    nextEventIn: 120,
    nextOpportunityIn: 45,
    pendingEvent: null,
    lastEventId: '',

    createdAt: now,
    lastSavedAt: now,
    settings: { sfxVolume: 0.7, musicVolume: 0.35, muted: false, language: detectLanguage(), playerName: '', reducedMotion: false },
    tutorialDone: false,
    seenEvents: {},
  };
}
