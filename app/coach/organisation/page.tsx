import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CreateTeamButton from "./CreateTeamButton";
import { StatusPill } from "@/app/components/StatusPill";
import { PageHeader } from "@/app/components/PageHeader";
import type { ComponentProps } from "react";

type StatusPillVariant = ComponentProps<typeof StatusPill>["variant"];

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo",
  team_launch: "Team Launch",
  club_5: "Club 5",
  org_custom: "Custom",
};

const STATUS_INFO: Record<string, { label: string; variant: StatusPillVariant }> = {
  trialing: { label: "Trialing", variant: "warning" },
  active: { label: "Active", variant: "success" },
  past_due: { label: "Past due", variant: "danger" },
  canceled: { label: "Canceled", variant: "neutral" },
  archived: { label: "Archived", variant: "neutral" },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function OrganisationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use admin client here to bypass any RLS/cookie edge-cases on the deployed app.
  const adminClient = createAdminClient();
  const { data: orgMember } = adminClient
    ? await adminClient
        .from("organisation_members")
        .select("organisation_id")
        .eq("user_id", user.id)
        .eq("role", "club_admin")
        .maybeSingle()
    : { data: null };
  if (!orgMember) redirect("/coach");

  const orgId = orgMember.organisation_id;

  // Use admin client for all data fetches on this page — same RLS bypass as the membership check.
  const db = adminClient ?? supabase;

  const [{ data: org }, { data: teams }] = await Promise.all([
    db
      .from("organisations")
      .select("name, plan, status, trial_ends_at, current_period_end")
      .eq("id", orgId)
      .single(),
    db
      .from("teams")
      .select("id, name")
      .eq("organisation_id", orgId)
      .eq("status", "active"),
  ]);

  const teamIds = (teams ?? []).map((t) => t.id);

  const [{ count: coachMemberCount }, { count: adminCount }] = await Promise.all([
    db
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
      .in("role", ["head_coach", "assistant_coach"])
      .eq("status", "active"),
    db
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId),
  ]);

  const totalSeats = (coachMemberCount ?? 0) + (adminCount ?? 0);

  const status = org?.status ?? "active";
  const statusInfo = STATUS_INFO[status] ?? STATUS_INFO.active;
  const billingDate =
    status === "trialing" ? org?.trial_ends_at : org?.current_period_end;
  const billingLabel = status === "trialing" ? "Trial ends" : "Renews";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <PageHeader
        title="Organisation"
        subtitle="Billing overview and plan details."
      />

      {/* Overview tile */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)] mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted mb-1">Organisation name</p>
            <p className="text-lg font-semibold text-foreground-strong">{org?.name ?? "—"}</p>
          </div>
          <StatusPill variant={statusInfo.variant} size="md" className="shrink-0 mt-0.5">
            {statusInfo.label}
          </StatusPill>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-muted mb-0.5">Plan</p>
            <p className="text-sm font-medium text-foreground">
              {PLAN_LABELS[org?.plan ?? ""] ?? org?.plan ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">{billingLabel}</p>
            <p className="text-sm font-medium text-foreground">{formatDate(billingDate)}</p>
          </div>
        </div>
      </section>

      {/* Usage tile */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)] mb-4">
        <h2 className="text-sm font-semibold text-foreground-strong mb-4">Usage</h2>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-muted mb-0.5">Active teams</p>
            <p className="text-2xl font-bold text-foreground-strong">{teams?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Coach seats used</p>
            <p className="text-2xl font-bold text-foreground-strong">{totalSeats}</p>
          </div>
        </div>
      </section>

      {/* Teams list + create */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground-strong">Teams</h2>
          <CreateTeamButton organisationId={orgId} />
        </div>
        {teams && teams.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {teams.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-2 text-sm text-foreground"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                {t.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No active teams yet.</p>
        )}
      </section>
    </div>
  );
}
