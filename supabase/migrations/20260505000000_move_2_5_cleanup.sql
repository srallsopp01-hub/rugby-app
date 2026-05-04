-- Move 2.5: Drop deprecated team_members columns + enforce team_invite_links.team_id NOT NULL
--
-- Pre-flight (run these in prod before executing):
--   SELECT count(*) FROM team_invite_links WHERE team_id IS NULL;  -- must be 0
--   SELECT count(*) FROM team_members WHERE role = 'assistant_coach' AND can_manage_team = true AND status = 'active';
--
-- Deploy order: apply this migration first, then deploy the app (code no longer references dropped columns).

begin;

-- 1. Drop invite_tokens RLS policies that reference deprecated team_members columns
--    (from 20260427000002_team_invites.sql — never updated by the multi-tenant migration)
drop policy if exists "Coach can create own invite tokens" on public.invite_tokens;
drop policy if exists "Coach can update own invite tokens" on public.invite_tokens;
drop policy if exists "Invitee can mark own token used" on public.invite_tokens;

-- 2. Recreate can_manage_team() RLS helper — derive from role only (drops the can_manage_team column ref)
create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role = 'head_coach'
  )
  or exists (
    select 1
    from public.organisation_members om
    join public.teams t on t.organisation_id = om.organisation_id
    where t.id = p_team_id
      and om.user_id = auth.uid()
      and om.role = 'club_admin'
  );
$$;

-- 3. Drop deprecated columns from team_members
alter table public.team_members drop column if exists owner_user_id;
alter table public.team_members drop column if exists member_user_id;
alter table public.team_members drop column if exists can_manage_team;

-- 4. Recreate invite_tokens policies using new schema (team_id + user_id + role)
create policy "Coach can create own invite tokens"
  on public.invite_tokens for insert
  to authenticated
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and public.can_manage_team(tm.team_id)
    )
  );

create policy "Coach can update own invite tokens"
  on public.invite_tokens for update
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and public.can_manage_team(tm.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and public.can_manage_team(tm.team_id)
    )
  );

create policy "Invitee can mark own token used"
  on public.invite_tokens for update
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.user_id = auth.uid()
        and lower(tm.email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = invite_tokens.team_member_id
        and tm.user_id = auth.uid()
        and lower(tm.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 5. Backfill any team_invite_links rows still missing team_id
--    Resolves via owner_user_id → team_members (head_coach, active, earliest created)
update public.team_invite_links til
set team_id = (
  select tm.team_id
  from public.team_members tm
  where tm.user_id = til.owner_user_id
    and tm.role = 'head_coach'
    and tm.status = 'active'
  order by tm.created_at asc
  limit 1
)
where til.team_id is null;

-- Delete any invite links that still have no resolvable team (orphaned/stale)
delete from public.team_invite_links where team_id is null;

-- 6. Enforce NOT NULL on team_invite_links.team_id (was nullable for transition safety)
alter table public.team_invite_links alter column team_id set not null;

commit;
