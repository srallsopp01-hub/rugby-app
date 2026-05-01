import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkSquadPlayerToUser } from "@/lib/inviteServer";

type InviteLinkRow = {
  id: string;
  owner_user_id: string;
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
      "id, owner_user_id, role, label, expires_at, is_active, pre_filled_email, pre_filled_squad_player_id, consumed_at"
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

  // Get team name and squad players — anon-readable per RLS (migration 20260429)
  const { data: squadProfile } = await supabase
    .from("squad_profiles")
    .select("team_name, players")
    .eq("user_id", link.owner_user_id)
    .maybeSingle();

  const rawPlayers = Array.isArray(squadProfile?.players)
    ? (squadProfile.players as SquadPlayerRaw[])
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
    teamName: (squadProfile as { team_name?: string } | null)?.team_name ?? null,
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
      "id, owner_user_id, role, is_active, expires_at, pre_filled_email, pre_filled_squad_player_id, consumed_at"
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
    const { data: profileRow } = await admin
      .from("squad_profiles")
      .select("players")
      .eq("user_id", link.owner_user_id)
      .single();

    const players = Array.isArray(profileRow?.players)
      ? (profileRow.players as SquadPlayerRaw[])
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

  // Check user not already a member of this team
  const { data: existing } = await admin
    .from("team_members")
    .select("id, status")
    .eq("owner_user_id", link.owner_user_id)
    .eq("member_user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You are already a member of this team", memberStatus: existing.status },
      { status: 409 }
    );
  }

  // Insert accepted team_members row (admin bypasses RLS insert policy which only allows pending_approval)
  const { error: insertError } = await admin.from("team_members").insert({
    owner_user_id: link.owner_user_id,
    member_user_id: user.id,
    email: user.email ?? "",
    role: link.role,
    status: "accepted",
    accepted_at: new Date().toISOString(),
    invite_link_id: link.id,
    player_squad_id: isPlayerRole ? (squadPlayerId ?? null) : null,
    invited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Failed to insert team member", JSON.stringify(insertError));
    return NextResponse.json({
      error: "Failed to join team",
      detail: insertError.message,
      code: (insertError as { code?: string }).code,
    }, { status: 500 });
  }

  // Link squad player's linkedUserId in the squad profile (player only)
  if (isPlayerRole && squadPlayerId) {
    await linkSquadPlayerToUser({
      ownerUserId: link.owner_user_id,
      playerSquadId: squadPlayerId,
      memberUserId: user.id,
    });
  }

  // Mark pre-filled single-use link as consumed so it can't be reused
  const isPrefilled = Boolean(link.pre_filled_email || link.pre_filled_squad_player_id);
  if (isPrefilled) {
    await admin
      .from("team_invite_links")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", link.id);
  }

  return NextResponse.json({ success: true, ownerUserId: link.owner_user_id, role: link.role });
}
