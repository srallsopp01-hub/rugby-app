"use client";

import { useState } from "react";
import OrgEditModal from "./OrgEditModal";

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

export interface OrgRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  team_limit: number | null;
  seat_limit: number | null;
  player_limit: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  teamCount: number;
  seatCount: number;
  teams: { id: string; name: string }[];
}

export default function OrgTable({ initialOrgs }: { initialOrgs: OrgRow[] }) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [editOrg, setEditOrg] = useState<OrgRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleSaved() {
    setEditOrg(null);
    window.location.reload();
  }

  return (
    <>
      {editOrg && (
        <OrgEditModal
          org={editOrg}
          onClose={() => setEditOrg(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="rounded-2xl border border-border bg-panel overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 border-b border-border bg-panel-2">
          {["Organisation", "Plan", "Status", "Teams", "Seats", "Billing date", ""].map((h) => (
            <span key={h} className="text-xs font-medium text-muted">
              {h}
            </span>
          ))}
        </div>

        {orgs.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted">No organisations found.</div>
        )}

        {orgs.map((org) => {
          const statusInfo = STATUS_STYLES[org.status] ?? STATUS_STYLES.active;
          const billingDate =
            org.status === "trialing" ? org.trial_ends_at : org.current_period_end;
          const isExpanded = expanded === org.id;

          return (
            <div key={org.id} className="border-b border-border last:border-0">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_80px] gap-4 items-center px-4 py-3 hover:bg-panel-2/50 transition-colors">
                <button
                  onClick={() => setExpanded(isExpanded ? null : org.id)}
                  className="text-left text-sm font-medium text-foreground-strong hover:text-foreground truncate"
                >
                  {org.name}
                </button>
                <span className="text-sm text-foreground">
                  {PLAN_LABELS[org.plan] ?? org.plan ?? "—"}
                </span>
                <span
                  className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
                <span className="text-sm text-foreground">{org.teamCount}</span>
                <span className="text-sm text-foreground">{org.seatCount}</span>
                <span className="text-sm text-foreground">{formatDate(billingDate)}</span>
                <button
                  onClick={() => setEditOrg(org)}
                  className="text-xs text-muted hover:text-foreground px-2 py-1 rounded-lg hover:bg-panel-3 transition-colors text-right"
                >
                  Edit
                </button>
              </div>

              {/* Expanded teams list */}
              {isExpanded && org.teams.length > 0 && (
                <div className="px-6 pb-3 pt-1 bg-panel-2/40">
                  <p className="text-xs text-muted mb-2">Teams</p>
                  <ul className="flex flex-col gap-1">
                    {org.teams.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 text-sm text-foreground px-3 py-1.5 rounded-lg bg-panel-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        {t.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isExpanded && org.teams.length === 0 && (
                <div className="px-6 pb-3 pt-1 text-xs text-muted">No active teams.</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
