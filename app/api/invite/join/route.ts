import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type InviteLinkRow = {
  id: string;
  owner_user_id: string;
  role: string;
  label: string | null;
  expires_at: string | null;
  is_active: boolean;
};

// GET /api/invite/join?token=xxx — public validation, no auth required
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: link, error } = await supabase
    .from("team_invite_links")
    .select("id, owner_user_id, role, label, expires_at, is_active")
    .eq("token", token)
    .single<InviteLinkRow>();

  if (error || !link) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: "This invite link has been deactivated" }, { status: 410 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  // Get team name from squad_profiles
  const { data: squadProfile } = await supabase
    .from("squad_profiles")
    .select("team_name")
    .eq("user_id", link.owner_user_id)
    .maybeSingle();

  return NextResponse.json({
    linkId: link.id,
    role: link.role,
    label: link.label,
    teamName: (squadProfile as { team_name?: string } | null)?.team_name ?? null,
  });
}

// POST /api/invite/join — authenticated, submit squad selection
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: string; playerSquadId?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, playerSquadId, displayName } = body;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const { data: link, error: linkError } = await supabase
    .from("team_invite_links")
    .select("id, owner_user_id, role, is_active, expires_at")
    .eq("token", token)
    .single<InviteLinkRow>();

  if (linkError || !link) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: "This invite link has been deactivated" }, { status: 410 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  // Check if user already has a pending/accepted membership for this team
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("owner_user_id", link.owner_user_id)
    .eq("member_user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a membership for this team", status: existing.status },
      { status: 409 }
    );
  }

  const { error: insertError } = await supabase.from("team_members").insert({
    owner_user_id: link.owner_user_id,
    member_user_id: user.id,
    email: user.email ?? "",
    role: link.role,
    status: "pending_approval",
    invite_link_id: link.id,
    player_squad_id: playerSquadId ?? null,
    display_name: displayName ?? null,
    invited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Failed to insert team member via link", insertError);
    return NextResponse.json({ error: "Failed to submit join request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
