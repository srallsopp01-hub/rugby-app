"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHelp } from "@/app/components/PageHelp";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusPill } from "@/app/components/StatusPill";
import { COACH_PAGE_HELP } from "../help-content";
import {
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import { formatMatchDate } from "@/app/rugby-tagging/helpers";
import { useMatches } from "@/app/providers/MatchesContext";
import { EmptyState } from "@/app/components/EmptyState";
import { GitCompareArrows } from "lucide-react";
import { buildMatchConfidenceSummary } from "@/app/rugby-tagging/lib/matchConfidence";
import {
  buildReportRowsFromMatch,
  buildSetPieceSummary,
  buildTeamEventSummary,
  buildTeamTotals,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import type { ReportRow } from "@/app/rugby-tagging/types";

type CompareTab = "match" | "player";
type CompareSide = "left" | "right";

type MatchSnapshot = {
  match: SavedMatchRecord;
  label: string;
  opponentLabel: string;
  updatedLabel: string;
  playerCount: number;
  eventCount: number;
  notesCount: number;
  reportRows: ReportRow[];
  tacklePct: number;
  tackles: number;
  missed: number;
  carries: number;
  turnovers: number;
  involvements: number;
  lineoutPct: number;
  scrumPct: number;
  triesScored: number;
  triesConceded: number;
  penaltiesConceded: number;
  pendingEvents: number;
  unresolvedReview: number;
  readyLabel: string;
  readyTone: "ready" | "needs-work";
};

type DeltaMetric = {
  label: string;
  left: number;
  right: number;
  format: "number" | "percent" | "rate";
  lowerIsBetter?: boolean;
};

function sortMatches(matches: SavedMatchRecord[]) {
  return [...matches].sort((a, b) => {
    const aKey = (a.matchDate || a.updatedAt || a.createdAt || "").trim();
    const bKey = (b.matchDate || b.updatedAt || b.createdAt || "").trim();
    return aKey.localeCompare(bKey);
  });
}

function matchLabel(match: SavedMatchRecord, index: number) {
  if (match.matchTitle?.trim()) return match.matchTitle.trim();
  if (match.opponent?.trim()) return `vs ${match.opponent.trim()}`;
  return `Saved match ${index + 1}`;
}

function formatNumber(value: number, format: DeltaMetric["format"]) {
  if (!Number.isFinite(value)) return format === "percent" ? "0%" : "0";
  if (format === "percent") return `${value.toFixed(0)}%`;
  if (format === "rate") return value.toFixed(2);
  return value.toFixed(0);
}

function formatDelta(metric: DeltaMetric) {
  const delta = metric.right - metric.left;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatNumber(delta, metric.format)}`;
}

function deltaTone(metric: DeltaMetric) {
  const delta = metric.right - metric.left;
  if (Math.abs(delta) < 0.0001) {
    return "border-border bg-panel-2 text-muted";
  }

  const positive = metric.lowerIsBetter ? delta < 0 : delta > 0;
  return positive
    ? "border-success/40 bg-success/10 text-success"
    : "border-danger/40 bg-danger/10 text-danger";
}

function snapshotForMatch(
  match: SavedMatchRecord,
  index: number
): MatchSnapshot {
  const reportRows = buildReportRowsFromMatch(match.rosterRows, match.events);
  const totals = buildTeamTotals(reportRows);
  const setPieceSummary = buildSetPieceSummary(match.events);
  const teamEventSummary = buildTeamEventSummary(match.events);
  const confidence = buildMatchConfidenceSummary(match);
  const opponentLabel = [match.opponent ? `vs ${match.opponent}` : "", match.matchDate]
    .filter(Boolean)
    .join(" - ");

  return {
    match,
    label: matchLabel(match, index),
    opponentLabel: opponentLabel || "No opponent or date added",
    updatedLabel: match.updatedAt ? new Date(match.updatedAt).toLocaleString() : "",
    playerCount: reportRows.length,
    eventCount: Array.isArray(match.events)
      ? match.events.filter((event) => !event.isPending).length
      : 0,
    notesCount: Array.isArray(match.coachNotes) ? match.coachNotes.length : 0,
    reportRows,
    tacklePct: teamTacklePctFromTotals(totals),
    tackles: totals.tackles,
    missed: totals.missed,
    carries: totals.carries,
    turnovers: totals.turnovers,
    involvements: totals.involvements,
    lineoutPct: setPieceSummary.ownLineoutSuccessPct,
    scrumPct: setPieceSummary.ownScrumSuccessPct,
    triesScored: teamEventSummary.triesScored,
    triesConceded: teamEventSummary.triesConceded,
    penaltiesConceded: teamEventSummary.penaltiesConceded,
    pendingEvents: confidence.pendingEvents,
    unresolvedReview: confidence.unresolvedReview,
    readyLabel: confidence.readyLabel,
    readyTone: confidence.readyTone,
  };
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-border-light"
      >
        {children}
      </select>
    </label>
  );
}


function SnapshotCard({ snapshot, side }: { snapshot: MatchSnapshot; side: CompareSide }) {
  const title = side === "left" ? "Left match" : "Right match";
  const readyClass =
    snapshot.readyTone === "ready" ? "text-success" : "text-warning";

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
            {title}
          </div>
          <h2 className="mt-2 text-xl font-semibold text-foreground-strong">
            {snapshot.label}
          </h2>
          <p className="mt-1 text-sm text-muted">{snapshot.opponentLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
          Read only
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <SmallStat label="Players" value={snapshot.playerCount.toString()} />
        <SmallStat label="Events" value={snapshot.eventCount.toString()} />
        <SmallStat label="Notes" value={snapshot.notesCount.toString()} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <BigStat label="Tackle %" value={`${snapshot.tacklePct.toFixed(0)}%`} detail={`${snapshot.tackles} made / ${snapshot.missed} missed`} />
        <BigStat label="Carries" value={snapshot.carries.toString()} detail="Attacking carries" />
        <BigStat label="Lineout %" value={`${snapshot.lineoutPct.toFixed(0)}%`} detail="Own lineouts" />
        <BigStat label="Scrum %" value={`${snapshot.scrumPct.toFixed(0)}%`} detail="Own scrums" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <SmallStat label="Pending" value={snapshot.pendingEvents.toString()} />
        <SmallStat label="Review" value={snapshot.unresolvedReview.toString()} />
        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
            Report
          </div>
          <div className={`mt-1 text-sm font-semibold ${readyClass}`}>
            {snapshot.readyLabel}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-panel-2 px-3 py-3 text-xs text-muted">
        Last updated {snapshot.updatedLabel || "unknown"} - based on resolved tagged events
      </div>
    </section>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function BigStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground-strong">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function DeltaTable({ metrics }: { metrics: DeltaMetric[] }) {
  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground-strong">
            Difference
          </h2>
          <p className="mt-1 text-sm text-muted">
            Right side compared with left side.
          </p>
        </div>
        <span className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
          Green is better
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-2">Metric</th>
              <th className="p-2 text-right">Left</th>
              <th className="p-2 text-right">Right</th>
              <th className="p-2 text-right">Delta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.label} className="border-b border-border/60">
                <td className="p-2 font-medium text-foreground">{metric.label}</td>
                <td className="p-2 text-right text-muted">
                  {formatNumber(metric.left, metric.format)}
                </td>
                <td className="p-2 text-right text-muted">
                  {formatNumber(metric.right, metric.format)}
                </td>
                <td className="p-2 text-right">
                  <span
                    className={`inline-flex min-w-[72px] justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${deltaTone(metric)}`}
                  >
                    {formatDelta(metric)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlayerCard({
  row,
  side,
}: {
  row: ReportRow | null;
  side: CompareSide;
}) {
  const title = side === "left" ? "Left player" : "Right player";

  if (!row) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-panel p-5 text-sm text-muted">
        No player data available for this side.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
        {title}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-foreground-strong">
          {row.name}
        </h2>
        <StatusPill size="md">
          #{row.number || "-"} - {row.position || "No position"}
        </StatusPill>
        <StatusPill size="md">
          {row.unit}
        </StatusPill>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <SmallStat label="Minutes" value={row.minutes.toString()} />
        <SmallStat label="Grade" value={row.overallGrade} />
        <SmallStat label="Inv" value={row.involvements.toString()} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <BigStat label="Tackle %" value={`${row.tacklePct.toFixed(0)}%`} detail={`${row.tackles} made / ${row.missed} missed`} />
        <BigStat label="Carries" value={row.carries.toString()} detail={`${row.carriesPerMin.toFixed(2)} per min`} />
        <BigStat label="Turnovers" value={row.turnovers.toString()} detail="Breakdown impact" />
        <BigStat label="Work rate" value={row.involvementsPerMin.toFixed(2)} detail="Involvements per min" />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-panel-2 p-4 text-sm leading-6 text-muted">
        {row.coachComment || "No coach comment available."}
      </div>
    </section>
  );
}

export default function ComparePage() {
  const { matches: rawMatches, isLoading } = useMatches();
  const savedMatches = useMemo(() => sortMatches(rawMatches), [rawMatches]);
  const hasLoaded = !isLoading;
  const [activeTab, setActiveTab] = useState<CompareTab>("match");
  const [leftMatchId, setLeftMatchId] = useState("");
  const [rightMatchId, setRightMatchId] = useState("");
  const [leftPlayerName, setLeftPlayerName] = useState("");
  const [rightPlayerName, setRightPlayerName] = useState("");

  useEffect(() => {
    if (!hasLoaded || savedMatches.length === 0) return;
    const latest = savedMatches[savedMatches.length - 1];
    const previous = savedMatches[savedMatches.length - 2];
    if (previous && !leftMatchId) setLeftMatchId(previous.id);
    if (latest && !rightMatchId) setRightMatchId(latest.id);
  }, [hasLoaded, savedMatches, leftMatchId, rightMatchId]);

  const snapshots = useMemo(
    () => savedMatches.map((match, index) => snapshotForMatch(match, index)),
    [savedMatches]
  );

  const leftSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.match.id === leftMatchId) || null,
    [snapshots, leftMatchId]
  );

  const rightSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.match.id === rightMatchId) || null,
    [snapshots, rightMatchId]
  );

  const isSameMatchSelected =
    Boolean(leftMatchId) && Boolean(rightMatchId) && leftMatchId === rightMatchId;

  useEffect(() => {
    if (!leftSnapshot) {
      setLeftPlayerName("");
      return;
    }
    if (!leftSnapshot.reportRows.some((row) => row.name === leftPlayerName)) {
      setLeftPlayerName(leftSnapshot.reportRows[0]?.name || "");
    }
  }, [leftSnapshot, leftPlayerName]);

  useEffect(() => {
    if (!rightSnapshot) {
      setRightPlayerName("");
      return;
    }
    if (!rightSnapshot.reportRows.some((row) => row.name === rightPlayerName)) {
      // When the same match is on both sides, default right to the second player
      // so the comparison isn't immediately player-vs-themselves
      const fallback = isSameMatchSelected
        ? (rightSnapshot.reportRows[1]?.name || rightSnapshot.reportRows[0]?.name || "")
        : (rightSnapshot.reportRows[0]?.name || "");
      setRightPlayerName(fallback);
    }
  }, [rightSnapshot, rightPlayerName, isSameMatchSelected]);

  const matchMetrics = useMemo<DeltaMetric[]>(() => {
    if (!leftSnapshot || !rightSnapshot) return [];
    return [
      { label: "Tackle %", left: leftSnapshot.tacklePct, right: rightSnapshot.tacklePct, format: "percent" },
      { label: "Tackles", left: leftSnapshot.tackles, right: rightSnapshot.tackles, format: "number" },
      { label: "Missed tackles", left: leftSnapshot.missed, right: rightSnapshot.missed, format: "number", lowerIsBetter: true },
      { label: "Carries", left: leftSnapshot.carries, right: rightSnapshot.carries, format: "number" },
      { label: "Turnovers", left: leftSnapshot.turnovers, right: rightSnapshot.turnovers, format: "number" },
      { label: "Involvements", left: leftSnapshot.involvements, right: rightSnapshot.involvements, format: "number" },
      { label: "Lineout %", left: leftSnapshot.lineoutPct, right: rightSnapshot.lineoutPct, format: "percent" },
      { label: "Scrum %", left: leftSnapshot.scrumPct, right: rightSnapshot.scrumPct, format: "percent" },
      { label: "Tries scored", left: leftSnapshot.triesScored, right: rightSnapshot.triesScored, format: "number" },
      { label: "Tries conceded", left: leftSnapshot.triesConceded, right: rightSnapshot.triesConceded, format: "number", lowerIsBetter: true },
      { label: "Penalties conceded", left: leftSnapshot.penaltiesConceded, right: rightSnapshot.penaltiesConceded, format: "number", lowerIsBetter: true },
    ];
  }, [leftSnapshot, rightSnapshot]);

  const leftPlayer = useMemo(
    () =>
      leftSnapshot?.reportRows.find((row) => row.name === leftPlayerName) ||
      null,
    [leftSnapshot, leftPlayerName]
  );

  const rightPlayer = useMemo(
    () =>
      rightSnapshot?.reportRows.find((row) => row.name === rightPlayerName) ||
      null,
    [rightSnapshot, rightPlayerName]
  );

  const playerMetrics = useMemo<DeltaMetric[]>(() => {
    if (!leftPlayer || !rightPlayer) return [];
    return [
      { label: "Minutes", left: leftPlayer.minutes, right: rightPlayer.minutes, format: "number" },
      { label: "Tackle %", left: leftPlayer.tacklePct, right: rightPlayer.tacklePct, format: "percent" },
      { label: "Tackles", left: leftPlayer.tackles, right: rightPlayer.tackles, format: "number" },
      { label: "Missed tackles", left: leftPlayer.missed, right: rightPlayer.missed, format: "number", lowerIsBetter: true },
      { label: "Carries", left: leftPlayer.carries, right: rightPlayer.carries, format: "number" },
      { label: "Turnovers", left: leftPlayer.turnovers, right: rightPlayer.turnovers, format: "number" },
      { label: "Involvements", left: leftPlayer.involvements, right: rightPlayer.involvements, format: "number" },
      { label: "Tackles/min", left: leftPlayer.tacklesPerMin, right: rightPlayer.tacklesPerMin, format: "rate" },
      { label: "Carries/min", left: leftPlayer.carriesPerMin, right: rightPlayer.carriesPerMin, format: "rate" },
      { label: "Inv/min", left: leftPlayer.involvementsPerMin, right: rightPlayer.involvementsPerMin, format: "rate" },
    ];
  }, [leftPlayer, rightPlayer]);

  const renderMatchOptions = (side: CompareSide) =>
    snapshots.map((snapshot) => (
      <option
        key={snapshot.match.id}
        value={snapshot.match.id}
        disabled={
          activeTab === "match" &&
          (side === "left"
            ? snapshot.match.id === rightMatchId
            : snapshot.match.id === leftMatchId)
        }
      >
        {snapshot.label}
        {snapshot.match.matchDate ? ` - ${formatMatchDate(snapshot.match.matchDate)}` : ""}
      </option>
    ));

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1900px]">
          <PageHeader title="Compare" subtitle="Loading saved match data..." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <PageHeader
          title="Compare"
          subtitle="Side-by-side comparison for saved matches and player output. This screen reads saved match records and uses resolved tagged events."
          helpButton={<PageHelp {...COACH_PAGE_HELP["/coach/compare"]} />}
          status={
            <span className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              Comparison only - no tagging or film review
            </span>
          }
        />

        {savedMatches.length === 0 ? (
          <EmptyState
            icon={GitCompareArrows}
            title="No saved matches yet"
            description="Save a match from Capture first, then return here to compare team and player performance."
            action={{ label: "Open Capture", href: "/coach/capture" }}
            secondaryAction={{ label: "View Saved Matches", href: "/coach/saved-matches" }}
          />
        ) : savedMatches.length < 2 ? (
          <EmptyState
            icon={GitCompareArrows}
            title="Need at least 2 matches"
            description="Capture one more match to unlock side-by-side comparison."
            action={{ label: "Open Capture", href: "/coach/capture" }}
            secondaryAction={{ label: "View Saved Matches", href: "/coach/saved-matches" }}
          />
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="inline-flex w-fit rounded-xl border border-border bg-panel-2 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("match")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      activeTab === "match"
                        ? "bg-panel-3 text-foreground-strong"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Match comparison
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("player")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      activeTab === "player"
                        ? "bg-panel-3 text-foreground-strong"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Player comparison
                  </button>
                </div>

                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 xl:max-w-[980px] xl:grid-cols-2">
                  <SelectField
                    label="Left match"
                    value={leftMatchId}
                    onChange={setLeftMatchId}
                  >
                    {renderMatchOptions("left")}
                  </SelectField>
                  <SelectField
                    label="Right match"
                    value={rightMatchId}
                    onChange={setRightMatchId}
                  >
                    {renderMatchOptions("right")}
                  </SelectField>
                </div>
              </div>
            </section>

            {isSameMatchSelected && activeTab === "match" && (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                Choose two different saved matches to compare. The same match cannot produce a useful delta.
              </div>
            )}

            {leftSnapshot && rightSnapshot && !isSameMatchSelected && activeTab === "match" && (
              <>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <SnapshotCard snapshot={leftSnapshot} side="left" />
                  <SnapshotCard snapshot={rightSnapshot} side="right" />
                </div>
                <DeltaTable metrics={matchMetrics} />
              </>
            )}

            {leftSnapshot && rightSnapshot && activeTab === "player" && (
              <>
                <section className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                  {isSameMatchSelected && (
                    <p className="mb-3 text-xs text-muted">
                      Comparing two players from the same match —{" "}
                      <span className="font-medium text-foreground">{leftSnapshot.label}</span>
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SelectField
                      label="Left player"
                      value={leftPlayerName}
                      onChange={setLeftPlayerName}
                    >
                      {leftSnapshot.reportRows.map((row) => (
                        <option key={row.name} value={row.name}>
                          {row.name} - {row.position || "No position"}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Right player"
                      value={rightPlayerName}
                      onChange={setRightPlayerName}
                    >
                      {rightSnapshot.reportRows.map((row) => (
                        <option key={row.name} value={row.name}>
                          {row.name} - {row.position || "No position"}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <PlayerCard row={leftPlayer} side="left" />
                  <PlayerCard row={rightPlayer} side="right" />
                </div>
                <DeltaTable metrics={playerMetrics} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
