import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MatchQuota = {
  used: number;
  limit: number | null;
  allowed: boolean;
  trialExpired: boolean;
  isTrial: boolean;
};

export async function GET(): Promise<NextResponse<MatchQuota | { error: string }>> {
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

  // Get the user's org
  const { data: membership } = await admin
    .from("organisation_members")
    .select("organisation_id, organisations(plan, status, trial_ends_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    // No org yet — allow (org will be created on first team setup)
    return NextResponse.json({ used: 0, limit: null, allowed: true, trialExpired: false, isTrial: false });
  }

  const orgRaw = membership.organisations;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { plan: string; status: string; trial_ends_at: string | null } | null;
  if (!org) {
    return NextResponse.json({ used: 0, limit: null, allowed: true, trialExpired: false, isTrial: false });
  }

  const isTrial = org.plan === "trial";
  if (!isTrial) {
    return NextResponse.json({ used: 0, limit: null, allowed: true, trialExpired: false, isTrial: false });
  }

  const trialExpired = org.trial_ends_at ? new Date(org.trial_ends_at) < new Date() : false;

  // Count matches across all teams in this org
  const { data: teams } = await admin
    .from("teams")
    .select("id")
    .eq("organisation_id", membership.organisation_id);

  const teamIds = (teams ?? []).map((t: { id: string }) => t.id);

  let used = 0;
  if (teamIds.length > 0) {
    const { count } = await admin
      .from("saved_matches")
      .select("id", { count: "exact", head: true })
      .in("team_id", teamIds);
    used = count ?? 0;
  }

  const limit = 2;
  const allowed = !trialExpired && used < limit;

  return NextResponse.json({ used, limit, allowed, trialExpired, isTrial });
}
