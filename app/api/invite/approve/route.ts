import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkSquadPlayerToUser, createAndLinkSquadPlayer } from "@/lib/inviteServer";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { memberId?: string };
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
    .select("id, owner_user_id, member_user_id, role, player_squad_id, status, requested_name, requested_position")
    .eq("id", body.memberId)
    .in("status", ["pending_approval", "notify_request"])
    .single();

  if (fetchError || !member) {
    return NextResponse.json({ error: "Member not found or not pending" }, { status: 404 });
  }

  const ownerIsUser = member.owner_user_id === user.id;
  if (!ownerIsUser) {
    const { data: callerMembership } = await supabase
      .from("team_members")
      .select("can_manage_team")
      .eq("owner_user_id", member.owner_user_id)
      .eq("member_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!callerMembership?.can_manage_team) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const admin = createAdminClient();

  let resolvedPlayerSquadId: string | null = member.player_squad_id;

  // For notify_request: create a new squad player from the requested name/position
  if (member.status === "notify_request" && member.member_user_id && member.requested_name) {
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const newPlayerId = await createAndLinkSquadPlayer({
      ownerUserId: member.owner_user_id,
      displayName: member.requested_name as string,
      memberUserId: member.member_user_id as string,
      position: (member.requested_position as string | null) ?? undefined,
    });
    if (!newPlayerId) {
      return NextResponse.json({ error: "Failed to create squad player" }, { status: 500 });
    }
    resolvedPlayerSquadId = newPlayerId;

    if (admin) {
      await admin
        .from("team_members")
        .update({ player_squad_id: newPlayerId })
        .eq("id", member.id);
    }
  }

  const { error: updateError } = await supabase
    .from("team_members")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to approve member" }, { status: 500 });
  }

  // For pending_approval rows that already have a player_squad_id and member_user_id
  if (
    member.status === "pending_approval" &&
    member.role === "player" &&
    resolvedPlayerSquadId &&
    member.member_user_id
  ) {
    await linkSquadPlayerToUser({
      ownerUserId: member.owner_user_id,
      playerSquadId: resolvedPlayerSquadId,
      memberUserId: member.member_user_id as string,
    });
  }

  return NextResponse.json({ success: true });
}
