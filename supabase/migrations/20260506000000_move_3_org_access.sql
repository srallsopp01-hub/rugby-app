-- Move 3: Club-admin org access — RLS policies + RPC extensions
--
-- Prerequisites: none (all prior migrations already applied).
-- Deploy order: apply this migration BEFORE deploying any Move 3 app code.
--
-- What this fixes:
--   1. organisation_members had no SELECT policy → queries returned 0 rows for authenticated users
--   2. organisations only had an owner-only SELECT policy → non-owner club_admins couldn't read their org
--   3. can_read_team_data() only checked team_members → club_admin failed the teams SELECT policy
--   4. resolve_active_team_id() fell back to team_members only → club_admin with no team_members got null
--   5. set_active_team_id() only validated team_members → club_admin team switch was rejected

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. organisation_members SELECT policies
-- ─────────────────────────────────────────────────────────────────────────────

-- User can always read their own membership row.
create policy "Member can read own organisation membership"
  on public.organisation_members for select
  to authenticated
  using (user_id = auth.uid());

-- Any org member can read all membership rows for their organisation
-- (needed to count admin seats on /coach/organisation).
create policy "Org member can read all organisation memberships"
  on public.organisation_members for select
  to authenticated
  using (
    exists (
      select 1 from public.organisation_members me
      where me.organisation_id = organisation_members.organisation_id
        and me.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. organisations SELECT policy for non-owner club_admins
-- ─────────────────────────────────────────────────────────────────────────────

-- Existing "Owner can read own organisation" policy (owner_user_id = auth.uid())
-- already covers org owners. This covers non-owner club_admins.
create policy "Org member can read organisation"
  on public.organisations for select
  to authenticated
  using (
    exists (
      select 1 from public.organisation_members om
      where om.organisation_id = organisations.id
        and om.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. can_read_team_data — extend to include org-level access
-- ─────────────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. resolve_active_team_id — extend with club_admin fallback
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.resolve_active_team_id(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  -- 1. Check stored last_active_team_id.
  select up.last_active_team_id
    into v_team_id
    from public.user_profiles up
   where up.user_id = p_user_id
     and up.last_active_team_id is not null;

  if v_team_id is not null then
    -- Valid if the user has active team_members OR club_admin org access to this team.
    if not exists (
      select 1 from public.team_members tm
      where tm.user_id = p_user_id
        and tm.team_id = v_team_id
        and tm.status  = 'active'
    ) and not exists (
      select 1
      from public.organisation_members om
      join public.teams t on t.organisation_id = om.organisation_id
      where t.id = v_team_id
        and om.user_id = p_user_id
        and om.role    = 'club_admin'
    ) then
      v_team_id := null;  -- stale — fall through
    end if;
  end if;

  -- 2. Fall back to first active team_members row (original path).
  if v_team_id is null then
    select tm.team_id
      into v_team_id
      from public.team_members tm
     where tm.user_id = p_user_id
       and tm.status  = 'active'
     order by tm.created_at asc, tm.id asc
     limit 1;
  end if;

  -- 3. Fall back to first active team in any org the user admins (club_admin path).
  if v_team_id is null then
    select t.id
      into v_team_id
      from public.organisation_members om
      join public.teams t on t.organisation_id = om.organisation_id
     where om.user_id = p_user_id
       and om.role    = 'club_admin'
       and t.status   = 'active'
     order by om.created_at asc, t.created_at asc, t.id asc
     limit 1;
  end if;

  if v_team_id is null then
    return null;
  end if;

  -- Upsert user_profiles so the resolved team is remembered.
  insert into public.user_profiles (user_id, last_active_team_id, updated_at)
  values (p_user_id, v_team_id, now())
  on conflict (user_id) do update
    set last_active_team_id = excluded.last_active_team_id,
        updated_at          = excluded.updated_at;

  return v_team_id;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. set_active_team_id — extend to accept org-level access
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_active_team_id(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.team_members tm
    where tm.user_id = auth.uid()
      and tm.team_id = p_team_id
      and tm.status  = 'active'
  ) and not exists (
    select 1
    from public.organisation_members om
    join public.teams t on t.organisation_id = om.organisation_id
    where t.id     = p_team_id
      and om.user_id = auth.uid()
      and om.role    = 'club_admin'
  ) then
    raise exception 'unauthorized: no access to team %', p_team_id;
  end if;

  insert into public.user_profiles (user_id, last_active_team_id, updated_at)
  values (auth.uid(), p_team_id, now())
  on conflict (user_id) do update
    set last_active_team_id = excluded.last_active_team_id,
        updated_at          = excluded.updated_at;
end;
$$;

commit;
