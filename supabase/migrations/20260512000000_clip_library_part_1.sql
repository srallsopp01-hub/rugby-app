-- Batch CA — Video Sources for Clips Module
-- Creates video_sources table for externally uploaded source videos
-- (opposition footage, training, etc) that can later be clipped into the library.

create table public.video_sources (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  opponent text null,
  context text null,
  r2_path text not null,
  file_size_bytes bigint null,
  duration_seconds integer null,
  uploaded_by_user_id uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index video_sources_team_id_idx on public.video_sources(team_id);
create index video_sources_uploaded_by_idx on public.video_sources(uploaded_by_user_id);

-- Auto-update updated_at on row change
create or replace function public.video_sources_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger video_sources_updated_at
  before update on public.video_sources
  for each row execute function public.video_sources_set_updated_at();

-- RLS
alter table public.video_sources enable row level security;

-- Read: any team member of the team
create policy "Team members can read video sources"
on public.video_sources
for select
to authenticated
using (public.can_read_team_data(team_id));

-- Insert: only head coaches (can_manage_team) for the team
create policy "Head coaches can insert video sources"
on public.video_sources
for insert
to authenticated
with check (public.can_manage_team(team_id));

-- Update: only head coaches for the team
create policy "Head coaches can update video sources"
on public.video_sources
for update
to authenticated
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

-- Delete: only head coaches for the team
create policy "Head coaches can delete video sources"
on public.video_sources
for delete
to authenticated
using (public.can_manage_team(team_id));

comment on table public.video_sources is
  'External source videos uploaded for the Clips Module (opposition footage, training, etc).';
