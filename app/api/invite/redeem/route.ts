import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkSquadPlayerToUser } from "@/lib/inviteServer";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = user.email?.toLowerCase().trim();

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Look up and validate the token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("invite_tokens")
    .select("id, team_member_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  // Get the team_members row
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, owner_user_id, role, player_squad_id, status, email")
    .eq("id", tokenRow.team_member_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (!userEmail || member.email.toLowerCase().trim() !== userEmail) {
    return NextResponse.json(
      { error: "Sign in with the email address this invite was sent to" },
      { status: 403 }
    );
  }

  // Accept the invite
  const { error: acceptError } = await supabase
    .from("team_members")
    .update({
      member_user_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (acceptError) {
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }

  // Mark token as used
  await supabase
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  // If player role: update the SquadPlayer.linkedUserId in the coach's squad profile
  if (member.role === "player" && member.player_squad_id) {
    await linkSquadPlayerToUser({
      ownerUserId: member.owner_user_id,
      playerSquadId: member.player_squad_id,
      memberUserId: user.id,
    });
  }

  return NextResponse.json({
    success: true,
    role: member.role,
    ownerUserId: member.owner_user_id,
    playerSquadId: member.player_squad_id ?? null,
  });
}
