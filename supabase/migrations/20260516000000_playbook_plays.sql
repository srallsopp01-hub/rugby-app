-- playbook_plays: team-scoped cloud storage for playbook plays

create table if not exists public.playbook_plays (
  id                 uuid primary key default gen_random_uuid(),
  team_id            uuid not null references public.teams(id) on delete cascade,
  name               text not null,
  scenes             jsonb not null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists playbook_plays_team_id_idx
  on public.playbook_plays(team_id);

alter table public.playbook_plays enable row level security;

drop policy if exists "Team member can read playbook plays" on public.playbook_plays;
create policy "Team member can read playbook plays"
  on public.playbook_plays for select
  to authenticated
  using (public.can_read_team_data(team_id));

drop policy if exists "Team manager can insert playbook plays" on public.playbook_plays;
create policy "Team manager can insert playbook plays"
  on public.playbook_plays for insert
  to authenticated
  with check (public.can_manage_team(team_id));

drop policy if exists "Team manager can update playbook plays" on public.playbook_plays;
create policy "Team manager can update playbook plays"
  on public.playbook_plays for update
  to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

drop policy if exists "Team manager can delete playbook plays" on public.playbook_plays;
create policy "Team manager can delete playbook plays"
  on public.playbook_plays for delete
  to authenticated
  using (public.can_manage_team(team_id));
