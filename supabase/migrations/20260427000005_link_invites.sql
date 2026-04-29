-- Shareable invite links (not email-based)
create table if not exists public.team_invite_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  role text not null default 'player' check (role in ('assistant_coach', 'player')),
  label text,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists team_invite_links_owner_idx on public.team_invite_links(owner_user_id);
create index if not exists team_invite_links_token_idx on public.team_invite_links(token);

alter table public.team_invite_links enable row level security;

-- Coach manages their own links
create policy "Coach can manage own invite links"
  on public.team_invite_links for all
  to authenticated
  using (public.can_manage_team(owner_user_id))
  with check (public.can_manage_team(owner_user_id));

-- Anyone authenticated can read a link by token (for join-page validation)
create policy "Authenticated can read link by token"
  on public.team_invite_links for select
  to authenticated
  using (true);

-- Extend team_members for link-based joins
alter table public.team_members
  add column if not exists invite_link_id uuid references public.team_invite_links(id),
  add column if not exists display_name text;

-- Expand status check to include pending_approval
alter table public.team_members
  drop constraint if exists team_members_status_check;

alter table public.team_members
  add constraint team_members_status_check
  check (status in ('pending', 'accepted', 'revoked', 'pending_approval'));

-- Allow any authenticated user to join via a valid active link
create policy "Member can join via link"
  on public.team_members for insert
  to authenticated
  with check (
    auth.uid() = member_user_id
    and status = 'pending_approval'
    and invite_link_id is not null
    and exists (
      select 1 from public.team_invite_links
      where id = invite_link_id
        and is_active = true
        and (expires_at is null or expires_at > now())
    )
  );
