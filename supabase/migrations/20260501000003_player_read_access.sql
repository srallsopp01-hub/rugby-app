-- Allow accepted team members (players + assistant coaches) to read their coach's data.
-- Previously the SELECT policies required auth.uid() = user_id (owner only), blocking players.

create or replace function public.can_read_team_data(target_owner_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() = target_owner_user_id
    or exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = target_owner_user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'accepted'
    );
$$;

grant execute on function public.can_read_team_data(uuid) to authenticated;

drop policy if exists "Coach can read own squad profile" on public.squad_profiles;
create policy "Team member can read squad profile"
  on public.squad_profiles for select
  to authenticated
  using (public.can_read_team_data(user_id));

drop policy if exists "Coach can read own saved matches" on public.saved_matches;
create policy "Team member can read saved matches"
  on public.saved_matches for select
  to authenticated
  using (public.can_read_team_data(user_id));
