import { createClient } from "@/lib/supabase/client";

export type TeamMember = {
  id: string;
  ownerUserId: string;
  memberUserId: string | null;
  email: string;
  role: "assistant_coach" | "player";
  playerSquadId: string | null;
  status: "pending" | "accepted" | "revoked";
  invitedAt: string;
  acceptedAt: string | null;
};

type TeamMemberRow = {
  id: string;
  owner_user_id: string;
  member_user_id: string | null;
  email: string;
  role: "assistant_coach" | "player";
  player_squad_id: string | null;
  status: "pending" | "accepted" | "revoked";
  invited_at: string;
  accepted_at: string | null;
};

function rowToMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    memberUserId: row.member_user_id,
    email: row.email,
    role: row.role,
    playerSquadId: row.player_squad_id,
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  };
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("owner_user_id", user.id)
      .neq("status", "revoked")
      .order("invited_at", { ascending: false });

    if (error || !data) return [];
    return (data as TeamMemberRow[]).map(rowToMember);
  } catch {
    return [];
  }
}

export async function revokeTeamMember(memberId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from("team_members")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", memberId);
  } catch {
    return;
  }
}

export async function getMyTeamRole(): Promise<{
  role: "coach" | "assistant_coach" | "player";
  ownerUserId: string;
} | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if this user is an accepted member of someone else's team
    const { data } = await supabase
      .from("team_members")
      .select("role, owner_user_id")
      .eq("member_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (data) {
      return {
        role: data.role as "assistant_coach" | "player",
        ownerUserId: data.owner_user_id as string,
      };
    }

    // Not a member of someone else's team — they are the data owner
    return { role: "coach", ownerUserId: user.id };
  } catch {
    return null;
  }
}
