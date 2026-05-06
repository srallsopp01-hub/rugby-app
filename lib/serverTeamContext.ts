import { createClient } from "@/lib/supabase/server";
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
      // Fetch ownerUserId from the team (needed for R2 video paths).
      const { data: team } = await supabase
        .from("teams")
        .select("created_by_user_id")
        .eq("id", teamId)
        .single();

      return {
        role: membership.role as TeamRole,
        userId: user.id,
        teamId,
        currentTeamId: teamId,
        ownerUserId: (team?.created_by_user_id as string) ?? user.id,
        canManageTeam: membership.role === "head_coach",
        isOrgAdminOnly: false,
      };
    }
  }

  // club_admin fallback: no team_members row — check organisation_members.
  const { data: orgMember } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "club_admin")
    .limit(1)
    .maybeSingle();

  if (!orgMember) return null;

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
    if (!firstTeam) return null;
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
  };
}
