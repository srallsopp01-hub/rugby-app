-- Allow unauthenticated users to read invite links by token (public join page)
create policy "Anon can read active invite links"
  on public.team_invite_links for select
  to anon
  using (true);

-- Allow unauthenticated users to read team names for the join landing page
create policy "Anon can read squad profiles"
  on public.squad_profiles for select
  to anon
  using (true);
