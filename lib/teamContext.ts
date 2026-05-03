import { createClient } from "@/lib/supabase/client";

export type TeamRole = "head_coach" | "assistant_coach" | "player";

export type MyTeamContext = {
  role: TeamRole;
  userId: string;
  teamId: string;
  ownerUserId: string; // derived from teams.created_by_user_id — kept for R2 path compatibility
  canManageTeam: boolean;
};

// Bump this when the schema changes so stale caches invalidate on deploy.
const CACHE_VERSION = 2;
let cachedContext: (MyTeamContext & { _v: number }) | null | undefined =
  undefined;

export async function getMyTeamContext(): Promise<MyTeamContext | null> {
  if (cachedContext !== undefined) {
    if (cachedContext === null) return null;
    if (cachedContext._v === CACHE_VERSION) {
      const { _v: _, ...ctx } = cachedContext;
      return ctx;
    }
    // stale cache — re-fetch
    cachedContext = undefined;
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      cachedContext = null;
      return null;
    }

    const { data: membership, error } = await supabase
      .from("team_members")
      .select("role, team_id, can_manage_team")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (error || !membership) {
      // No active membership row — user is not part of any team yet.
      cachedContext = null;
      return null;
    }

    const { data: team } = await supabase
      .from("teams")
      .select("created_by_user_id")
      .eq("id", membership.team_id)
      .single();

    const ctx: MyTeamContext & { _v: number } = {
      role: membership.role as TeamRole,
      userId: user.id,
      teamId: membership.team_id as string,
      ownerUserId: (team?.created_by_user_id as string) ?? user.id,
      canManageTeam: Boolean(membership.can_manage_team),
      _v: CACHE_VERSION,
    };

    cachedContext = ctx;
    const { _v: _, ...result } = ctx;
    return result;
  } catch {
    // Don't cache null on exception — transient errors shouldn't block all future lookups.
    return null;
  }
}

export function clearTeamContextCache() {
  cachedContext = undefined;
}
