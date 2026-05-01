"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePlayer } from "@/app/player/PlayerContext";
import {
  SQUAD_PROFILE_KEY,
} from "@/app/rugby-tagging/constants";
import {
  saveSquadProfile,
  SQUAD_PROFILE_CHANGED_EVENT,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";
import type { AvailabilityResponse, Fixture, TrainingSession, TrainingSessionDayOfWeek } from "@/app/rugby-tagging/types";

// ---------------------------------------------------------------------------
// Storage subscription — reacts to saveSquadProfile() calls
// ---------------------------------------------------------------------------

function subscribeSquadProfile(cb: () => void) {
  window.addEventListener(SQUAD_PROFILE_CHANGED_EVENT, cb);
  return () => window.removeEventListener(SQUAD_PROFILE_CHANGED_EVENT, cb);
}

function getSquadProfileSnapshot(): string {
  if (typeof window === "undefined") return "{}";
  return localStorage.getItem(SQUAD_PROFILE_KEY) || "{}";
}

function parseProfile(snapshot: string): SquadProfile | null {
  try {
    const parsed = JSON.parse(snapshot);
    return parsed && typeof parsed === "object" ? (parsed as SquadProfile) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DOW_LABELS: Record<TrainingSessionDayOfWeek, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function nextOccurrence(dayOfWeek: TrainingSessionDayOfWeek | undefined): string {
  if (!dayOfWeek) return "";
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const target = dayMap[dayOfWeek];
  const today = new Date();
  const current = today.getDay();
  const diff = (target - current + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Availability button group
// ---------------------------------------------------------------------------

const RESPONSE_LABELS: Record<AvailabilityResponse["response"], string> = {
  available: "Available",
  unavailable: "Can't make it",
  maybe: "Maybe",
};

function AvailabilityButtons({
  current,
  onChange,
}: {
  current: AvailabilityResponse["response"] | null;
  onChange: (r: AvailabilityResponse["response"]) => void;
}) {
  const options: AvailabilityResponse["response"][] = ["available", "unavailable", "maybe"];
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={(e) => { e.currentTarget.blur(); onChange(opt); }}
          className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
            current === opt
              ? opt === "available"
                ? "border-success/40 bg-success/15 text-success"
                : opt === "unavailable"
                ? "border-danger/40 bg-danger/15 text-danger"
                : "border-warning/40 bg-warning/15 text-warning"
              : "border-border bg-panel-2 text-muted hover:border-border-light hover:text-foreground"
          }`}
        >
          {RESPONSE_LABELS[opt]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlayerAvailabilityPage() {
  const { currentPlayer, ready } = usePlayer();

  const profileSnapshot = useSyncExternalStore(
    subscribeSquadProfile,
    getSquadProfileSnapshot,
    () => "{}"
  );

  const profile = useMemo(() => parseProfile(profileSnapshot), [profileSnapshot]);

  const today = todayIso();

  const upcomingFixtures = useMemo(
    () => (profile?.fixtures ?? []).filter((f) => f.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [profile, today]
  );

  const trainingSessions = useMemo(
    () => [...(profile?.trainingSessions ?? [])].sort((a, b) => {
      const order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      return order.indexOf(a.dayOfWeek ?? "") - order.indexOf(b.dayOfWeek ?? "");
    }),
    [profile]
  );

  const responses = useMemo(
    () => profile?.availabilityResponses ?? [],
    [profile]
  );

  function getFixtureResponse(fixtureId: string): AvailabilityResponse["response"] | null {
    return responses.find((r) => r.fixtureId === fixtureId && r.playerId === currentPlayer?.id)?.response ?? null;
  }

  function getSessionResponse(sessionId: string): AvailabilityResponse["response"] | null {
    return responses.find((r) => r.trainingSessionId === sessionId && r.playerId === currentPlayer?.id)?.response ?? null;
  }

  function upsertResponse(patch: Partial<AvailabilityResponse> & { response: AvailabilityResponse["response"] }) {
    if (!profile || !currentPlayer) return;
    const existing = responses.findIndex(
      (r) =>
        r.playerId === currentPlayer.id &&
        (patch.fixtureId ? r.fixtureId === patch.fixtureId : r.trainingSessionId === patch.trainingSessionId)
    );
    const next: AvailabilityResponse = {
      id: existing >= 0 ? responses[existing].id : crypto.randomUUID(),
      playerId: currentPlayer.id,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const updated =
      existing >= 0
        ? responses.map((r, i) => (i === existing ? next : r))
        : [...responses, next];
    saveSquadProfile({
      ...profile,
      availabilityResponses: updated,
      updatedAt: new Date().toISOString(),
    });

    import("@/lib/squadProfileCloud")
      .then(({ upsertPlayerAvailabilityResponse }) =>
        void upsertPlayerAvailabilityResponse(next)
      )
      .catch(() => {});
  }

  if (!ready) return null;

  if (!currentPlayer) {
    return (
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[800px]">
          <div className="rounded-2xl border border-border bg-panel p-8 text-center">
            <h1 className="text-lg font-semibold text-foreground-strong">No player selected</h1>
            <p className="mt-2 text-sm text-muted">
              Select your player profile first to mark your availability.
            </p>
            <Link
              href="/player/settings"
              className="mt-4 inline-block rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-3"
            >
              Go to Settings →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[800px] space-y-5">

        {/* Header */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">Availability</h1>
          <p className="mt-2 text-sm text-muted">
            Let your coach know if you&apos;re available for upcoming fixtures and training sessions.
          </p>
        </section>

        {/* Upcoming fixtures */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-base font-semibold text-foreground-strong">Upcoming Fixtures</h2>
          {upcomingFixtures.length > 0 ? (
            <div className="space-y-3">
              {upcomingFixtures.map((fixture: Fixture) => (
                <div key={fixture.id} className="rounded-xl border border-border bg-panel-2 p-4">
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground-strong">vs {fixture.opponent}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        fixture.homeOrAway === "home"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border bg-panel-3 text-muted"
                      }`}>
                        {fixture.homeOrAway}
                      </span>
                      {fixture.round && (
                        <span className="text-xs text-muted-2">Rd {fixture.round}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {formatDate(fixture.date)}{fixture.time ? ` · ${fixture.time}` : ""}
                      {fixture.venue ? ` · ${fixture.venue}` : ""}
                    </div>
                  </div>
                  <AvailabilityButtons
                    current={getFixtureResponse(fixture.id)}
                    onChange={(r) => upsertResponse({ fixtureId: fixture.id, response: r })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-panel-2 px-5 py-5 text-center text-sm text-muted">
              No upcoming fixtures scheduled yet.
            </p>
          )}
        </section>

        {/* Training sessions */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-base font-semibold text-foreground-strong">Training Sessions</h2>
          {trainingSessions.length > 0 ? (
            <div className="space-y-3">
              {trainingSessions.map((session: TrainingSession) => (
                <div key={session.id} className="rounded-xl border border-border bg-panel-2 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-foreground-strong">
                      {session.dayOfWeek ? DOW_LABELS[session.dayOfWeek] : session.oneOffDate ?? "One-off"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {session.time}{session.locationName ? ` · ${session.locationName}` : ""}
                      {session.dayOfWeek && <>{" · next: "}{nextOccurrence(session.dayOfWeek)}</>}
                    </div>
                  </div>
                  <AvailabilityButtons
                    current={getSessionResponse(session.id)}
                    onChange={(r) => upsertResponse({ trainingSessionId: session.id, response: r })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-panel-2 px-5 py-5 text-center text-sm text-muted">
              No training sessions configured yet.
            </p>
          )}
        </section>

      </div>
    </main>
  );
}
