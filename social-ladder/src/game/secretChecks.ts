import type { GameState } from './state';

export interface SecretContext {
  now: number;
  idleMs: number;
  visible: boolean;
}

/** Custom secret conditions referenced by name from data/secrets.ts. */
const CHECKS: Record<string, (s: GameState, ctx: SecretContext) => boolean> = {
  nightOwl: (_s, ctx) => new Date(ctx.now).getHours() === 3,
  patience: (s, ctx) => ctx.visible && ctx.idleMs >= 10 * 60 * 1000 && s.stats.totalClicks > 0,
  minimalist: (s) => s.rankIndex >= 31 && s.equipped.home === 'cardboard_mattress',
  streetSmart: (s) => (s.counters.refused_deals ?? 0) >= 3,
  nobody: (s) => s.settings.playerName.trim().toLowerCase() === 'nobody',
  keyFits: (s) => !!s.items.mystery_key && !!s.items.private_island,
  loyal: (s) => s.stats.daysPlayed.length >= 3,
  // Triggered directly by the engine at click time:
  lucky777: () => false,
  speed: () => false,
};

export function checkCustomSecret(name: string, s: GameState, ctx: SecretContext): boolean {
  return CHECKS[name]?.(s, ctx) ?? false;
}
