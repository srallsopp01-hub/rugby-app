import { createClient } from "@/lib/supabase/client";

export type TeamRole = "head_coach" | "assistant_coach" | "player";

export type MyTeamContext = {
  role: TeamRole;
  userId: string;
  /** Resolved active team ID (deterministic via resolve_active_team_id RPC). */
  teamId: string;
  /** Explicit alias of teamId — makes the "active team" concept visible at call sites. */
  currentTeamId: string;
  /** teams.created_by_user_id for the active team — kept for R2 video path compatibility. */
  ownerUserId: string;
  canManageTeam: boolean;
};

export const ACTIVE_TEAM_CHANGED_EVENT = "fynlwhistle-active-team-changed";
/** localStorage key storing the resolved active team ID for synchronous reads (e.g. PlayerContext). */
export const ACTIVE_TEAM_ID_KEY = "fynlwhistle-active-team-id";

// Bump this when the shape changes so stale caches invalidate on deploy.
const CACHE_VERSION = 3;

type CachedContext = MyTeamContext & { _v: number; _userId: string };
let cachedContext: CachedContext | null | undefined = undefined;

export async function getMyTeamContext(): Promise<MyTeamContext | null> {
  const supabase = createClient();

  // Peek at the current user before touching the cache — the cache is per-user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cachedContext = null;
    return null;
  }

  // Return cached context if it is current for this user and schema version.
  if (
    cachedContext !== undefined &&
    cachedContext !== null &&
    cachedContext._v === CACHE_VERSION &&
    cachedContext._userId === user.id
  ) {
    const { _v: _, _userId: __, ...ctx } = cachedContext;
    return ctx;
  }

  // Stale or empty — re-fetch.
  cachedContext = undefined;

  try {
    // 1. Resolve the active team via the RPC (deterministic even for multi-team users).
    const { data: resolvedTeamId, error: rpcError } = await supabase.rpc(
      "resolve_active_team_id",
      { p_user_id: user.id }
    );

    let teamId: string;

    if (rpcError) {
      // Fallback: RPC not yet deployed (e.g. pre-migration env). Query team_members directly.
      const { data: fallback } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!fallback) {
        cachedContext = null;
        return null;
      }
      teamId = fallback.team_id as string;
    } else if (!resolvedTeamId) {
      cachedContext = null;
      return null;
    } else {
      teamId = resolvedTeamId as string;
    }

    // 2. Fetch role + canManageTeam from the specific membership row.
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError || !membership) {
      cachedContext = null;
      return null;
    }

    // 3. Fetch ownerUserId from the team (needed for R2 video paths).
    const { data: team } = await supabase
      .from("teams")
      .select("created_by_user_id")
      .eq("id", teamId)
      .single();

    // 4. Write resolved teamId to localStorage so synchronous readers (e.g. PlayerContext)
    //    can access it without an async call.
    try {
      localStorage.setItem(ACTIVE_TEAM_ID_KEY, teamId);
    } catch {
      // localStorage unavailable (SSR or private browsing) — non-fatal.
    }

    const ctx: CachedContext = {
      role: membership.role as TeamRole,
      userId: user.id,
      teamId,
      currentTeamId: teamId,
      ownerUserId: (team?.created_by_user_id as string) ?? user.id,
      canManageTeam: membership.role === "head_coach",
      _v: CACHE_VERSION,
      _userId: user.id,
    };

    cachedContext = ctx;
    const { _v: _, _userId: __, ...result } = ctx;
    return result;
  } catch {
    // Don't cache null on transient exceptions — allow retry next call.
    return null;
  }
}

export function clearTeamContextCache() {
  cachedContext = undefined;
}

/**
 * Switch the authenticated user's active team.
 * Validates the membership server-side via the set_active_team_id RPC, then clears
 * the local cache and fires ACTIVE_TEAM_CHANGED_EVENT so sync components re-fetch.
 * Used by the team switcher (Move 3 sub-batch 3C).
 */
export async function setActiveTeam(teamId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_active_team_id", {
    p_team_id: teamId,
  });
  if (error) throw new Error(`setActiveTeam failed: ${error.message}`);

  clearTeamContextCache();
  try {
    localStorage.setItem(ACTIVE_TEAM_ID_KEY, teamId);
  } catch {
    // non-fatal
  }
  window.dispatchEvent(new CustomEvent(ACTIVE_TEAM_CHANGED_EVENT));
}
