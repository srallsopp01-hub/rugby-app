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
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and status  = 'active'
  ) then
    raise exception 'Not an accepted member of this team';
  end if;

  v_player_id := p_response->>'playerId';

  -- FOR UPDATE locks the teams row for the duration of this transaction,
  -- serialising concurrent calls and preventing the read-modify-write race.
  select coalesce(availability_responses, '[]'::jsonb)
  into   v_existing
  from   public.teams
  where  id = p_team_id
  for update;

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
