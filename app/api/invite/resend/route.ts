import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type InviteMember = {
  id: string;
  email: string;
  role: "assistant_coach" | "player";
  status: string;
  coach_label: string | null;
};

function formatCoachRoleLabel(label: string | null) {
  return `${label ? `${label} ` : ""}coach`;
}

function roleLabelFor(member: InviteMember) {
  return member.role === "assistant_coach"
    ? formatCoachRoleLabel(member.coach_label)
    : "player";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, email, role, status, coach_label")
    .eq("id", body.memberId)
    .single<InviteMember>();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.status !== "invited") {
    return NextResponse.json({ error: "Only pending email invites can be resent" }, { status: 400 });
  }

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("team_member_id", member.id)
    .is("used_at", null);

  const { error: tokenError } = await supabase.from("invite_tokens").insert({
    team_member_id: member.id,
    token,
    expires_at: expiresAt,
  });

  if (tokenError) {
    return NextResponse.json({ error: "Failed to generate invite token" }, { status: 500 });
  }

  if (!resend) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/accept?token=${token}`;
  const coachName = user.user_metadata?.coach_name as string | undefined;
  const roleLabel = roleLabelFor(member);

  const { error: emailError } = await resend.emails.send({
    from: "FYNL Whistle <noreply@fynlwhistle.com>",
    to: member.email,
    subject: `Reminder: you've been invited to join ${coachName ? `${coachName}'s` : "a"} FYNL Whistle team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">You're invited</h2>
        <p>${coachName ?? "A coach"} has invited you to join their FYNL Whistle team as an <strong>${roleLabel}</strong>.</p>
        <p>Click the link below to accept your invite and create your account:</p>
        <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#ff5a1f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Accept invite
        </a>
        <p style="color:#888;font-size:12px">This link expires in 7 days. If you didn't expect this, you can ignore this email.</p>
      </div>
    `,
  });

  if (emailError) {
    console.error("Failed to resend invite email", emailError);
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
