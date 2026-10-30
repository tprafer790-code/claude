-- THE SOCIAL LADDER — initial schema.
-- Principles:
--   * The browser only holds the public anon key.
--   * Clients can read leaderboards, and read/write ONLY their own profile and cloud save.
--   * Clients can NEVER write scores. Scores are written by the `submit-score`
--     Edge Function (service role), after server-side plausibility checks.

create extension if not exists pgcrypto;

-- Profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Anonymous'
    check (char_length(display_name) between 1 and 20),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles are public" on public.profiles
  for select using (true);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Cloud saves ----------------------------------------------------------------
-- Opaque save blob. It is never used to rank players.
create table if not exists public.cloud_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data text not null check (char_length(data) < 500000),
  updated_at timestamptz not null default now()
);
alter table public.cloud_saves enable row level security;

create policy "read own save" on public.cloud_saves
  for select using (auth.uid() = user_id);
create policy "insert own save" on public.cloud_saves
  for insert with check (auth.uid() = user_id);
create policy "update own save" on public.cloud_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own save" on public.cloud_saves
  for delete using (auth.uid() = user_id);

-- Score submissions (audit log) ----------------------------------------------
create table if not exists public.score_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  lifetime_log10 double precision not null,
  best_life_log10 double precision not null,
  highest_rank int not null,
  prestige_count int not null,
  reputation double precision not null,
  achievements int not null,
  play_seconds bigint not null,
  client_version int not null,
  status text not null check (status in ('accepted', 'rejected')),
  reason text
);
create index if not exists score_submissions_user_time on public.score_submissions (user_id, created_at desc);
alter table public.score_submissions enable row level security;

-- Players may read their own history. No insert/update/delete policy exists,
-- so only the service role (Edge Function) can write.
create policy "read own submissions" on public.score_submissions
  for select using (auth.uid() = user_id);

-- Accepted best records --------------------------------------------------------
create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lifetime_log10 double precision not null default 0,
  highest_rank int not null default 0,
  prestige_count int not null default 0,
  reputation double precision not null default 0,
  achievements int not null default 0,
  play_seconds bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard_entries enable row level security;
create policy "leaderboard is public" on public.leaderboard_entries
  for select using (true);

-- Weekly board: best accepted lifetime per ISO week.
create table if not exists public.weekly_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  lifetime_log10 double precision not null,
  highest_rank int not null,
  prestige_count int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.weekly_entries enable row level security;
create policy "weekly is public" on public.weekly_entries
  for select using (true);

-- Views (security_invoker so RLS of the underlying tables applies) -------------
create or replace view public.leaderboard_global with (security_invoker = true) as
  select e.user_id, coalesce(p.display_name, 'Anonymous') as display_name,
         e.lifetime_log10, e.highest_rank, e.prestige_count, e.reputation, e.achievements
  from public.leaderboard_entries e left join public.profiles p on p.id = e.user_id;

create or replace view public.leaderboard_prestige with (security_invoker = true) as
  select * from public.leaderboard_global where prestige_count > 0;

create or replace view public.leaderboard_achievements with (security_invoker = true) as
  select * from public.leaderboard_global where achievements > 0;

create or replace view public.leaderboard_weekly with (security_invoker = true) as
  select w.user_id, coalesce(p.display_name, 'Anonymous') as display_name,
         w.lifetime_log10, w.highest_rank, w.prestige_count
  from public.weekly_entries w left join public.profiles p on p.id = w.user_id
  where w.week_start = date_trunc('week', now())::date;

grant select on public.leaderboard_global, public.leaderboard_prestige,
  public.leaderboard_achievements, public.leaderboard_weekly to anon, authenticated;
