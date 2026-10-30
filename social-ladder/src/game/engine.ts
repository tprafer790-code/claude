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
import { createInitialState, type GameState } from './state';

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
  | { type: 'toast'; text: string; tone: 'info' | 'good' | 'bad' | 'rare' };

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
}

export interface EngineOptions {
  now?: () => number;
  random?: () => number;
}

export type BuyQty = 1 | 10 | 100 | 'max';

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
  reward(seconds: number, min = 0): Decimal {
    const unit = this.incomeUnit();
    const cap = Decimal.max(this.state.earnedThisLife.mul(ECONOMY.rewardCapFraction), unit.mul(15));
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

    const result = { amount, crit, combo: this.combo, comboMult, lucky };
    this.emit({ type: 'click', ...result });
    this.checkRanks();
    this.changed();
    return result;
  }

  // ——— Main loop ———
  tick(dt: number) {
    if (dt <= 0) return;
    const s = this.state;
    const t = this.now();
    const d = this.derived;

    this.earn(d.incomePerSec.mul(dt));

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
  /** Progress to the next rank in [0..1] (log-scaled for readability) and blockers. */
  rankProgress(): { fraction: number; missingItem: string | null; req: Decimal | null } {
    const next = this.nextRank();
    if (!next) return { fraction: 1, missingItem: null, req: null };
    const cur = new Decimal(this.rank.req);
    const req = new Decimal(next.req);
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
      if (s.earnedThisLife.lt(next.req)) break;
      if (next.requiresItem && !s.items[next.requiresItem]) break;
      const from = s.rankIndex;
      s.rankIndex++;
      if (s.rankIndex > s.highestRankEver) s.highestRankEver = s.rankIndex;
      const stageChanged = RANKS[from].stage !== next.stage;
      this.invalidate();
      promoted = true;
      this.emit({ type: 'promotion', from, to: s.rankIndex, stageChanged });
    }
    if (promoted) {
      this.checkCustomSecrets();
      this.checkAchievements();
    }
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
    const u = UPGRADE_BY_ID[id];
    if (!this.spend(new Decimal(u.cost))) return false;
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
  canBuyItem(id: string) {
    const it = ITEM_BY_ID[id];
    return !!it && !it.unobtainableInShop && !this.state.items[id] && this.state.rankIndex >= it.rankReq && this.state.money.gte(it.price);
  }
  buyItem(id: string): boolean {
    const it = ITEM_BY_ID[id];
    if (!it || it.unobtainableInShop || this.state.items[id] || this.state.rankIndex < it.rankReq) return false;
    if (!this.spend(new Decimal(it.price))) return false;
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
      text = `Lucky deal! +${money(amount)}`;
    } else if (r < 0.8) {
      this.addBuff('frenzy', 'Boom Time', 'income', o.frenzyMultiplier, o.frenzySeconds);
      text = `Boom time! Income ×${o.frenzyMultiplier} for ${o.frenzySeconds}s`;
    } else {
      this.addBuff('click_frenzy', 'Hot Streak', 'click', o.clickFrenzyMultiplier, o.clickFrenzySeconds);
      text = `Hot streak! Clicks ×${o.clickFrenzyMultiplier} for ${o.clickFrenzySeconds}s`;
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
          if (a.seconds) amount = amount.add(this.reward(a.seconds));
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
          summary.push(`${a.target === 'income' ? 'Income' : 'Clicks'} ×${a.mult} for ${a.seconds}s`);
          break;
        case 'item':
          if (!s.items[a.id]) {
            this.grantItem(a.id);
            summary.push(`New object: ${ITEM_BY_ID[a.id]?.name ?? a.id}`);
          } else {
            const bonus = this.reward(120);
            this.earn(bonus);
            summary.push(`Already owned — sold the duplicate: +${money(bonus)}`);
          }
          break;
        case 'flag':
          s.flags[a.id] = true;
          break;
        case 'counter':
          s.counters[a.id] = (s.counters[a.id] ?? 0) + a.add;
          break;
        case 'permanent':
          s.lifeEffects.push({ effect: a.effect, label: a.label });
          this.invalidate();
          summary.push(`${a.label} (this life)`);
          break;
        case 'delayed':
          s.delayed.push({ id: `${title}_${this.now()}_${Math.floor(this.random() * 1e6)}`, at: this.now() + a.seconds * 1000, label: a.label, eventTitle: title, outcomes: a.outcomes });
          summary.push(`${a.label} in ${a.seconds}s`);
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
  typeKey(key: string) {
    if (key.length !== 1) return;
    this.typedBuffer = (this.typedBuffer + key.toLowerCase()).slice(-16);
    for (const sec of SECRETS) {
      if (this.state.secrets[sec.id] || sec.trigger.type !== 'typed') continue;
      if (this.typedBuffer.endsWith(sec.trigger.word)) this.discoverSecret(sec.id);
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
    this.emit({ type: 'toast', text: `Daily challenge complete! +${money(reward)}`, tone: 'good' });
    this.checkRanks();
    this.changed();
    return true;
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
    const fresh = createInitialState(this.now());
    const heirlooms: Record<string, true> = {};
    for (const id in old.items) if (ITEM_BY_ID[id]?.unobtainableInShop) heirlooms[id] = true;

    this.state = {
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
      prestige: { ...old.prestige, reputation: old.prestige.reputation + gained, legacy: old.prestige.legacy + gained, count: old.prestige.count + 1 },
      stats: old.stats,
      daily: old.daily,
      createdAt: old.createdAt,
      settings: old.settings,
      tutorialDone: true,
      seenEvents: old.seenEvents,
      items: heirlooms,
      nextEventIn: 90,
      nextOpportunityIn: 30,
    };
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
    this.invalidate();
    this.changed();
    if (seconds < ECONOMY.offline.minSecondsForSummary && resolved.length === 0) return null;
    return { seconds, creditedSeconds: credited, capped: seconds > cap, earned, efficiency: d.offlineEfficiency, ranksGained, resolved };
  }
}
