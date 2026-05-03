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

  if (rpcError || !resolvedTeamId) return null;

  const teamId = resolvedTeamId as string;

  // Fetch role + canManageTeam from the specific membership row.
  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role, can_manage_team")
    .eq("user_id", user.id)
    .eq("team_id", teamId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) return null;

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
    canManageTeam: Boolean(membership.can_manage_team),
  };
}
