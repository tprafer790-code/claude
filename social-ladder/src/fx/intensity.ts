import type { Settings } from '../game/state';

/**
 * Visual intensity grows with the social class the player has reached, so the
 * game literally looks richer the higher you climb. Stage indices 0–7 map onto
 * four tiers.
 */
export type Tier = 0 | 1 | 2 | 3;

export function tierForStage(stageIndex: number): Tier {
  if (stageIndex >= 6) return 3; // Absurd power, Beyond the ladder
  if (stageIndex >= 4) return 2; // Wealth, Extreme wealth
  if (stageIndex >= 2) return 1; // Lower middle, Middle class
  return 0; // Survival, Working class
}

export interface TierFx {
  /** Particles on an ordinary click. */
  clickParticles: number;
  /** Particles on a critical click. */
  critParticles: number;
  /** Base size of a particle in CSS pixels. */
  particleSize: number;
  /** Font size of ordinary floating numbers. */
  floatSize: number;
  /** Font size of critical numbers. */
  critSize: number;
  /** Glow halo behind particles (0 = none). */
  glow: number;
  /** Shockwave rings on a critical hit. */
  critRings: number;
  /** Extra sparkle colours mixed into bursts. */
  sparkle: boolean;
  /** Scale bump of the money counter on gains. */
  counterBump: number;
}

export const TIER_FX: Record<Tier, TierFx> = {
  0: { clickParticles: 4, critParticles: 16, particleSize: 3, floatSize: 12, critSize: 20, glow: 0, critRings: 1, sparkle: false, counterBump: 1.04 },
  1: { clickParticles: 6, critParticles: 24, particleSize: 3, floatSize: 13, critSize: 23, glow: 0.35, critRings: 1, sparkle: false, counterBump: 1.07 },
  2: { clickParticles: 9, critParticles: 34, particleSize: 4, floatSize: 14, critSize: 26, glow: 0.55, critRings: 2, sparkle: true, counterBump: 1.1 },
  3: { clickParticles: 12, critParticles: 46, particleSize: 4, floatSize: 15, critSize: 30, glow: 0.8, critRings: 3, sparkle: true, counterBump: 1.13 },
};

/** Arcade colours shared by the canvas effects and the stylesheet. */
export const FX = {
  gold: '#ffe44d',
  goldLight: '#fff6b0',
  goldDark: '#c79a00',
  orange: '#ff7a18',
  red: '#ff3b3b',
  green: '#39f56a',
  cyan: '#22e6e0',
  electric: '#168bff',
  violet: '#a855f7',
  pink: '#ff3dad',
  white: '#ffffff',
  ink: '#10152e',
} as const;

const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Reduced motion is on if the player asked for it or the OS does. */
export function reducedMotion(settings: Settings): boolean {
  return settings.reducedMotion || prefersReduced();
}

/** Screen shake is off with reduced motion or when the player disabled it. */
export function shakeAllowed(settings: Settings): boolean {
  return settings.screenShake && !reducedMotion(settings);
}
