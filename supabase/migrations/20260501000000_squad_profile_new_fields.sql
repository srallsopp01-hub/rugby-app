-- Add fixtures, training sessions, availability responses, session logs, and league position
-- to squad_profiles. These fields were added to the app in the dashboard rebuild (fca44ff)
-- but were not included in the original cloud sync code.

alter table public.squad_profiles
  add column if not exists fixtures              jsonb default '[]'::jsonb,
  add column if not exists training_sessions     jsonb default '[]'::jsonb,
  add column if not exists availability_responses jsonb default '[]'::jsonb,
  add column if not exists session_logs          jsonb default '[]'::jsonb,
  add column if not exists league_position       integer;
