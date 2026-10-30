// Pure plausibility checks for leaderboard submissions. No Deno/Node APIs here,
// so the same file is unit-tested with Vitest (tests/validate.test.ts).
//
// This is NOT complete anti-cheat: a determined player can still forge a
// plausible-looking save. It rejects impossible values and impossible growth.

/** log10 of the net-worth requirement of each rank (index = rank). Keep in sync with src/data/ranks.ts. */
export const RANK_LOG10 = [0, 0.7, 1.3, 1.78, 2.18, 2.48, 2.78, 3, 3.18, 3.4, 3.6, 3.81, 4, 4.18, 4.34, 4.51, 4.65, 4.78, 4.9, 5.02, 5.13, 5.23, 5.32, 5.41, 5.51, 5.59, 5.67, 5.75, 5.82, 5.89, 5.95, 6, 6.48, 7, 7.48, 8, 8.4, 8.74, 9, 9.6, 10.18, 10.78, 11.3, 11.78, 12, 13.3, 14.7, 16, 17.48, 19, 21, 23, 25, 27, 30, 33, 36, 40];

export const LIMITS = {
  /** Max orders of magnitude of lifetime growth per real hour since the last accepted record. */
  maxLog10PerHour: 15,
  /** First submission: max orders of magnitude per hour of claimed play time. */
  maxLog10PerPlayHour: 15,
  /** Slack for clock skew / rounding, in seconds. */
  timeSlackSeconds: 120,
  minSecondsBetweenSubmissions: 60,
  maxLifetimeLog10: 1000,
  prestigeMinRank: 31,
  prestigeDivisorLog10: 6,
};

export interface Submission {
  lifetime_log10: number;
  best_life_log10: number;
  highest_rank: number;
  prestige_count: number;
  reputation: number;
  achievements: number;
  achievements_total: number;
  play_seconds: number;
  client_version: number;
}

export interface PreviousRecord {
  created_at: string;
  lifetime_log10: number;
  prestige_count: number;
  achievements: number;
  play_seconds: number;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseSubmission(body: unknown): Submission | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const keys: (keyof Submission)[] = ['lifetime_log10', 'best_life_log10', 'highest_rank', 'prestige_count', 'reputation', 'achievements', 'achievements_total', 'play_seconds', 'client_version'];
  for (const k of keys) if (!isNum(b[k])) return null;
  return {
    lifetime_log10: b.lifetime_log10 as number,
    best_life_log10: b.best_life_log10 as number,
    highest_rank: Math.trunc(b.highest_rank as number),
    prestige_count: Math.trunc(b.prestige_count as number),
    reputation: b.reputation as number,
    achievements: Math.trunc(b.achievements as number),
    achievements_total: Math.trunc(b.achievements_total as number),
    play_seconds: Math.trunc(b.play_seconds as number),
    client_version: Math.trunc(b.client_version as number),
  };
}

export function validate(s: Submission, prev: PreviousRecord | null, nowMs: number): Verdict {
  const fail = (reason: string): Verdict => ({ ok: false, reason });

  // Range checks.
  if (s.lifetime_log10 < 0 || s.lifetime_log10 > LIMITS.maxLifetimeLog10) return fail('lifetime out of range');
  if (s.best_life_log10 < 0 || s.best_life_log10 > s.lifetime_log10 + 1e-6) return fail('best life exceeds lifetime');
  if (s.highest_rank < 0 || s.highest_rank >= RANK_LOG10.length) return fail('unknown rank');
  if (s.prestige_count < 0 || s.reputation < 0 || s.achievements < 0 || s.play_seconds < 0) return fail('negative value');
  if (s.achievements > s.achievements_total || s.achievements_total > 500) return fail('achievement count impossible');

  // Rank must be reachable with the claimed money (rank = net worth within one life).
  if (s.best_life_log10 + 0.01 < RANK_LOG10[s.highest_rank]) return fail('rank not reachable with claimed net worth');

  // Reputation formula: floor(cbrt(lifetime / 1e6)), perks can't raise it. Allow +1 for rounding.
  const maxRep = s.lifetime_log10 > LIMITS.prestigeDivisorLog10 ? Math.pow(10, (s.lifetime_log10 - LIMITS.prestigeDivisorLog10) / 3) + 1 : 1;
  if (s.reputation > maxRep) return fail('reputation exceeds what lifetime earnings allow');
  if (s.prestige_count > 0 && s.highest_rank < LIMITS.prestigeMinRank) return fail('prestige without reaching the required rank');

  if (!prev) {
    // First record: growth must fit inside the claimed play time.
    const hours = Math.max(s.play_seconds, 1) / 3600;
    if (s.lifetime_log10 > 3 + hours * LIMITS.maxLog10PerPlayHour) return fail('growth too fast for claimed play time');
    return { ok: true };
  }

  const elapsed = (nowMs - Date.parse(prev.created_at)) / 1000;
  if (elapsed < LIMITS.minSecondsBetweenSubmissions) return fail('too many submissions, wait a minute');

  // Monotonic counters.
  if (s.prestige_count < prev.prestige_count) return fail('prestige count decreased');
  if (s.achievements < prev.achievements) return fail('achievements decreased');
  if (s.lifetime_log10 + 1e-6 < prev.lifetime_log10) return fail('lifetime earnings decreased');
  if (s.play_seconds < prev.play_seconds) return fail('play time decreased');

  // Play time cannot advance faster than real time.
  if (s.play_seconds - prev.play_seconds > elapsed + LIMITS.timeSlackSeconds) return fail('play time advanced faster than real time');

  // Growth since last accepted record.
  const growth = s.lifetime_log10 - prev.lifetime_log10;
  if (growth > 1 + (elapsed / 3600) * LIMITS.maxLog10PerHour) return fail('earnings grew implausibly fast');

  return { ok: true };
}
