import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const ctx = await getServerTeamContext();
  if (!ctx?.canManageTeam) {
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

  const supabase = await createClient();
  const { data: link, error } = await supabase
    .from("team_invite_links")
    .insert({
      team_id: ctx.teamId,
      owner_user_id: ctx.ownerUserId, // retained: NOT NULL column, deferred drop in Move 2.5
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
  const ctx = await getServerTeamContext();
  if (!ctx?.canManageTeam) {
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_invite_links")
    .update({ is_active: false })
    .eq("id", body.linkId);

  if (error) {
    return NextResponse.json({ error: "Failed to deactivate link" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
