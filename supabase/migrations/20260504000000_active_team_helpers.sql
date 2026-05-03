-- Migration: Active team resolution helpers (Move 3 sub-batch 3A)
--
-- Provides two SECURITY DEFINER functions that let application code resolve and
-- set a user's active team via user_profiles.last_active_team_id, without
-- needing a direct INSERT policy on user_profiles.
--
-- resolve_active_team_id: used by getMyTeamContext() on every authenticated
--   request to deterministically pick the active team.
-- set_active_team_id:     used by setActiveTeam() in the team switcher (3C).

-- ─────────────────────────────────────────────────────────────────────────────
-- resolve_active_team_id(p_user_id uuid) → uuid
--
-- 1. If user_profiles.last_active_team_id is set and still has an active
--    team_members row, return it unchanged.
-- 2. Otherwise pick the user's first active team_members row (created_at ASC,
--    id ASC for tiebreaking) and upsert user_profiles to record it.
-- 3. If the user has no active memberships at all, return NULL.
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
  -- Caller must be requesting their own profile.
  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  -- 1. Check whether the stored last_active_team_id is still a valid active membership.
  select up.last_active_team_id
    into v_team_id
    from public.user_profiles up
   where up.user_id = p_user_id
     and up.last_active_team_id is not null;

  if v_team_id is not null then
    if not exists (
      select 1
        from public.team_members tm
       where tm.user_id  = p_user_id
         and tm.team_id  = v_team_id
         and tm.status   = 'active'
    ) then
      v_team_id := null;  -- stale — fall through to pick a fresh one
    end if;
  end if;

  -- 2. Fall back to the user's first active membership (deterministic order).
  if v_team_id is null then
    select tm.team_id
      into v_team_id
      from public.team_members tm
     where tm.user_id = p_user_id
       and tm.status  = 'active'
     order by tm.created_at asc, tm.id asc
     limit 1;
  end if;

  if v_team_id is null then
    return null;
  end if;

  -- 3. Upsert user_profiles so the resolved team is remembered.
  insert into public.user_profiles (user_id, last_active_team_id, updated_at)
  values (p_user_id, v_team_id, now())
  on conflict (user_id) do update
    set last_active_team_id = excluded.last_active_team_id,
        updated_at          = excluded.updated_at;

  return v_team_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- set_active_team_id(p_team_id uuid) → void
--
-- Validates that auth.uid() has an active membership in p_team_id, then
-- upserts user_profiles to record it as the active team.
-- Used by setActiveTeam() in the client (Move 3 team switcher).
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
  ) then
    raise exception 'unauthorized: no active membership in team %', p_team_id;
  end if;

  insert into public.user_profiles (user_id, last_active_team_id, updated_at)
  values (auth.uid(), p_team_id, now())
  on conflict (user_id) do update
    set last_active_team_id = excluded.last_active_team_id,
        updated_at          = excluded.updated_at;
end;
$$;

-- Grant execute to authenticated users.
-- The SECURITY DEFINER attribute means the functions run as the definer, so
-- they can read/write user_profiles regardless of the caller's RLS context.
grant execute on function public.resolve_active_team_id(uuid) to authenticated;
grant execute on function public.set_active_team_id(uuid)     to authenticated;
