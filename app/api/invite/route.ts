import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function formatCoachRoleLabel(label: string | null, canManageTeam: boolean) {
  if (!canManageTeam) return `${label ? `${label} ` : ""}coach`;
  if (!label || label.toLowerCase() === "head") return "head coach";
  return `${label} head coach`;
}

function isMissingInviteColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("coach_label") ||
    message.includes("can_manage_team") ||
    message.includes("schema cache")
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("owner_user_id, can_manage_team")
    .eq("member_user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  let resolvedMembership = membership;
  if (membershipError) {
    const { data: fallbackMembership } = await supabase
      .from("team_members")
      .select("owner_user_id")
      .eq("member_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();
    resolvedMembership = fallbackMembership
      ? { ...fallbackMembership, can_manage_team: false }
      : null;
  }

  if (resolvedMembership && !resolvedMembership.can_manage_team) {
    return NextResponse.json({ error: "Only head coaches can send invites" }, { status: 403 });
  }

  const ownerUserId = resolvedMembership?.owner_user_id ?? user.id;

  let body: {
    email?: string;
    role?: string;
    playerSquadId?: string;
    coachLabel?: string;
    canManageTeam?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, playerSquadId } = body;
  const role = body.role === "coach" ? "assistant_coach" : body.role;
  const coachLabel = body.coachLabel?.trim() || null;
  const canManageTeam = role === "assistant_coach" && Boolean(body.canManageTeam);

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  if (role !== "assistant_coach" && role !== "player") {
    return NextResponse.json({ error: "role must be assistant_coach or player" }, { status: 400 });
  }

  if (role === "player" && !playerSquadId) {
    return NextResponse.json({ error: "playerSquadId required for player invites" }, { status: 400 });
  }

  const baseInvitePayload = {
    owner_user_id: ownerUserId,
    email: email.toLowerCase().trim(),
    role,
    player_squad_id: playerSquadId ?? null,
    status: "pending",
    invited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const fullInvitePayload = {
    ...baseInvitePayload,
    coach_label: role === "assistant_coach" ? coachLabel : null,
    can_manage_team: canManageTeam,
  };

  let usedLegacyInvitePayload = false;
  let memberResult = await supabase
    .from("team_members")
    .upsert(fullInvitePayload, { onConflict: "owner_user_id,email" })
    .select("id")
    .single();

  if (isMissingInviteColumnError(memberResult.error)) {
    console.warn("Invite creation falling back to legacy team_members payload", memberResult.error);
    usedLegacyInvitePayload = true;
    memberResult = await supabase
      .from("team_members")
      .upsert(baseInvitePayload, { onConflict: "owner_user_id,email" })
      .select("id")
      .single();
  }

  const { data: member, error: memberError } = memberResult;
  if (memberError || !member) {
    console.error("Failed to create invite", memberError);
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
  const roleLabel =
    role === "assistant_coach"
      ? formatCoachRoleLabel(coachLabel, canManageTeam)
      : "player";

  if (!resend) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  const { error: emailError } = await resend.emails.send({
    from: "FYNL Whistle <noreply@fynlwhistle.com>",
    to: email,
    subject: `You've been invited to join ${coachName ? `${coachName}'s` : "a"} FYNL Whistle team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">You've been invited</h2>
        <p>${coachName ?? "A coach"} has invited you to join their FYNL Whistle team as an <strong>${roleLabel}</strong>.</p>
        <p>Click the link below to accept your invite and create your account:</p>
        <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#ed6a1f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Accept invite
        </a>
        <p style="color:#888;font-size:12px">This link expires in 7 days. If you didn't expect this, you can ignore this email.</p>
      </div>
    `,
  });

  if (emailError) {
    console.error("Failed to send invite email", emailError);
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    warning: usedLegacyInvitePayload
      ? "Invite sent, but coach labels/head permissions need the latest Supabase migration."
      : undefined,
  });
}
