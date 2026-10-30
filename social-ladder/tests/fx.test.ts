import { describe, expect, it } from 'vitest';
import { shakeAllowed, TIER_FX, tierForStage } from '../src/fx/intensity';
import { createInitialState } from '../src/game/state';

describe('visual intensity', () => {
  it('maps the eight social stages onto four rising tiers', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(tierForStage)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('never gets calmer as tiers rise', () => {
    for (const t of [1, 2, 3] as const) {
      const prev = TIER_FX[(t - 1) as 0 | 1 | 2];
      expect(TIER_FX[t].clickParticles).toBeGreaterThanOrEqual(prev.clickParticles);
      expect(TIER_FX[t].critParticles).toBeGreaterThan(prev.critParticles);
      expect(TIER_FX[t].critSize).toBeGreaterThan(prev.critSize);
    }
  });

  it('turns screen shake off with reduced motion or the shake setting', () => {
    const s = createInitialState(0).settings;
    expect(shakeAllowed(s)).toBe(true);
    expect(shakeAllowed({ ...s, reducedMotion: true })).toBe(false);
    expect(shakeAllowed({ ...s, screenShake: false })).toBe(false);
  });
});
