-- ─────────────────────────────────────────────────────────────────────────────
-- team_snapshots: server-side history of teams row state
--
-- Every UPDATE on public.teams writes the previous row state to
-- public.team_snapshots via a BEFORE UPDATE trigger. This means a destructive
-- client-side write (e.g. a buggy onboarding flow pushing an empty team over
-- a populated one) is always recoverable from the snapshot row.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.team_snapshots (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  snapshot    jsonb not null,
  reason      text,
  taken_at    timestamptz not null default now()
);

create index if not exists team_snapshots_team_id_taken_at_idx
  on public.team_snapshots (team_id, taken_at desc);

alter table public.team_snapshots enable row level security;

drop policy if exists "Team member can read team snapshots" on public.team_snapshots;
create policy "Team member can read team snapshots"
  on public.team_snapshots for select
  to authenticated
  using (public.can_read_team_data(team_id));

-- No insert/update/delete policies for clients — the trigger is security
-- definer and writes happen server-side. Manual restores are done by service
-- role in the Supabase SQL editor.

create or replace function public.snapshot_team_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_snapshots (team_id, snapshot, reason)
  values (old.id, to_jsonb(old), 'pre-update');
  return new;
end;
$$;

drop trigger if exists team_snapshot_before_update on public.teams;
create trigger team_snapshot_before_update
before update on public.teams
for each row execute function public.snapshot_team_before_update();
