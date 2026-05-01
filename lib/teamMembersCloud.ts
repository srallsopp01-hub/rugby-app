import { createClient } from "@/lib/supabase/client";

export type TeamMemberStatus = "pending" | "accepted" | "revoked" | "pending_approval" | "notify_request";

export type TeamMember = {
  id: string;
  ownerUserId: string;
  memberUserId: string | null;
  email: string;
  role: "assistant_coach" | "player";
  coachLabel: string | null;
  canManageTeam: boolean;
  playerSquadId: string | null;
  displayName: string | null;
  inviteLinkId: string | null;
  status: TeamMemberStatus;
  invitedAt: string;
  acceptedAt: string | null;
  requestedName: string | null;
  requestedPosition: string | null;
};

export type InviteLink = {
  id: string;
  ownerUserId: string;
  token: string;
  role: "assistant_coach" | "player";
  label: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  preFillEmail: string | null;
  preFillSquadPlayerId: string | null;
};

type TeamMemberRow = {
  id: string;
  owner_user_id: string;
  member_user_id: string | null;
  email: string;
  role: "assistant_coach" | "player";
  coach_label: string | null;
  can_manage_team: boolean | null;
  player_squad_id: string | null;
  display_name: string | null;
  invite_link_id: string | null;
  status: TeamMemberStatus;
  invited_at: string;
  accepted_at: string | null;
  requested_name: string | null;
  requested_position: string | null;
};

type InviteLinkRow = {
  id: string;
  owner_user_id: string;
  token: string;
  role: "assistant_coach" | "player";
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  pre_filled_email: string | null;
  pre_filled_squad_player_id: string | null;
};

function rowToMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    memberUserId: row.member_user_id,
    email: row.email,
    role: row.role,
    coachLabel: row.coach_label,
    canManageTeam: Boolean(row.can_manage_team),
    playerSquadId: row.player_squad_id,
    displayName: row.display_name,
    inviteLinkId: row.invite_link_id,
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    requestedName: row.requested_name,
    requestedPosition: row.requested_position,
  };
}

function rowToInviteLink(row: InviteLinkRow): InviteLink {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    token: row.token,
    role: row.role,
    label: row.label,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    preFillEmail: row.pre_filled_email,
    preFillSquadPlayerId: row.pre_filled_squad_player_id,
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
      .neq("status", "notify_request")
      .order("invited_at", { ascending: false });

    if (error || !data) return [];
    return (data as TeamMemberRow[]).map(rowToMember);
  } catch {
    return [];
  }
}

export async function revokeTeamMember(memberId: string): Promise<void> {
  try {
    await fetch("/api/invite/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
  } catch {
    return;
  }
}

export async function resendTeamMemberInvite(memberId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/invite/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Failed to resend invite" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to resend invite" };
  }
}

export async function updateTeamMemberEmail(
  memberId: string,
  email: string
): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const res = await fetch("/api/invite/member-email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, email }),
    });
    const data = (await res.json().catch(() => ({}))) as { email?: string; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Failed to update email" };
    }
    return { ok: true, email: data.email };
  } catch {
    return { ok: false, error: "Failed to update email" };
  }
}

export async function sendTeamMemberPasswordReset(
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/invite/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Failed to send password reset" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to send password reset" };
  }
}

export async function fetchPendingApprovals(): Promise<TeamMember[]> {
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
      .eq("status", "pending_approval")
      .order("invited_at", { ascending: false });

    if (error || !data) return [];
    return (data as TeamMemberRow[]).map(rowToMember);
  } catch {
    return [];
  }
}

export async function fetchNotifyRequests(): Promise<TeamMember[]> {
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
      .eq("status", "notify_request")
      .order("invited_at", { ascending: false });

    if (error || !data) return [];
    return (data as TeamMemberRow[]).map(rowToMember);
  } catch {
    return [];
  }
}

export async function approveTeamMember(memberId: string): Promise<void> {
  await fetch("/api/invite/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
  });
}

export async function rejectTeamMember(memberId: string): Promise<void> {
  await fetch("/api/invite/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
  });
}

export async function createInviteLink(
  role: "assistant_coach" | "player",
  options?: { label?: string; email?: string; squadPlayerId?: string }
): Promise<{ url: string; token: string; linkId: string } | null> {
  try {
    const res = await fetch("/api/invite/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, label: options?.label, email: options?.email, squadPlayerId: options?.squadPlayerId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { url: string; token: string; linkId: string };
  } catch {
    return null;
  }
}

export async function deactivateInviteLink(linkId: string): Promise<void> {
  await fetch("/api/invite/link", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linkId }),
  });
}

export async function fetchActiveInviteLinks(): Promise<InviteLink[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("team_invite_links")
      .select("*")
      .eq("owner_user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as InviteLinkRow[]).map(rowToInviteLink);
  } catch {
    return [];
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
