-- Unified invite flow migration
-- Adds pre-fill + single-use support to team_invite_links
-- Adds notify_request status + columns to team_members

-- 1. team_invite_links: pre-fill and single-use columns
alter table public.team_invite_links
  add column if not exists pre_filled_email text null,
  add column if not exists pre_filled_squad_player_id text null,
  add column if not exists consumed_at timestamptz null;

-- 2. team_members: notify_request status + requested player info
alter table public.team_members
  drop constraint if exists team_members_status_check;

alter table public.team_members
  add constraint team_members_status_check
    check (status in ('pending', 'accepted', 'revoked', 'pending_approval', 'notify_request'));

alter table public.team_members
  add column if not exists requested_name text null,
  add column if not exists requested_position text null;

-- 3. invite_tokens left untouched (kept for one release cycle)
