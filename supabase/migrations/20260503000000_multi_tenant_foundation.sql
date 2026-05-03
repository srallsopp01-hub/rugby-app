-- Move 2: Multi-Tenant Foundation
-- Organisation → Team → User
--
-- Runs inside a single transaction. Any RAISE EXCEPTION rolls everything back.
-- Apply to local Supabase first; only apply to production after full local smoke-test passes.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- PRE-MIGRATION SNAPSHOT (for post-migration verification)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  snap_squad_profiles   integer;
  snap_saved_matches    integer;
  snap_team_members     integer;
  snap_invite_tokens    integer;
  snap_team_invite_links integer;
begin
  select count(*) into snap_squad_profiles   from public.squad_profiles;
  select count(*) into snap_saved_matches    from public.saved_matches;
  select count(*) into snap_team_members     from public.team_members;
  select count(*) into snap_invite_tokens    from public.invite_tokens;
  select count(*) into snap_team_invite_links from public.team_invite_links;

  raise notice 'PRE-MIGRATION SNAPSHOT:';
  raise notice '  squad_profiles:    %', snap_squad_profiles;
  raise notice '  saved_matches:     %', snap_saved_matches;
  raise notice '  team_members:      %', snap_team_members;
  raise notice '  invite_tokens:     %', snap_invite_tokens;
  raise notice '  team_invite_links: %', snap_team_invite_links;

  -- Store in a temp table so the post-migration block can read them
  create temp table _migration_snapshot (key text primary key, val integer);
  insert into _migration_snapshot values
    ('squad_profiles',    snap_squad_profiles),
    ('saved_matches',     snap_saved_matches),
    ('team_members',      snap_team_members),
    ('invite_tokens',     snap_invite_tokens),
    ('team_invite_links', snap_team_invite_links);
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 1: organisations + stripe_events_processed
-- ─────────────────────────────────────────────────────────────────────────────

create table public.organisations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  plan                    text not null default 'team_launch'
                            check (plan in ('solo', 'team_launch', 'club_5', 'org_custom')),
  status                  text not null default 'active'
                            check (status in ('trialing', 'active', 'past_due', 'canceled', 'archived')),
  team_limit              integer,
  seat_limit              integer,
  player_limit            integer,
  trial_ends_at           timestamptz,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  current_period_end      timestamptz,
  canceled_at             timestamptz,
  archived_at             timestamptz,
  owner_user_id           uuid not null references auth.users(id) on delete restrict,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index organisations_owner_idx
  on public.organisations(owner_user_id);
create index organisations_status_idx
  on public.organisations(status);
create index organisations_stripe_customer_idx
  on public.organisations(stripe_customer_id)
  where stripe_customer_id is not null;
create index organisations_stripe_sub_idx
  on public.organisations(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.organisations enable row level security;

create table public.stripe_events_processed (
  event_id      text primary key,
  processed_at  timestamptz not null default now()
);

alter table public.stripe_events_processed enable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 2: teams (replaces squad_profiles)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.teams (
  id                      uuid primary key default gen_random_uuid(),
  organisation_id         uuid not null references public.organisations(id) on delete restrict,
  name                    text not null default '',
  status                  text not null default 'active'
                            check (status in ('active', 'archived')),
  archived_at             timestamptz,
  current_season          text,
  created_by_user_id      uuid references auth.users(id) on delete set null,
  -- squad_profile fields (carried forward verbatim)
  coach_name              text not null default '',
  profile_id              text not null default '',
  primary_colour          text not null default '',
  secondary_colour        text not null default '',
  logo_url                text not null default '',
  players                 jsonb not null default '[]'::jsonb,
  action_samples          jsonb not null default '[]'::jsonb,
  correction_memory       jsonb not null default '[]'::jsonb,
  kpi_targets             jsonb,
  fixtures                jsonb,
  training_sessions       jsonb,
  availability_responses  jsonb,
  session_logs            jsonb,
  league_position         integer,
  ai_chat_history         jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index teams_organisation_idx
  on public.teams(organisation_id);
create index teams_status_idx
  on public.teams(status);

alter table public.teams enable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 3: user_profiles
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  has_used_trial       boolean not null default false,
  last_active_team_id  uuid references public.teams(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.user_profiles enable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 4: organisation_members
-- ─────────────────────────────────────────────────────────────────────────────

create table public.organisation_members (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  role             text not null default 'club_admin'
                     check (role in ('club_admin')),
  created_at       timestamptz not null default now(),
  unique (user_id, organisation_id)
);

alter table public.organisation_members enable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 5: DATA MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. One organisation per squad_profiles owner
insert into public.organisations (name, plan, status, owner_user_id, created_at, updated_at)
select
  coalesce(nullif(sp.team_name, ''), 'My Team'),
  'team_launch',
  'active',
  sp.user_id,
  sp.created_at,
  sp.updated_at
from public.squad_profiles sp;

-- 5b. One team per squad_profiles row
insert into public.teams (
  organisation_id, name, created_by_user_id,
  coach_name, profile_id,
  primary_colour, secondary_colour, logo_url,
  players, action_samples, correction_memory,
  kpi_targets, fixtures, training_sessions,
  availability_responses, session_logs, league_position,
  -- ai_chat_history was never a top-level squad_profiles column; it lives in the
  -- app's localStorage payload. Leave it null here — the first coach sync will
  -- write it from localStorage into teams.ai_chat_history.
  created_at, updated_at
)
select
  o.id,
  coalesce(nullif(sp.team_name, ''), 'My Team'),
  sp.user_id,
  coalesce(sp.coach_name, ''),
  coalesce(sp.profile_id, ''),
  coalesce(sp.primary_colour, ''),
  coalesce(sp.secondary_colour, ''),
  coalesce(sp.logo_url, ''),
  coalesce(sp.players, '[]'::jsonb),
  coalesce(sp.action_samples, '[]'::jsonb),
  coalesce(sp.correction_memory, '[]'::jsonb),
  sp.kpi_targets,
  sp.fixtures,
  sp.training_sessions,
  sp.availability_responses,
  sp.session_logs,
  sp.league_position,
  sp.created_at,
  sp.updated_at
from public.squad_profiles sp
join public.organisations o on o.owner_user_id = sp.user_id;

-- 5c. user_profiles: one row per auth user
insert into public.user_profiles (user_id, has_used_trial, created_at, updated_at)
select id, false, now(), now()
from auth.users
on conflict (user_id) do nothing;

-- Set last_active_team_id for coaches (org owners)
update public.user_profiles up
set last_active_team_id = t.id,
    updated_at = now()
from public.teams t
join public.organisations o on o.id = t.organisation_id
where o.owner_user_id = up.user_id;

-- 5d. organisation_members: club_admin for each org owner
insert into public.organisation_members (user_id, organisation_id, role)
select o.owner_user_id, o.id, 'club_admin'
from public.organisations o;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 6: RESHAPE team_members
-- ─────────────────────────────────────────────────────────────────────────────

-- 6a. Make email nullable (pending invites keep their email; new team-based members don't need it)
alter table public.team_members
  alter column email drop not null;

-- 6b. Add new columns
alter table public.team_members
  add column team_id            uuid references public.teams(id) on delete cascade,
  add column user_id            uuid references auth.users(id) on delete cascade,
  add column invited_by_user_id uuid references auth.users(id) on delete set null,
  add column removed_at         timestamptz,
  add column left_team_at       timestamptz;

-- 6c. Backfill team_id from owner_user_id
update public.team_members tm
set team_id = t.id
from public.teams t
join public.organisations o on o.id = t.organisation_id
where o.owner_user_id = tm.owner_user_id;

-- 6d. Backfill user_id from member_user_id
update public.team_members
set user_id = member_user_id
where member_user_id is not null;

-- 6e. Backfill invited_by_user_id from owner_user_id
update public.team_members
set invited_by_user_id = owner_user_id;

-- 6f. Expand role CHECK to include head_coach
alter table public.team_members
  drop constraint if exists team_members_role_check;
alter table public.team_members
  add constraint team_members_role_check
    check (role in ('head_coach', 'assistant_coach', 'player'));

-- Drop old UNIQUE(owner_user_id, email) now so the head_coach insert below doesn't collide
-- (moved earlier from 6j; the partial unique on user_id+team_id is added in 6j)
alter table public.team_members
  drop constraint if exists team_members_owner_user_id_email_key;

-- 6g. Ensure each org owner has exactly one head_coach row in their team.
-- If they already have any team_members row (e.g. from a previous invite/test),
-- update it to head_coach. Otherwise insert a new one.

-- 6g-i. Promote any existing row for the org owner to head_coach
update public.team_members tm
set role              = 'head_coach',
    status            = 'accepted',   -- translated to 'active' in step 6h
    can_manage_team   = true,
    updated_at        = now()
from public.organisations o
join public.teams t on t.organisation_id = o.id
where tm.team_id = t.id
  and tm.user_id = o.owner_user_id;

-- 6g-ii. Insert head_coach row only where no row exists at all for this user+team
insert into public.team_members (
  team_id, user_id, role, status, invited_by_user_id,
  owner_user_id, email,
  invited_at, accepted_at, created_at, updated_at
)
select
  t.id,
  o.owner_user_id,
  'head_coach',
  'accepted',
  o.owner_user_id,
  o.owner_user_id,
  coalesce(
    (select email from auth.users where id = o.owner_user_id limit 1),
    ''
  ),
  now(), now(), now(), now()
from public.organisations o
join public.teams t on t.organisation_id = o.id
where not exists (
  select 1 from public.team_members tm2
  where tm2.team_id = t.id
    and tm2.user_id = o.owner_user_id
);

-- ─── CRITICAL CHECK: every org owner must have a head_coach row ───────────────
do $$
declare
  missing_count integer;
  missing_info  text;
begin
  select count(*) into missing_count
  from public.organisations o
  where not exists (
    select 1 from public.team_members tm
    where tm.user_id = o.owner_user_id
      and tm.role = 'head_coach'
      and tm.status = 'accepted'
  );

  if missing_count > 0 then
    select string_agg(o.owner_user_id::text, ', ') into missing_info
    from public.organisations o
    where not exists (
      select 1 from public.team_members tm
      where tm.user_id = o.owner_user_id
        and tm.role = 'head_coach'
        and tm.status = 'accepted'
    );
    raise exception
      'ABORT: % org owner(s) have no head_coach team_members row. Missing user_id(s): %. Migration rolled back.',
      missing_count, missing_info;
  end if;
end $$;

-- 6h. Translate status values to new enum
-- Drop old status check first — 'active' is not in the old allowed values
alter table public.team_members
  drop constraint if exists team_members_status_check;

update public.team_members set status = 'active'  where status = 'accepted';
update public.team_members set status = 'removed' where status = 'revoked';
update public.team_members set status = 'invited' where status = 'pending';
update public.team_members set status = 'pending' where status in ('pending_approval', 'notify_request');

alter table public.team_members
  add constraint team_members_status_check
    check (status in ('active', 'invited', 'pending', 'removed'));

-- 6i. Enforce team_id NOT NULL (all rows have a team now)
alter table public.team_members
  alter column team_id set not null;

-- 6j. Add partial unique on (user_id, team_id)
create unique index team_members_user_team_uniq
  on public.team_members(user_id, team_id)
  where user_id is not null;

-- 6k. Set can_manage_team = true for all head_coach rows
update public.team_members
  set can_manage_team = true
  where role = 'head_coach';


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 7: RESHAPE saved_matches
-- ─────────────────────────────────────────────────────────────────────────────

-- 7a. Rename user_id → created_by_user_id (rename, not drop+add, preserves data)
alter table public.saved_matches
  rename column user_id to created_by_user_id;

-- 7b. Add new columns
alter table public.saved_matches
  add column team_id    uuid references public.teams(id) on delete cascade,
  add column season     text,
  add column visibility text not null default 'org'
                          check (visibility in ('org', 'team'));

-- 7c. Backfill team_id from created_by_user_id
update public.saved_matches sm
set team_id = t.id
from public.teams t
join public.organisations o on o.id = t.organisation_id
where o.owner_user_id = sm.created_by_user_id;

-- 7d. Enforce team_id NOT NULL
alter table public.saved_matches
  alter column team_id set not null;

-- 7e. Drop old unique constraint (references the old column name)
alter table public.saved_matches
  drop constraint if exists saved_matches_user_id_match_id_key;

-- 7f. New unique constraint
alter table public.saved_matches
  add constraint saved_matches_team_id_match_id_key unique (team_id, match_id);

-- 7g. Update indexes
drop index if exists saved_matches_user_id_updated_at_idx;
drop index if exists saved_matches_user_id_match_date_idx;
drop index if exists saved_matches_video_path_idx;

create index saved_matches_team_id_updated_at_idx
  on public.saved_matches(team_id, updated_at desc);
create index saved_matches_team_id_match_date_idx
  on public.saved_matches(team_id, match_date);
create index saved_matches_video_path_idx
  on public.saved_matches(team_id, video_storage_path)
  where video_storage_path is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 8: Extend team_invite_links with team_id
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.team_invite_links
  add column team_id uuid references public.teams(id) on delete cascade;

update public.team_invite_links til
set team_id = t.id
from public.teams t
join public.organisations o on o.id = t.organisation_id
where o.owner_user_id = til.owner_user_id;

-- Note: team_id NOT NULL enforcement deferred to Move 2.5 after verifying zero nulls in production.


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 9: Drop squad_profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop all RLS policies referencing squad_profiles
drop policy if exists "Coach can read own squad profile"     on public.squad_profiles;
drop policy if exists "Coach can insert own squad profile"   on public.squad_profiles;
drop policy if exists "Coach can update own squad profile"   on public.squad_profiles;
drop policy if exists "Coach can delete own squad profile"   on public.squad_profiles;
drop policy if exists "Team member can read squad profile"   on public.squad_profiles;
drop policy if exists "Anon can read squad profiles"         on public.squad_profiles;

drop table public.squad_profiles;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 10: Updated RLS helper functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old signatures first (CASCADE drops dependent policies; Block 11 recreates them)
drop function if exists public.can_read_team_data(uuid) cascade;
drop function if exists public.can_manage_team(uuid) cascade;

-- can_read_team_data: now takes team_id (not owner_user_id)
create or replace function public.can_read_team_data(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

grant execute on function public.can_read_team_data(uuid) to authenticated;

-- can_manage_team: now takes team_id (not owner_user_id)
create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and (
        tm.role = 'head_coach'
        or (tm.role = 'assistant_coach' and tm.can_manage_team = true)
      )
  );
$$;

grant execute on function public.can_manage_team(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 11: New RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- teams
drop policy if exists "Team member can read team" on public.teams;
create policy "Team member can read team"
  on public.teams for select
  to authenticated
  using (public.can_read_team_data(id));

drop policy if exists "Team manager can update team" on public.teams;
create policy "Team manager can update team"
  on public.teams for update
  to authenticated
  using (public.can_manage_team(id))
  with check (public.can_manage_team(id));

drop policy if exists "Team manager can delete team" on public.teams;
create policy "Team manager can delete team"
  on public.teams for delete
  to authenticated
  using (public.can_manage_team(id));

-- saved_matches: drop all old policies first
drop policy if exists "Coach can read own saved matches"    on public.saved_matches;
drop policy if exists "Team member can read saved matches"  on public.saved_matches;
drop policy if exists "Coach can insert own saved matches"  on public.saved_matches;
drop policy if exists "Coach can update own saved matches"  on public.saved_matches;
drop policy if exists "Coach can delete own saved matches"  on public.saved_matches;

create policy "Team member can read saved matches"
  on public.saved_matches for select
  to authenticated
  using (public.can_read_team_data(team_id));

create policy "Team manager can insert saved matches"
  on public.saved_matches for insert
  to authenticated
  with check (public.can_manage_team(team_id));

create policy "Team manager can update saved matches"
  on public.saved_matches for update
  to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

create policy "Team manager can delete saved matches"
  on public.saved_matches for delete
  to authenticated
  using (public.can_manage_team(team_id));

-- team_members: drop old policies, add new ones keyed on team_id
drop policy if exists "Coach can manage own team members"  on public.team_members;
drop policy if exists "Member can read own membership"     on public.team_members;
drop policy if exists "Member can accept own invite"       on public.team_members;
drop policy if exists "Member can join via link"           on public.team_members;

create policy "Team manager can manage team members"
  on public.team_members for all
  to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

create policy "Member can read own membership"
  on public.team_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Member can accept invite"
  on public.team_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Member can join via link"
  on public.team_members for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and invite_link_id is not null
    and exists (
      select 1 from public.team_invite_links
      where id = invite_link_id
        and is_active = true
        and (expires_at is null or expires_at > now())
    )
  );

-- organisations
create policy "Owner can read own organisation"
  on public.organisations for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "Owner can update own organisation"
  on public.organisations for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- user_profiles
create policy "User can read own profile"
  on public.user_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "User can update own profile"
  on public.user_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- team_invite_links: drop old policies, add new ones
drop policy if exists "Coach can manage own invite links"      on public.team_invite_links;
drop policy if exists "Authenticated can read link by token"   on public.team_invite_links;
drop policy if exists "Anon can read active invite links"      on public.team_invite_links;

create policy "Team manager can manage invite links"
  on public.team_invite_links for all
  to authenticated
  using (
    team_id is not null and public.can_manage_team(team_id)
    or owner_user_id = auth.uid()          -- fallback for rows not yet backfilled
  )
  with check (
    team_id is not null and public.can_manage_team(team_id)
    or owner_user_id = auth.uid()
  );

create policy "Authenticated can read link by token"
  on public.team_invite_links for select
  to authenticated
  using (true);

create policy "Anon can read active invite links"
  on public.team_invite_links for select
  to anon
  using (true);

-- Storage: update video policies to use teams.created_by_user_id lookup
drop policy if exists "Coach can upload own videos"        on storage.objects;
drop policy if exists "Coach can read own videos"          on storage.objects;
drop policy if exists "Coach can update own videos"        on storage.objects;
drop policy if exists "Coach can delete own videos"        on storage.objects;
drop policy if exists "Team member can read coach videos"  on storage.objects;
drop policy if exists "Head coach can upload team videos"  on storage.objects;
drop policy if exists "Head coach can update team videos"  on storage.objects;
drop policy if exists "Head coach can delete team videos"  on storage.objects;

-- Any accepted team member can read videos stored under the coach's user folder
create policy "Team member can read team videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'match-videos'
    and exists (
      select 1
      from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.created_by_user_id::text = (storage.foldername(name))[1]
        and tm.user_id = auth.uid()
        and tm.status = 'active'
    )
  );

-- Team managers can upload/update/delete videos in the team's coach folder
create policy "Team manager can upload team videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'match-videos'
    and exists (
      select 1
      from public.teams t
      where t.created_by_user_id::text = (storage.foldername(name))[1]
        and public.can_manage_team(t.id)
    )
  );

create policy "Team manager can update team videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'match-videos'
    and exists (
      select 1
      from public.teams t
      where t.created_by_user_id::text = (storage.foldername(name))[1]
        and public.can_manage_team(t.id)
    )
  )
  with check (
    bucket_id = 'match-videos'
    and exists (
      select 1
      from public.teams t
      where t.created_by_user_id::text = (storage.foldername(name))[1]
        and public.can_manage_team(t.id)
    )
  );

create policy "Team manager can delete team videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'match-videos'
    and exists (
      select 1
      from public.teams t
      where t.created_by_user_id::text = (storage.foldername(name))[1]
        and public.can_manage_team(t.id)
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 12: Update upsert_player_availability RPC
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.upsert_player_availability(uuid, jsonb) cascade;

create or replace function public.upsert_player_availability(
  p_team_id  uuid,
  p_response jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text;
  v_existing  jsonb;
  v_filtered  jsonb;
  v_updated   jsonb;
begin
  -- Caller must be an accepted member of this team
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and status  = 'active'
  ) then
    raise exception 'Not an accepted member of this team';
  end if;

  v_player_id := p_response->>'playerId';

  select coalesce(availability_responses, '[]'::jsonb)
  into   v_existing
  from   public.teams
  where  id = p_team_id;

  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into   v_filtered
  from   jsonb_array_elements(v_existing) as elem
  where  not (
    elem->>'playerId' = v_player_id
    and (
      (p_response ? 'fixtureId'
        and elem->>'fixtureId' = p_response->>'fixtureId')
      or
      (p_response ? 'trainingSessionId'
        and elem->>'trainingSessionId' = p_response->>'trainingSessionId')
    )
  );

  v_updated := v_filtered || jsonb_build_array(p_response);

  update public.teams
  set    availability_responses = v_updated,
         updated_at             = now()
  where  id = p_team_id;
end;
$$;

grant execute on function public.upsert_player_availability(uuid, jsonb) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  snap_squad_profiles    integer;
  snap_saved_matches     integer;
  snap_team_members      integer;
  post_teams             integer;
  post_saved_matches     integer;
  post_team_members      integer;
  post_organisations     integer;
  post_org_members       integer;
  errors                 text := '';
begin
  -- Read pre-migration snapshot
  select val into snap_squad_profiles   from _migration_snapshot where key = 'squad_profiles';
  select val into snap_saved_matches    from _migration_snapshot where key = 'saved_matches';
  select val into snap_team_members     from _migration_snapshot where key = 'team_members';

  -- Read post-migration counts
  select count(*) into post_teams          from public.teams;
  select count(*) into post_saved_matches  from public.saved_matches;
  select count(*) into post_team_members   from public.team_members;
  select count(*) into post_organisations  from public.organisations;
  select count(*) into post_org_members    from public.organisation_members;

  raise notice 'POST-MIGRATION VERIFICATION:';
  raise notice '  organisations:       % (expected %)', post_organisations, snap_squad_profiles;
  raise notice '  teams:               % (expected %)', post_teams, snap_squad_profiles;
  raise notice '  organisation_members:% (expected %)', post_org_members, snap_squad_profiles;
  raise notice '  saved_matches:       % (expected %)', post_saved_matches, snap_saved_matches;
  raise notice '  team_members total:  %', post_team_members;

  if post_organisations <> snap_squad_profiles then
    errors := errors || format(
      'organisations count mismatch: got %s, expected %s. ',
      post_organisations, snap_squad_profiles
    );
  end if;

  if post_teams <> snap_squad_profiles then
    errors := errors || format(
      'teams count mismatch: got %s, expected %s. ',
      post_teams, snap_squad_profiles
    );
  end if;

  if post_org_members <> snap_squad_profiles then
    errors := errors || format(
      'organisation_members count mismatch: got %s, expected %s. ',
      post_org_members, snap_squad_profiles
    );
  end if;

  if post_saved_matches <> snap_saved_matches then
    errors := errors || format(
      'saved_matches count mismatch: got %s, expected %s. ',
      post_saved_matches, snap_saved_matches
    );
  end if;

  -- team_members: we promoted existing rows OR inserted new ones, so count >= original.
  -- The hard check is that every org has exactly one head_coach row.
  if post_team_members < snap_team_members then
    errors := errors || format(
      'team_members count dropped: got %s, expected at least %s. ',
      post_team_members, snap_team_members
    );
  end if;

  declare
    head_coach_count integer;
  begin
    select count(*) into head_coach_count
    from public.team_members
    where role = 'head_coach' and status = 'active';

    raise notice '  head_coach rows:     % (expected %)', head_coach_count, snap_squad_profiles;

    if head_coach_count <> snap_squad_profiles then
      errors := errors || format(
        'head_coach rows mismatch: got %s, expected %s. ',
        head_coach_count, snap_squad_profiles
      );
    end if;
  end;

  if errors <> '' then
    raise exception 'POST-MIGRATION VERIFICATION FAILED: %', errors;
  end if;

  raise notice 'All post-migration counts verified OK.';
end $$;

-- Clean up temp snapshot table
drop table _migration_snapshot;

commit;
