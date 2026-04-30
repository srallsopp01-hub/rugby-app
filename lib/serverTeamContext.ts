import { createClient } from "@/lib/supabase/server";
import type { MyTeamContext } from "@/lib/teamContext";

export async function getServerTeamContext(): Promise<MyTeamContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role, owner_user_id, can_manage_team")
    .eq("member_user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  let resolvedMembership = membership;
  if (membershipError) {
    const { data: fallbackMembership } = await supabase
      .from("team_members")
      .select("role, owner_user_id")
      .eq("member_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();
    resolvedMembership = fallbackMembership
      ? { ...fallbackMembership, can_manage_team: false }
      : null;
  }

  if (!resolvedMembership) {
    return { role: "coach", ownerUserId: user.id, canManageTeam: true };
  }

  return {
    role: resolvedMembership.role as MyTeamContext["role"],
    ownerUserId: resolvedMembership.owner_user_id as string,
    canManageTeam: Boolean(resolvedMembership.can_manage_team),
  };
}
