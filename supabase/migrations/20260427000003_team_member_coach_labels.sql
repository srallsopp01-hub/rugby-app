-- Optional display label for invited coaches, e.g. Head, Forwards, Backs, 2nd team.
-- Permissions still use role='assistant_coach' internally so invited coaches do
-- not receive head-coach/data-owner write access.
alter table public.team_members
  add column if not exists coach_label text;
