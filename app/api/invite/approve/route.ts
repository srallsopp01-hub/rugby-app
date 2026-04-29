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

  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // Fetch the member row — RLS ensures coach can only touch their own team
  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("id, owner_user_id, member_user_id, role, player_squad_id, status")
    .eq("id", body.memberId)
    .eq("status", "pending_approval")
    .single();

  if (fetchError || !member) {
    return NextResponse.json({ error: "Member not found or not pending approval" }, { status: 404 });
  }

  // Verify caller can manage this team
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

  if (member.role === "player" && member.player_squad_id && member.member_user_id) {
    await linkSquadPlayerToUser({
      ownerUserId: member.owner_user_id,
      playerSquadId: member.player_squad_id,
      memberUserId: member.member_user_id,
    });
  }

  return NextResponse.json({ success: true });
}
