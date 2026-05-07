"use client";

import { useState } from "react";

const PLAN_OPTIONS = [
  { value: "team_launch", label: "Team Launch" },
  { value: "club_5", label: "Club 5" },
  { value: "org_custom", label: "Custom" },
  { value: "solo", label: "Solo" },
];

interface OrgEditModalProps {
  org: {
    id: string;
    name: string;
    plan: string;
    team_limit: number | null;
    seat_limit: number | null;
    player_limit: number | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

export default function OrgEditModal({ org, onClose, onSaved }: OrgEditModalProps) {
  const [plan, setPlan] = useState(org.plan ?? "team_launch");
  const [teamLimit, setTeamLimit] = useState(org.team_limit?.toString() ?? "");
  const [seatLimit, setSeatLimit] = useState(org.seat_limit?.toString() ?? "");
  const [playerLimit, setPlayerLimit] = useState(org.player_limit?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/org/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: org.id,
          plan,
          teamLimit: teamLimit === "" ? null : parseInt(teamLimit, 10),
          seatLimit: seatLimit === "" ? null : parseInt(seatLimit, 10),
          playerLimit: playerLimit === "" ? null : parseInt(playerLimit, 10),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unknown error");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-strong)]">
        <h2 className="text-base font-semibold text-foreground-strong mb-1">{org.name}</h2>
        <p className="text-xs text-muted mb-5">Edit plan and limit overrides.</p>

        <div className="space-y-4">
          {/* Plan */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Limit overrides */}
          <div>
            <p className="text-xs text-muted mb-2">
              Limit overrides — leave blank to use plan defaults.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Teams", value: teamLimit, set: setTeamLimit },
                { label: "Seats", value: seatLimit, set: setSeatLimit },
                { label: "Players", value: playerLimit, set: setPlayerLimit },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs text-muted mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
