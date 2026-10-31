// Azar con semilla (mulberry32). El estado vive en GameState.rng para que
// guardar y recargar reproduzca exactamente la misma secuencia.
import type { GameState } from './types';

export function nextRaw(s: number): [number, number] {
  let t = (s + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

export function rand(state: Pick<GameState, 'rng'>): number {
  const [v, n] = nextRaw(state.rng);
  state.rng = n;
  return v;
}

export function randRange(state: Pick<GameState, 'rng'>, min: number, max: number): number {
  return min + rand(state) * (max - min);
}

export function chance(state: Pick<GameState, 'rng'>, p: number): boolean {
  return rand(state) < p;
}

export function pickWeighted<T>(state: Pick<GameState, 'rng'>, items: T[], weight: (t: T) => number): T | undefined {
  const total = items.reduce((a, t) => a + Math.max(0, weight(t)), 0);
  if (total <= 0) return undefined;
  let r = rand(state) * total;
  for (const t of items) {
    r -= Math.max(0, weight(t));
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

export function newSeed(): number {
  return (Math.floor(Math.random() * 2 ** 31) ^ Date.now()) >>> 0;
}
