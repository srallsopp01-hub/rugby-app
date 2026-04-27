-- Team membership: maps a coach (data owner) to invited members
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('assistant_coach', 'player')),
  player_squad_id text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, email)
);

create index if not exists team_members_owner_idx on public.team_members(owner_user_id);
create index if not exists team_members_member_idx on public.team_members(member_user_id)
  where member_user_id is not null;
create index if not exists team_members_email_idx on public.team_members(lower(email));

-- Short-lived invite tokens (separate table for clean token lifecycle)
create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invite_tokens_token_idx on public.invite_tokens(token);

alter table public.team_members enable row level security;
alter table public.invite_tokens enable row level security;

-- Coach can fully manage their own team_members rows
drop policy if exists "Coach can manage own team members" on public.team_members;
create policy "Coach can manage own team members"
  on public.team_members for all
  to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Members can read their own membership row
drop policy if exists "Member can read own membership" on public.team_members;
create policy "Member can read own membership"
  on public.team_members for select
  to authenticated
  using (auth.uid() = member_user_id);

-- Members can update their own row. Pending invite acceptance is allowed only
-- when the authenticated account email matches the invited email address.
drop policy if exists "Member can accept own invite" on public.team_members;
create policy "Member can accept own invite"
  on public.team_members for update
  to authenticated
  using (
    auth.uid() = member_user_id
    or (
      member_user_id is null
      and status = 'pending'
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    auth.uid() = member_user_id
    and lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Invite tokens: anon-readable for token lookup on the acceptance page
-- The token value itself is 256-bit entropy; used_at + expires_at guard replay
drop policy if exists "Token lookup by value" on public.invite_tokens;
create policy "Token lookup by value"
  on public.invite_tokens for select
  to anon, authenticated
  using (true);

-- Coaches can create and manage tokens for invites they own
drop policy if exists "Coach can create own invite tokens" on public.invite_tokens;
create policy "Coach can create own invite tokens"
  on public.invite_tokens for insert
  to authenticated
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.owner_user_id = auth.uid()
    )
  );

drop policy if exists "Coach can update own invite tokens" on public.invite_tokens;
create policy "Coach can update own invite tokens"
  on public.invite_tokens for update
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.owner_user_id = auth.uid()
    )
  );

-- Invitees can mark their own accepted token as used
drop policy if exists "Invitee can mark own token used" on public.invite_tokens;
create policy "Invitee can mark own token used"
  on public.invite_tokens for update
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.member_user_id = auth.uid()
        and lower(tm.email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.member_user_id = auth.uid()
        and lower(tm.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Extend squad_profiles SELECT to include accepted team members
drop policy if exists "Coach can read own squad profile" on public.squad_profiles;
create policy "Coach can read own squad profile"
  on public.squad_profiles for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = squad_profiles.user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );

-- Extend saved_matches SELECT to include accepted members
drop policy if exists "Coach can read own saved matches" on public.saved_matches;
create policy "Coach can read own saved matches"
  on public.saved_matches for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = saved_matches.user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );

-- Video storage: accepted members can read coach's videos
-- (storage.objects policies are additive — this adds team member read on top of coach's own-folder read)
drop policy if exists "Team member can read coach videos" on storage.objects;
create policy "Team member can read coach videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'match-videos'
    and exists (
      select 1 from public.team_members tm
      where tm.owner_user_id::text = (storage.foldername(name))[1]
        and tm.member_user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );
