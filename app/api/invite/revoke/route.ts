import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unlinkSquadPlayerFromUser } from "@/lib/inviteServer";

type InviteMember = {
  id: string;
  team_id: string;
  role: "assistant_coach" | "player";
  player_squad_id: string | null;
};

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

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, team_id, role, player_squad_id")
    .eq("id", body.memberId)
    .single<InviteMember>();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke member" }, { status: 500 });
  }

  if (member.role === "player" && member.player_squad_id) {
    await unlinkSquadPlayerFromUser({
      teamId: member.team_id,
      playerSquadId: member.player_squad_id,
    });
  }

  return NextResponse.json({ success: true });
}
