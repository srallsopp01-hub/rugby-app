import { createClient } from "@/lib/supabase/client";

export type TeamRole = "coach" | "assistant_coach" | "player";

export type MyTeamContext = {
  role: TeamRole;
  ownerUserId: string;
  canManageTeam: boolean;
};

let cachedContext: MyTeamContext | null | undefined = undefined;

export async function getMyTeamContext(): Promise<MyTeamContext | null> {
  if (cachedContext !== undefined) return cachedContext;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { cachedContext = null; return null; }

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
      // No membership row means this user is a head coach (owns their own data)
      cachedContext = { role: "coach", ownerUserId: user.id, canManageTeam: true };
    } else {
      cachedContext = {
        role: resolvedMembership.role as "assistant_coach" | "player",
        ownerUserId: resolvedMembership.owner_user_id as string,
        canManageTeam: Boolean(resolvedMembership.can_manage_team),
      };
    }

    return cachedContext;
  } catch {
    // Don't cache null on exception — a transient error shouldn't block all future lookups.
    return null;
  }
}

export function clearTeamContextCache() {
  cachedContext = undefined;
}
