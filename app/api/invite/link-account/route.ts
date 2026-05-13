import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkSquadPlayerToUser } from "@/lib/inviteServer";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId, playerSquadId, email } = await req.json() as {
    teamId: string;
    playerSquadId: string;
    email: string;
  };

  if (!teamId || !playerSquadId || !email) {
    return NextResponse.json({ error: "teamId, playerSquadId, email required" }, { status: 400 });
  }

  // Caller must be head_coach or club_admin for this team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { data: orgMember } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isManager =
    membership?.role === "head_coach" ||
    membership?.role === "assistant_coach" ||
    orgMember !== null;

  if (!isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

  // Look up the target user by email
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 500 });
  const targetUser = users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());

  if (!targetUser) {
    return NextResponse.json(
      { error: `No account found for ${email}. Ask the player to sign up first.` },
      { status: 404 }
    );
  }

  // Check not already a member of this team
  const { data: existing } = await admin
    .from("team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  // If already an active member, skip creating a new row and just link the squad slot
  if (existing?.status === "active") {
    await linkSquadPlayerToUser({ teamId, playerSquadId, memberUserId: targetUser.id });
    return NextResponse.json({ ok: true });
  }

  if (existing) {
    return NextResponse.json(
      { error: "This account is already a member of this team." },
      { status: 409 }
    );
  }

  // Create team_members row
  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("team_members").insert({
    team_id: teamId,
    user_id: targetUser.id,
    email: email.trim().toLowerCase(),
    role: "player",
    status: "active",
    player_squad_id: playerSquadId,
    invited_by_user_id: user.id,
    invited_at: now,
    accepted_at: now,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Set linkedUserId on the squad player in teams.players JSONB
  await linkSquadPlayerToUser({ teamId, playerSquadId, memberUserId: targetUser.id });

  return NextResponse.json({ ok: true });
}
