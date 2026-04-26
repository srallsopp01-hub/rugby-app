"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { PageHelp } from "@/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import { PlayerPicker } from "../PlayerPicker";
import { usePlayer } from "../PlayerContext";
import { SAVED_MATCHES_KEY, type SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import {
  buildReportRowsFromMatch,
  buildSetPieceSummary,
  buildTeamEventSummary,
  buildTeamTotals,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import { buildPlayerCoachingPlan } from "../playerCoachingPlan";
import type { ReportRow } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

type CompareMode = "matches" | "players";

type Snapshot = {
  match: SavedMatchRecord;
  label: string;
  rows: ReportRow[];
  tacklePct: number;
  tackles: number;
  missed: number;
  carries: number;
  involvements: number;
  lineoutPct: number;
  scrumPct: number;
  triesScored: number;
  triesConceded: number;
  penaltiesConceded: number;
};

type Metric = {
  label: string;
  left: number;
  right: number;
  format: "number" | "percent" | "rate";
  lowerIsBetter?: boolean;
};

const noSubscribe = () => () => {};

function parseMatches(snapshot: string): SavedMatchRecord[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

function buildSnapshot(match: SavedMatchRecord, index: number): Snapshot {
  const resolvedEvents = (match.events || []).filter((event) => !event.isPending);
  const rows = buildReportRowsFromMatch(match.rosterRows, resolvedEvents);
  const totals = buildTeamTotals(rows);
  const setPiece = buildSetPieceSummary(resolvedEvents);
  const teamEvents = buildTeamEventSummary(resolvedEvents);

  return {
    match,
    label: matchLabel(match, index),
    rows,
    tacklePct: teamTacklePctFromTotals(totals),
    tackles: totals.tackles,
    missed: totals.missed,
    carries: totals.carries,
    involvements: totals.involvements,
    lineoutPct: setPiece.ownLineoutSuccessPct,
    scrumPct: setPiece.ownScrumSuccessPct,
    triesScored: teamEvents.triesScored,
    triesConceded: teamEvents.triesConceded,
    penaltiesConceded: teamEvents.penaltiesConceded,
  };
}

function formatNumber(value: number, format: Metric["format"]) {
  if (!Number.isFinite(value)) return format === "percent" ? "0%" : "0";
  if (format === "percent") return `${value.toFixed(0)}%`;
  if (format === "rate") return value.toFixed(2);
  return value.toFixed(0);
}

function deltaTone(metric: Metric) {
  const delta = metric.right - metric.left;
  if (Math.abs(delta) < 0.0001) return "border-border bg-panel-2 text-muted";
  const positive = metric.lowerIsBetter ? delta < 0 : delta > 0;
  return positive
    ? "border-success/40 bg-success/10 text-success"
    : "border-danger/40 bg-danger/10 text-danger";
}

function DeltaTable({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground-strong">Difference</h2>
        <p className="mt-1 text-sm text-muted">Right side compared with left side.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-2">Metric</th>
              <th className="p-2 text-right">Left</th>
              <th className="p-2 text-right">Right</th>
              <th className="p-2 text-right">Delta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const delta = metric.right - metric.left;
              const sign = delta > 0 ? "+" : "";

              return (
                <tr key={metric.label} className="border-b border-border/60">
                  <td className="p-2 font-medium text-foreground">{metric.label}</td>
                  <td className="p-2 text-right text-muted">
                    {formatNumber(metric.left, metric.format)}
                  </td>
                  <td className="p-2 text-right text-muted">
                    {formatNumber(metric.right, metric.format)}
                  </td>
                  <td className="p-2 text-right">
                    <span className={`inline-flex min-w-[72px] justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${deltaTone(metric)}`}>
                      {sign}
                      {formatNumber(delta, metric.format)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
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
        className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-foreground"
      >
        {children}
      </select>
    </label>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground-strong">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function MatchCard({ snapshot, title }: { snapshot: Snapshot; title: string }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
        {title}
      </div>
      <h2 className="mt-2 text-xl font-semibold text-foreground-strong">{snapshot.label}</h2>
      <p className="mt-1 text-sm text-muted">
        {[snapshot.match.opponent ? `vs ${snapshot.match.opponent}` : "", snapshot.match.matchDate]
          .filter(Boolean)
          .join(" - ") || "No opponent or date added"}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Tackle %" value={`${snapshot.tacklePct.toFixed(0)}%`} detail={`${snapshot.tackles} made / ${snapshot.missed} missed`} />
        <StatCard label="Carries" value={String(snapshot.carries)} detail="Team carries" />
        <StatCard label="Lineout %" value={`${snapshot.lineoutPct.toFixed(0)}%`} detail="Own lineouts" />
        <StatCard label="Scrum %" value={`${snapshot.scrumPct.toFixed(0)}%`} detail="Own scrums" />
      </div>
    </section>
  );
}

function isCurrentPlayerRow(row: ReportRow, player: SquadPlayer) {
  return row.name === player.fullName || row.name === player.preferredName;
}

function PlayerCard({
  row,
  title,
  currentPlayer,
}: {
  row: ReportRow | null;
  title: string;
  currentPlayer: SquadPlayer;
}) {
  if (!row) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-panel p-5 text-sm text-muted">
        No player data available for this side.
      </section>
    );
  }

  const canShowCoachingPlan = isCurrentPlayerRow(row, currentPlayer);
  const coachingPlan = canShowCoachingPlan ? buildPlayerCoachingPlan(row) : null;

  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
        {title}
      </div>
      <h2 className="mt-2 text-xl font-semibold text-foreground-strong">{row.name}</h2>
      <p className="mt-1 text-sm text-muted">
        #{row.number || "-"} - {row.position || "No position"} - {row.unit}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Tackle %" value={`${row.tacklePct.toFixed(0)}%`} detail={`${row.tackles} made / ${row.missed} missed`} />
        <StatCard label="Carries" value={String(row.carries)} detail={`${row.carriesPerMin.toFixed(2)} per min`} />
        <StatCard label="Involvements" value={String(row.involvements)} detail={`${row.involvementsPerMin.toFixed(2)} per min`} />
        <StatCard label="Turnovers" value={String(row.turnovers)} detail="Breakdown impact" />
      </div>

      {coachingPlan ? (
        <div className="mt-5 rounded-xl border border-border bg-panel-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
            Your coaching plan
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">{coachingPlan.mainFocus}</p>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
              Next week targets
            </p>
            <ul className="mt-2 space-y-2">
              {coachingPlan.nextWeekTargets.slice(0, 3).map((target) => (
                <li key={target} className="flex gap-2 text-sm leading-6 text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span>{target}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function PlayerComparePage() {
  const { currentPlayer, ready } = usePlayer();
  const [mode, setMode] = useState<CompareMode>("matches");
  const [leftMatchChoice, setLeftMatchChoice] = useState("");
  const [rightMatchChoice, setRightMatchChoice] = useState("");
  const [leftPlayerChoice, setLeftPlayerChoice] = useState("");
  const [rightPlayerChoice, setRightPlayerChoice] = useState("");

  const matchesRaw = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const snapshots = useMemo(() => {
    const matches = sortMatches(parseMatches(matchesRaw));
    return matches.map((match, index) => buildSnapshot(match, index));
  }, [matchesRaw]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const latest = snapshots[snapshots.length - 1] || null;
  const previous = snapshots[snapshots.length - 2] || null;
  const leftMatchId = leftMatchChoice || previous?.match.id || latest?.match.id || "";
  const rightMatchId = rightMatchChoice || latest?.match.id || previous?.match.id || "";
  const leftSnapshot = snapshots.find((snapshot) => snapshot.match.id === leftMatchId) || null;
  const rightSnapshot = snapshots.find((snapshot) => snapshot.match.id === rightMatchId) || null;
  const sameMatch = Boolean(leftMatchId && rightMatchId && leftMatchId === rightMatchId);

  const leftPlayerName =
    leftPlayerChoice ||
    leftSnapshot?.rows.find((row) => row.name === currentPlayer.fullName || row.name === currentPlayer.preferredName)?.name ||
    leftSnapshot?.rows[0]?.name ||
    "";
  const rightPlayerName =
    rightPlayerChoice ||
    rightSnapshot?.rows.find((row) => row.name !== leftPlayerName)?.name ||
    rightSnapshot?.rows[0]?.name ||
    "";

  const leftPlayer = leftSnapshot?.rows.find((row) => row.name === leftPlayerName) || null;
  const rightPlayer = rightSnapshot?.rows.find((row) => row.name === rightPlayerName) || null;

  const matchMetrics = leftSnapshot && rightSnapshot ? [
    { label: "Tackle %", left: leftSnapshot.tacklePct, right: rightSnapshot.tacklePct, format: "percent" },
    { label: "Tackles", left: leftSnapshot.tackles, right: rightSnapshot.tackles, format: "number" },
    { label: "Missed tackles", left: leftSnapshot.missed, right: rightSnapshot.missed, format: "number", lowerIsBetter: true },
    { label: "Carries", left: leftSnapshot.carries, right: rightSnapshot.carries, format: "number" },
    { label: "Involvements", left: leftSnapshot.involvements, right: rightSnapshot.involvements, format: "number" },
    { label: "Lineout %", left: leftSnapshot.lineoutPct, right: rightSnapshot.lineoutPct, format: "percent" },
    { label: "Scrum %", left: leftSnapshot.scrumPct, right: rightSnapshot.scrumPct, format: "percent" },
    { label: "Tries scored", left: leftSnapshot.triesScored, right: rightSnapshot.triesScored, format: "number" },
    { label: "Tries conceded", left: leftSnapshot.triesConceded, right: rightSnapshot.triesConceded, format: "number", lowerIsBetter: true },
    { label: "Penalties conceded", left: leftSnapshot.penaltiesConceded, right: rightSnapshot.penaltiesConceded, format: "number", lowerIsBetter: true },
  ] satisfies Metric[] : [];

  const playerMetrics = leftPlayer && rightPlayer ? [
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
  ] satisfies Metric[] : [];

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground-strong">Compare</h1>
            <PageHelp {...PLAYER_PAGE_HELP["/player/compare"]} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Compare saved matches or player output from the same read-only match data coaches use.
          </p>
        </header>

        {snapshots.length < 2 ? (
          <section className="rounded-xl border border-dashed border-border bg-panel p-8 text-center">
            <p className="text-sm font-medium text-foreground">At least two saved matches are needed.</p>
            <p className="mt-1 text-xs text-muted">Ask your coach to save more matches after tagging.</p>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-panel p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="inline-flex w-fit rounded-xl border border-border bg-panel-2 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("matches")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "matches" ? "bg-panel-3 text-foreground-strong" : "text-muted hover:text-foreground"}`}
                  >
                    Match comparison
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("players")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "players" ? "bg-panel-3 text-foreground-strong" : "text-muted hover:text-foreground"}`}
                  >
                    Player comparison
                  </button>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 xl:max-w-[900px] xl:grid-cols-2">
                  <SelectField label="Left match" value={leftMatchId} onChange={setLeftMatchChoice}>
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.match.id} value={snapshot.match.id}>
                        {snapshot.label}
                        {snapshot.match.matchDate ? ` - ${snapshot.match.matchDate}` : ""}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Right match" value={rightMatchId} onChange={setRightMatchChoice}>
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.match.id} value={snapshot.match.id}>
                        {snapshot.label}
                        {snapshot.match.matchDate ? ` - ${snapshot.match.matchDate}` : ""}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </section>

            {sameMatch && mode === "matches" ? (
              <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                Choose two different saved matches to compare match performance.
              </div>
            ) : null}

            {leftSnapshot && rightSnapshot && mode === "matches" && !sameMatch ? (
              <>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <MatchCard snapshot={leftSnapshot} title="Left match" />
                  <MatchCard snapshot={rightSnapshot} title="Right match" />
                </div>
                <DeltaTable metrics={matchMetrics} />
              </>
            ) : null}

            {leftSnapshot && rightSnapshot && mode === "players" ? (
              <>
                <section className="rounded-xl border border-border bg-panel p-4">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SelectField label="Left player" value={leftPlayerName} onChange={setLeftPlayerChoice}>
                      {leftSnapshot.rows.map((row) => (
                        <option key={row.name} value={row.name}>
                          {row.name} - {row.position || "No position"}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField label="Right player" value={rightPlayerName} onChange={setRightPlayerChoice}>
                      {rightSnapshot.rows.map((row) => (
                        <option key={row.name} value={row.name}>
                          {row.name} - {row.position || "No position"}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </section>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <PlayerCard row={leftPlayer} title="Left player" currentPlayer={currentPlayer} />
                  <PlayerCard row={rightPlayer} title="Right player" currentPlayer={currentPlayer} />
                </div>
                <DeltaTable metrics={playerMetrics} />
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
