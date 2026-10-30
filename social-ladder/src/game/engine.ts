import { getLanguage, t } from '../i18n';
import { BUSINESS_UPGRADE_TIERS, ECONOMY } from '../config/economy';
import { Decimal, money } from '../core/bignum';
import { ABILITIES } from '../data/abilities';
import { ACHIEVEMENTS } from '../data/achievements';
import { BUSINESS_BY_ID, BUSINESSES } from '../data/businesses';
import { COMBOS } from '../data/combos';
import { EVENT_BY_ID, EVENTS, type EventAction, type EventOutcome } from '../data/events';
import { ITEM_BY_ID, ITEMS } from '../data/items';
import { DAILIES, MISSIONS } from '../data/missions';
import { PERK_BY_ID, SEED_MONEY } from '../data/perks';
import { RANKS } from '../data/ranks';
import { SECRET_BY_ID, SECRETS } from '../data/secrets';
import { STAGE_BY_ID } from '../data/stages';
import { UPGRADE_BY_ID, UPGRADES } from '../data/upgrades';
import { businessAffordable, businessCost, computeDerived, type Derived } from './derive';
import { checkCustomSecret } from './secretChecks';
import { DILEMMA_BY_ID, DILEMMAS } from '../data/dilemmas';
import { AID_COOLDOWN, DEFLATION_EVERY, ELECTION_EVERY, ENVELOPE_SCANDAL_CHANCE, HAPPENING_EVERY, PARTY_BY_ID, phaseForStage, TOWNHALL_INCOME, TOWNHALL_STATUS, type PartyDef, SUBSIDY_INFLATION, SUBSIDY_INFLATION_CAP } from '../data/parties';
import { PARTNER_BY_ID, PARTNERS, ROMANCE } from '../data/romance';
import { CASINO, RED_NUMBERS, SCRATCH_PRIZES, SCRATCH_SYMBOLS } from '../data/casino';
import { ATTACKS, HEALTH, RIVAL_GROWTH, RIVAL_LEAD, RIVALS, STATUS_DANGER, STATUS_GAIN_SECONDS, STATUS_JAIL, STATUS_LOSS_SECONDS, STATUS_MAX, STATUS_MIN, statusReqMult, VAULT_PRIZES, vaultClicks } from '../data/social';
import { CHEST_PRIZES, CHESTS, LEAGUE, leagueBots, LOGIN_DAYS, botProgress, prevDay, weekElapsed, weekOf, type ChestPrize, type ChestRarity } from '../data/retention';
import { createInitialState, type GameState } from './state';
import { ENGINEERING_MIN_PHASE, HACIENDA, inspectionChance, inspectionLevel, TAX_MODES, TAX_PAID, TAX_RISK_PER_SEC, type InspectionLevel, type TaxMode } from '../data/hacienda';
import type { IconId } from '../data/types';

export type GameEvent =
  | { type: 'click'; amount: Decimal; crit: boolean; combo: number; comboMult: number; lucky: Decimal | null }
  | { type: 'promotion'; from: number; to: number; stageChanged: boolean }
  | { type: 'achievement'; id: string }
  | { type: 'secret'; id: string }
  | { type: 'combo'; id: string }
  | { type: 'purchase'; kind: 'business' | 'upgrade' | 'item' | 'perk'; id: string }
  | { type: 'eventStart'; id: string }
  | { type: 'eventResult'; title: string; text: string; summary: string[] }
  | { type: 'opportunitySpawn'; id: number; x: number; y: number; lifetime: number }
  | { type: 'opportunityCollect'; id: number; text: string }
  | { type: 'opportunityExpire'; id: number }
  | { type: 'ability'; id: string }
  | { type: 'mission'; id: string; reward: Decimal }
  | { type: 'prestige'; gained: number }
  | { type: 'toast'; text: string; tone: 'info' | 'good' | 'bad' | 'rare' }
  | { type: 'vote'; party: string; mandates: number }
  | { type: 'partyPerk'; party: string; label: string; text: string; summary: string[]; tone: 'good' | 'bad' }
  | { type: 'dilemmaStart'; id: string }
  | { type: 'dilemmaResult'; id: string; yes: boolean; timedOut: boolean; title: string; text: string; summary: string[]; statusDelta: number }
  | { type: 'status'; delta: number; value: number; payout: Decimal }
  | { type: 'aid'; party: string; amount: Decimal; inflation: number }
  | { type: 'attack'; damage: number; text: string; knockedOut: boolean; bill: Decimal }
  | { type: 'heal'; cost: Decimal }
  | { type: 'jail'; reason: 'status' | 'tax' }
  | { type: 'happening'; party: string; text: string; summary: string[]; tone: 'good' | 'bad' }
  | { type: 'taxRefund'; amount: Decimal; status: number }
  | { type: 'inspection'; level: InspectionLevel; fine: Decimal; status: number; prison: boolean; seized: boolean }
  | { type: 'regularize'; cost: Decimal; amnesty: boolean }
  | { type: 'prescribed' }
  | { type: 'encounterStart'; partner: string }
  | { type: 'encounterResult'; choice: 'safe' | 'wild' | 'leave'; pregnant: boolean }
  | { type: 'baby'; children: number }
  | { type: 'childSupport'; amount: Decimal; children: number }
  | { type: 'rivalBeaten'; index: number; name: string; reward: Decimal }
  | { type: 'vault'; prize: string; text: string; summary: string[] }
  | { type: 'chestDrop'; rarity: ChestRarity; source: 'time' | 'click' | 'login' | 'offline' | 'league' }
  | { type: 'chestOpen'; result: ChestResult }
  | { type: 'loginReward'; day: number; amount: Decimal; chest: ChestRarity | null };

export interface ChestResult {
  rarity: ChestRarity;
  prize: ChestPrize['kind'];
  text: string;
  amount: Decimal | null;
}

export interface NextUnlock {
  kind: 'business' | 'ability' | 'class' | 'dates' | 'prestige';
  name: string;
  icon: IconId;
  rank: number;
  fraction: number;
  reveal: boolean;
}

export interface LeagueRow {
  name: string;
  value: Decimal;
  status: number;
  me: boolean;
}

export interface ClickResult {
  amount: Decimal;
  crit: boolean;
  combo: number;
  comboMult: number;
  lucky: Decimal | null;
}

export interface OfflineSummary {
  seconds: number;
  creditedSeconds: number;
  capped: boolean;
  earned: Decimal;
  efficiency: number;
  ranksGained: string[];
  resolved: string[];
  /** Business that earned the most while away (null with no businesses). */
  topBusiness: string | null;
  /** A chest left in the letterbox after a long absence. */
  chest: boolean;
}

export interface EngineOptions {
  now?: () => number;
  random?: () => number;
}

export type BuyQty = 1 | 10 | 100 | 'max';

export interface ScratchResult {
  prize: string;
  grid: string[];
  payout: Decimal;
  price: Decimal;
}

export interface RouletteResult {
  n: number;
  color: 'red' | 'black' | 'green';
  win: boolean;
  payout: Decimal;
  stake: Decimal;
}

/** Seconds to answer a dilemma before it defaults to NO. */
export const DILEMMA_SECONDS = 25;

/**
 * The game simulation. Pure TypeScript with no DOM access, so it can be unit
 * tested and simulated headlessly. UI and renderer subscribe to changes and
 * transient events.
 */
export class GameEngine {
  state: GameState;
  readonly now: () => number;
  readonly random: () => number;

  private derivedCache: Derived | null = null;
  private baseDerivedCache: Derived | null = null;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: GameEvent) => void>();
  private version = 0;

  // Transient (not saved)
  combo = 0;
  private lastClickAt = 0;
  private recentClicks: number[] = [];
  private lastActivityAt: number;
  private typedBuffer = '';
  private achievementTimer = 0;
  private assistantCarry = 0;
  opportunity: { id: number; expiresAt: number } | null = null;
  /** A casino prize waiting for its reveal animation. */
  casinoPending: { payout: Decimal; status: number; at: number } | null = null;
  private opportunitySeq = 0;
  visible = true;

  constructor(state?: GameState, opts: EngineOptions = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.random = opts.random ?? Math.random;
    this.state = state ?? createInitialState(this.now());
    this.lastActivityAt = this.now();
  }

  // ——— Subscriptions ———
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  onEvent(fn: (e: GameEvent) => void) {
    this.eventListeners.add(fn);
    return () => void this.eventListeners.delete(fn);
  }
  getVersion() {
    return this.version;
  }
  private emit(e: GameEvent) {
    for (const fn of this.eventListeners) fn(e);
  }
  /** Marks state as changed: invalidates derived values and notifies the UI. */
  changed() {
    this.invalidate();
    this.version++;
    for (const fn of this.listeners) fn();
  }

  private invalidate() {
    this.derivedCache = null;
    this.baseDerivedCache = null;
  }

  get derived(): Derived {
    if (!this.derivedCache) this.derivedCache = computeDerived(this.state, this.now());
    return this.derivedCache;
  }

  /** Derived values without temporary buffs (used for reward scaling and offline). */
  get baseDerived(): Derived {
    if (!this.baseDerivedCache) this.baseDerivedCache = computeDerived(this.state, this.now(), false);
    return this.baseDerivedCache;
  }

  /**
   * "Seconds of income" unit used by rewards. Based on un-buffed income, with
   * an early-game floor of two clicks per second so rewards matter before
   * passive income exists.
   */
  incomeUnit(): Decimal {
    const d = this.baseDerived;
    return Decimal.max(d.incomePerSec, d.clickValue.mul(2)).max(1);
  }

  /**
   * A reward worth `seconds` of income, capped at a fraction of this life's
   * net worth so bonuses accelerate progress without skipping whole stages.
   */
  reward(seconds: number, min = 0, capFraction: number = ECONOMY.rewardCapFraction): Decimal {
    const unit = this.incomeUnit();
    const cap = Decimal.max(this.state.earnedThisLife.mul(capFraction), unit.mul(15));
    return Decimal.min(unit.mul(seconds), cap).max(min);
  }

  get rank() {
    return RANKS[this.state.rankIndex];
  }
  get stage() {
    return STAGE_BY_ID[this.rank.stage];
  }

  // ——— Money ———
  earn(amount: Decimal) {
    if (amount.lte(0)) return;
    const s = this.state;
    s.money = s.money.add(amount);
    s.earnedThisLife = s.earnedThisLife.add(amount);
    s.lifetimeEarned = s.lifetimeEarned.add(amount);
    s.league.earned = s.league.earned.add(amount);
    if (s.earnedThisLife.gt(s.stats.bestLifeEarned)) s.stats.bestLifeEarned = s.earnedThisLife;
  }
  private spend(amount: Decimal): boolean {
    if (this.state.money.lt(amount)) return false;
    this.state.money = this.state.money.sub(amount);
    return true;
  }

  // ——— Clicking ———
  /** Current combo if still within the combo window, else 0. */
  liveCombo(): number {
    return this.now() - this.lastClickAt <= ECONOMY.click.comboWindowMs ? this.combo : 0;
  }

  click(): ClickResult {
    const s = this.state;
    const t = this.now();
    const d = this.derived;

    if (s.money.floor().eq(777)) this.checkSecret('jackpot', true);

    this.combo = t - this.lastClickAt <= ECONOMY.click.comboWindowMs ? this.combo + 1 : 1;
    this.lastClickAt = t;
    this.lastActivityAt = t;
    this.recentClicks.push(t);
    while (this.recentClicks.length && t - this.recentClicks[0] > 1000) this.recentClicks.shift();
    if (this.recentClicks.length >= 15) this.checkSecret('speed_demon', true);

    const steps = Math.min(this.combo - 1, d.comboMax);
    const comboMult = 1 + steps * ECONOMY.click.comboStep;
    const crit = this.random() < d.critChance;
    let amount = d.clickValue.mul(comboMult);
    if (crit) amount = amount.mul(ECONOMY.click.critMultiplier);

    let lucky: Decimal | null = null;
    if (this.random() < ECONOMY.click.luckyFindChance) {
      lucky = this.reward(ECONOMY.click.luckyFindSecondsOfIncome);
      amount = amount.add(lucky);
    }

    this.earn(amount);
    s.stats.totalClicks++;
    s.lifeClicks++;
    if (crit) s.stats.crits++;
    if (this.combo > s.stats.maxCombo) s.stats.maxCombo = this.combo;
    s.vault.clicks++;
    if (s.vault.clicks >= vaultClicks(s.vault.opened)) this.openVault();
    if (this.random() < CHESTS.clickChance) this.dropChest('click');

    const result = { amount, crit, combo: this.combo, comboMult, lucky };
    this.emit({ type: 'click', ...result });
    this.checkRanks();
    this.changed();
    return result;
  }

  // ——— Main loop ———
  tick(dt: number) {
    if (dt <= 0) return;
    if (this.state.status <= STATUS_JAIL) {
      this.goToJail();
      return;
    }
    const s = this.state;
    const t = this.now();
    const d = this.derived;

    this.earnTaxed(d.incomePerSec.mul(dt), dt);
    if (this.state !== s) return;

    if (d.assistantClicksPerSec > 0) {
      this.assistantCarry += d.assistantClicksPerSec * dt;
      const n = Math.floor(this.assistantCarry);
      if (n > 0) {
        this.assistantCarry -= n;
        this.earn(d.clickValue.mul(n));
      }
    }

    s.stats.playSeconds += dt;

    // Expire buffs
    const before = s.buffs.length;
    s.buffs = s.buffs.filter((b) => b.endsAt > t);
    if (s.buffs.length !== before) this.invalidate();

    this.resolveDueDelayed(t);
    this.tickGovernment(dt);
    this.tickDilemma(dt);
    this.tickRival(dt);
    this.tickHealth(dt);
    this.tickFamily(dt);
    if (this.casinoPending && t - this.casinoPending.at > 15000) this.settleCasino();

    // Free chests fall every few minutes of play.
    s.chests.nextIn -= dt;
    if (s.chests.nextIn <= 0) {
      s.chests.nextIn = CHESTS.dropMin + this.random() * (CHESTS.dropMax - CHESTS.dropMin);
      this.dropChest('time');
    }
    if (s.status < s.league.lowestStatus) s.league.lowestStatus = s.status;
    // Rivals grow with you, an hour behind.
    const hourly = this.incomeUnit().mul(3600);
    if (hourly.gt(s.league.ref)) s.league.ref = s.league.ref.add(hourly.sub(s.league.ref).mul(Math.min(1, dt / LEAGUE.refLagSeconds)));

    // Events
    if (!s.pendingEvent) {
      s.nextEventIn -= dt * d.eventRate;
      if (s.nextEventIn <= 0) this.startRandomEvent();
    }

    // Opportunities
    if (this.opportunity && this.opportunity.expiresAt <= t) {
      this.emit({ type: 'opportunityExpire', id: this.opportunity.id });
      this.opportunity = null;
    }
    if (!this.opportunity) {
      s.nextOpportunityIn -= dt;
      if (s.nextOpportunityIn <= 0) this.spawnOpportunity();
    }

    this.checkRanks();

    this.achievementTimer += dt;
    if (this.achievementTimer >= 1) {
      this.achievementTimer = 0;
      this.checkAchievements();
      this.checkCustomSecrets();
    }
    this.changed();
  }

  // ——— Ranks ———
  nextRank() {
    return RANKS[this.state.rankIndex + 1] ?? null;
  }
  /** Net worth needed for a rank, after the status multiplier. */
  rankReq(index: number): Decimal {
    const r = RANKS[index];
    return r ? new Decimal(r.req).mul(this.statusMult()) : new Decimal(Infinity);
  }
  statusMult(): number {
    return statusReqMult(this.state.status);
  }
  /** Progress to the next rank in [0..1] (log-scaled for readability) and blockers. */
  rankProgress(): { fraction: number; missingItem: string | null; req: Decimal | null } {
    const next = this.nextRank();
    if (!next) return { fraction: 1, missingItem: null, req: null };
    const req = this.rankReq(this.state.rankIndex + 1);
    const cur = Decimal.min(this.rankReq(this.state.rankIndex), req);
    const e = this.state.earnedThisLife;
    let fraction: number;
    if (e.gte(req)) fraction = 1;
    else {
      const span = req.sub(cur);
      fraction = span.lte(0) ? 1 : Math.max(0, Math.min(1, e.sub(cur).div(span).toNumber()));
    }
    const missingItem = next.requiresItem && !this.state.items[next.requiresItem] ? next.requiresItem : null;
    return { fraction, missingItem, req };
  }
  checkRanks() {
    const s = this.state;
    let promoted = false;
    for (;;) {
      const next = RANKS[s.rankIndex + 1];
      if (!next) break;
      if (s.earnedThisLife.lt(this.rankReq(s.rankIndex + 1))) break;
      if (next.requiresItem && !s.items[next.requiresItem]) break;
      const from = s.rankIndex;
      s.rankIndex++;
      if (s.rankIndex > s.highestRankEver) s.highestRankEver = s.rankIndex;
      const stageChanged = RANKS[from].stage !== next.stage;
      this.invalidate();
      promoted = true;
      this.emit({ type: 'promotion', from, to: s.rankIndex, stageChanged });
      if (stageChanged) this.onNewClass();
    }
    if (promoted) {
      this.checkCustomSecrets();
      this.checkAchievements();
    }
  }

  /**
   * The next thing the climb unlocks (business, ability, social class…) and
   * how close it is. The name stays hidden until you are 70 % of the way.
   */
  nextUnlock(): NextUnlock | null {
    const s = this.state;
    const cands: Omit<NextUnlock, 'fraction' | 'reveal'>[] = [];
    const nb = this.nextLockedBusiness();
    if (nb) cands.push({ kind: 'business', name: nb.name, icon: nb.icon, rank: nb.rankReq });
    const ab = ABILITIES.find((a) => a.rankReq > s.rankIndex);
    if (ab) cands.push({ kind: 'ability', name: ab.name, icon: ab.icon, rank: ab.rankReq });
    const cls = RANKS.findIndex((r, i) => i > s.rankIndex && r.stage !== this.rank.stage);
    if (cls > 0) cands.push({ kind: 'class', name: STAGE_BY_ID[RANKS[cls].stage].name, icon: 'crown', rank: cls });
    if (PARTNERS.length && s.rankIndex < ROMANCE.minRank) cands.push({ kind: 'dates', name: '', icon: 'wine', rank: ROMANCE.minRank });
    if (s.rankIndex < ECONOMY.prestige.minRankIndex && s.prestige.count === 0) cands.push({ kind: 'prestige', name: '', icon: 'star', rank: ECONOMY.prestige.minRankIndex });
    if (!cands.length) return null;
    const next = cands.reduce((a, b) => (b.rank < a.rank ? b : a));
    let fraction: number;
    if (next.rank === s.rankIndex + 1) fraction = this.rankProgress().fraction;
    else {
      const cur = Decimal.max(this.rankReq(s.rankIndex), 1);
      const req = this.rankReq(next.rank);
      const e = Decimal.max(s.earnedThisLife, 1);
      fraction = Math.max(0, Math.min(1, e.div(cur).log10() / Math.max(1e-9, req.div(cur).log10())));
    }
    return { ...next, fraction, reveal: fraction >= 0.7 };
  }

  // ——— Businesses ———
  isBusinessVisible(id: string) {
    const b = BUSINESS_BY_ID[id];
    if (b.secret) return !!this.state.unlockedBusinesses[id];
    return this.state.rankIndex >= b.rankReq;
  }
  visibleBusinesses() {
    return BUSINESSES.filter((b) => this.isBusinessVisible(b.id));
  }
  /** Next business that will unlock with rank (teaser). */
  nextLockedBusiness() {
    return BUSINESSES.find((b) => !b.secret && this.state.rankIndex < b.rankReq) ?? null;
  }
  resolveQty(id: string, qty: BuyQty): number {
    if (qty === 'max') return Math.max(1, businessAffordable(this.state, id, this.derived.costDiscount));
    return qty;
  }
  businessCost(id: string, qty: BuyQty): Decimal {
    return businessCost(this.state, id, this.resolveQty(id, qty), this.derived.costDiscount);
  }
  buyBusiness(id: string, qty: BuyQty = 1): boolean {
    if (!BUSINESS_BY_ID[id] || !this.isBusinessVisible(id)) return false;
    const n = this.resolveQty(id, qty);
    const cost = businessCost(this.state, id, n, this.derived.costDiscount);
    if (!this.spend(cost)) return false;
    this.state.businesses[id] = (this.state.businesses[id] ?? 0) + n;
    this.state.stats.businessesBought += n;
    this.emit({ type: 'purchase', kind: 'business', id });
    this.changed();
    return true;
  }

  // ——— Upgrades ———
  isUpgradeAvailable(id: string) {
    const u = UPGRADE_BY_ID[id];
    if (!u || this.state.upgrades[id]) return false;
    if (u.rankReq !== undefined && this.state.rankIndex < u.rankReq) return false;
    if (u.business) {
      if (!this.isBusinessVisible(u.business.id)) return false;
      if ((this.state.businesses[u.business.id] ?? 0) < u.business.owned) return false;
    }
    return true;
  }
  availableUpgrades() {
    return UPGRADES.filter((u) => this.isUpgradeAvailable(u.id)).sort((a, b) => a.cost - b.cost);
  }
  buyUpgrade(id: string): boolean {
    if (!this.isUpgradeAvailable(id)) return false;
    if (!this.spend(this.upgradeCost(id))) return false;
    this.state.upgrades[id] = true;
    this.emit({ type: 'purchase', kind: 'upgrade', id });
    this.changed();
    return true;
  }
  /** Number of business upgrade tiers still ahead (for teasers). */
  nextBusinessUpgradeAt(id: string): number | null {
    const owned = this.state.businesses[id] ?? 0;
    for (let tier = 0; tier < BUSINESS_UPGRADE_TIERS.length; tier++) {
      const [need] = BUSINESS_UPGRADE_TIERS[tier];
      if (!this.state.upgrades[`bu_${id}_${tier}`] && owned < need) return need;
    }
    return null;
  }

  // ——— Items & inventory ———
  shopItems() {
    return ITEMS.filter((i) => !i.unobtainableInShop);
  }
  itemPrice(id: string): Decimal {
    return new Decimal(ITEM_BY_ID[id]?.price ?? 0).mul(this.derived.priceMult);
  }
  upgradeCost(id: string): Decimal {
    return new Decimal(UPGRADE_BY_ID[id]?.cost ?? 0).mul(this.derived.priceMult);
  }
  canBuyItem(id: string) {
    const it = ITEM_BY_ID[id];
    return !!it && !it.unobtainableInShop && !this.state.items[id] && this.state.rankIndex >= it.rankReq && this.state.money.gte(this.itemPrice(id));
  }
  buyItem(id: string): boolean {
    const it = ITEM_BY_ID[id];
    if (!it || it.unobtainableInShop || this.state.items[id] || this.state.rankIndex < it.rankReq) return false;
    if (!this.spend(this.itemPrice(id))) return false;
    this.grantItem(id);
    this.state.stats.itemsBought++;
    this.emit({ type: 'purchase', kind: 'item', id });
    this.checkRanks();
    this.changed();
    return true;
  }
  private grantItem(id: string) {
    const it = ITEM_BY_ID[id];
    if (!it || this.state.items[id]) return;
    this.state.items[id] = true;
    if (it.slot) {
      const cur = this.state.equipped[it.slot];
      if (!cur || (ITEM_BY_ID[cur]?.price ?? 0) <= it.price) this.state.equipped[it.slot] = id;
    }
    this.invalidate();
    this.checkCombos();
  }
  equip(id: string) {
    const it = ITEM_BY_ID[id];
    if (!it?.slot || !this.state.items[id]) return;
    this.state.equipped[it.slot] = id;
    this.changed();
  }

  checkCombos() {
    for (const c of COMBOS) {
      if (this.state.discoveredCombos[c.id]) continue;
      if (!c.items.every((i) => this.state.items[i])) continue;
      this.state.discoveredCombos[c.id] = this.now();
      if (c.unlockBusiness) this.state.unlockedBusinesses[c.unlockBusiness] = true;
      if (c.grantItem) this.grantItem(c.grantItem);
      this.invalidate();
      this.emit({ type: 'combo', id: c.id });
    }
  }

  // ——— Abilities ———
  availableAbilities() {
    return ABILITIES.filter((a) => this.state.rankIndex >= a.rankReq);
  }
  abilityCooldown(id: string): number {
    return Math.max(0, ((this.state.abilityReadyAt[id] ?? 0) - this.now()) / 1000);
  }
  useAbility(id: string): boolean {
    const a = ABILITIES.find((x) => x.id === id);
    if (!a || this.state.rankIndex < a.rankReq || this.abilityCooldown(id) > 0) return false;
    const t = this.now();
    if (a.kind === 'instantIncome') this.earn(this.reward(a.seconds ?? 60));
    else this.addBuff(a.id, a.name, a.kind === 'clickBuff' ? 'click' : 'income', a.mult ?? 2, a.duration ?? 10);
    this.state.abilityReadyAt[id] = t + a.cooldown * 1000;
    this.state.counters.abilities_used = (this.state.counters.abilities_used ?? 0) + 1;
    this.emit({ type: 'ability', id });
    this.checkRanks();
    this.changed();
    return true;
  }
  addBuff(id: string, label: string, target: 'income' | 'click', mult: number, seconds: number) {
    const endsAt = this.now() + seconds * 1000;
    const existing = this.state.buffs.find((b) => b.id === id);
    if (existing) {
      existing.endsAt = Math.max(existing.endsAt, endsAt);
      existing.mult = mult;
    } else this.state.buffs.push({ id, label, target, mult, endsAt });
    this.invalidate();
  }

  // ——— Golden opportunities ———
  private scheduleOpportunity() {
    const o = ECONOMY.opportunity;
    this.state.nextOpportunityIn = (o.minDelay + this.random() * (o.maxDelay - o.minDelay)) * this.derived.opportunityRate;
  }
  spawnOpportunity() {
    const id = ++this.opportunitySeq;
    const lifetime = ECONOMY.opportunity.lifetime;
    this.opportunity = { id, expiresAt: this.now() + lifetime * 1000 };
    this.scheduleOpportunity();
    this.emit({ type: 'opportunitySpawn', id, x: 0.15 + this.random() * 0.7, y: 0.18 + this.random() * 0.45, lifetime });
  }
  collectOpportunity(id: number): string | null {
    if (!this.opportunity || this.opportunity.id !== id) return null;
    this.opportunity = null;
    const o = ECONOMY.opportunity;
    const r = this.random();
    let text: string;
    if (r < 0.5) {
      const amount = this.reward(o.cashSecondsOfIncome).add(Decimal.min(this.state.money.mul(o.cashMoneyFraction), this.incomeUnit().mul(600)));
      this.earn(amount);
      text = t('oppCash', { amount: money(amount) });
    } else if (r < 0.8) {
      this.addBuff('frenzy', 'Boom Time', 'income', o.frenzyMultiplier, o.frenzySeconds);
      text = t('oppFrenzy', { mult: o.frenzyMultiplier, s: o.frenzySeconds });
    } else {
      this.addBuff('click_frenzy', 'Hot Streak', 'click', o.clickFrenzyMultiplier, o.clickFrenzySeconds);
      text = t('oppClickFrenzy', { mult: o.clickFrenzyMultiplier, s: o.clickFrenzySeconds });
    }
    this.state.stats.opportunitiesClicked++;
    this.emit({ type: 'opportunityCollect', id, text });
    this.checkRanks();
    this.changed();
    return text;
  }

  // ——— Random events ———
  private scheduleEvent() {
    const e = ECONOMY.events;
    this.state.nextEventIn = e.minCooldown + this.random() * (e.maxCooldown - e.minCooldown);
  }
  eligibleEvents() {
    const s = this.state;
    return EVENTS.filter((e) => {
      if (s.rankIndex < e.minRank) return false;
      if (e.maxRank !== undefined && s.rankIndex > e.maxRank) return false;
      if (e.once && s.seenEvents[e.id]) return false;
      if (e.requiresFlag && !s.flags[e.requiresFlag]) return false;
      if (e.forbidsFlag && s.flags[e.forbidsFlag]) return false;
      if (e.id === s.lastEventId) return false;
      return true;
    });
  }
  startRandomEvent(forceId?: string) {
    const pool = forceId ? [EVENT_BY_ID[forceId]].filter(Boolean) : this.eligibleEvents();
    if (!pool.length) {
      this.scheduleEvent();
      return;
    }
    const total = pool.reduce((a, e) => a + e.weight, 0);
    let r = this.random() * total;
    let chosen = pool[0];
    for (const e of pool) {
      r -= e.weight;
      if (r <= 0) {
        chosen = e;
        break;
      }
    }
    this.state.pendingEvent = chosen.id;
    this.emit({ type: 'eventStart', id: chosen.id });
    this.changed();
  }
  choiceCost(seconds?: number): Decimal {
    return seconds ? this.incomeUnit().mul(seconds) : new Decimal(0);
  }
  resolveEvent(choiceIndex: number): boolean {
    const s = this.state;
    const ev = s.pendingEvent ? EVENT_BY_ID[s.pendingEvent] : null;
    if (!ev) return false;
    const choice = ev.choices[choiceIndex];
    if (!choice) return false;
    const cost = this.choiceCost(choice.costSeconds);
    if (!this.spend(cost)) return false;
    const outcome = this.pickOutcome(choice.outcomes);
    const summary = this.applyActions(outcome.actions, ev.title);
    if (cost.gt(0)) summary.unshift(`-${money(cost)}`);
    s.pendingEvent = null;
    s.lastEventId = ev.id;
    s.seenEvents[ev.id] = (s.seenEvents[ev.id] ?? 0) + 1;
    s.stats.eventsSeen++;
    if (ev.rare) s.stats.rareEventsSeen++;
    this.scheduleEvent();
    this.emit({ type: 'eventResult', title: ev.title, text: outcome.text, summary });
    this.checkRanks();
    this.checkCustomSecrets();
    this.changed();
    return true;
  }
  private pickOutcome(outcomes: EventOutcome[]): EventOutcome {
    const total = outcomes.reduce((a, o) => a + o.chance, 0);
    let r = this.random() * total;
    for (const o of outcomes) {
      r -= o.chance;
      if (r <= 0) return o;
    }
    return outcomes[outcomes.length - 1];
  }
  private applyActions(actions: EventAction[], title: string): string[] {
    const s = this.state;
    const summary: string[] = [];
    for (const a of actions) {
      switch (a.type) {
        case 'money': {
          let amount = new Decimal(0);
          if (a.seconds) amount = amount.add(this.reward(a.seconds, 0, a.capFraction));
          if (a.fraction) amount = amount.add(s.money.mul(a.fraction));
          if (amount.gt(0)) {
            this.earn(amount);
            summary.push(`+${money(amount)}`);
          } else if (amount.lt(0)) {
            const loss = Decimal.min(amount.neg(), s.money);
            s.money = s.money.sub(loss);
            summary.push(`-${money(loss)}`);
          }
          break;
        }
        case 'buff':
          this.addBuff(`ev_${a.label}`, a.label, a.target, a.mult, a.seconds);
          summary.push(t(a.target === 'income' ? 'evBuffIncome' : 'evBuffClicks', { mult: a.mult, s: a.seconds }));
          break;
        case 'item':
          if (!s.items[a.id]) {
            this.grantItem(a.id);
            summary.push(t('evNewItem', { name: ITEM_BY_ID[a.id]?.name ?? a.id }));
          } else {
            const bonus = this.reward(120);
            this.earn(bonus);
            summary.push(t('evDuplicate', { amount: money(bonus) }));
          }
          break;
        case 'flag':
          s.flags[a.id] = true;
          break;
        case 'counter':
          s.counters[a.id] = (s.counters[a.id] ?? 0) + a.add;
          break;
        case 'status': {
          const delta = this.changeStatus(a.add);
          if (delta) summary.push(t('statusDelta', { v: `${delta > 0 ? '+' : ''}${delta}` }));
          break;
        }
        case 'permanent':
          s.lifeEffects.push({ effect: a.effect, label: a.label });
          this.invalidate();
          summary.push(t('evThisLife', { label: a.label }));
          break;
        case 'delayed':
          s.delayed.push({ id: `${title}_${this.now()}_${Math.floor(this.random() * 1e6)}`, at: this.now() + a.seconds * 1000, label: a.label, eventTitle: title, outcomes: a.outcomes });
          summary.push(t('evDelayed', { label: a.label, s: a.seconds }));
          break;
      }
    }
    return summary;
  }
  private resolveDueDelayed(t: number): string[] {
    const s = this.state;
    const due = s.delayed.filter((d) => d.at <= t);
    if (!due.length) return [];
    s.delayed = s.delayed.filter((d) => d.at > t);
    const texts: string[] = [];
    for (const d of due) {
      const outcome = this.pickOutcome(d.outcomes);
      const summary = this.applyActions(outcome.actions, d.eventTitle);
      texts.push(`${d.label}: ${outcome.text}`);
      this.emit({ type: 'eventResult', title: d.label, text: outcome.text, summary });
    }
    this.invalidate();
    return texts;
  }

  // ——— Status ———
  /** Changes status within its range; returns the change actually applied. */
  /**
   * Changes status within its range and returns the change actually applied.
   * Losing status pays dirty money; gaining it brings donations. `rewarded`
   * is off for prices paid in status (the casino entry fee).
   */
  changeStatus(add: number, rewarded = true): number {
    const s = this.state;
    const next = Math.round(Math.max(STATUS_MIN, Math.min(STATUS_MAX, s.status + add)) * 2) / 2;
    const delta = next - s.status;
    if (!delta) return 0;
    s.status = next;
    let payout = new Decimal(0);
    if (rewarded) {
      const pts = Math.abs(delta);
      payout = delta < 0 ? this.reward(pts * STATUS_LOSS_SECONDS, 50, Math.min(0.4, 0.1 * pts)) : this.reward(pts * STATUS_GAIN_SECONDS, 20, Math.min(0.25, 0.05 * pts));
      this.earn(payout);
    }
    this.invalidate();
    this.emit({ type: 'status', delta, value: next, payout });
    return delta;
  }

  // ——— Health and jail ———
  inDanger() {
    return this.state.status <= STATUS_DANGER;
  }
  healCost(): Decimal {
    return Decimal.max(this.state.money.mul(HEALTH.healCashFraction), this.incomeUnit().mul(HEALTH.healMinSeconds)).floor();
  }
  heal(): boolean {
    const s = this.state;
    if (s.health >= HEALTH.max) return false;
    const cost = this.healCost();
    if (!this.spend(cost)) return false;
    s.health = HEALTH.max;
    this.invalidate();
    this.emit({ type: 'heal', cost });
    this.changed();
    return true;
  }
  private tickHealth(dt: number) {
    const s = this.state;
    if (!this.inDanger()) {
      if (s.health < HEALTH.max) {
        s.health = Math.min(HEALTH.max, s.health + HEALTH.regenPerSec * dt);
        this.invalidate();
      }
      return;
    }
    s.attackIn -= dt;
    if (s.attackIn > 0) return;
    // The lower your status, the more often people go for you.
    const fury = Math.min(3, 1 + (STATUS_DANGER - s.status) / 15);
    const [a, b] = HEALTH.attackEvery;
    s.attackIn = (a + this.random() * (b - a)) / fury;
    const [lo, hi] = HEALTH.damage;
    const damage = Math.round(lo + this.random() * (hi - lo));
    s.health = Math.max(0, s.health - damage);
    let bill = new Decimal(0);
    const knockedOut = s.health <= 0;
    if (knockedOut) {
      bill = s.money.mul(HEALTH.hospitalCashFraction).floor();
      s.money = s.money.sub(bill);
      s.health = 40;
    }
    const text = ATTACKS[Math.floor(this.random() * ATTACKS.length)].text;
    this.invalidate();
    this.emit({ type: 'attack', damage, text, knockedOut, bill });
  }
  /** Status hit rock bottom: jail, and the life starts over with nothing gained. */
  goToJail(reason: 'status' | 'tax' = 'status') {
    const old = this.state;
    this.state = this.freshLife(old, old.prestige);
    this.state.counters.jail = (this.state.counters.jail ?? 0) + 1;
    this.opportunity = null;
    this.casinoPending = null;
    this.combo = 0;
    this.invalidate();
    this.emit({ type: 'jail', reason });
    this.changed();
  }

  // ——— Romance ———
  private tickFamily(dt: number) {
    const s = this.state;
    const f = s.family;
    if (f.pregnancyIn > 0) {
      f.pregnancyIn -= dt;
      if (f.pregnancyIn <= 0) {
        f.pregnancyIn = 0;
        f.children++;
        if (f.children === 1) f.supportIn = ROMANCE.supportEvery;
        s.lifeEffects.push({ effect: { kind: 'incomeMult', value: ROMANCE.childIncome }, label: t('childSupportLabel') });
        this.invalidate();
        this.emit({ type: 'baby', children: f.children });
      }
    }
    if (f.children > 0) {
      f.supportIn -= dt;
      if (f.supportIn <= 0) {
        f.supportIn = ROMANCE.supportEvery;
        const per = Decimal.max(s.money.mul(ROMANCE.supportCashFraction), this.incomeUnit().mul(ROMANCE.supportMinSeconds));
        const amount = Decimal.min(per.mul(f.children), s.money).floor();
        s.money = s.money.sub(amount);
        this.emit({ type: 'childSupport', amount, children: f.children });
      }
    }
    if (!PARTNERS.length || f.pending || s.pendingVote || s.pendingDilemma || s.rankIndex < ROMANCE.minRank) return;
    if (s.status < ROMANCE.minStatus && !s.equipped.ride) return;
    f.encounterIn -= dt;
    if (f.encounterIn > 0) return;
    const [a, b] = ROMANCE.every;
    f.encounterIn = a + this.random() * (b - a);
    f.pending = PARTNERS[Math.floor(this.random() * PARTNERS.length)].id;
    this.emit({ type: 'encounterStart', partner: f.pending });
  }
  startEncounter(partner = PARTNERS[0]?.id) {
    if (!partner) return;
    this.state.family.pending = partner;
    this.emit({ type: 'encounterStart', partner });
    this.changed();
  }
  resolveEncounter(choice: 'safe' | 'wild' | 'leave'): boolean {
    const s = this.state;
    const f = s.family;
    if (!f.pending || !PARTNER_BY_ID[f.pending]) return false;
    f.pending = null;
    let pregnant = false;
    if (choice === 'safe') s.lifeEffects.push({ effect: { kind: 'incomeMult', value: ROMANCE.safeIncome }, label: t('romanceSafeLabel') });
    if (choice === 'wild') {
      s.lifeEffects.push({ effect: { kind: 'incomeMult', value: ROMANCE.wildIncome }, label: t('romanceWildLabel') });
      if (f.pregnancyIn <= 0 && this.random() < ROMANCE.childChance) {
        f.pregnancyIn = ROMANCE.pregnancySeconds;
        pregnant = true;
      }
    }
    s.counters.encounters = (s.counters.encounters ?? 0) + 1;
    this.invalidate();
    this.emit({ type: 'encounterResult', choice, pregnant });
    this.changed();
    return true;
  }

  // ——— Government ———
  phase() {
    return phaseForStage(this.stage.index);
  }
  /** Owns a real home (not just a cardboard mattress). */
  private hasHome() {
    return Object.keys(this.state.items).some((id) => ITEM_BY_ID[id]?.slot === 'home' && ITEM_BY_ID[id].price >= 50000);
  }
  vote(partyId: string): boolean {
    const s = this.state;
    const party = PARTY_BY_ID[partyId];
    if (!party || !s.pendingVote) return false;
    const g = s.government;
    const phase = this.phase();
    g.mandates = g.party === partyId ? g.mandates + 1 : 1;
    g.party = partyId;
    g.perkIn = 25;
    g.happeningIn = 60;
    g.notices = 0;
    g.okupa = partyId === 'podremos' && phase === 0 && !this.hasHome();
    s.flags[`party_${partyId}_${phase}`] = true;
    s.pendingVote = false;
    g.electionIn = ELECTION_EVERY;
    this.invalidate();
    this.emit({ type: 'vote', party: partyId, mandates: g.mandates });
    this.changed();
    return true;
  }
  aidCooldown(): number {
    return Math.max(0, (this.state.government.aidReadyAt - this.now()) / 1000);
  }
  /** PESOE and Podremos hand out aid on request; every aid pushes prices up. */
  requestAid(): boolean {
    const g = this.state.government;
    const party = g.party ? PARTY_BY_ID[g.party] : null;
    if (!party?.aid || this.state.pendingVote || this.aidCooldown() > 0) return false;
    const amount = this.reward(party.aid.seconds[this.phase()], 20);
    this.earn(amount);
    if (g.subsidies < SUBSIDY_INFLATION_CAP) g.subsidies++;
    g.aidReadyAt = this.now() + AID_COOLDOWN * 1000;
    this.invalidate();
    this.emit({ type: 'aid', party: party.id, amount, inflation: Math.round(SUBSIDY_INFLATION * g.subsidies * 100) });
    this.checkRanks();
    this.changed();
    return true;
  }
  /** A new social class: squatters finally buy a home. */
  private onNewClass() {
    const s = this.state;
    const g = s.government;
    if (g.okupa) {
      g.okupa = false;
      g.notices = 0;
      const summary: string[] = [];
      if (!g.housingBonus) {
        g.housingBonus = true;
        const amount = this.reward(300, 0, 0.15);
        this.earn(amount);
        summary.push(`+${money(amount)}`);
      }
      this.emit({ type: 'partyPerk', party: 'podremos', label: t('housingTitle'), text: t('housingText'), summary, tone: 'good' });
    }
  }
  private tickGovernment(dt: number) {
    const s = this.state;
    const g = s.government;
    const party = g.party ? PARTY_BY_ID[g.party] : null;
    if (!party || s.pendingVote) return;
    g.electionIn -= dt;
    if (g.electionIn <= 0) {
      s.pendingVote = true;
      return;
    }
    // Right-wing governments slowly bring prices back down.
    if (!party.aid && g.subsidies > 0) {
      g.deflationIn -= dt;
      if (g.deflationIn <= 0) {
        g.deflationIn = DEFLATION_EVERY;
        g.subsidies--;
        this.invalidate();
      }
    }
    g.happeningIn -= dt;
    if (g.happeningIn <= 0) {
      const [a, b] = HAPPENING_EVERY;
      g.happeningIn = a + this.random() * (b - a);
      this.happen(party);
    }
    const perk = party.phases[this.phase()].perk;
    if (!perk) return;
    if (perk.kind === 'notice' && !g.okupa) return;
    g.perkIn -= dt;
    if (g.perkIn > 0) return;
    g.perkIn = perk.every;
    const summary: string[] = [];
    let text = perk.text;
    let tone: 'good' | 'bad' = 'good';
    switch (perk.kind) {
      case 'notice': {
        const notices = party.notices ?? [];
        if (g.notices >= notices.length) return;
        text = notices[g.notices].text;
        g.notices++;
        tone = 'bad';
        summary.push(t('noticeStress', { n: g.notices, max: notices.length }));
        break;
      }
      case 'parade':
        this.addBuff('parade', perk.label, 'income', 0.5, 15);
        tone = 'bad';
        break;
      case 'townhall': {
        this.addBuff('townhall', perk.label, 'income', TOWNHALL_INCOME, 10);
        const d = this.changeStatus(TOWNHALL_STATUS);
        if (d) summary.push(t('statusDelta', { v: `+${d}` }));
        break;
      }
      case 'envelope':
      case 'kickback': {
        const amount = this.reward(perk.seconds ?? 30);
        this.earn(amount);
        summary.push(`+${money(amount)}`);
        if (perk.kind === 'envelope' && this.random() < ENVELOPE_SCANDAL_CHANCE) {
          text = t('envelopeScandal');
          tone = 'bad';
          const d = this.changeStatus(-1);
          if (d) summary.push(t('statusDelta', { v: String(d) }));
        }
        break;
      }
    }
    this.invalidate();
    this.emit({ type: 'partyPerk', party: party.id, label: perk.label, text, summary, tone });
  }

  /** One of the governing party's absurd happenings. */
  happen(party: PartyDef, id?: string) {
    const list = party.happenings;
    if (!list.length) return;
    const h = (id && list.find((x) => x.id === id)) || list[Math.floor(this.random() * list.length)];
    const s = this.state;
    const summary: string[] = [];
    let good = 0;
    if (h.money) {
      const amount = this.reward(Math.abs(h.money), 10);
      if (h.money > 0) {
        this.earn(amount);
        summary.push(`+${money(amount)}`);
        good++;
      } else {
        const paid = Decimal.min(amount, s.money).floor();
        s.money = s.money.sub(paid);
        summary.push(`-${money(paid)}`);
        good--;
      }
    }
    if (h.status) {
      const d = this.changeStatus(h.status, h.status > 0);
      if (d) summary.push(t('statusDelta', { v: `${d > 0 ? '+' : ''}${d}` }));
      good += Math.sign(h.status);
    }
    if (h.buff) {
      this.addBuff(`hap_${h.id}`, party.name, h.buff.target, h.buff.mult, h.buff.seconds);
      summary.push(`${h.buff.target === 'click' ? t('clicksWord') : t('incomeWord')} ×${String(h.buff.mult).replace('.', getLanguage() === 'es' ? ',' : '.')} · ${h.buff.seconds}s`);
      good += h.buff.mult >= 1 ? 1 : -1;
    }
    this.invalidate();
    this.emit({ type: 'happening', party: party.id, text: h.text, summary, tone: good >= 0 ? 'good' : 'bad' });
  }

  // ——— Treasury (Hacienda) ———
  /** Income-tax rate of the current government for this social class. */
  taxRate(): number {
    const g = this.state.government;
    const party = g.party ? PARTY_BY_ID[g.party] : null;
    return party ? party.tax.rate[this.phase()] : HACIENDA.defaultRate;
  }
  /** How hard the current government chases tax dodgers. */
  taxZeal(): number {
    const g = this.state.government;
    return g.party ? PARTY_BY_ID[g.party].tax.inspect : 1;
  }
  canUseTaxMode(mode: TaxMode): boolean {
    return mode !== 'engineering' || this.phase() >= ENGINEERING_MIN_PHASE;
  }
  setTaxMode(mode: TaxMode): boolean {
    if (!TAX_MODES.includes(mode) || !this.canUseTaxMode(mode)) return false;
    this.state.tax.mode = mode;
    this.state.tax.cleanFor = 0;
    this.changed();
    return true;
  }
  /** PEPE's Tax Amnesty (late phase) lets hidden money home for 10%. */
  amnestyOpen(): boolean {
    return this.state.government.party === 'pepe' && this.phase() === 2;
  }
  regularizeCost(): Decimal {
    const h = this.state.tax.hidden;
    return h.mul(this.amnestyOpen() ? HACIENDA.amnestyRate : 1 + HACIENDA.regularizeSurcharge).ceil();
  }
  /** Own up voluntarily: pay the hidden tax plus a surcharge, risk back to zero. */
  regularize(): boolean {
    const x = this.state.tax;
    if (x.hidden.lte(0)) return false;
    const cost = this.regularizeCost();
    if (!this.spend(cost)) return false;
    x.hidden = new Decimal(0);
    x.risk = 0;
    x.cleanFor = 0;
    this.emit({ type: 'regularize', cost, amnesty: this.amnestyOpen() });
    this.changed();
    return true;
  }
  /** Passive income goes through the Treasury: honest pays, evaders hide it. */
  private earnTaxed(gross: Decimal, dt: number) {
    const x = this.state.tax;
    const rate = this.taxRate();
    const paidShare = TAX_PAID[x.mode];
    const tax = gross.mul(rate);
    this.earn(gross.sub(tax.mul(paidShare)));
    if (paidShare > 0) x.paid = x.paid.add(tax.mul(paidShare));
    if (paidShare < 1) x.hidden = x.hidden.add(tax.mul(1 - paidShare));
    this.tickTax(dt);
  }
  private tickTax(dt: number) {
    const s = this.state;
    const x = s.tax;
    x.risk = Math.max(0, Math.min(100, x.risk + TAX_RISK_PER_SEC[x.mode] * dt));
    if (x.mode === 'honest') {
      x.refundIn -= dt;
      if (x.refundIn <= 0) {
        x.refundIn = HACIENDA.refundEvery;
        const amount = x.paid.mul(HACIENDA.refundShare).floor();
        x.paid = new Decimal(0);
        if (amount.gt(0)) {
          this.earn(amount);
          const d = this.changeStatus(HACIENDA.refundStatus, false);
          this.emit({ type: 'taxRefund', amount, status: d });
        }
      }
      // Old sins prescribe after a long enough clean spell.
      if (x.risk <= 0 && x.hidden.gt(0)) {
        x.cleanFor += dt;
        if (x.cleanFor >= HACIENDA.prescriptionSeconds) {
          x.hidden = new Decimal(0);
          x.cleanFor = 0;
          this.emit({ type: 'prescribed' });
        }
      }
    }
    x.checkIn -= dt;
    if (x.checkIn > 0) return;
    x.checkIn = HACIENDA.checkEvery;
    if (x.hidden.lt(this.incomeUnit().mul(HACIENDA.minHiddenSeconds))) return;
    if (this.random() < inspectionChance(x.risk, this.taxZeal())) this.inspect();
  }
  /** The Treasury knocks. Punishment depends on the risk at that moment. */
  inspect(level: InspectionLevel = inspectionLevel(this.state.tax.risk)) {
    const s = this.state;
    const x = s.tax;
    const fine = x.hidden.mul(1 + HACIENDA.fine[level]).ceil();
    const paid = Decimal.min(fine, s.money);
    s.money = s.money.sub(paid);
    const seized = paid.lt(fine);
    x.hidden = new Decimal(0);
    x.risk = level === 'minor' ? 0 : 10;
    x.cleanFor = 0;
    x.inspections++;
    s.counters.inspections = (s.counters.inspections ?? 0) + 1;
    let status = this.changeStatus(HACIENDA.status[level], false);
    if (seized) status += this.changeStatus(HACIENDA.seizureStatus, false);
    if (level === 'grave') this.addBuff('embargo', t('embargoBuff'), 'income', HACIENDA.embargo.mult, HACIENDA.embargo.seconds);
    const prison = level === 'crime' && this.random() < HACIENDA.prisonChance;
    this.invalidate();
    this.emit({ type: 'inspection', level, fine: paid, status, prison, seized });
    if (prison) this.goToJail('tax');
    else this.changed();
  }

  // ——— Moral dilemmas ———
  eligibleDilemmas() {
    const s = this.state;
    return DILEMMAS.filter((d) => s.rankIndex >= d.minRank && (d.maxRank === undefined || s.rankIndex <= d.maxRank) && !(d.once && s.seenDilemmas[d.id]) );
  }
  startDilemma(forceId?: string) {
    const s = this.state;
    const pool = forceId ? [DILEMMA_BY_ID[forceId]].filter(Boolean) : this.eligibleDilemmas().filter((d) => d.id !== this.lastDilemma);
    this.scheduleDilemma();
    if (!pool.length) return;
    const total = pool.reduce((a, d) => a + d.weight, 0);
    let r = this.random() * total;
    let chosen = pool[0];
    for (const d of pool) {
      r -= d.weight;
      if (r <= 0) {
        chosen = d;
        break;
      }
    }
    s.pendingDilemma = chosen.id;
    s.dilemmaTimeLeft = DILEMMA_SECONDS;
    this.emit({ type: 'dilemmaStart', id: chosen.id });
    this.changed();
  }
  private lastDilemma = '';
  private scheduleDilemma() {
    this.state.nextDilemmaIn = 110 + this.random() * 120;
  }
  resolveDilemma(yes: boolean, timedOut = false): boolean {
    const s = this.state;
    const d = s.pendingDilemma ? DILEMMA_BY_ID[s.pendingDilemma] : null;
    if (!d) return false;
    const choice = yes ? d.yes : d.no;
    const cost = this.choiceCost(choice.costSeconds);
    if (!this.spend(cost)) return false;
    const before = s.status;
    const outcome = this.pickOutcome(choice.outcomes);
    const summary = this.applyActions(outcome.actions, d.title);
    if (cost.gt(0)) summary.unshift(`-${money(cost)}`);
    s.pendingDilemma = null;
    s.seenDilemmas[d.id] = (s.seenDilemmas[d.id] ?? 0) + 1;
    this.lastDilemma = d.id;
    this.emit({ type: 'dilemmaResult', id: d.id, yes, timedOut, title: d.title, text: outcome.text, summary, statusDelta: s.status - before });
    this.checkRanks();
    this.changed();
    return true;
  }
  private tickDilemma(dt: number) {
    const s = this.state;
    if (s.pendingDilemma) {
      s.dilemmaTimeLeft -= dt;
      if (s.dilemmaTimeLeft <= 0) this.resolveDilemma(false, true);
      return;
    }
    if (s.pendingVote || s.family.pending) return;
    s.nextDilemmaIn -= dt;
    if (s.nextDilemmaIn <= 0) this.startDilemma();
  }

  // ——— Rival ———
  rivalDef() {
    return RIVALS[Math.min(this.state.rival.index, RIVALS.length - 1)];
  }
  private tickRival(dt: number) {
    const s = this.state;
    const r = s.rival;
    if (r.worth.lte(0)) r.worth = Decimal.max(s.earnedThisLife.mul(RIVAL_LEAD), 200);
    r.worth = r.worth.add(this.baseDerived.incomePerSec.mul(RIVAL_GROWTH * dt));
    if (s.earnedThisLife.lt(r.worth)) return;
    const name = this.rivalDef().name;
    const index = r.index;
    const reward = this.reward(90, 50);
    this.earn(reward);
    this.addBuff('rival', t('rivalBuff'), 'income', 2, 20);
    r.index++;
    r.worth = s.earnedThisLife.mul(RIVAL_LEAD + 0.1 * Math.min(r.index, 10));
    this.emit({ type: 'rivalBeaten', index, name, reward });
  }

  // ——— Mystery safe ———
  vaultProgress(): [number, number] {
    const v = this.state.vault;
    return [v.clicks, vaultClicks(v.opened)];
  }
  private openVault() {
    const s = this.state;
    const total = VAULT_PRIZES.reduce((a, p) => a + p.chance, 0);
    let r = this.random() * total;
    let prize = VAULT_PRIZES[0];
    for (const p of VAULT_PRIZES) {
      r -= p.chance;
      if (r <= 0) {
        prize = p;
        break;
      }
    }
    const summary: string[] = [];
    const pay = (amount: Decimal) => {
      this.earn(amount);
      summary.push(`+${money(amount)}`);
    };
    switch (prize.id) {
      case 'cash': pay(this.reward(240, 100)); break;
      case 'frenzy': this.addBuff('vault_income', t('vaultBuff'), 'income', 3, 45); break;
      case 'hands': this.addBuff('vault_click', t('vaultBuff'), 'click', 5, 20); break;
      case 'status': this.changeStatus(1); break;
      case 'jackpot': pay(this.reward(900, 500, 0.25)); break;
    }
    s.vault.opened++;
    s.vault.clicks = 0;
    this.emit({ type: 'vault', prize: prize.id, text: prize.text, summary });
  }

  // ——— Casino ———
  /** Below this status the casino will not let you in. */
  casinoOpen() {
    return this.state.status > STATUS_MIN;
  }
  scratchPrice(): Decimal {
    return Decimal.max(this.state.money.mul(CASINO.scratchCashFraction), this.incomeUnit().mul(CASINO.scratchMinSeconds)).floor().max(10);
  }
  rouletteStake(fraction: number): Decimal {
    return this.state.money.mul(fraction).floor();
  }
  /**
   * Buys a scratch card: money and status are paid now, the prize is held
   * until the card is scratched (`settleCasino`) so the reveal is a surprise.
   */
  playScratch(): ScratchResult | null {
    if (!this.casinoOpen() || this.casinoPending) return null;
    const price = this.scratchPrice();
    if (!this.spend(price)) return null;
    this.changeStatus(-CASINO.statusCost, false);
    const total = SCRATCH_PRIZES.reduce((a, p) => a + p.chance, 0);
    let r = this.random() * total;
    let prize = SCRATCH_PRIZES[0];
    for (const p of SCRATCH_PRIZES) {
      r -= p.chance;
      if (r <= 0) {
        prize = p;
        break;
      }
    }
    const payout = price.mul(prize.mult);
    this.casinoPending = { payout, status: prize.status, at: this.now() };
    this.countPlay();
    this.changed();
    return { prize: prize.id, grid: this.scratchGrid(prize.symbol), payout, price };
  }
  /** A 3×3 card where only the winning symbol (if any) appears three times. */
  private scratchGrid(win: string | null): string[] {
    // Each other symbol appears at most twice, so no accidental line.
    const pool = SCRATCH_SYMBOLS.filter((x) => x !== win).flatMap((x) => [x, x]);
    const cells: string[] = win ? [win, win, win] : [];
    while (cells.length < 9) cells.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
  }
  /** Spins the roulette. `bet` is 'red', 'black' or a number 0–36. */
  spinRoulette(bet: 'red' | 'black' | number, fraction: number): RouletteResult | null {
    if (!this.casinoOpen() || this.casinoPending) return null;
    const stake = this.rouletteStake(fraction);
    if (stake.lt(1) || !this.spend(stake)) return null;
    this.changeStatus(-CASINO.statusCost, false);
    const n = Math.floor(this.random() * 37);
    const color = n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black';
    let payout = new Decimal(0);
    let status = 0;
    if (typeof bet === 'number') {
      if (bet === n) {
        payout = stake.mul(36);
        status = 2;
      }
    } else if (bet === color) payout = stake.mul(2);
    else if (n === 0) status = -1;
    this.casinoPending = { payout, status, at: this.now() };
    this.countPlay();
    this.changed();
    return { n, color, win: payout.gt(0), payout, stake };
  }
  private countPlay() {
    this.state.counters.casino_plays = (this.state.counters.casino_plays ?? 0) + 1;
  }
  /** Pays out the last casino game once its reveal has finished. */
  settleCasino() {
    const p = this.casinoPending;
    if (!p) return;
    this.casinoPending = null;
    if (p.payout.gt(0)) this.earn(p.payout);
    if (p.status) this.changeStatus(p.status);
    this.checkRanks();
    this.changed();
  }

  // ——— Achievements ———
  checkAchievements() {
    const s = this.state;
    let any = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      if (a.check(s)) {
        s.achievements[a.id] = this.now();
        any = true;
        this.emit({ type: 'achievement', id: a.id });
      }
    }
    if (any) this.invalidate();
  }

  // ——— Secrets ———
  interact(target: string) {
    const s = this.state;
    s.secretProgress[target] = (s.secretProgress[target] ?? 0) + 1;
    for (const sec of SECRETS) {
      if (s.secrets[sec.id] || sec.trigger.type !== 'interact' || sec.trigger.target !== target) continue;
      if (s.secretProgress[target] >= sec.trigger.count) this.discoverSecret(sec.id);
    }
    this.changed();
  }
  /** Milliseconds since the player last clicked. */
  idleMs(): number {
    return this.now() - this.lastActivityAt;
  }
  /** Cash picked up in the street: a falling banknote or a passer-by's tip. */
  streetCash(kind: 'bill' | 'tip'): Decimal {
    const amount = this.reward(kind === 'bill' ? 8 : 3, 1);
    this.earn(amount);
    this.changed();
    return amount;
  }
  typeKey(key: string) {
    if (key.length !== 1) return;
    this.typedBuffer = (this.typedBuffer + key.toLowerCase()).slice(-16);
    for (const sec of SECRETS) {
      if (this.state.secrets[sec.id] || sec.trigger.type !== 'typed') continue;
      if ([sec.trigger.word, ...(sec.trigger.aliases ?? [])].some((w) => this.typedBuffer.endsWith(w))) this.discoverSecret(sec.id);
    }
  }
  private checkSecret(id: string, condition: boolean) {
    if (condition && !this.state.secrets[id]) this.discoverSecret(id);
  }
  private checkCustomSecrets() {
    for (const sec of SECRETS) {
      if (this.state.secrets[sec.id] || sec.trigger.type !== 'custom') continue;
      if (checkCustomSecret(sec.trigger.check, this.state, { now: this.now(), idleMs: this.now() - this.lastActivityAt, visible: this.visible })) this.discoverSecret(sec.id);
    }
  }
  noteActivity() {
    this.lastActivityAt = this.now();
  }
  discoverSecret(id: string) {
    const sec = SECRET_BY_ID[id];
    if (!sec || this.state.secrets[id]) return;
    this.state.secrets[id] = this.now();
    if (sec.grantItem) this.grantItem(sec.grantItem);
    if (sec.rewardSeconds !== undefined) {
      const amount = sec.rewardSeconds > 0 ? this.reward(sec.rewardSeconds, 50) : new Decimal(50);
      this.earn(amount);
    }
    this.invalidate();
    this.emit({ type: 'secret', id });
    this.changed();
  }

  // ——— Missions & daily ———
  visibleMissions() {
    return MISSIONS.filter((m) => !this.state.missionsClaimed[m.id]).slice(0, 3);
  }
  missionReward(id: string): Decimal {
    const m = MISSIONS.find((x) => x.id === id)!;
    return this.reward(m.rewardSeconds, m.rewardMin);
  }
  claimMission(id: string): boolean {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m || this.state.missionsClaimed[id]) return false;
    const [cur, target] = m.progress(this.state);
    if (cur < target) return false;
    const reward = this.missionReward(id);
    this.earn(reward);
    this.state.missionsClaimed[id] = true;
    this.emit({ type: 'mission', id, reward });
    this.checkRanks();
    this.changed();
    return true;
  }
  ensureDaily(today: string) {
    const s = this.state;
    if (!s.stats.daysPlayed.includes(today)) {
      s.stats.daysPlayed = [...s.stats.daysPlayed, today].slice(-60);
    }
    this.ensureLogin(today);
    this.ensureLeague(today);
    if (s.daily.date === today) return;
    let h = 0;
    for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const def = DAILIES[h % DAILIES.length];
    s.daily = { ...s.daily, date: today, challengeId: def.id, baseline: def.metric(s), claimed: false };
    this.changed();
  }
  dailyProgress(): { text: string; cur: number; target: number; claimed: boolean } | null {
    const def = DAILIES.find((d) => d.id === this.state.daily.challengeId);
    if (!def) return null;
    return { text: def.text, cur: Math.max(0, def.metric(this.state) - this.state.daily.baseline), target: def.target, claimed: this.state.daily.claimed };
  }
  claimDaily(): boolean {
    const p = this.dailyProgress();
    if (!p || p.claimed || p.cur < p.target) return false;
    const s = this.state;
    const yesterday = new Date(new Date(s.daily.date + 'T12:00:00').getTime() - 86400000).toISOString().slice(0, 10);
    s.daily.streak = s.daily.lastClaimDate === yesterday ? s.daily.streak + 1 : 1;
    s.daily.lastClaimDate = s.daily.date;
    s.daily.claimed = true;
    const reward = this.reward(600 * Math.min(1 + 0.1 * (s.daily.streak - 1), 2), 100);
    this.earn(reward);
    this.emit({ type: 'toast', text: t('dailyDone', { amount: money(reward) }), tone: 'good' });
    this.checkRanks();
    this.changed();
    return true;
  }

  // ——— Daily login streak ———
  /** Advances the 7-day calendar on the first visit of each day. */
  ensureLogin(today: string) {
    const l = this.state.login;
    if (l.lastDate === today) return;
    l.streak = l.lastDate === prevDay(today) ? (l.streak % LOGIN_DAYS.length) + 1 : 1;
    l.lastDate = today;
    l.pendingDay = l.streak;
    l.bestStreak = Math.max(l.bestStreak, l.streak);
    this.changed();
  }
  loginReward(day: number): Decimal {
    return this.reward(LOGIN_DAYS[day - 1].seconds, 100);
  }
  claimLogin(): boolean {
    const l = this.state.login;
    const day = l.pendingDay;
    if (!day) return false;
    const def = LOGIN_DAYS[day - 1];
    const amount = this.loginReward(day);
    this.earn(amount);
    l.pendingDay = 0;
    if (def.chest) this.dropChest('login', def.chest);
    this.emit({ type: 'loginReward', day, amount, chest: def.chest ?? null });
    this.checkRanks();
    this.changed();
    return true;
  }

  // ——— Chests ———
  rollRarity(): ChestRarity {
    const r = this.random();
    return r < CHESTS.legendaryChance ? 'legendary' : r < CHESTS.legendaryChance + CHESTS.rareChance ? 'rare' : 'common';
  }
  /** Adds a chest (random rarity unless given). Returns false when that pile is full. */
  dropChest(source: 'time' | 'click' | 'login' | 'offline' | 'league', rarity: ChestRarity = this.rollRarity()): boolean {
    const c = this.state.chests;
    if (c[rarity] >= CHESTS.maxHeld) return false;
    c[rarity]++;
    this.emit({ type: 'chestDrop', rarity, source });
    return true;
  }
  chestCount(): number {
    const c = this.state.chests;
    return c.common + c.rare + c.legendary;
  }
  /** Opens the best chest held (or the given rarity). */
  openChest(rarity?: ChestRarity): ChestResult | null {
    const s = this.state;
    const c = s.chests;
    const pick = rarity ?? (c.legendary > 0 ? 'legendary' : c.rare > 0 ? 'rare' : 'common');
    if (c[pick] <= 0) return null;
    c[pick]--;
    c.opened++;
    const table = CHEST_PRIZES[pick];
    let roll = this.random() * table.reduce((n, [w]) => n + w, 0);
    let prize = table[table.length - 1][1];
    for (const [w, p] of table) {
      if (roll < w) {
        prize = p;
        break;
      }
      roll -= w;
    }
    // The permanent bonus has a ceiling; past it the legendary pays big cash instead.
    if (prize.kind === 'bonus' && c.bonus >= CHESTS.legendaryBonusCap) prize = { kind: 'cash', seconds: 3600 };
    let text: string;
    let amount: Decimal | null = null;
    switch (prize.kind) {
      case 'cash':
        amount = this.reward(prize.seconds, 50, pick === 'legendary' ? 0.5 : ECONOMY.rewardCapFraction);
        this.earn(amount);
        text = t('chestCash', { amount: money(amount) });
        break;
      case 'buff':
        this.addBuff(`chest_${prize.target}`, t(pick === 'legendary' ? 'chestBuffLegend' : 'chestBuff'), prize.target, prize.mult, prize.seconds);
        text = t(prize.target === 'income' ? 'chestIncomeBuff' : 'chestClickBuff', { mult: prize.mult, s: prize.seconds });
        break;
      case 'status':
        amount = this.reward(prize.seconds, 50);
        this.earn(amount);
        this.changeStatus(prize.points, false);
        text = t('chestStatus', { n: prize.points, amount: money(amount) });
        break;
      case 'bonus':
        c.bonus = Math.min(CHESTS.legendaryBonusCap, +(c.bonus + CHESTS.legendaryIncomeBonus).toFixed(2));
        text = t('chestBonus', { pct: Math.round(CHESTS.legendaryIncomeBonus * 100), total: Math.round(c.bonus * 100) });
        break;
    }
    const result: ChestResult = { rarity: pick, prize: prize.kind, text, amount };
    this.emit({ type: 'chestOpen', result });
    this.invalidate();
    this.checkRanks();
    this.changed();
    return result;
  }

  // ——— Weekly league ———
  /** Starts a new league week when the calendar week changes, paying last week's prizes. */
  ensureLeague(today: string) {
    const s = this.state;
    const week = weekOf(today);
    if (s.league.week === week) return;
    if (s.league.week) {
      const rows = this.leagueTable('wealth', 1);
      const villains = this.leagueTable('villain', 1);
      const wealth = rows.findIndex((r) => r.me) + 1;
      const villain = villains.findIndex((r) => r.me) + 1;
      const chests: string[] = [];
      const prize = LEAGUE.rewards.find((r) => wealth <= r.upTo);
      if (prize && this.dropChest('league', prize.chest)) chests.push(prize.chest);
      if (villain === 1 && this.dropChest('league', LEAGUE.villainChest)) chests.push(LEAGUE.villainChest);
      s.league.lastResult = { week: s.league.week, wealth, villain, chests };
    }
    s.league.week = week;
    s.league.earned = new Decimal(0);
    s.league.lowestStatus = s.status;
    s.league.ref = Decimal.max(this.incomeUnit().mul(3600), LEAGUE.refFloor);
    s.league.joinedAt = this.now();
    this.changed();
  }
  /** Weekly table: 19 simulated rivals plus you, sorted best first. */
  leagueTable(kind: 'wealth' | 'villain', elapsed = weekElapsed(this.state.league.week, this.now(), this.state.league.joinedAt)): LeagueRow[] {
    const s = this.state;
    const bots = leagueBots(s.league.week, Math.floor(s.createdAt / 1000));
    const rows: LeagueRow[] = bots.map((b) => ({
      name: b.name,
      value: s.league.ref.mul(b.factor * botProgress(b, elapsed)),
      status: Math.round(b.lowestStatus * Math.min(1, elapsed * 3)),
      me: false,
    }));
    rows.push({ name: s.settings.playerName || t('you'), value: s.league.earned, status: s.league.lowestStatus, me: true });
    if (kind === 'wealth') rows.sort((a, b) => (b.value.cmp(a.value) || (a.me ? 1 : -1)));
    else rows.sort((a, b) => a.status - b.status || (a.me ? 1 : -1));
    return rows;
  }
  leaguePosition(kind: 'wealth' | 'villain' = 'wealth'): number {
    return this.leagueTable(kind).findIndex((r) => r.me) + 1;
  }

  // ——— Prestige ———
  reputationFor(lifetime: Decimal): number {
    const p = ECONOMY.prestige;
    const v = lifetime.div(p.divisor);
    if (v.lt(1)) return 0;
    return Math.floor(Math.pow(10, v.log10() * p.exponent) + 1e-9);
  }
  prestigeGain(): number {
    return Math.max(0, this.reputationFor(this.state.lifetimeEarned) - this.state.prestige.reputation);
  }
  canPrestige() {
    return this.state.rankIndex >= ECONOMY.prestige.minRankIndex && this.prestigeGain() > 0;
  }
  prestige(): boolean {
    if (!this.canPrestige()) return false;
    const old = this.state;
    const gained = this.prestigeGain();
    this.state = this.freshLife(old, { ...old.prestige, reputation: old.prestige.reputation + gained, legacy: old.prestige.legacy + gained, count: old.prestige.count + 1 });
    const seed = SEED_MONEY[this.state.prestige.perks.seed_money ?? 0] ?? 0;
    if (seed > 0) this.state.money = new Decimal(seed);
    this.opportunity = null;
    this.combo = 0;
    this.invalidate();
    this.checkAchievements();
    this.emit({ type: 'prestige', gained });
    this.changed();
    return true;
  }
  /** A new life that keeps everything permanent from `old`. */
  private freshLife(old: GameState, prestige: GameState['prestige']): GameState {
    const fresh = createInitialState(this.now());
    const heirlooms: Record<string, true> = {};
    for (const id in old.items) if (ITEM_BY_ID[id]?.unobtainableInShop) heirlooms[id] = true;
    return {
      ...fresh,
      lifetimeEarned: old.lifetimeEarned,
      highestRankEver: old.highestRankEver,
      achievements: old.achievements,
      secrets: old.secrets,
      secretProgress: old.secretProgress,
      discoveredCombos: old.discoveredCombos,
      unlockedBusinesses: old.unlockedBusinesses,
      flags: old.flags,
      counters: old.counters,
      missionsClaimed: old.missionsClaimed,
      prestige,
      stats: old.stats,
      daily: old.daily,
      login: old.login,
      chests: old.chests,
      league: old.league,
      createdAt: old.createdAt,
      settings: old.settings,
      tutorialDone: true,
      seenEvents: old.seenEvents,
      seenDilemmas: old.seenDilemmas,
      items: heirlooms,
      nextEventIn: 90,
      nextOpportunityIn: 30,
    };
  }
  buyPerk(id: string): boolean {
    const p = PERK_BY_ID[id];
    if (!p) return false;
    const level = this.state.prestige.perks[id] ?? 0;
    if (level >= p.maxLevel) return false;
    const cost = p.cost(level);
    if (this.state.prestige.legacy < cost) return false;
    this.state.prestige.legacy -= cost;
    this.state.prestige.perks[id] = level + 1;
    this.emit({ type: 'purchase', kind: 'perk', id });
    this.changed();
    return true;
  }

  // ——— Offline progress ———
  /**
   * Credits income for time spent away. Uses wall-clock time since the last
   * save, ignores temporary buffs, applies efficiency and a cap, and guards
   * against clocks moving backwards.
   */
  applyOffline(lastSavedAt: number): OfflineSummary | null {
    const t = this.now();
    const seconds = Math.max(0, (t - lastSavedAt) / 1000);
    const s = this.state;
    s.buffs = s.buffs.filter((b) => b.endsAt > t);
    if (seconds < 1) return null;
    const d = computeDerived(s, t, false);
    const cap = d.offlineCapHours * 3600;
    const credited = Math.min(seconds, cap);
    const earned = d.incomePerSec.mul(credited).mul(d.offlineEfficiency);
    const rankBefore = s.rankIndex;
    this.earn(earned);
    const resolved = this.resolveDueDelayed(t);
    // Ability cooldowns and event timers keep running in wall-clock time; event timer advances by play time only.
    this.checkRanks();
    this.checkAchievements();
    const ranksGained = RANKS.slice(rankBefore + 1, s.rankIndex + 1).map((r) => r.name);
    let topBusiness: string | null = null;
    for (const id in d.businessIncome) if (!topBusiness || d.businessIncome[id].gt(d.businessIncome[topBusiness])) topBusiness = id;
    if (topBusiness && d.businessIncome[topBusiness].lte(0)) topBusiness = null;
    const chest = seconds >= CHESTS.offlineChestSeconds && this.dropChest('offline', 'common');
    this.invalidate();
    this.changed();
    if (seconds < ECONOMY.offline.minSecondsForSummary && resolved.length === 0) return null;
    return { seconds, creditedSeconds: credited, capped: seconds > cap, earned, efficiency: d.offlineEfficiency, ranksGained, resolved, topBusiness, chest };
  }
}
