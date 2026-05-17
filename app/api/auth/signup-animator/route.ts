import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; password?: string };
  const { name = "", email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Create the user with email pre-confirmed so no verification email is sent.
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { coach_name: name.trim() },
  });

  if (userError || !userData.user) {
    const msg = userError?.message ?? "Failed to create account";
    // Surface a friendly message for duplicate email.
    if (msg.toLowerCase().includes("already")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const user = userData.user;
  const now = new Date().toISOString();

  // Create the organisation with the solo (free animator) plan — no Stripe, no trial timer.
  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({
      name: "My Plays",
      plan: "solo",
      status: "active",
      owner_user_id: user.id,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    // Clean up the auth user so signup can be retried.
    await admin.auth.admin.deleteUser(user.id);
    return NextResponse.json(
      { error: orgError?.message ?? "Failed to create organisation" },
      { status: 500 }
    );
  }

  // Add the user as club_admin of the org.
  await admin.from("organisation_members").insert({
    organisation_id: org.id,
    user_id: user.id,
    role: "club_admin",
    created_at: now,
  });

  // Create a default team named "My Plays".
  const { data: team, error: teamError } = await admin
    .from("teams")
    .insert({
      organisation_id: org.id,
      name: "My Plays",
      status: "active",
      created_by_user_id: user.id,
      coach_name: name.trim(),
      players: [],
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return NextResponse.json(
      { error: teamError?.message ?? "Failed to create team" },
      { status: 500 }
    );
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

  return NextResponse.json({ ok: true });
}
