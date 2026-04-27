-- Batch Z Part 2: Cloud Data Foundation
-- Apply this in the Supabase SQL editor or with the Supabase CLI.

create table if not exists public.squad_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  team_name text not null default '',
  coach_name text not null default '',
  primary_colour text not null default '',
  secondary_colour text not null default '',
  logo_url text not null default '',
  players jsonb not null default '[]'::jsonb,
  action_samples jsonb not null default '[]'::jsonb,
  correction_memory jsonb not null default '[]'::jsonb,
  kpi_targets jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists squad_profiles_user_id_idx
  on public.squad_profiles(user_id);

create table if not exists public.saved_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null,
  match_title text not null default '',
  opponent text not null default '',
  match_date text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists saved_matches_user_id_updated_at_idx
  on public.saved_matches(user_id, updated_at desc);

create index if not exists saved_matches_user_id_match_date_idx
  on public.saved_matches(user_id, match_date);

alter table public.squad_profiles enable row level security;
alter table public.saved_matches enable row level security;

drop policy if exists "Coach can read own squad profile" on public.squad_profiles;
create policy "Coach can read own squad profile"
  on public.squad_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Coach can insert own squad profile" on public.squad_profiles;
create policy "Coach can insert own squad profile"
  on public.squad_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Coach can update own squad profile" on public.squad_profiles;
create policy "Coach can update own squad profile"
  on public.squad_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Coach can delete own squad profile" on public.squad_profiles;
create policy "Coach can delete own squad profile"
  on public.squad_profiles
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Coach can read own saved matches" on public.saved_matches;
create policy "Coach can read own saved matches"
  on public.saved_matches
  for select
  using (auth.uid() = user_id);

drop policy if exists "Coach can insert own saved matches" on public.saved_matches;
create policy "Coach can insert own saved matches"
  on public.saved_matches
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Coach can update own saved matches" on public.saved_matches;
create policy "Coach can update own saved matches"
  on public.saved_matches
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Coach can delete own saved matches" on public.saved_matches;
create policy "Coach can delete own saved matches"
  on public.saved_matches
  for delete
  using (auth.uid() = user_id);
