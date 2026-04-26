"use client";

import { useEffect, useRef, useState } from "react";
import { POSITION_OPTIONS } from "@/app/rugby-tagging/constants";
import {
  createDefaultSquadProfile,
  createPlayerId,
  getSquadProfile,
  removeSquadPlayer,
  saveSquadProfile,
  upsertSquadPlayer,
  type SquadPlayer,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";
import { KpiTargetsSection } from "./KpiTargetsSection";
import { PageHelp } from "@/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";

function PositionMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (positions: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (position: string) => {
    if (selected.includes(position)) {
      onChange(selected.filter((p) => p !== position));
    } else {
      onChange([...selected, position]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-left text-sm text-foreground"
      >
        <span className={selected.length === 0 ? "text-muted" : ""}>
          {selected.length === 0 ? "Select positions…" : selected.join(" · ")}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-panel-2 py-1 shadow-lg">
          {POSITION_OPTIONS.map((position) => {
            const checked = selected.includes(position);
            const idx = selected.indexOf(position);
            return (
              <label
                key={position}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-panel-3"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(position)}
                  className="h-4 w-4 rounded accent-foreground"
                />
                <span className="flex-1 text-sm text-foreground">{position}</span>
                {checked && (
                  <span className="text-xs text-muted">
                    {idx === 0 ? "primary" : "secondary"}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

const BLANK_FORM = {
  fullName: "",
  preferredName: "",
  nicknamesRaw: "",
  selectedPositions: [] as string[],
  status: "active" as SquadPlayer["status"],
};

export default function TeamSetupPage() {
  const [profile, setProfile] = useState<SquadProfile | null>(() => {
    const loaded = getSquadProfile();
    return loaded ?? createDefaultSquadProfile();
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const persist = (updated: SquadProfile) => {
    saveSquadProfile(updated);
    setProfile(updated);
  };

  const updateProfileField = (
    field: "teamName" | "coachName" | "primaryColour" | "secondaryColour",
    value: string
  ) => {
    if (!profile) return;
    persist({ ...profile, [field]: value, updatedAt: new Date().toISOString() });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  };

  const openEdit = (player: SquadPlayer) => {
    setEditingId(player.id);
    setForm({
      fullName: player.fullName,
      preferredName: player.preferredName,
      nicknamesRaw: player.nicknames.join(", "),
      selectedPositions: [player.primaryPosition, ...player.secondaryPositions].filter(Boolean),
      status: player.status,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const savePlayer = () => {
    if (!profile || !form.fullName.trim()) return;

    const existing = profile.players.find((p) => p.id === editingId);
    const player: SquadPlayer = {
      id: editingId ?? createPlayerId(),
      fullName: form.fullName.trim(),
      preferredName: form.preferredName.trim(),
      nicknames: form.nicknamesRaw
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
      primaryPosition: form.selectedPositions[0] ?? "",
      secondaryPositions: form.selectedPositions.slice(1),
      jerseyNumber: null,
      voiceSamples: existing?.voiceSamples ?? [],
      status: form.status,
    };

    persist(upsertSquadPlayer(profile, player));
    cancelForm();
  };

  const deletePlayer = (playerId: string) => {
    if (!profile) return;
    if (!window.confirm("Remove this player from the squad?")) return;
    persist(removeSquadPlayer(profile, playerId));
  };

  if (!profile) return null;

  const sortedPlayers = [...profile.players].sort((a, b) => {
    const ai = POSITION_OPTIONS.indexOf(a.primaryPosition);
    const bi = POSITION_OPTIONS.indexOf(b.primaryPosition);
    const aIdx = ai === -1 ? 999 : ai;
    const bIdx = bi === -1 ? 999 : bi;
    return aIdx !== bIdx ? aIdx - bIdx : a.fullName.localeCompare(b.fullName);
  });

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">

        {/* Header */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
              Team Setup
            </h1>
            <PageHelp {...COACH_PAGE_HELP["/coach/team-setup"]} />
          </div>
          <p className="mt-2 text-sm text-muted">
            Manage your squad — names, positions, and voice recognition settings. This data persists across all matches.
          </p>
        </div>

        {/* Team details */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-base font-semibold text-foreground-strong">Team details</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Team name</label>
              <input
                value={profile.teamName}
                onChange={(e) => updateProfileField("teamName", e.target.value)}
                className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                placeholder="e.g. Easts Rugby"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Coach name</label>
              <input
                value={profile.coachName}
                onChange={(e) => updateProfileField("coachName", e.target.value)}
                className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                placeholder="e.g. Tom Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Primary colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={profile.primaryColour || "#000000"}
                  onChange={(e) => updateProfileField("primaryColour", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-panel-2 p-1"
                />
                <input
                  value={profile.primaryColour}
                  onChange={(e) => updateProfileField("primaryColour", e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-panel-2 px-3 py-2.5 font-mono text-sm text-foreground"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Secondary colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={profile.secondaryColour || "#ffffff"}
                  onChange={(e) => updateProfileField("secondaryColour", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-panel-2 p-1"
                />
                <input
                  value={profile.secondaryColour}
                  onChange={(e) => updateProfileField("secondaryColour", e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-panel-2 px-3 py-2.5 font-mono text-sm text-foreground"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">Players</h2>
              <p className="mt-1 text-sm text-muted">
                {profile.players.length} player{profile.players.length === 1 ? "" : "s"} in squad
              </p>
            </div>
            {!showForm && (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-xl border border-border bg-panel-2 px-4 py-2.5 text-sm font-medium text-foreground"
              >
                + Add player
              </button>
            )}
          </div>

          {sortedPlayers.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-panel-2">
                  <tr>
                    <th className="p-3 text-left text-xs text-muted">Full name</th>
                    <th className="p-3 text-left text-xs text-muted">Preferred / nicknames</th>
                    <th className="p-3 text-left text-xs text-muted">Position</th>
                    <th className="p-3 text-left text-xs text-muted">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((player) => (
                    <tr key={player.id} className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">{player.fullName}</td>
                      <td className="p-3 text-muted">
                        {[player.preferredName, ...player.nicknames]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="p-3">
                        {player.primaryPosition ? (
                          <span className="text-foreground">{player.primaryPosition}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {player.secondaryPositions.length > 0 && (
                          <span className="ml-1 text-muted">
                            · {player.secondaryPositions.join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            player.status === "active"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : player.status === "injured"
                              ? "bg-rose-500/10 text-rose-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {player.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(player)}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePlayer(player.id)}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sortedPlayers.length === 0 && !showForm && (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted">
                No players added yet. Click &quot;+ Add player&quot; to get started.
              </p>
            </div>
          )}
        </div>

        {/* Add / Edit player form */}
        {showForm && (
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-semibold text-foreground-strong">
              {editingId ? "Edit player" : "Add player"}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted">Full name *</label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                  placeholder="e.g. James Williams"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted">Preferred name</label>
                <input
                  value={form.preferredName}
                  onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                  placeholder="e.g. Jamie"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted">Nicknames</label>
                <input
                  value={form.nicknamesRaw}
                  onChange={(e) => setForm({ ...form, nicknamesRaw: e.target.value })}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                  placeholder="e.g. JW, Williamsy"
                />
                <p className="mt-1 text-xs text-muted">Separate multiple nicknames with commas</p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as SquadPlayer["status"] })
                  }
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="active">Active</option>
                  <option value="injured">Injured</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-muted">
                  Positions
                  {form.selectedPositions.length > 0 && (
                    <span className="ml-2 text-muted">
                      — first selected is primary
                    </span>
                  )}
                </label>
                <PositionMultiSelect
                  selected={form.selectedPositions}
                  onChange={(positions) => setForm({ ...form, selectedPositions: positions })}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <button
                type="button"
                onClick={savePlayer}
                disabled={!form.fullName.trim()}
                className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-40"
              >
                {editingId ? "Save changes" : "Add to squad"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* KPI Targets */}
        <KpiTargetsSection profile={profile} persist={persist} />

      </div>
    </main>
  );
}
