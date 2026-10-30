import { describe, expect, it } from 'vitest';
import { RANKS } from '../src/data/ranks';
import { parseSubmission, RANK_LOG10, validate, type Submission } from '../supabase/functions/submit-score/validate';

const base: Submission = {
  lifetime_log10: 6.5, best_life_log10: 6.2, highest_rank: 31, prestige_count: 0, reputation: 0,
  achievements: 20, achievements_total: 75, play_seconds: 3600, client_version: 1,
};
const t0 = Date.parse('2026-10-01T00:00:00Z');

describe('server-side submission validation', () => {
  it('rank table matches the game data', () => {
    expect(RANK_LOG10.length).toBe(RANKS.length);
    RANKS.forEach((r, i) => {
      const v = Number(r.req);
      expect(RANK_LOG10[i]).toBeCloseTo(v > 0 ? Math.log10(v) : 0, 1);
    });
  });

  it('accepts a plausible first record', () => {
    expect(validate(base, null, t0)).toEqual({ ok: true });
  });

  it('rejects malformed bodies', () => {
    expect(parseSubmission({ ...base, lifetime_log10: 'lots' })).toBeNull();
    expect(parseSubmission(null)).toBeNull();
    expect(parseSubmission({ ...base, lifetime_log10: Infinity })).toBeNull();
  });

  it('rejects impossible values', () => {
    expect(validate({ ...base, highest_rank: 57 }, null, t0).ok).toBe(false); // rank without the money
    expect(validate({ ...base, best_life_log10: 9 }, null, t0).ok).toBe(false); // best life > lifetime
    expect(validate({ ...base, reputation: 50 }, null, t0).ok).toBe(false);
    expect(validate({ ...base, prestige_count: 1, highest_rank: 10, best_life_log10: 4 }, null, t0).ok).toBe(false);
    expect(validate({ ...base, achievements: 99 }, null, t0).ok).toBe(false);
    expect(validate({ ...base, lifetime_log10: 40, best_life_log10: 40, highest_rank: 57, play_seconds: 60 }, null, t0).ok).toBe(false);
  });

  it('checks growth and time against the previous accepted record', () => {
    const prev = { created_at: new Date(t0).toISOString(), lifetime_log10: 6.5, prestige_count: 0, achievements: 20, play_seconds: 3600 };
    const hourLater = t0 + 3600_000;
    expect(validate({ ...base, lifetime_log10: 9, best_life_log10: 9, highest_rank: 38, play_seconds: 7000 }, prev, hourLater)).toEqual({ ok: true });
    expect(validate({ ...base, play_seconds: 3600 + 7200 }, prev, hourLater).ok).toBe(false); // play time faster than clock
    expect(validate({ ...base, lifetime_log10: 30, best_life_log10: 30, highest_rank: 54 }, prev, hourLater).ok).toBe(false);
    expect(validate({ ...base, achievements: 10 }, prev, hourLater).ok).toBe(false);
    expect(validate(base, prev, t0 + 10_000).ok).toBe(false); // rate limit
  });
});
