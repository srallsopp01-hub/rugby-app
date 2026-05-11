import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo",
  team_launch: "Team Launch",
  club_5: "Club 5",
  org_custom: "Custom",
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  trialing: { label: "Trialing", className: "bg-amber-500/15 text-amber-300" },
  active: { label: "Active", className: "bg-green-500/15 text-green-400" },
  past_due: { label: "Past due", className: "bg-red-500/15 text-red-400" },
  canceled: { label: "Canceled", className: "bg-muted-2/20 text-muted-2" },
  archived: { label: "Archived", className: "bg-muted-2/20 text-muted-2" },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function BillingPage() {
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
      "id, name, plan, status, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id"
    )
    .order("created_at", { ascending: false });

  const allOrgs = orgs ?? [];

  // Counts by plan
  const byPlan = allOrgs.reduce<Record<string, number>>((acc, o) => {
    const p = o.plan ?? "unknown";
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});

  const trialing = allOrgs
    .filter((o) => o.status === "trialing")
    .sort((a, b) => new Date(a.trial_ends_at ?? "").getTime() - new Date(b.trial_ends_at ?? "").getTime());

  const pastDue = allOrgs.filter((o) => o.status === "past_due");

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground-strong">Billing</h1>
        <p className="mt-1 text-sm text-muted">Subscription status across all organisations.</p>
      </div>

      {/* Plan breakdown */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)] mb-4">
        <h2 className="text-sm font-semibold text-foreground-strong mb-4">Orgs by plan</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PLAN_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-xl bg-panel-2 px-4 py-3 min-w-[100px]">
              <p className="text-xs text-muted mb-0.5">{label}</p>
              <p className="text-2xl font-bold text-foreground-strong">{byPlan[key] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trialing — expiring soonest first */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)] mb-4">
        <h2 className="text-sm font-semibold text-foreground-strong mb-1">
          Trialing ({trialing.length})
        </h2>
        <p className="text-xs text-muted mb-4">Sorted by trial end — soonest first.</p>
        {trialing.length === 0 ? (
          <p className="text-sm text-muted">No trialing orgs.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {trialing.map((org) => {
              const days = daysUntil(org.trial_ends_at);
              const urgent = days !== null && days <= 3;
              return (
                <div
                  key={org.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-panel-2 text-sm"
                >
                  <span className="font-medium text-foreground-strong truncate">{org.name}</span>
                  <span className={`text-xs ml-4 shrink-0 ${urgent ? "text-red-400 font-semibold" : "text-muted"}`}>
                    {days !== null ? (days <= 0 ? "Expired" : `${days}d left`) : "—"} · ends {formatDate(org.trial_ends_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past due */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground-strong mb-4">
          Past due ({pastDue.length})
        </h2>
        {pastDue.length === 0 ? (
          <p className="text-sm text-muted">No past-due accounts.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pastDue.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-500/10 text-sm"
              >
                <span className="font-medium text-foreground-strong truncate">{org.name}</span>
                <span className="text-xs text-red-400 ml-4 shrink-0">
                  {PLAN_LABELS[org.plan] ?? org.plan} · due {formatDate(org.current_period_end)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
