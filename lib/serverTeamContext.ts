import { createClient } from "@/lib/supabase/server";
import type { MyTeamContext, TeamRole } from "@/lib/teamContext";

export async function getServerTeamContext(): Promise<MyTeamContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership, error } = await supabase
    .from("team_members")
    .select("role, team_id, can_manage_team")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership) return null;

  const { data: team } = await supabase
    .from("teams")
    .select("created_by_user_id")
    .eq("id", membership.team_id)
    .single();

  return {
    role: membership.role as TeamRole,
    userId: user.id,
    teamId: membership.team_id as string,
    ownerUserId: (team?.created_by_user_id as string) ?? user.id,
    canManageTeam: Boolean(membership.can_manage_team),
  };
}
