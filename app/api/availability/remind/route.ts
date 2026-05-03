import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerTeamContext } from "@/lib/serverTeamContext";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  const ctx = await getServerTeamContext();
  if (!ctx?.canManageTeam) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { fixtureId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.fixtureId) return NextResponse.json({ error: "fixtureId is required" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

  const { data: teamRow } = await admin
    .from("teams")
    .select("fixtures, players, availability_responses")
    .eq("id", ctx.teamId)
    .maybeSingle();

  if (!teamRow) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  type AnyRecord = Record<string, unknown>;
  const fixtures = (teamRow.fixtures as AnyRecord[]) ?? [];
  const fixture = fixtures.find((f) => f.id === body.fixtureId);
  if (!fixture) return NextResponse.json({ error: "Fixture not found" }, { status: 404 });

  const allPlayers = (teamRow.players as AnyRecord[]) ?? [];
  const activePlayers = allPlayers.filter((p) => p.status === "active");
  const responses = ((teamRow.availability_responses as AnyRecord[]) ?? []).filter(
    (r) => r.fixtureId === body.fixtureId
  );
  const respondedIds = new Set(responses.map((r) => r.playerId));
  const pendingPlayers = activePlayers.filter((p) => !respondedIds.has(p.id));

  if (pendingPlayers.length === 0) return NextResponse.json({ sent: 0, skipped: 0 });

  if (!resend) return NextResponse.json({ error: "Email service not configured" }, { status: 500 });

  const pendingIds = pendingPlayers.map((p) => p.id as string);
  const { data: members } = await admin
    .from("team_members")
    .select("player_squad_id, email")
    .eq("team_id", ctx.teamId)
    .eq("status", "active")
    .in("player_squad_id", pendingIds);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fynlwhistle.com";
  const fixtureDate = new Date((fixture.date as string) + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const subject = `Availability needed: vs ${fixture.opponent} on ${fixtureDate}`;

  let sent = 0;
  let skipped = 0;

  for (const player of pendingPlayers) {
    const member = members?.find((m) => m.player_squad_id === player.id);
    if (!member?.email) { skipped++; continue; }

    const name = (player.preferredName as string) || (player.fullName as string) || "there";

    const { error } = await resend.emails.send({
      from: "FYNL Whistle <noreply@fynlwhistle.com>",
      to: member.email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">Availability needed</h2>
          <p>Hey ${name}, your coach needs to know if you can make it to:</p>
          <p style="font-size:18px;font-weight:600;margin:16px 0">vs ${fixture.opponent} &mdash; ${fixtureDate}</p>
          <p>Take 5 seconds to let them know:</p>
          <a href="${appUrl}/player/availability" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#ed6a1f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Update my availability
          </a>
          <p style="color:#888;font-size:12px">You&apos;re receiving this because you&apos;re part of a FYNL Whistle team.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[availability/remind] failed to send to", member.email, error);
      skipped++;
    } else {
      sent++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
