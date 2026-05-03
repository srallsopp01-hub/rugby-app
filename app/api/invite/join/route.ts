import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkSquadPlayerToUser } from "@/lib/inviteServer";

type InviteLinkRow = {
  id: string;
  team_id: string | null;
  owner_user_id: string; // retained: NOT NULL, deferred drop in Move 2.5
  role: string;
  label: string | null;
  expires_at: string | null;
  is_active: boolean;
  pre_filled_email: string | null;
  pre_filled_squad_player_id: string | null;
  consumed_at: string | null;
};

type SquadPlayerRaw = {
  id: string;
  fullName: string;
  preferredName: string;
  primaryPosition: string;
  linkedUserId?: string;
};

function parseCoachLabel(label: string | null): { displayName: string | null; coachLabel: string | null; canManageTeam: boolean } {
  if (!label) return { displayName: null, coachLabel: null, canManageTeam: false };
  const [name, title, adminMarker] = label.split("|");
  return {
    displayName: name?.trim() || null,
    coachLabel: title?.trim() || null,
    canManageTeam: adminMarker?.trim() === "admin",
  };
}

// GET /api/invite/join?token=xxx — public validation, no auth required
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: link, error } = await supabase
    .from("team_invite_links")
    .select(
      "id, team_id, owner_user_id, role, label, expires_at, is_active, pre_filled_email, pre_filled_squad_player_id, consumed_at"
    )
    .eq("token", token)
    .single<InviteLinkRow>();

  if (error || !link) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: "This invite link has been deactivated" }, { status: 410 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  const preFilled = Boolean(link.pre_filled_email || link.pre_filled_squad_player_id);
  const consumed = Boolean(link.consumed_at);

  // Get team name and squad players from the teams table
  const { data: teamRow } = link.team_id
    ? await supabase
        .from("teams")
        .select("name, players")
        .eq("id", link.team_id)
        .maybeSingle()
    : { data: null };

  const rawPlayers = Array.isArray(teamRow?.players)
    ? (teamRow.players as SquadPlayerRaw[])
    : [];

  // Never expose linkedUserId to the client — only send a claimed boolean
  const squadPlayers = rawPlayers.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    preferredName: p.preferredName,
    primaryPosition: p.primaryPosition,
    claimed: Boolean(p.linkedUserId),
  }));

  return NextResponse.json({
    linkId: link.id,
    role: link.role,
    label: link.label,
    teamName: (teamRow as { name?: string } | null)?.name ?? null,
    preFilled,
    preFilledEmail: link.pre_filled_email,
    preFilledSquadPlayerId: link.pre_filled_squad_player_id,
    consumed,
    squadPlayers,
  });
}

// POST /api/invite/join — authenticated user claims a squad slot directly (no approval step)
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { token?: string; squadPlayerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, squadPlayerId } = body;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Fetch and validate the link via admin to bypass any RLS timing issues
  const { data: link, error: linkError } = await admin
    .from("team_invite_links")
    .select(
      "id, team_id, owner_user_id, role, label, is_active, expires_at, pre_filled_email, pre_filled_squad_player_id, consumed_at"
    )
    .eq("token", token)
    .single<InviteLinkRow>();

  if (linkError || !link) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: "This invite link has been deactivated" }, { status: 410 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  if (link.consumed_at) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 409 });
  }

  if (!link.team_id) {
    return NextResponse.json({ error: "Invalid invite link (no team)" }, { status: 400 });
  }

  const isPlayerRole = link.role === "player";

  // Player: squadPlayerId required
  if (isPlayerRole && !squadPlayerId) {
    return NextResponse.json({ error: "squadPlayerId is required" }, { status: 400 });
  }

  // Validate pre-fill constraints (player only)
  if (isPlayerRole && link.pre_filled_squad_player_id && link.pre_filled_squad_player_id !== squadPlayerId) {
    return NextResponse.json({ error: "This invite is for a different squad slot" }, { status: 403 });
  }

  if (link.pre_filled_email) {
    const userEmail = (user.email ?? "").toLowerCase().trim();
    const linkEmail = link.pre_filled_email.toLowerCase().trim();
    if (userEmail !== linkEmail) {
      return NextResponse.json(
        { error: "This invite is for a different email address" },
        { status: 403 }
      );
    }
  }

  // Player: verify slot is unclaimed
  if (isPlayerRole && squadPlayerId) {
    const { data: teamRow } = await admin
      .from("teams")
      .select("players")
      .eq("id", link.team_id)
      .single();

    const players = Array.isArray(teamRow?.players)
      ? (teamRow.players as SquadPlayerRaw[])
      : [];
    const targetPlayer = players.find((p) => p.id === squadPlayerId);

    if (!targetPlayer) {
      return NextResponse.json({ error: "Squad player not found" }, { status: 404 });
    }

    if (targetPlayer.linkedUserId) {
      return NextResponse.json(
        { error: "This player slot has already been claimed. Contact your coach if this is wrong." },
        { status: 409 }
      );
    }
  }

  // Check user not already an active member of this team (by user ID)
  const { data: existingByUserId } = await admin
    .from("team_members")
    .select("id, status")
    .eq("team_id", link.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingByUserId?.status === "active") {
    return NextResponse.json(
      { error: "You are already a member of this team", memberStatus: existingByUserId.status },
      { status: 409 }
    );
  }

  // Check for an existing row by email — old email invite rows have user_id=null
  // and would cause a unique(user_id, team_id) violation on update
  const normalizedEmail = (user.email ?? "").toLowerCase().trim();
  const { data: existingByEmail } = normalizedEmail
    ? await admin
        .from("team_members")
        .select("id, status")
        .eq("team_id", link.team_id)
        .eq("email", normalizedEmail)
        .is("user_id", null)
        .maybeSingle()
    : { data: null };

  const coachData = !isPlayerRole ? parseCoachLabel(link.label) : { displayName: null, coachLabel: null, canManageTeam: false };

  if (existingByEmail) {
    if (existingByEmail.status === "active") {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 409 }
      );
    }
    // Update the existing row (old invited email invite) to active
    const { error: updateError } = await admin
      .from("team_members")
      .update({
        user_id: user.id,
        status: "active",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        invite_link_id: link.id,
        player_squad_id: isPlayerRole ? (squadPlayerId ?? null) : null,
        display_name: coachData.displayName,
        coach_label: coachData.coachLabel,
        can_manage_team: coachData.canManageTeam,
      })
      .eq("id", existingByEmail.id);

    if (updateError) {
      console.error("Failed to update team member", JSON.stringify(updateError));
      return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
    }
  } else {
    // No existing row — insert fresh
    const insertPayload = {
      team_id: link.team_id,
      owner_user_id: link.owner_user_id, // retained: NOT NULL column, deferred drop in Move 2.5
      user_id: user.id,
      email: normalizedEmail || null,
      role: link.role,
      status: "active",
      accepted_at: new Date().toISOString(),
      invite_link_id: link.id,
      player_squad_id: isPlayerRole ? (squadPlayerId ?? null) : null,
      display_name: coachData.displayName,
      coach_label: coachData.coachLabel,
      can_manage_team: coachData.canManageTeam,
      invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await admin
      .from("team_members")
      .insert(insertPayload);

    if (insertError) {
      console.error("Failed to insert team member", JSON.stringify(insertError));
      return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
    }
  }

  // Link squad player's linkedUserId in the teams table (player only)
  if (isPlayerRole && squadPlayerId) {
    await linkSquadPlayerToUser({
      teamId: link.team_id,
      playerSquadId: squadPlayerId,
      memberUserId: user.id,
    });
  }

  // Mark single-use link as consumed so it can't be reused
  const isPrefilled = Boolean(
    link.pre_filled_email ||
    link.pre_filled_squad_player_id ||
    (!isPlayerRole && link.label)
  );
  if (isPrefilled) {
    await admin
      .from("team_invite_links")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", link.id);
  }

  return NextResponse.json({ success: true, teamId: link.team_id, role: link.role });
}
