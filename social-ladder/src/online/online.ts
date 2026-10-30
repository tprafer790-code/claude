import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { GameState } from '../game/state';
import { ACHIEVEMENTS } from '../data/achievements';

/**
 * Optional online layer (Supabase). The game never depends on it: when the
 * environment variables are missing every call is a no-op and the UI shows
 * local mode. The browser only ever holds the public anon key; scores are
 * validated server-side by the `submit-score` Edge Function.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const onlineConfigured = !!(URL && KEY);

let client: SupabaseClient | null = null;
async function sb(): Promise<SupabaseClient> {
  if (!onlineConfigured) throw new Error('Online services are not configured');
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

export interface LeaderboardRow {
  position: number;
  user_id: string;
  display_name: string;
  value: number;
  highest_rank: number;
  prestige_count: number;
}

export type BoardKind = 'global' | 'weekly' | 'prestige' | 'achievements';

const VIEW: Record<BoardKind, { view: string; column: string }> = {
  global: { view: 'leaderboard_global', column: 'lifetime_log10' },
  weekly: { view: 'leaderboard_weekly', column: 'lifetime_log10' },
  prestige: { view: 'leaderboard_prestige', column: 'reputation' },
  achievements: { view: 'leaderboard_achievements', column: 'achievements' },
};

export async function getSession(): Promise<Session | null> {
  if (!onlineConfigured) return null;
  const { data } = await (await sb()).auth.getSession();
  return data.session;
}

export async function onAuthChange(fn: (s: Session | null) => void): Promise<() => void> {
  if (!onlineConfigured) return () => {};
  const { data } = (await sb()).auth.onAuthStateChange((_e, session) => fn(session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string) {
  const { error } = await (await sb()).auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split('#')[0] } });
  if (error) throw error;
}

export async function signOut() {
  await (await sb()).auth.signOut();
}

export async function fetchBoard(kind: BoardKind, limit = 50): Promise<LeaderboardRow[]> {
  const { view, column } = VIEW[kind];
  const { data, error } = await (await sb()).from(view).select('*').order(column, { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>, i: number) => ({
    position: i + 1,
    user_id: String(r.user_id),
    display_name: String(r.display_name ?? 'Anonymous'),
    value: Number(r[column] ?? 0),
    highest_rank: Number(r.highest_rank ?? 0),
    prestige_count: Number(r.prestige_count ?? 0),
  }));
}

export async function upsertProfile(displayName: string) {
  const s = await (await sb()).auth.getUser();
  const uid = s.data.user?.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await (await sb()).from('profiles').upsert({ id: uid, display_name: displayName.slice(0, 20) });
  if (error) throw error;
}

/** Claimed snapshot. The server re-checks it against time and history before accepting. */
export function buildSubmission(s: GameState) {
  return {
    lifetime_log10: s.lifetimeEarned.gt(0) ? s.lifetimeEarned.log10() : 0,
    best_life_log10: s.stats.bestLifeEarned.gt(0) ? s.stats.bestLifeEarned.log10() : 0,
    highest_rank: s.highestRankEver,
    prestige_count: s.prestige.count,
    reputation: s.prestige.reputation,
    achievements: Object.keys(s.achievements).length,
    achievements_total: ACHIEVEMENTS.length,
    play_seconds: Math.floor(s.stats.playSeconds),
    client_version: 1,
  };
}

export async function submitScore(s: GameState): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await (await sb()).functions.invoke('submit-score', { body: buildSubmission(s) });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error ?? message;
    } catch {
      /* keep generic message */
    }
    return { ok: false, message };
  }
  return { ok: true, message: (data as { message?: string })?.message ?? 'Record accepted' };
}

export async function saveToCloud(serialized: string) {
  const s = await (await sb()).auth.getUser();
  const uid = s.data.user?.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await (await sb()).from('cloud_saves').upsert({ user_id: uid, data: serialized, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function loadFromCloud(): Promise<string | null> {
  const s = await (await sb()).auth.getUser();
  const uid = s.data.user?.id;
  if (!uid) throw new Error('Not signed in');
  const { data, error } = await (await sb()).from('cloud_saves').select('data').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return (data?.data as string | undefined) ?? null;
}

export async function myHistory(): Promise<{ created_at: string; lifetime_log10: number; status: string }[]> {
  const { data, error } = await (await sb()).from('score_submissions').select('created_at, lifetime_log10, status').order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data ?? [];
}
