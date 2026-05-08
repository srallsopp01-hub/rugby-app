"use client";

import { useEffect, useRef, useState } from "react";
import { POSITION_OPTIONS } from "@/app/rugby-tagging/constants";
import {
  createDefaultSquadProfile,
  createFixtureId,
  createPlayerId,
  createTrainingSessionId,
  removeSquadPlayer,
  saveSquadProfile,
  upsertSquadPlayer,
  type SquadPlayer,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/team";
import { useTeam } from "@/app/providers/TeamContext";
import type { Fixture, TrainingSession, TrainingSessionDayOfWeek } from "@/app/rugby-tagging/types";
import { KpiTargetsSection } from "./KpiTargetsSection";
import { PageHelp } from "@/app/components/PageHelp";
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

type FixtureForm = { opponent: string; date: string; time: string; homeOrAway: "home" | "away"; round: string; venue: string };
const BLANK_FIXTURE_FORM: FixtureForm = {
  opponent: "",
  date: "",
  time: "",
  homeOrAway: "home",
  round: "",
  venue: "",
};

type SessionForm = {
  sessionType: "recurring" | "oneOff";
  dayOfWeek: TrainingSessionDayOfWeek;
  oneOffDate: string;
  time: string;
  locationName: string;
};
const BLANK_SESSION_FORM: SessionForm = {
  sessionType: "recurring",
  dayOfWeek: "monday",
  oneOffDate: "",
  time: "",
  locationName: "",
};

const DOW_LABELS: Record<TrainingSessionDayOfWeek, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};
const DOW_ORDER: TrainingSessionDayOfWeek[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

function formatSessionLabel(session: TrainingSession): string {
  if (session.dayOfWeek) return DOW_LABELS[session.dayOfWeek];
  if (session.oneOffDate) {
    try {
      return new Date(session.oneOffDate + "T00:00:00").toLocaleDateString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return session.oneOffDate; }
  }
  return "—";
}

export default function TeamSetupPage() {
  const { team: liveTeam, isLoading } = useTeam();
  const [profile, setProfile] = useState<SquadProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Initialise and keep local profile in sync with TeamContext.
  // Start as null so we never persist a blank default before real data arrives.
  useEffect(() => {
    if (liveTeam) setProfile(liveTeam);
  }, [liveTeam]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const persist = (updated: SquadProfile) => {
    if (isLoading) return;
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

  // Fixture state
  const [fixtureForm, setFixtureForm] = useState<FixtureForm>(BLANK_FIXTURE_FORM);
  const [showFixtureForm, setShowFixtureForm] = useState(false);
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);

  const openAddFixture = () => {
    setEditingFixtureId(null);
    setFixtureForm(BLANK_FIXTURE_FORM);
    setShowFixtureForm(true);
  };

  const openEditFixture = (fixture: Fixture) => {
    setEditingFixtureId(fixture.id);
    setFixtureForm({
      opponent: fixture.opponent,
      date: fixture.date,
      time: fixture.time,
      homeOrAway: fixture.homeOrAway,
      round: fixture.round ?? "",
      venue: fixture.venue ?? "",
    });
    setShowFixtureForm(true);
  };

  const cancelFixtureForm = () => {
    setShowFixtureForm(false);
    setEditingFixtureId(null);
  };

  const saveFixture = () => {
    if (!profile || !fixtureForm.opponent.trim() || !fixtureForm.date) return;
    const fixtures = profile.fixtures ?? [];
    const existing = fixtures.find((f) => f.id === editingFixtureId);
    const fixture: Fixture = {
      id: editingFixtureId ?? createFixtureId(),
      opponent: fixtureForm.opponent.trim(),
      date: fixtureForm.date,
      time: fixtureForm.time,
      homeOrAway: fixtureForm.homeOrAway,
      round: fixtureForm.round.trim() || undefined,
      venue: fixtureForm.venue.trim() || undefined,
      availabilityRequested: existing?.availabilityRequested ?? false,
    };
    const updated = editingFixtureId
      ? fixtures.map((f) => (f.id === editingFixtureId ? fixture : f))
      : [...fixtures, fixture];
    persist({ ...profile, fixtures: updated.sort((a, b) => a.date.localeCompare(b.date)), updatedAt: new Date().toISOString() });
    cancelFixtureForm();
  };

  const deleteFixture = (id: string) => {
    if (!profile) return;
    if (!window.confirm("Remove this fixture?")) return;
    persist({
      ...profile,
      fixtures: (profile.fixtures ?? []).filter((f) => f.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleAvailabilityRequested = (id: string) => {
    if (!profile) return;
    persist({
      ...profile,
      fixtures: (profile.fixtures ?? []).map((f) =>
        f.id === id ? { ...f, availabilityRequested: !f.availabilityRequested } : f
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  // Training session state
  const [sessionForm, setSessionForm] = useState<SessionForm>(BLANK_SESSION_FORM);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const openEditSession = (session: TrainingSession) => {
    setEditingSessionId(session.id);
    setSessionForm({
      sessionType: session.oneOffDate ? "oneOff" : "recurring",
      dayOfWeek: session.dayOfWeek ?? "monday",
      oneOffDate: session.oneOffDate ?? "",
      time: session.time,
      locationName: session.locationName ?? "",
    });
    setShowSessionForm(true);
  };

  const cancelSessionForm = () => {
    setShowSessionForm(false);
    setEditingSessionId(null);
    setSessionForm(BLANK_SESSION_FORM);
  };

  const saveSession = () => {
    if (!profile || !sessionForm.time) return;
    const isOneOff = sessionForm.sessionType === "oneOff";
    if (isOneOff && !sessionForm.oneOffDate) return;
    const sessions = profile.trainingSessions ?? [];
    const existing = sessions.find((s) => s.id === editingSessionId);
    const session: TrainingSession = {
      id: editingSessionId ?? createTrainingSessionId(),
      ...(isOneOff
        ? { oneOffDate: sessionForm.oneOffDate }
        : { dayOfWeek: sessionForm.dayOfWeek }),
      time: sessionForm.time,
      locationName: sessionForm.locationName.trim() || undefined,
      availabilityRequested: existing?.availabilityRequested,
      skipDates: existing?.skipDates,
    };
    const updated = editingSessionId
      ? sessions.map((s) => (s.id === editingSessionId ? session : s))
      : [...sessions, session];
    persist({
      ...profile,
      trainingSessions: updated,
      updatedAt: new Date().toISOString(),
    });
    cancelSessionForm();
  };

  const deleteSession = (id: string) => {
    if (!profile) return;
    if (!window.confirm("Remove this training session?")) return;
    persist({
      ...profile,
      trainingSessions: (profile.trainingSessions ?? []).filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleSessionAvailabilityRequested = (id: string) => {
    if (!profile) return;
    persist({
      ...profile,
      trainingSessions: (profile.trainingSessions ?? []).map((s) =>
        s.id === id ? { ...s, availabilityRequested: !s.availabilityRequested } : s
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  if (!profile || isLoading) return (
    <div className="flex min-h-full items-center justify-center text-muted text-sm">Loading…</div>
  );

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

        {/* Fixtures */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">Fixtures</h2>
              <p className="mt-1 text-sm text-muted">
                {(profile.fixtures ?? []).length} fixture{(profile.fixtures ?? []).length === 1 ? "" : "s"} scheduled
              </p>
            </div>
            {!showFixtureForm && (
              <button
                type="button"
                onClick={(e) => { openAddFixture(); e.currentTarget.blur(); }}
                className="rounded-xl border border-border bg-panel-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-panel-3"
              >
                + Add fixture
              </button>
            )}
          </div>

          {showFixtureForm && (
            <div className="mt-5 rounded-xl border border-border bg-panel-2 p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground-strong">
                {editingFixtureId ? "Edit fixture" : "Add fixture"}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted">Opponent *</label>
                  <input
                    value={fixtureForm.opponent}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, opponent: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                    placeholder="e.g. Norths"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Date *</label>
                  <input
                    type="date"
                    value={fixtureForm.date}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, date: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Time</label>
                  <input
                    type="time"
                    value={fixtureForm.time}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, time: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Home or Away *</label>
                  <div className="flex gap-2">
                    {(["home", "away"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={(e) => { setFixtureForm({ ...fixtureForm, homeOrAway: opt }); e.currentTarget.blur(); }}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                          fixtureForm.homeOrAway === opt
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-panel-3 text-muted hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Round (optional)</label>
                  <input
                    value={fixtureForm.round}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, round: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Venue (optional)</label>
                  <input
                    value={fixtureForm.venue}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, venue: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                    placeholder="e.g. Trumper Park"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={(e) => { saveFixture(); e.currentTarget.blur(); }}
                  disabled={!fixtureForm.opponent.trim() || !fixtureForm.date}
                  className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-40"
                >
                  {editingFixtureId ? "Save changes" : "Add fixture"}
                </button>
                <button
                  type="button"
                  onClick={(e) => { cancelFixtureForm(); e.currentTarget.blur(); }}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(profile.fixtures ?? []).length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-panel-2">
                  <tr>
                    <th className="p-3 text-left text-xs text-muted">Date</th>
                    <th className="p-3 text-left text-xs text-muted">Opponent</th>
                    <th className="p-3 text-left text-xs text-muted">H/A</th>
                    <th className="p-3 text-left text-xs text-muted">Round</th>
                    <th className="p-3 text-left text-xs text-muted">Availability</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.fixtures ?? []).map((fixture) => (
                    <tr key={fixture.id} className="border-t border-border">
                      <td className="p-3 text-muted">{fixture.date}</td>
                      <td className="p-3 font-medium text-foreground">vs {fixture.opponent}</td>
                      <td className="p-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          fixture.homeOrAway === "home"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border bg-panel-2 text-muted"
                        }`}>
                          {fixture.homeOrAway}
                        </span>
                      </td>
                      <td className="p-3 text-muted">{fixture.round ?? "—"}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={(e) => { toggleAvailabilityRequested(fixture.id); e.currentTarget.blur(); }}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                            fixture.availabilityRequested
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-border bg-panel-2 text-muted hover:text-foreground"
                          }`}
                        >
                          {fixture.availabilityRequested ? "Requested ✓" : "Mark requested"}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={(e) => { openEditFixture(fixture); e.currentTarget.blur(); }}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { deleteFixture(fixture.id); e.currentTarget.blur(); }}
                            className="text-xs text-muted hover:text-danger"
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
        </div>

        {/* Training Sessions */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">Training Sessions</h2>
              <p className="mt-1 text-sm text-muted">
                Weekly recurring sessions shown on the dashboard
              </p>
            </div>
            {!showSessionForm && (
              <button
                type="button"
                onClick={(e) => { setShowSessionForm(true); e.currentTarget.blur(); }}
                className="rounded-xl border border-border bg-panel-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-panel-3"
              >
                + Add session
              </button>
            )}
          </div>

          {showSessionForm && (
            <div className="mt-5 rounded-xl border border-border bg-panel-2 p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground-strong">
                {editingSessionId ? "Edit training session" : "Add training session"}
              </h3>

              {/* Recurring / One-off toggle */}
              <div className="mb-4 flex rounded-lg border border-border bg-panel-3 p-1 w-fit">
                {(["recurring", "oneOff"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={(e) => { setSessionForm({ ...sessionForm, sessionType: type }); e.currentTarget.blur(); }}
                    className={`rounded-md px-4 py-1.5 text-xs font-bold uppercase transition ${
                      sessionForm.sessionType === type ? "bg-foreground-strong text-background" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {type === "recurring" ? "Recurring" : "One-off"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  {sessionForm.sessionType === "recurring" ? (
                    <>
                      <label className="mb-1 block text-xs text-muted">Day of week *</label>
                      <select
                        value={sessionForm.dayOfWeek}
                        onChange={(e) => setSessionForm({ ...sessionForm, dayOfWeek: e.target.value as TrainingSessionDayOfWeek })}
                        className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                      >
                        {DOW_ORDER.map((d) => (
                          <option key={d} value={d}>{DOW_LABELS[d]}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label className="mb-1 block text-xs text-muted">Date *</label>
                      <input
                        type="date"
                        value={sessionForm.oneOffDate}
                        onChange={(e) => setSessionForm({ ...sessionForm, oneOffDate: e.target.value })}
                        className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                      />
                    </>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Time *</label>
                  <input
                    type="time"
                    value={sessionForm.time}
                    onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Location (optional)</label>
                  <input
                    value={sessionForm.locationName}
                    onChange={(e) => setSessionForm({ ...sessionForm, locationName: e.target.value })}
                    className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                    placeholder="e.g. Training Oval 1"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={(e) => { saveSession(); e.currentTarget.blur(); }}
                  disabled={!sessionForm.time || (sessionForm.sessionType === "oneOff" && !sessionForm.oneOffDate)}
                  className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-40"
                >
                  {editingSessionId ? "Save changes" : "Add session"}
                </button>
                <button
                  type="button"
                  onClick={(e) => { cancelSessionForm(); e.currentTarget.blur(); }}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(profile.trainingSessions ?? []).length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-panel-2">
                  <tr>
                    <th className="p-3 text-left text-xs text-muted">When</th>
                    <th className="p-3 text-left text-xs text-muted">Time</th>
                    <th className="p-3 text-left text-xs text-muted">Location</th>
                    <th className="p-3 text-left text-xs text-muted">Availability</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...(profile.trainingSessions ?? [])]
                    .sort((a, b) => {
                      const ai = a.dayOfWeek ? DOW_ORDER.indexOf(a.dayOfWeek) : 999;
                      const bi = b.dayOfWeek ? DOW_ORDER.indexOf(b.dayOfWeek) : 999;
                      if (ai !== bi) return ai - bi;
                      return (a.oneOffDate ?? "").localeCompare(b.oneOffDate ?? "");
                    })
                    .map((session) => (
                      <tr key={session.id} className="border-t border-border">
                        <td className="p-3 font-medium text-foreground-strong">
                          {formatSessionLabel(session)}
                          {session.oneOffDate && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-2">one-off</span>
                          )}
                        </td>
                        <td className="p-3 text-muted">{session.time}</td>
                        <td className="p-3 text-muted">{session.locationName ?? "—"}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={(e) => { toggleSessionAvailabilityRequested(session.id); e.currentTarget.blur(); }}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                              session.availabilityRequested
                                ? "border-success/30 bg-success/10 text-success"
                                : "border-border bg-panel-2 text-muted hover:text-foreground"
                            }`}
                          >
                            {session.availabilityRequested ? "Requested ✓" : "Mark requested"}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={(e) => { openEditSession(session); e.currentTarget.blur(); }}
                              className="text-xs text-muted hover:text-foreground"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { deleteSession(session.id); e.currentTarget.blur(); }}
                              className="text-xs text-muted hover:text-danger"
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
          ) : (
            !showSessionForm && (
              <p className="mt-4 text-sm text-muted">No training sessions added yet.</p>
            )
          )}
        </div>

      </div>
    </main>
  );
}
