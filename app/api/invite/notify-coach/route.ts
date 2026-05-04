import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type InviteLinkRow = {
  id: string;
  team_id: string | null;
  owner_user_id: string;
  is_active: boolean;
  expires_at: string | null;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { token?: string; requestedName?: string; requestedPosition?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, requestedName, requestedPosition } = body;
  if (!token || !requestedName?.trim()) {
    return NextResponse.json({ error: "token and requestedName are required" }, { status: 400 });
  }

  const { data: link, error: linkError } = await supabase
    .from("team_invite_links")
    .select("id, team_id, owner_user_id, is_active, expires_at")
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

  if (!link.team_id) {
    return NextResponse.json({ error: "Invalid invite link (no team)" }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("team_members")
    .select("id, status")
    .eq("team_id", link.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a membership or request for this team", memberStatus: existing.status },
      { status: 409 }
    );
  }

  const { error: insertError } = await admin.from("team_members").insert({
    team_id: link.team_id,
    user_id: user.id,
    email: user.email ?? null,
    role: "player",
    status: "pending",
    requested_name: requestedName.trim(),
    requested_position: requestedPosition?.trim() || null,
    invite_link_id: link.id,
    invited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Failed to create notify request", insertError);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
