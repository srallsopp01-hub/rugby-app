import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MyTeamContext, TeamRole } from "@/lib/teamContext";

export async function getServerTeamContext(): Promise<MyTeamContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Resolve the active team via the RPC (deterministic even for multi-team users).
  const { data: resolvedTeamId, error: rpcError } = await supabase.rpc(
    "resolve_active_team_id",
    { p_user_id: user.id }
  );

  if (rpcError) return null;

  const teamId = resolvedTeamId as string | null;

  if (teamId) {
    // Fetch role from the specific team_members row.
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .eq("status", "active")
      .maybeSingle();

    if (!membershipError && membership) {
      // Fetch ownerUserId from the team and check if this user is also a club_admin.
      // Use admin client for the org check to bypass any RLS edge-cases on deployed infra.
      const adminClient = createAdminClient();
      const [{ data: team }, orgCheckResult] = await Promise.all([
        supabase
          .from("teams")
          .select("created_by_user_id")
          .eq("id", teamId)
          .single(),
        adminClient
          ? adminClient
              .from("organisation_members")
              .select("organisation_id")
              .eq("user_id", user.id)
              .eq("role", "club_admin")
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const orgRow = orgCheckResult.data;

      return {
        role: membership.role as TeamRole,
        userId: user.id,
        teamId,
        currentTeamId: teamId,
        ownerUserId: (team?.created_by_user_id as string) ?? user.id,
        canManageTeam: membership.role === "head_coach",
        isOrgAdminOnly: false,
        isClubAdmin: !!orgRow,
        orgId: orgRow?.organisation_id ?? null,
      };
    }
  }

  // club_admin fallback: no team_members row — check organisation_members.
  const adminClient2 = createAdminClient();
  const { data: orgMember } = adminClient2
    ? await adminClient2
        .from("organisation_members")
        .select("organisation_id")
        .eq("user_id", user.id)
        .eq("role", "club_admin")
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!orgMember) {
    // Authenticated user with no team and no org — standard coach who just signed up.
    // Return a valid context so the coach layout can guide them to create their first team
    // instead of trapping them in an infinite redirect to /player.
    return {
      role: "head_coach" as TeamRole,
      userId: user.id,
      teamId: "",
      currentTeamId: "",
      ownerUserId: user.id,
      canManageTeam: false,
      isOrgAdminOnly: false,
      isClubAdmin: false,
      orgId: null,
      hasNoTeams: true,
    };
  }

  // Prefer the RPC-resolved team if it belongs to this org; otherwise pick the first active team.
  let adminTeamId: string | null = null;

  if (teamId) {
    const { data: resolvedTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("organisation_id", orgMember.organisation_id)
      .eq("status", "active")
      .maybeSingle();
    if (resolvedTeam) adminTeamId = resolvedTeam.id as string;
  }

  if (!adminTeamId) {
    const { data: firstTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("organisation_id", orgMember.organisation_id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!firstTeam) {
      // Club admin exists but has no teams yet — return a valid context so the
      // coach layout doesn't redirect them to /player. They'll land on the org
      // page where they can create their first team.
      return {
        role: "club_admin" as TeamRole,
        userId: user.id,
        teamId: "",
        currentTeamId: "",
        ownerUserId: user.id,
        canManageTeam: false,
        isOrgAdminOnly: true,
        isClubAdmin: true,
        orgId: orgMember.organisation_id,
        hasNoTeams: true,
      };
    }

    adminTeamId = firstTeam.id as string;
  }

  const { data: orgTeam } = await supabase
    .from("teams")
    .select("created_by_user_id")
    .eq("id", adminTeamId)
    .single();

  return {
    role: "club_admin" as TeamRole,
    userId: user.id,
    teamId: adminTeamId,
    currentTeamId: adminTeamId,
    ownerUserId: (orgTeam?.created_by_user_id as string) ?? user.id,
    canManageTeam: true,
    isOrgAdminOnly: true,
    isClubAdmin: true,
    orgId: orgMember.organisation_id,
  };
}
