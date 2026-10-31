// Creación del estado y aplicación de efectos con registro de causas.
import { country } from '../data/countries';
import { POLICY_BY_ID } from '../data/policies';
import { GROUPS, GROUP_INTERESTS, TUNING } from '../data/tuning';
import { CAST } from '../data/cast';
import type {
  CandidateId, CastId, CountryId, DeltaRec, Effect, GameState, GroupId, L, Lang, Orientation, StatId,
} from './types';

export const SAVE_VERSION = 1;

const RANGES: Partial<Record<StatId, [number, number]>> = {
  treasury: [0, 99], debt: [0, 200], privateFunds: [0, 99], funds: [0, 99], momentum: [-20, 20],
};
/** Indicadores en los que subir es malo (no se les aplica la dificultad al empeorar). */
export const BAD_UP: StatId[] = ['debt', 'suspicion', 'evidence', 'unrest'];
export const SECTORS: StatId[] = ['jobs', 'housing', 'services', 'security', 'environment', 'economy'];

export function clamp(v: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, v)); }

export interface Setup { seed: number; country: CountryId; candidate: CandidateId; name: string; orientation: Orientation; lang: Lang }

export function createState(s: Setup): GameState {
  const c = country(s.country);
  const stats = { ...TUNING.startStats, ...c.startStats } as Record<StatId, number>;
  const groups = Object.fromEntries(GROUPS.map((g) => [g, { sat: 50, mob: 0.5, base: 0 }])) as GameState['groups'];
  const cast = Object.fromEntries(Object.keys(CAST).map((k) => [k, { trust: 0, memory: [] as string[] }])) as GameState['cast'];
  const st: GameState = {
    version: SAVE_VERSION, seed: s.seed, rng: s.seed >>> 0, lang: s.lang,
    country: s.country, candidate: s.candidate, name: s.name, orientation: s.orientation,
    phase: 'setup', round: 0, campaignDay: 0, actionsLeft: 0,
    stats, groups, cast, structural: {}, mods: { wellbeing: 0, support: 0 },
    promises: [], flags: [], unlocked: ['promises'], parties: [], favors: [], deferred: [], agenda: [],
    eventHistory: {}, excluded: [], scheduled: [], passed: [], fastTracked: [],
    budget: { tax: 1, lines: { services: 1, housing: 1, security: 1, investment: 1 }, approved: false, prorogued: false },
    log: [], elections: [], campaignPlan: Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<GroupId, number>,
    decisions: [], crises: [], uidCounter: 0, startedAt: 0,
  };
  st.stats.funds = TUNING.startFunds;
  recompute(st);
  return st;
}

export function hasFlag(s: GameState, f: string): boolean { return s.flags.includes(f); }
export function addFlag(s: GameState, f: string): void { if (!s.flags.includes(f)) s.flags.push(f); }

/** Suma un cambio a un indicador respetando rangos y dificultad. Devuelve el cambio real. */
export function changeStat(s: GameState, stat: StatId, delta: number): number {
  if (stat === 'wellbeing') { s.mods.wellbeing += delta; const before = s.stats.wellbeing; recompute(s); return s.stats.wellbeing - before; }
  if (stat === 'support') { s.mods.support += delta; const before = s.stats.support; recompute(s); return s.stats.support - before; }
  let d = delta;
  const worse = BAD_UP.includes(stat) ? d > 0 : d < 0;
  if (worse && !['privateFunds', 'funds', 'treasury'].includes(stat)) d *= TUNING.difficulty;
  const [lo, hi] = RANGES[stat] ?? [0, 100];
  const before = s.stats[stat];
  s.stats[stat] = clamp(before + d, lo, hi);
  if (SECTORS.includes(stat)) s.structural[stat] = (s.structural[stat] ?? 0) + d * 0.8;
  return s.stats[stat] - before;
}

export interface ApplyResult { deltas: DeltaRec[]; specials: NonNullable<Effect['special']>[] }

/** Aplica una lista de efectos. Los que llevan `delay` se agendan como consecuencias diferidas. */
export function applyEffects(s: GameState, effects: Effect[], source: string, why?: L): ApplyResult {
  const out: ApplyResult = { deltas: [], specials: [] };
  for (const e of effects) {
    if (e.delay && e.delay > 0) {
      s.deferred.push({ round: s.round + e.delay, effects: [{ ...e, delay: 0 }], why: e.why ?? why ?? { es: 'Consecuencia diferida', en: 'Delayed consequence' }, source });
      continue;
    }
    const reason = e.why ?? why;
    if (e.stat && e.delta) {
      const real = changeStat(s, e.stat, e.delta);
      if (Math.abs(real) > 0.01) out.deltas.push({ stat: e.stat, delta: real, why: reason });
    }
    if (e.group && e.sat) {
      const g = s.groups[e.group];
      const before = g.sat;
      g.sat = clamp(g.sat + e.sat);
      g.base += e.sat * 0.5; // memoria del grupo
      out.deltas.push({ group: e.group, delta: g.sat - before, why: reason });
    }
    if (e.cast && e.trust) {
      const c = s.cast[e.cast];
      c.trust = clamp(c.trust + e.trust, -100, 100);
      c.memory.push(`${source}:${e.trust > 0 ? '+' : '-'}`);
      if (c.memory.length > 12) c.memory.shift();
      out.deltas.push({ cast: e.cast, delta: e.trust, why: reason });
    }
    if (e.flag) addFlag(s, e.flag);
    if (e.unflag) s.flags = s.flags.filter((f) => f !== e.unflag);
    if (e.unlock && !s.unlocked.includes(e.unlock)) s.unlocked.push(e.unlock);
    if (e.favor) {
      s.favors.push({ id: `${e.favor.demand}_${s.uidCounter++}`, creditor: e.favor.creditor, demand: e.favor.demand, dueRound: Math.max(s.round, 0) + e.favor.dueIn, status: 'open' });
    }
    if (e.clearFavor) for (const f of s.favors) if (f.demand === e.clearFavor && f.status === 'open') f.status = 'paid';
    if (e.refuseFavor) for (const f of s.favors) if (f.demand === e.refuseFavor && f.status === 'open') f.status = 'refused';
    if (e.chain) s.scheduled.push({ event: e.chain.event, round: Math.max(1, s.round) + e.chain.in });
    if (e.loyalty) {
      for (const p of s.parties) {
        const def = partyDef(s, p.id);
        if (!def || def.isPlayer) continue;
        if (e.loyalty.party === 'all' || e.loyalty.party === p.id || (e.loyalty.party === 'partners' && p.inGovernment)) {
          p.loyalty = clamp(p.loyalty + e.loyalty.delta, -100, 100);
        }
      }
      out.deltas.push({ stat: 'support', delta: e.loyalty.delta / 4, why: reason });
    }
    if (e.promise) evaluatePromise(s, e.promise.axis, e.promise.stance, out.deltas);
    if (e.special) out.specials.push(e.special);
  }
  recompute(s);
  return out;
}

export function partyDef(s: GameState, id: string) {
  return country(s.country).parties(s.orientation).find((p) => p.id === id);
}

/** Recalcula los indicadores derivados. */
export function recompute(s: GameState): void {
  const w = TUNING.wellbeingWeights;
  const base = s.stats.services * w.services + s.stats.housing * w.housing + s.stats.jobs * w.jobs + s.stats.security * w.security + s.stats.environment * w.environment;
  s.stats.wellbeing = clamp(Math.round((base + s.mods.wellbeing) * 10) / 10);
  if (s.parties.length) s.stats.support = clamp(Math.round(computeSupport(s) + s.mods.support));
}

// Evitamos un ciclo de importación: parliament.ts registra la función real.
let supportFn: (s: GameState) => number = () => 50;
export function registerSupport(fn: (s: GameState) => number): void { supportFn = fn; }
function computeSupport(s: GameState): number { return supportFn(s); }

/** Satisfacción objetivo de un grupo a partir de sus intereses. */
export function groupTarget(s: GameState, g: GroupId): number {
  let t = 50;
  for (const [stat, weight] of Object.entries(GROUP_INTERESTS[g]) as [StatId, number][]) t += (s.stats[stat] - 50) * weight * 1.1;
  return clamp(t + s.groups[g].base);
}

export function avgSatisfaction(s: GameState): number {
  const sizes = country(s.country).groupSizes;
  let sum = 0; let tot = 0;
  for (const g of GROUPS) { sum += s.groups[g].sat * sizes[g]; tot += sizes[g]; }
  return sum / tot;
}

/** Cumplimiento o incumplimiento de una promesa al aprobar algo en su eje. */
export function evaluatePromise(s: GameState, axis: string, stance: number, deltas: DeltaRec[]): void {
  const p = s.promises.find((x) => x.axis === axis && x.status === 'pending');
  if (!p) return;
  const diff = Math.abs(p.stance - stance);
  if (diff === 0) {
    p.status = 'kept';
    deltas.push({ stat: 'credibility', delta: changeStat(s, 'credibility', 6), why: { es: 'Promesa cumplida', en: 'Promise kept' } });
    remember(s, ['advisor', 'citizenA', 'citizenB', 'citizenC'], 'kept', 4);
  } else if (diff === 2) {
    p.status = 'broken';
    deltas.push({ stat: 'credibility', delta: changeStat(s, 'credibility', -9), why: { es: 'Promesa rota', en: 'Promise broken' } });
    remember(s, ['journalist', 'citizenA', 'citizenB', 'citizenC', 'opposition'], 'broken', -6);
  } else {
    deltas.push({ stat: 'credibility', delta: changeStat(s, 'credibility', -1), why: { es: 'Promesa cumplida a medias', en: 'Promise half-kept' } });
  }
}

export function remember(s: GameState, who: CastId[], what: string, trust: number): void {
  for (const id of who) {
    const c = s.cast[id];
    c.trust = clamp(c.trust + trust, -100, 100);
    c.memory.push(what);
    if (c.memory.length > 12) c.memory.shift();
  }
}

export function policyById(id: string) { return POLICY_BY_ID[id]; }

export function uid(s: GameState, prefix: string): string { s.uidCounter += 1; return `${prefix}_${s.uidCounter}`; }

/** Postura del jugador: orientación matizada por la media de sus promesas. */
export function playerLean(s: GameState): number {
  const o = s.orientation === 'left' ? -1 : 1;
  if (!s.promises.length) return o;
  const avg = s.promises.reduce((a, p) => a + p.stance, 0) / s.promises.length;
  return clamp(o * 0.5 + avg * 0.38, -1.8, 1.8);
}
