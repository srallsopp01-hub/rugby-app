import { createClient } from "@/lib/supabase/client";

export type TeamRole = "coach" | "assistant_coach" | "player";

export type MyTeamContext = {
  role: TeamRole;
  ownerUserId: string;
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

    const { data: membership } = await supabase
      .from("team_members")
      .select("role, owner_user_id")
      .eq("member_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!membership) {
      // No membership row means this user is a head coach (owns their own data)
      cachedContext = { role: "coach", ownerUserId: user.id };
    } else {
      cachedContext = {
        role: membership.role as "assistant_coach" | "player",
        ownerUserId: membership.owner_user_id as string,
      };
    }

    return cachedContext;
  } catch {
    cachedContext = null;
    return null;
  }
}

export function clearTeamContextCache() {
  cachedContext = undefined;
}
