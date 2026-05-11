import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organisationId, name } = await req.json() as {
    organisationId: string;
    name: string;
  };

  if (!organisationId || !name?.trim()) {
    return NextResponse.json({ error: "organisationId and name required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

  // Verify caller is club_admin for this org
  const { data: orgMember } = await admin
    .from("organisation_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("organisation_id", organisationId)
    .eq("role", "club_admin")
    .maybeSingle();

  if (!orgMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Create the team
  const { data: team, error: teamError } = await admin
    .from("teams")
    .insert({
      organisation_id: organisationId,
      name: name.trim(),
      status: "active",
      created_by_user_id: user.id,
      coach_name: "",
      players: [],
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return NextResponse.json({ error: teamError?.message ?? "Failed to create team" }, { status: 500 });
  }

  // Add the creator as head_coach so they can access the team immediately
  await admin.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "head_coach",
    status: "active",
    invited_at: now,
    accepted_at: now,
  });

  return NextResponse.json({ ok: true, teamId: team.id });
}
