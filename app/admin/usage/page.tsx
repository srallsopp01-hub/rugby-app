import { createAdminClient } from "@/lib/supabase/admin";

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function bucketByMonth(items: { created_at: string }[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function UsagePage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="p-8 text-sm text-red-400">
        Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.
      </div>
    );
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    { count: totalOrgs },
    { count: totalTeams },
    { count: totalMatches },
    { count: totalMembers },
    { data: recentOrgs },
    { data: recentMatches },
  ] = await Promise.all([
    admin.from("organisations").select("id", { count: "exact", head: true }),
    admin.from("teams").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("saved_matches").select("id", { count: "exact", head: true }),
    admin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("organisations")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString()),
    admin
      .from("saved_matches")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString()),
  ]);

  // Build last 6 month labels
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const orgsByMonth = bucketByMonth(recentOrgs ?? []);
  const matchesByMonth = bucketByMonth(recentMatches ?? []);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Usage</h1>
        <p className="mt-1 text-sm text-muted">Platform-wide activity metrics.</p>
      </div>

      {/* Top totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total orgs", value: totalOrgs ?? 0 },
          { label: "Active teams", value: totalTeams ?? 0 },
          { label: "Active members", value: totalMembers ?? 0 },
          { label: "Saved matches", value: totalMatches ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground-strong">{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "New orgs per month", data: orgsByMonth },
          { title: "Matches saved per month", data: matchesByMonth },
        ].map(({ title, data }) => {
          const maxVal = Math.max(1, ...months.map((m) => data[m] ?? 0));
          return (
            <section
              key={title}
              className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]"
            >
              <h2 className="text-sm font-semibold text-foreground-strong mb-4">{title}</h2>
              <div className="flex flex-col gap-2">
                {months.map((m) => {
                  const count = data[m] ?? 0;
                  const pct = Math.round((count / maxVal) * 100);
                  const d = new Date(m + "-01");
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <span className="text-xs text-muted w-16 shrink-0">{monthLabel(d)}</span>
                      <div className="flex-1 h-2 rounded-full bg-panel-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground/40 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-4 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
