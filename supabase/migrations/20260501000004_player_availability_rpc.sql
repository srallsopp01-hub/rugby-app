-- Allow accepted players to write their own availability response into the coach's
-- squad_profiles row without needing full UPDATE rights on the row.
-- The function does an explicit membership check then surgically splices the JSONB array.

create or replace function public.upsert_player_availability(
  p_owner_user_id uuid,
  p_response       jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id  text;
  v_existing   jsonb;
  v_filtered   jsonb;
  v_updated    jsonb;
begin
  -- Caller must be an accepted member of the team
  if not exists (
    select 1 from public.team_members
    where owner_user_id  = p_owner_user_id
      and member_user_id = auth.uid()
      and status         = 'accepted'
  ) then
    raise exception 'Not an accepted member of this team';
  end if;

  v_player_id := p_response->>'playerId';

  -- Fetch current responses array
  select coalesce(availability_responses, '[]'::jsonb)
  into   v_existing
  from   public.squad_profiles
  where  user_id = p_owner_user_id;

  -- Remove the existing entry for this player + fixture OR training session
  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into   v_filtered
  from   jsonb_array_elements(v_existing) as elem
  where  not (
    elem->>'playerId' = v_player_id
    and (
      (p_response ? 'fixtureId'         and elem->>'fixtureId'         = p_response->>'fixtureId')
      or
      (p_response ? 'trainingSessionId' and elem->>'trainingSessionId' = p_response->>'trainingSessionId')
    )
  );

  v_updated := v_filtered || jsonb_build_array(p_response);

  update public.squad_profiles
  set    availability_responses = v_updated,
         updated_at             = now()
  where  user_id = p_owner_user_id;
end;
$$;

grant execute on function public.upsert_player_availability(uuid, jsonb) to authenticated;
