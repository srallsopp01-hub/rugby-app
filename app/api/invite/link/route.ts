import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOwnerUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("team_members")
    .select("owner_user_id, can_manage_team")
    .eq("member_user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (membership && !membership.can_manage_team) return null;

  return membership?.owner_user_id ?? user.id;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const ownerUserId = await getOwnerUserId(supabase);
  if (!ownerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { role?: string; label?: string; email?: string; squadPlayerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const role = body.role === "assistant_coach" ? "assistant_coach" : "player";
  const label = body.label?.trim() || null;
  const preFillEmail = body.email?.toLowerCase().trim() || null;
  const preFillSquadPlayerId = body.squadPlayerId?.trim() || null;

  const token =
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  // Pre-filled single-use links expire in 30 days; reusable links never expire
  const isPrefilled = Boolean(preFillEmail || preFillSquadPlayerId);
  const expiresAt = isPrefilled
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: link, error } = await supabase
    .from("team_invite_links")
    .insert({
      owner_user_id: ownerUserId,
      token,
      role,
      label,
      pre_filled_email: preFillEmail,
      pre_filled_squad_player_id: preFillSquadPlayerId,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !link) {
    console.error("Failed to create invite link", error);
    return NextResponse.json({ error: "Failed to create invite link" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/invite/join?token=${token}`;
  return NextResponse.json({ url, token, linkId: link.id });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const ownerUserId = await getOwnerUserId(supabase);
  if (!ownerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { linkId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.linkId) {
    return NextResponse.json({ error: "linkId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_invite_links")
    .update({ is_active: false })
    .eq("id", body.linkId);

  if (error) {
    return NextResponse.json({ error: "Failed to deactivate link" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
