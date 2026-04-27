-- Optional full head-coach permissions for invited coaches.
-- Standard invited coaches remain read-only. Rows with can_manage_team=true can
-- manage the owner team's squad profile, saved matches, videos, and invites.

alter table public.team_members
  add column if not exists can_manage_team boolean not null default false;

create or replace function public.can_manage_team(target_owner_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() = target_owner_user_id
    or exists (
      select 1
      from public.team_members tm
      where tm.owner_user_id = target_owner_user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'accepted'
        and tm.role = 'assistant_coach'
        and tm.can_manage_team = true
    );
$$;

grant execute on function public.can_manage_team(uuid) to authenticated;

-- Team member management: owner and invited head-permission coaches can invite/revoke.
drop policy if exists "Coach can manage own team members" on public.team_members;
create policy "Coach can manage own team members"
  on public.team_members for all
  to authenticated
  using (public.can_manage_team(owner_user_id))
  with check (public.can_manage_team(owner_user_id));

-- Squad profile writes: owner and invited head-permission coaches can write the owner row.
drop policy if exists "Coach can insert own squad profile" on public.squad_profiles;
create policy "Coach can insert own squad profile"
  on public.squad_profiles for insert
  to authenticated
  with check (public.can_manage_team(user_id));

drop policy if exists "Coach can update own squad profile" on public.squad_profiles;
create policy "Coach can update own squad profile"
  on public.squad_profiles for update
  to authenticated
  using (public.can_manage_team(user_id))
  with check (public.can_manage_team(user_id));

drop policy if exists "Coach can delete own squad profile" on public.squad_profiles;
create policy "Coach can delete own squad profile"
  on public.squad_profiles for delete
  to authenticated
  using (public.can_manage_team(user_id));

-- Saved match writes: owner and invited head-permission coaches can write the owner rows.
drop policy if exists "Coach can insert own saved matches" on public.saved_matches;
create policy "Coach can insert own saved matches"
  on public.saved_matches for insert
  to authenticated
  with check (public.can_manage_team(user_id));

drop policy if exists "Coach can update own saved matches" on public.saved_matches;
create policy "Coach can update own saved matches"
  on public.saved_matches for update
  to authenticated
  using (public.can_manage_team(user_id))
  with check (public.can_manage_team(user_id));

drop policy if exists "Coach can delete own saved matches" on public.saved_matches;
create policy "Coach can delete own saved matches"
  on public.saved_matches for delete
  to authenticated
  using (public.can_manage_team(user_id));

-- Video storage writes: owner and invited head-permission coaches can manage the owner folder.
drop policy if exists "Head coach can upload team videos" on storage.objects;
create policy "Head coach can upload team videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'match-videos'
    and public.can_manage_team(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Head coach can update team videos" on storage.objects;
create policy "Head coach can update team videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'match-videos'
    and public.can_manage_team(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'match-videos'
    and public.can_manage_team(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Head coach can delete team videos" on storage.objects;
create policy "Head coach can delete team videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'match-videos'
    and public.can_manage_team(((storage.foldername(name))[1])::uuid)
  );
