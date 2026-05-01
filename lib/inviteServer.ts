import { createAdminClient } from "@/lib/supabase/admin";
import { createPlayerId, type SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => PromiseLike<{ error: unknown }>;
    };
  };
};

type AuthUserLike = {
  id: string;
  email?: string | null;
};

type InviteTokenRow = {
  id: string;
  team_member_id: string;
  expires_at: string;
  used_at: string | null;
};

type InviteMemberRow = {
  id: string;
  owner_user_id: string;
  role: "assistant_coach" | "player";
  player_squad_id: string | null;
  status: string;
  email: string;
};

export type RedeemInviteResult =
  | {
      ok: true;
      role: "assistant_coach" | "player";
      ownerUserId: string;
      playerSquadId: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function normaliseEmail(email: string | null | undefined) {
  return email?.toLowerCase().trim() ?? "";
}

function createInvitePlayer(fullName: string, memberUserId: string, position?: string): SquadPlayer {
  const trimmedName = fullName.trim();
  return {
    id: createPlayerId(),
    fullName: trimmedName,
    preferredName: trimmedName.split(/\s+/)[0] ?? trimmedName,
    nicknames: [],
    primaryPosition: position?.trim() ?? "",
    secondaryPositions: [],
    jerseyNumber: null,
    voiceSamples: [],
    status: "active",
    linkedUserId: memberUserId,
  };
}

export async function linkSquadPlayerToUser({
  ownerUserId,
  playerSquadId,
  memberUserId,
}: {
  ownerUserId: string;
  playerSquadId: string;
  memberUserId: string;
}) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: profileRow } = await admin
    .from("squad_profiles")
    .select("players")
    .eq("user_id", ownerUserId)
    .single();

  if (!profileRow?.players) return;

  const players = (profileRow.players as Array<Record<string, unknown>>).map((player) =>
    player.id === playerSquadId ? { ...player, linkedUserId: memberUserId } : player
  );

  await admin
    .from("squad_profiles")
    .update({ players, updated_at: new Date().toISOString() })
    .eq("user_id", ownerUserId);
}

export async function unlinkSquadPlayerFromUser({
  ownerUserId,
  playerSquadId,
}: {
  ownerUserId: string;
  playerSquadId: string;
}) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: profileRow } = await admin
    .from("squad_profiles")
    .select("players")
    .eq("user_id", ownerUserId)
    .single();

  if (!profileRow?.players) return;

  const players = (profileRow.players as Array<Record<string, unknown>>).map((player) => {
    if (player.id !== playerSquadId) return player;
    const { linkedUserId: _linkedUserId, ...rest } = player;
    return rest;
  });

  await admin
    .from("squad_profiles")
    .update({ players, updated_at: new Date().toISOString() })
    .eq("user_id", ownerUserId);
}

export async function createAndLinkSquadPlayer({
  ownerUserId,
  displayName,
  memberUserId,
  position,
}: {
  ownerUserId: string;
  displayName: string;
  memberUserId: string;
  position?: string;
}): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: profileRow } = await admin
    .from("squad_profiles")
    .select("players")
    .eq("user_id", ownerUserId)
    .single();

  const newPlayer = createInvitePlayer(displayName, memberUserId, position);
  const existingPlayers = Array.isArray(profileRow?.players)
    ? (profileRow.players as SquadPlayer[])
    : [];

  const { error } = await admin
    .from("squad_profiles")
    .update({
      players: [...existingPlayers, newPlayer],
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", ownerUserId);

  if (error) return null;
  return newPlayer.id;
}

export async function redeemInviteToken({
  supabase,
  token,
  user,
  playerSquadId,
  displayName,
}: {
  supabase: unknown;
  token: string;
  user: AuthUserLike;
  playerSquadId?: string | null;
  displayName?: string | null;
}): Promise<RedeemInviteResult> {
  const db = supabase as SupabaseClientLike;
  const userEmail = normaliseEmail(user.email);

  const { data: tokenData, error: tokenError } = await db
    .from("invite_tokens")
    .select("id, team_member_id, expires_at, used_at")
    .eq("token", token)
    .single();
  const tokenRow = tokenData as InviteTokenRow | null;

  if (tokenError || !tokenRow) {
    return { ok: false, status: 404, error: "Invalid invite token" };
  }

  if (tokenRow.used_at) {
    return { ok: false, status: 409, error: "Invite already used" };
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return { ok: false, status: 410, error: "Invite has expired" };
  }

  const { data: memberData, error: memberError } = await db
    .from("team_members")
    .select("id, owner_user_id, role, player_squad_id, status, email")
    .eq("id", tokenRow.team_member_id)
    .single();
  const member = memberData as InviteMemberRow | null;

  if (memberError || !member) {
    return { ok: false, status: 404, error: "Invite not found" };
  }

  if (!userEmail || normaliseEmail(member.email) !== userEmail) {
    return {
      ok: false,
      status: 403,
      error: "Sign in with the email address this invite was sent to",
    };
  }

  let resolvedPlayerSquadId = member.player_squad_id;
  if (member.role === "player") {
    const trimmedDisplayName = displayName?.trim() ?? "";
    if (playerSquadId) {
      resolvedPlayerSquadId = playerSquadId;
    } else if (trimmedDisplayName) {
      resolvedPlayerSquadId = await createAndLinkSquadPlayer({
        ownerUserId: member.owner_user_id,
        displayName: trimmedDisplayName,
        memberUserId: user.id,
      });
      if (!resolvedPlayerSquadId) {
        return { ok: false, status: 500, error: "Failed to create player profile" };
      }
    } else {
      return { ok: false, status: 400, error: "Choose your player profile first" };
    }
  }

  const { error: acceptError } = await db
    .from("team_members")
    .update({
      member_user_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      player_squad_id: resolvedPlayerSquadId,
    })
    .eq("id", member.id);

  if (acceptError) {
    return { ok: false, status: 500, error: "Failed to accept invite" };
  }

  await db
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (member.role === "player" && resolvedPlayerSquadId) {
    await linkSquadPlayerToUser({
      ownerUserId: member.owner_user_id,
      playerSquadId: resolvedPlayerSquadId,
      memberUserId: user.id,
    });
  }

  return {
    ok: true,
    role: member.role,
    ownerUserId: member.owner_user_id,
    playerSquadId: resolvedPlayerSquadId,
  };
}
