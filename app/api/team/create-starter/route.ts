import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Creates a personal org + team for a coach who signed up directly (not via org invite).
// Called from the coach layout when hasNoTeams = true and the user is not a club_admin.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

  // Guard: if the user already has a team, don't create another one.
  const { data: existing } = await admin
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, teamId: existing.team_id });

  const now = new Date().toISOString();
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create a personal organisation for this coach.
  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({
      name: "My Club",
      plan: "trial",
      status: "active",
      owner_user_id: user.id,
      trial_ends_at: trialEnd,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Failed to create organisation" }, { status: 500 });
  }

  // Add as club_admin of the org.
  await admin.from("organisation_members").insert({
    organisation_id: org.id,
    user_id: user.id,
    role: "club_admin",
    created_at: now,
  });

  // Create the team.
  const { data: team, error: teamError } = await admin
    .from("teams")
    .insert({
      organisation_id: org.id,
      name: "My Team",
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

  // Add as head_coach of the team.
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
