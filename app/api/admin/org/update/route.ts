import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes((user.email ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orgId, plan, teamLimit, seatLimit, playerLimit } = body as {
    orgId: string;
    plan?: string;
    teamLimit?: number | null;
    seatLimit?: number | null;
    playerLimit?: number | null;
  };

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const validPlans = ["solo", "team_launch", "club_5", "org_custom"];
  if (plan !== undefined && !validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (plan !== undefined) updates.plan = plan;
  if ("teamLimit" in body) updates.team_limit = teamLimit ?? null;
  if ("seatLimit" in body) updates.seat_limit = seatLimit ?? null;
  if ("playerLimit" in body) updates.player_limit = playerLimit ?? null;

  const { error } = await adminClient
    .from("organisations")
    .update(updates)
    .eq("id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
