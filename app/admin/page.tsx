import { createAdminClient } from "@/lib/supabase/admin";

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400",
  trialing: "bg-amber-500/15 text-amber-300",
  past_due: "bg-red-500/15 text-red-400",
  canceled: "bg-muted-2/20 text-muted-2",
  archived: "bg-muted-2/20 text-muted-2",
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground-strong">{value}</p>
      {sub && <p className="text-xs text-muted-2 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminHomePage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="p-8 text-sm text-red-400">
        Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.
      </div>
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: orgs },
    { count: activeTeams },
    { count: coachSeats },
    { count: newOrgs },
  ] = await Promise.all([
    admin.from("organisations").select("status"),
    admin
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .in("role", ["head_coach", "assistant_coach"])
      .eq("status", "active"),
    admin
      .from("organisations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  const byStatus = (orgs ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalOrgs = (orgs ?? []).length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground-strong">Platform overview</h1>
        <p className="mt-1 text-sm text-muted">Live stats across all organisations and teams.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total orgs" value={totalOrgs} />
        <StatCard label="Active teams" value={activeTeams ?? 0} />
        <StatCard label="Coach seats in use" value={coachSeats ?? 0} />
        <StatCard label="New orgs (30 days)" value={newOrgs ?? 0} />
      </div>

      {/* Orgs by status */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground-strong mb-4">Orgs by status</h2>
        <div className="flex flex-wrap gap-3">
          {["active", "trialing", "past_due", "canceled", "archived"].map((s) => (
            <div
              key={s}
              className="flex items-center gap-2 rounded-xl bg-panel-2 px-4 py-3 min-w-[100px]"
            >
              <div className="flex-1">
                <p className="text-xs text-muted capitalize">{s.replace("_", " ")}</p>
                <p className="text-xl font-bold text-foreground-strong">{byStatus[s] ?? 0}</p>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOURS[s]?.split(" ")[0] ?? "bg-muted/30"}`}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
