import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkSquadPlayerToUser, createAndLinkSquadPlayer } from "@/lib/inviteServer";
import { getServerTeamContext } from "@/lib/serverTeamContext";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { memberId?: string; existingPlayerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("id, team_id, user_id, role, player_squad_id, status, requested_name, requested_position")
    .eq("id", body.memberId)
    .eq("status", "pending")
    .single<{
      id: string;
      team_id: string;
      user_id: string | null;
      role: "assistant_coach" | "player";
      player_squad_id: string | null;
      status: string;
      requested_name: string | null;
      requested_position: string | null;
    }>();

  if (fetchError || !member) {
    return NextResponse.json({ error: "Member not found or not pending" }, { status: 404 });
  }

  const ctx = await getServerTeamContext();
  if (!ctx || ctx.teamId !== member.team_id || !ctx.canManageTeam) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  let resolvedPlayerSquadId: string | null = member.player_squad_id;

  // existingPlayerId provided = coach mapped this user to an existing squad player
  if (body.existingPlayerId && member.user_id) {
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    resolvedPlayerSquadId = body.existingPlayerId;
    await admin
      .from("team_members")
      .update({ player_squad_id: body.existingPlayerId })
      .eq("id", member.id);
    await linkSquadPlayerToUser({
      teamId: member.team_id,
      playerSquadId: body.existingPlayerId,
      memberUserId: member.user_id,
    });
  } else if (member.requested_name && member.user_id) {
    // requested_name present = user joined via link with no pre-assigned slot; create their player
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const newPlayerId = await createAndLinkSquadPlayer({
      teamId: member.team_id,
      displayName: member.requested_name,
      memberUserId: member.user_id,
      position: member.requested_position ?? undefined,
    });
    if (!newPlayerId) {
      return NextResponse.json({ error: "Failed to create squad player" }, { status: 500 });
    }
    resolvedPlayerSquadId = newPlayerId;

    await admin
      .from("team_members")
      .update({ player_squad_id: newPlayerId })
      .eq("id", member.id);
  }

  const { error: updateError } = await supabase
    .from("team_members")
    .update({
      status: "active",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to approve member" }, { status: 500 });
  }

  // Link the squad player slot for users who joined with a pre-assigned slot (no requested_name, no existingPlayerId)
  if (
    !body.existingPlayerId &&
    !member.requested_name &&
    member.role === "player" &&
    resolvedPlayerSquadId &&
    member.user_id
  ) {
    await linkSquadPlayerToUser({
      teamId: member.team_id,
      playerSquadId: resolvedPlayerSquadId,
      memberUserId: member.user_id,
    });
  }

  return NextResponse.json({ success: true });
}
