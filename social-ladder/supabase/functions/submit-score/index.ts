// Supabase Edge Function (Deno): validates and records leaderboard submissions.
// Deploy: supabase functions deploy submit-score
// Uses SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, which Supabase
// injects into Edge Functions automatically. The service role key never reaches the browser.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseSubmission, validate, type PreviousRecord } from './validate.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(401, { error: 'Sign in required' });
  const uid = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const sub = parseSubmission(body);
  if (!sub) return json(400, { error: 'Malformed submission' });

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // Rate limit on any submission (accepted or rejected).
  const { data: last } = await admin
    .from('score_submissions').select('created_at').eq('user_id', uid)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - Date.parse(last.created_at) < 60_000) return json(429, { error: 'Too many submissions, wait a minute' });

  // Compare against the last ACCEPTED record.
  const { data: prev } = await admin
    .from('score_submissions')
    .select('created_at, lifetime_log10, prestige_count, achievements, play_seconds')
    .eq('user_id', uid).eq('status', 'accepted')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const verdict = validate(sub, (prev as PreviousRecord | null) ?? null, Date.now());
  const { achievements_total: _total, ...row } = sub;

  await admin.from('score_submissions').insert({
    user_id: uid, ...row,
    status: verdict.ok ? 'accepted' : 'rejected',
    reason: verdict.ok ? null : verdict.reason,
  });
  if (!verdict.ok) return json(422, { error: `Record rejected: ${verdict.reason}` });

  await admin.from('leaderboard_entries').upsert({
    user_id: uid,
    lifetime_log10: sub.lifetime_log10,
    highest_rank: sub.highest_rank,
    prestige_count: sub.prestige_count,
    reputation: sub.reputation,
    achievements: sub.achievements,
    play_seconds: sub.play_seconds,
    updated_at: new Date().toISOString(),
  });

  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  const week_start = monday.toISOString().slice(0, 10);
  const { data: wk } = await admin.from('weekly_entries').select('lifetime_log10').eq('user_id', uid).eq('week_start', week_start).maybeSingle();
  if (!wk || wk.lifetime_log10 < sub.lifetime_log10) {
    await admin.from('weekly_entries').upsert({
      user_id: uid, week_start,
      lifetime_log10: sub.lifetime_log10, highest_rank: sub.highest_rank, prestige_count: sub.prestige_count,
      updated_at: now.toISOString(),
    });
  }

  return json(200, { message: 'Record accepted' });
});
