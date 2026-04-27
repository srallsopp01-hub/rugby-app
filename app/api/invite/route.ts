import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; role?: string; playerSquadId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, role, playerSquadId } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  if (role !== "assistant_coach" && role !== "player") {
    return NextResponse.json({ error: "role must be assistant_coach or player" }, { status: 400 });
  }

  if (role === "player" && !playerSquadId) {
    return NextResponse.json({ error: "playerSquadId required for player invites" }, { status: 400 });
  }

  // Upsert team_members row
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .upsert(
      {
        owner_user_id: user.id,
        email: email.toLowerCase().trim(),
        role,
        player_squad_id: playerSquadId ?? null,
        status: "pending",
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_user_id,email" }
    )
    .select("id")
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  // Generate invite token
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: tokenError } = await supabase.from("invite_tokens").insert({
    team_member_id: member.id,
    token,
    expires_at: expiresAt,
  });

  if (tokenError) {
    return NextResponse.json({ error: "Failed to generate invite token" }, { status: 500 });
  }

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/accept?token=${token}`;
  const coachName = user.user_metadata?.coach_name as string | undefined;
  const roleLabel = role === "assistant_coach" ? "assistant coach" : "player";

  if (resend) {
    await resend.emails.send({
      from: "RugbyCoach <noreply@rugbycoach.app>",
      to: email,
      subject: `You've been invited to join ${coachName ? `${coachName}'s` : "a"} RugbyCoach team`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">You've been invited</h2>
          <p>${coachName ?? "A coach"} has invited you to join their RugbyCoach team as an <strong>${roleLabel}</strong>.</p>
          <p>Click the link below to accept your invite and create your account:</p>
          <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#ed6a1f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Accept invite
          </a>
          <p style="color:#888;font-size:12px">This link expires in 7 days. If you didn't expect this, you can ignore this email.</p>
        </div>
      `,
    });
  }

  return NextResponse.json({ success: true });
}
