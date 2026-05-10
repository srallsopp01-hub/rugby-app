"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePlayer } from "./PlayerContext";
import { PlayerPicker } from "./PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { StatusPill } from "@/app/components/StatusPill";
import { saveSquadProfile } from "@/app/rugby-tagging/lib/team";
import { buildReportRowsFromMatch, gradeToScore } from "@/app/rugby-tagging/helpers";
import { buildPlayerCoachingPlan } from "./playerCoachingPlan";
import { countUnseenClips } from "./lib/unseenClips";
import { getLastSeenAt, subscribeReviewSeenChanged } from "./lib/reviewSeen";
import { useTeam } from "@/app/providers/TeamContext";
import { useMatches } from "@/app/providers/MatchesContext";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { ReportRow, AvailabilityResponse, Fixture, TrainingSession, TrainingSessionDayOfWeek } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";
import { EmptyState } from "@/app/components/EmptyState";
import { Trophy } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playerNameSet(player: SquadPlayer): Set<string> {
  return new Set([
    player.fullName.toLowerCase().trim(),
    player.preferredName.toLowerCase().trim(),
    ...player.nicknames.map((n) => n.toLowerCase().trim()),
  ]);
}

function getPlayerMatches(matches: SavedMatchRecord[], player: SquadPlayer) {
  const names = playerNameSet(player);
  return matches.filter((m) =>
    m.rosterRows.some(
      (r) => (r.playerId && r.playerId === player.id) || names.has(r.name.toLowerCase().trim())
    )
  );
}

function getPlayerRow(match: SavedMatchRecord, player: SquadPlayer): ReportRow | null {
  const rows = buildReportRowsFromMatch(match.rosterRows, match.events);
  const names = playerNameSet(player);
  return (
    rows.find((r) => r.playerId && r.playerId === player.id) ??
    rows.find((r) => names.has(r.name.toLowerCase().trim())) ??
    null
  );
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const DOW_ORDER: TrainingSessionDayOfWeek[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

const DOW_LABELS: Record<TrainingSessionDayOfWeek, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function nextOccurrence(dayOfWeek: TrainingSessionDayOfWeek): string {
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const target = dayMap[dayOfWeek];
  const today = new Date();
  const diff = (target - today.getDay() + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

type RowMode = "buttons" | "reason-input" | "saved";

// ---------------------------------------------------------------------------
// Availability row components
// ---------------------------------------------------------------------------

function FixtureRow({
  fixture,
  mode,
  currentResponse,
  reasonDraft,
  onResponse,
  onSaveReason,
  onReasonChange,
  onChange,
}: {
  fixture: Fixture;
  mode: RowMode;
  currentResponse: AvailabilityResponse | undefined;
  reasonDraft: string;
  onResponse: (r: AvailabilityResponse["response"]) => void;
  onSaveReason: () => void;
  onReasonChange: (v: string) => void;
  onChange: () => void;
}) {
  const FIXTURE_LABELS: Record<AvailabilityResponse["response"], string> = {
    available: "Available",
    unavailable: "Unavailable",
    maybe: "Maybe",
  };

  return (
    <div className="rounded-xl border border-border bg-panel-2 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground-strong">vs {fixture.opponent}</span>
            <StatusPill
              variant={fixture.homeOrAway === "home" ? "success" : "neutral"}
              size="sm"
              uppercase
            >
              {fixture.homeOrAway}
            </StatusPill>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {formatDate(fixture.date)}
            {fixture.time ? ` · ${fixture.time}` : ""}
            {fixture.venue ? ` · ${fixture.venue}` : ""}
          </div>
        </div>
      </div>

      {mode === "saved" && currentResponse ? (
        <div className="flex items-center gap-3">
          <span className={`rounded-xl border px-3 py-2 text-xs font-medium ${
            currentResponse.response === "available"
              ? "border-success/40 bg-success/15 text-success"
              : currentResponse.response === "unavailable"
              ? "border-danger/40 bg-danger/15 text-danger"
              : "border-warning/40 bg-warning/15 text-warning"
          }`}>
            {FIXTURE_LABELS[currentResponse.response]}
          </span>
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onChange(); }}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Change
          </button>
        </div>
      ) : mode === "reason-input" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-danger/40 bg-danger/15 px-3 py-2 text-xs font-medium text-danger">
              Unavailable
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={reasonDraft}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Let the coach know why (optional)"
              className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-foreground placeholder:text-muted-2 outline-none focus:border-border-light"
            />
            <button
              type="button"
              onClick={(e) => { e.currentTarget.blur(); onSaveReason(); }}
              className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-panel-3 transition"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {(["available", "unavailable", "maybe"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => { e.currentTarget.blur(); onResponse(opt); }}
              className="rounded-xl border border-border bg-panel-3 px-3 py-2 text-xs font-medium text-muted hover:border-border-light hover:text-foreground transition"
            >
              {FIXTURE_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingRow({
  session,
  mode,
  currentResponse,
  reasonDraft,
  onResponse,
  onSaveReason,
  onReasonChange,
  onChange,
}: {
  session: TrainingSession;
  mode: RowMode;
  currentResponse: AvailabilityResponse | undefined;
  reasonDraft: string;
  onResponse: (r: AvailabilityResponse["response"]) => void;
  onSaveReason: () => void;
  onReasonChange: (v: string) => void;
  onChange: () => void;
}) {
  const TRAINING_LABELS: Record<AvailabilityResponse["response"], string> = {
    available: "Going",
    unavailable: "Can't make it",
    maybe: "Maybe",
  };

  const title = session.dayOfWeek
    ? `${DOW_LABELS[session.dayOfWeek]} training`
    : session.oneOffDate
    ? `${formatDate(session.oneOffDate)} training`
    : "Training";

  const subtitle = [
    session.time,
    session.locationName,
    session.dayOfWeek ? `next: ${nextOccurrence(session.dayOfWeek)}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-border bg-panel-2 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground-strong">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
      </div>

      {mode === "saved" && currentResponse ? (
        <div className="flex items-center gap-3">
          <span className={`rounded-xl border px-3 py-2 text-xs font-medium ${
            currentResponse.response === "available"
              ? "border-success/40 bg-success/15 text-success"
              : currentResponse.response === "unavailable"
              ? "border-danger/40 bg-danger/15 text-danger"
              : "border-warning/40 bg-warning/15 text-warning"
          }`}>
            {TRAINING_LABELS[currentResponse.response]}
          </span>
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onChange(); }}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Change
          </button>
        </div>
      ) : mode === "reason-input" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-danger/40 bg-danger/15 px-3 py-2 text-xs font-medium text-danger">
              Can&apos;t make it
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={reasonDraft}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Let the coach know why (optional)"
              className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-foreground placeholder:text-muted-2 outline-none focus:border-border-light"
            />
            <button
              type="button"
              onClick={(e) => { e.currentTarget.blur(); onSaveReason(); }}
              className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-panel-3 transition"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {(["available", "unavailable", "maybe"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => { e.currentTarget.blur(); onResponse(opt); }}
              className="rounded-xl border border-border bg-panel-3 px-3 py-2 text-xs font-medium text-muted hover:border-border-light hover:text-foreground transition"
            >
              {TRAINING_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlayerHomePage() {
  const { currentPlayer, ready } = usePlayer();
  const { team: profile } = useTeam();
  const { matches: allMatches } = useMatches();

  const playerMatches = useMemo<SavedMatchRecord[]>(() => {
    if (!currentPlayer) return [];
    return getPlayerMatches(allMatches, currentPlayer).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [allMatches, currentPlayer]);

  const playerRows = useMemo<ReportRow[]>(() => {
    if (!currentPlayer) return [];
    return playerMatches.map((m) => getPlayerRow(m, currentPlayer)).filter(Boolean) as ReportRow[];
  }, [playerMatches, currentPlayer]);

  const today = todayIso();

  const upcomingFixtures = useMemo(
    () => (profile?.fixtures ?? []).filter((f) => f.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [profile, today]
  );

  const trainingSessions = useMemo(
    () => [...(profile?.trainingSessions ?? [])].sort(
      (a, b) => DOW_ORDER.indexOf(a.dayOfWeek ?? "monday") - DOW_ORDER.indexOf(b.dayOfWeek ?? "monday")
    ),
    [profile]
  );

  const savedResponses = useMemo(() => profile?.availabilityResponses ?? [], [profile]);

  // Row mode state — initialised from saved responses
  const initialModes = useMemo<Record<string, RowMode>>(() => {
    const map: Record<string, RowMode> = {};
    for (const f of upcomingFixtures) {
      const r = savedResponses.find((r) => r.fixtureId === f.id && r.playerId === currentPlayer?.id);
      map[f.id] = r ? "saved" : "buttons";
    }
    for (const s of trainingSessions) {
      const r = savedResponses.find((r) => r.trainingSessionId === s.id && r.playerId === currentPlayer?.id);
      map[s.id] = r ? "saved" : "buttons";
    }
    return map;
  }, [upcomingFixtures, trainingSessions, savedResponses, currentPlayer]);

  const [rowModes, setRowModes] = useState<Record<string, RowMode>>({});
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  function getMode(id: string): RowMode {
    return rowModes[id] ?? initialModes[id] ?? "buttons";
  }

  function setMode(id: string, mode: RowMode) {
    setRowModes((prev) => ({ ...prev, [id]: mode }));
  }

  function upsertResponse(patch: Partial<AvailabilityResponse> & { response: AvailabilityResponse["response"] }) {
    if (!profile || !currentPlayer) return;
    const existing = savedResponses.findIndex(
      (r) =>
        r.playerId === currentPlayer.id &&
        (patch.fixtureId ? r.fixtureId === patch.fixtureId : r.trainingSessionId === patch.trainingSessionId)
    );
    const next: AvailabilityResponse = {
      id: existing >= 0 ? savedResponses[existing].id : crypto.randomUUID(),
      playerId: currentPlayer.id,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const updated =
      existing >= 0
        ? savedResponses.map((r, i) => (i === existing ? next : r))
        : [...savedResponses, next];
    saveSquadProfile({ ...profile, availabilityResponses: updated, updatedAt: new Date().toISOString() });

    import("@/lib/teamCloud")
      .then(({ upsertPlayerAvailabilityResponse }) => void upsertPlayerAvailabilityResponse(next))
      .catch(() => {});
  }

  function handleResponse(id: string, type: "fixture" | "session", response: AvailabilityResponse["response"]) {
    if (response === "unavailable") {
      setMode(id, "reason-input");
      return;
    }
    const patch = type === "fixture" ? { fixtureId: id, response } : { trainingSessionId: id, response };
    upsertResponse(patch);
    setMode(id, "saved");
  }

  function handleSaveReason(id: string, type: "fixture" | "session") {
    const reason = (reasonDrafts[id] ?? "").trim();
    const patch = type === "fixture"
      ? { fixtureId: id, response: "unavailable" as const, reason: reason || undefined }
      : { trainingSessionId: id, response: "unavailable" as const, reason: reason || undefined };
    upsertResponse(patch);
    setMode(id, "saved");
    setReasonDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  const hasAnyEvent = upcomingFixtures.length > 0 || trainingSessions.length > 0;

  const lastSeenAt = useSyncExternalStore(
    subscribeReviewSeenChanged,
    () => (currentPlayer ? getLastSeenAt(currentPlayer.id) : null),
    () => null
  );

  const unseenClipCount = useMemo(() => {
    if (!currentPlayer) return 0;
    return countUnseenClips(allMatches, currentPlayer, lastSeenAt);
  }, [allMatches, currentPlayer, lastSeenAt]);

  const unansweredCount = useMemo(() => {
    if (!currentPlayer) return 0;
    let count = 0;
    for (const f of upcomingFixtures) {
      if (!savedResponses.find((r) => r.fixtureId === f.id && r.playerId === currentPlayer.id)) count++;
    }
    for (const s of trainingSessions) {
      if (!savedResponses.find((r) => r.trainingSessionId === s.id && r.playerId === currentPlayer.id)) count++;
    }
    return count;
  }, [upcomingFixtures, trainingSessions, savedResponses, currentPlayer]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const latestMatch = playerMatches[0];
  const latestRow = playerRows[0];
  const coachingPlan = latestRow ? buildPlayerCoachingPlan(latestRow) : null;

  const avgTacklePct = avg(playerRows.map((r) => r.tacklePct));
  const avgCarries = avg(playerRows.map((r) => r.carries));
  const avgMissed = avg(playerRows.map((r) => r.missed));
  const avgTurnovers = avg(playerRows.map((r) => r.turnovers));
  const avgMinutes = avg(playerRows.map((r) => r.minutes));
  const hasSeason = playerRows.length >= 2;

  const gradeTrend = latestRow && playerRows[1]
    ? gradeToScore(latestRow.overallGrade) - gradeToScore(playerRows[1].overallGrade)
    : 0;

  const nextFixture = upcomingFixtures[0] ?? null;
  const teamName = profile?.teamName ?? "";

  function trendIcon(latest: number, seasonAvg: number): { icon: string; cls: string } {
    if (!hasSeason) return { icon: "→", cls: "text-muted" };
    const delta = latest - seasonAvg;
    if (delta > 0.5) return { icon: "↑", cls: "text-success" };
    if (delta < -0.5) return { icon: "↓", cls: "text-danger" };
    return { icon: "→", cls: "text-muted" };
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[800px] space-y-5">

        {/* Header */}
        <section className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
              {getGreeting()}, {currentPlayer.preferredName || currentPlayer.fullName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {teamName && <span className="font-medium text-foreground">{teamName}</span>}
              {teamName && currentPlayer.primaryPosition && " · "}
              {currentPlayer.primaryPosition}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {unansweredCount > 0 && (
              <StatusPill variant="warning" size="md">
                {unansweredCount} response{unansweredCount !== 1 ? "s" : ""} needed
              </StatusPill>
            )}
            {unseenClipCount > 0 && (
              <Link
                href="/player/review"
                className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning hover:border-warning/60 transition-colors"
              >
                {unseenClipCount} new clip{unseenClipCount !== 1 ? "s" : ""} from your coach
              </Link>
            )}
          </div>
        </section>

        {/* Availability */}
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-base font-semibold text-foreground-strong">Your availability</h2>
          {hasAnyEvent ? (
            <div className="space-y-3">
              {upcomingFixtures.map((fixture) => (
                <FixtureRow
                  key={fixture.id}
                  fixture={fixture}
                  mode={getMode(fixture.id)}
                  currentResponse={savedResponses.find((r) => r.fixtureId === fixture.id && r.playerId === currentPlayer.id)}
                  reasonDraft={reasonDrafts[fixture.id] ?? ""}
                  onResponse={(r) => handleResponse(fixture.id, "fixture", r)}
                  onSaveReason={() => handleSaveReason(fixture.id, "fixture")}
                  onReasonChange={(v) => setReasonDrafts((prev) => ({ ...prev, [fixture.id]: v }))}
                  onChange={() => setMode(fixture.id, "buttons")}
                />
              ))}
              {trainingSessions.map((session) => (
                <TrainingRow
                  key={session.id}
                  session={session}
                  mode={getMode(session.id)}
                  currentResponse={savedResponses.find((r) => r.trainingSessionId === session.id && r.playerId === currentPlayer.id)}
                  reasonDraft={reasonDrafts[session.id] ?? ""}
                  onResponse={(r) => handleResponse(session.id, "session", r)}
                  onSaveReason={() => handleSaveReason(session.id, "session")}
                  onReasonChange={(v) => setReasonDrafts((prev) => ({ ...prev, [session.id]: v }))}
                  onChange={() => setMode(session.id, "buttons")}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing to respond to right now.</p>
          )}
        </section>

        {/* Season at a glance */}
        {latestRow && (
          <section>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-2">Season at a Glance</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Latest grade</div>
                <div className="mt-1.5">
                  <GradeBadge grade={latestRow.overallGrade} />
                  {gradeTrend !== 0 && (
                    <span className={`ml-1.5 text-xs font-semibold ${gradeTrend > 0 ? "text-success" : "text-danger"}`}>
                      {gradeTrend > 0 ? "↑" : "↓"}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-2">{playerMatches.length} game{playerMatches.length !== 1 ? "s" : ""} this season</div>
              </div>
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Tackle %</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground-strong">{latestRow.tacklePct.toFixed(0)}%</span>
                  {hasSeason && (
                    <span className={`text-xs font-semibold ${trendIcon(latestRow.tacklePct, avgTacklePct).cls}`}>
                      {trendIcon(latestRow.tacklePct, avgTacklePct).icon}
                    </span>
                  )}
                </div>
                {hasSeason && (
                  <div className="mt-0.5 text-[10px] text-muted-2">avg {avgTacklePct.toFixed(0)}%</div>
                )}
              </div>
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Carries</div>
                <div className="mt-0.5 text-xl font-bold text-foreground-strong">{latestRow.carries}</div>
                {hasSeason && (
                  <div className="mt-0.5 text-[10px] text-muted-2">avg {avgCarries.toFixed(1)}/game</div>
                )}
              </div>
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Games this season</div>
                <div className="mt-0.5 text-xl font-bold text-foreground-strong">{playerMatches.length}</div>
                <div className="mt-0.5 text-[10px] text-muted-2">matches tagged</div>
              </div>
            </div>
          </section>
        )}

        {/* Next game + last grade — two column */}
        {(nextFixture || latestMatch) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Next game */}
            <div className="rounded-xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-2 mb-2">Next game</p>
              {nextFixture ? (
                <>
                  <p className="text-base font-semibold text-foreground-strong">vs {nextFixture.opponent}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                    <span>{formatDate(nextFixture.date)}</span>
                    {nextFixture.time && <><span className="text-muted-2">·</span><span>{nextFixture.time}</span></>}
                    <span className="text-muted-2">·</span>
                    <span className={nextFixture.homeOrAway === "home" ? "text-success" : ""}>{nextFixture.homeOrAway}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-accent">
                    {daysUntil(nextFixture.date) === 0
                      ? "Today"
                      : daysUntil(nextFixture.date) === 1
                      ? "Tomorrow"
                      : `${daysUntil(nextFixture.date)} days away`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">No fixtures added yet.</p>
              )}
            </div>

            {/* Last grade */}
            {latestMatch && latestRow && (
              <Link
                href={`/player/games/${latestMatch.id}`}
                className="block rounded-xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)] hover:border-border-light transition-colors"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-2 mb-2">Last game</p>
                <div className="flex items-center gap-2">
                  <GradeBadge grade={latestRow.overallGrade} />
                  <span className="text-base font-semibold text-foreground-strong">vs {latestMatch.opponent || "Opponent"}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{formatDate(latestMatch.matchDate || latestMatch.createdAt)}</p>
                <p className="mt-2 text-xs text-accent">View breakdown →</p>
              </Link>
            )}
          </div>
        )}

        {/* Coach feedback — last game */}
        {coachingPlan && (
          <section className="rounded-2xl border border-border bg-panel overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="flex items-stretch">
              <div className="w-1 shrink-0 bg-accent" />
              <div className="flex-1 min-w-0 px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">Coach feedback — last game</div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground-strong mb-1.5">What went well</h3>
                    <ul className="space-y-1.5">
                      {coachingPlan.whatWentWell.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-muted leading-5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground-strong mb-1.5">Focus area</h3>
                    <p className="text-sm text-muted leading-5">{coachingPlan.mainFocus}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Targets this week */}
        {coachingPlan && coachingPlan.nextWeekTargets.length > 0 && (
          <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-3 text-base font-semibold text-foreground-strong">Your targets this week</h2>
            <ul className="space-y-2.5">
              {coachingPlan.nextWeekTargets.slice(0, 3).map((target) => (
                <li key={target} className="flex gap-2.5 text-sm text-foreground leading-5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{target}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Stats — last game */}
        {latestRow && (
          <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-3 text-base font-semibold text-foreground-strong">Stats — last game</h2>
            <div className="divide-y divide-border">
              {[
                { label: "Tackles made", value: latestRow.tackles, seasonAvg: avg(playerRows.map((r) => r.tackles)) },
                { label: "Missed tackles", value: latestRow.missed, seasonAvg: avgMissed, invert: true },
                { label: "Carries", value: latestRow.carries, seasonAvg: avgCarries },
                { label: "Turnovers won", value: latestRow.turnovers, seasonAvg: avgTurnovers },
                { label: "Minutes played", value: latestRow.minutes, seasonAvg: avgMinutes },
              ].map(({ label, value, seasonAvg, invert }) => {
                const delta = value - seasonAvg;
                const isGood = invert ? delta < -0.5 : delta > 0.5;
                const isBad = invert ? delta > 0.5 : delta < -0.5;
                const trend = hasSeason
                  ? isGood ? { icon: "↑", cls: "text-success" }
                  : isBad ? { icon: "↓", cls: "text-danger" }
                  : { icon: "→", cls: "text-muted" }
                  : null;
                return (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground-strong">{value}</span>
                      {trend && (
                        <span className={`text-xs font-semibold ${trend.cls}`}>{trend.icon}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {!latestMatch && (
              <p className="text-xs text-muted-2 mt-2">vs season average ({playerMatches.length} games)</p>
            )}
          </section>
        )}

        {/* Empty state — no matches */}
        {!latestRow && (
          <EmptyState
            icon={Trophy}
            title="Your stats will show here"
            description="Once your coach tags a match you played in, your performance will appear here."
          />
        )}

      </div>
    </main>
  );
}
