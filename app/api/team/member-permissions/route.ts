import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";

export async function POST(req: Request) {
  const ctx = await getServerTeamContext();
  if (!ctx?.canManageTeam) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { memberId?: string; canManageTeam?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.memberId || typeof body.canManageTeam !== "boolean") {
    return NextResponse.json({ error: "memberId and canManageTeam are required" }, { status: 400 });
  }

  // Verify the target member belongs to the same team and is a coach
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, team_id, role, user_id")
    .eq("id", body.memberId)
    .eq("team_id", ctx.teamId)
    .single<{ id: string; team_id: string; role: string; user_id: string | null }>();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "player") {
    return NextResponse.json({ error: "Cannot grant admin to players" }, { status: 400 });
  }

  // Prevent removing your own permissions
  if (!body.canManageTeam && member.user_id === user.id) {
    return NextResponse.json({ error: "You cannot remove your own admin permissions" }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_members")
    .update({ can_manage_team: body.canManageTeam, updated_at: new Date().toISOString() })
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
