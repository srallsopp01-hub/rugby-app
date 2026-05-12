import { createAdminClient } from "@/lib/supabase/admin";
import OrgTable, { OrgRow } from "./OrgTable";

export default async function OrganisationsPage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="p-8 text-sm text-red-400">
        Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.
      </div>
    );
  }

  const { data: orgs } = await admin
    .from("organisations")
    .select(
      "id, name, plan, status, team_limit, seat_limit, player_limit, trial_ends_at, current_period_end, created_at, owner_user_id, stripe_customer_id"
    )
    .order("created_at", { ascending: false });

  if (!orgs || orgs.length === 0) {
    return (
      <div className="p-8 max-w-5xl">
        <h1 className="text-2xl font-semibold text-foreground-strong mb-1">Organisations</h1>
        <p className="text-sm text-muted">No organisations yet.</p>
      </div>
    );
  }

  const orgIds = orgs.map((o) => o.id);

  const [{ data: teams }, { data: orgMembers }, { data: teamMembersRaw }, authUsersResult] =
    await Promise.all([
      admin
        .from("teams")
        .select("id, name, organisation_id")
        .in("organisation_id", orgIds)
        .eq("status", "active"),
      admin
        .from("organisation_members")
        .select("organisation_id, id")
        .in("organisation_id", orgIds),
      admin
        .from("team_members")
        .select("team_id, role, status")
        .in("role", ["head_coach", "assistant_coach"])
        .eq("status", "active"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  // Build userId → email map from auth users
  const emailByUserId = new Map<string, string>();
  for (const u of authUsersResult.data?.users ?? []) {
    if (u.email) emailByUserId.set(u.id, u.email);
  }

  const teamsByOrg = (teams ?? []).reduce<Record<string, { id: string; name: string }[]>>(
    (acc, t) => {
      if (!acc[t.organisation_id]) acc[t.organisation_id] = [];
      acc[t.organisation_id].push({ id: t.id, name: t.name });
      return acc;
    },
    {}
  );

  const orgAdminCount = (orgMembers ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.organisation_id] = (acc[m.organisation_id] ?? 0) + 1;
    return acc;
  }, {});

  const teamIds = new Set((teams ?? []).map((t) => t.id));
  const coachByTeam = (teamMembersRaw ?? []).reduce<Record<string, number>>((acc, m) => {
    if (teamIds.has(m.team_id)) {
      acc[m.team_id] = (acc[m.team_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  const coachByOrg: Record<string, number> = {};
  for (const t of teams ?? []) {
    coachByOrg[t.organisation_id] =
      (coachByOrg[t.organisation_id] ?? 0) + (coachByTeam[t.id] ?? 0);
  }

  const rows: OrgRow[] = orgs.map((org) => ({
    ...org,
    teamCount: (teamsByOrg[org.id] ?? []).length,
    seatCount: (coachByOrg[org.id] ?? 0) + (orgAdminCount[org.id] ?? 0),
    teams: teamsByOrg[org.id] ?? [],
    ownerEmail: org.owner_user_id ? (emailByUserId.get(org.owner_user_id) ?? null) : null,
    stripeCustomerId: org.stripe_customer_id ?? null,
  }));

  const stripeTestMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Organisations</h1>
        <p className="mt-1 text-sm text-muted">
          {rows.length} organisation{rows.length !== 1 ? "s" : ""} — click a row to see teams,
          Edit to change plan or limits.
        </p>
      </div>

      <OrgTable initialOrgs={rows} stripeTestMode={stripeTestMode} />
    </div>
  );
}
