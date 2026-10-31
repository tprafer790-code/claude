import type { Cond, GameState, StatId } from './types';

/** Evalúa una condición declarativa contra el estado. Vacía = cierta. */
export function evalCond(s: GameState, c: Cond | undefined): boolean {
  if (!c) return true;
  if (c.minRound !== undefined && s.round < c.minRound) return false;
  if (c.maxRound !== undefined && s.round > c.maxRound) return false;
  if (c.flags && !c.flags.every((f) => s.flags.includes(f))) return false;
  if (c.notFlags && c.notFlags.some((f) => s.flags.includes(f))) return false;
  if (c.unlocked && !c.unlocked.every((u) => s.unlocked.includes(u))) return false;
  if (c.countries && !c.countries.includes(s.country)) return false;
  if (c.phases && !c.phases.includes(s.phase)) return false;
  if (c.orientation && c.orientation !== s.orientation) return false;
  if (c.stats) {
    for (const [k, [lo, hi]] of Object.entries(c.stats) as [StatId, [number, number]][]) {
      const v = s.stats[k];
      if (v < lo || v > hi) return false;
    }
  }
  if (c.castTrust) {
    for (const [k, [lo, hi]] of Object.entries(c.castTrust) as [keyof GameState['cast'], [number, number]][]) {
      const v = s.cast[k].trust;
      if (v < lo || v > hi) return false;
    }
  }
  if (c.hasFavorFrom && !s.favors.some((f) => f.creditor === c.hasFavorFrom && f.status === 'open')) return false;
  if (c.promise && !s.promises.some((p) => p.axis === c.promise!.axis && (c.promise!.stance === undefined || p.stance === c.promise!.stance))) return false;
  return true;
}
