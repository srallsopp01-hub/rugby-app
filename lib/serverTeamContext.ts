import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MyTeamContext, TeamRole } from "@/lib/teamContext";

async function fetchOrgPlan(
  adminClient: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<string | undefined> {
  if (!adminClient) return undefined;
  const { data } = await adminClient
    .from("organisations")
    .select("plan")
    .eq("id", orgId)
    .single();
  return (data?.plan as string) ?? undefined;
}

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
      // Fetch ownerUserId + organisation_id from the team; check if user is club_admin.
      const adminClient = createAdminClient();
      const [{ data: team }, orgCheckResult] = await Promise.all([
        supabase
          .from("teams")
          .select("created_by_user_id, organisation_id")
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

      // Resolve the org ID: prefer the club_admin row, fall back to the team's org.
      const orgId =
        (orgRow?.organisation_id as string | null) ??
        (team?.organisation_id as string | null) ??
        null;

      const orgPlan = orgId ? await fetchOrgPlan(adminClient, orgId) : undefined;

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
        orgPlan,
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

  const orgPlanForAdmin = await fetchOrgPlan(
    adminClient2,
    orgMember.organisation_id as string
  );

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
        orgPlan: orgPlanForAdmin,
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
    orgPlan: orgPlanForAdmin,
  };
}
