"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePlayer } from "./PlayerContext";
import { PageHelp } from "@/components/PageHelp";
import { PLAYER_PAGE_HELP } from "./help-content";
import { PlayerPicker } from "./PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
import { buildReportRowsFromMatch, gradeToScore } from "@/app/rugby-tagging/helpers";
import { buildPlayerCoachingPlan } from "./playerCoachingPlan";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { ReportRow } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

function getPlayerMatches(matches: SavedMatchRecord[], player: SquadPlayer) {
  return matches.filter((m) =>
    m.rosterRows.some((r) => r.name === player.fullName || r.name === player.preferredName)
  );
}

function getPlayerRow(match: SavedMatchRecord, player: SquadPlayer): ReportRow | null {
  const rows = buildReportRowsFromMatch(match.rosterRows, match.events);
  return rows.find((r) => r.name === player.fullName || r.name === player.preferredName) ?? null;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const noSubscribe = () => () => {};

export default function PlayerHomePage() {
  const { currentPlayer, ready } = usePlayer();

  const matchesRaw = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const playerMatches = useMemo<SavedMatchRecord[]>(() => {
    if (!currentPlayer) return [];
    let all: SavedMatchRecord[];
    try { all = JSON.parse(matchesRaw); } catch { return []; }
    return getPlayerMatches(all, currentPlayer);
  }, [matchesRaw, currentPlayer]);

  const playerRows = useMemo<ReportRow[]>(() => {
    if (!currentPlayer) return [];
    return playerMatches.map((m) => getPlayerRow(m, currentPlayer)).filter(Boolean) as ReportRow[];
  }, [playerMatches, currentPlayer]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const latestMatch = playerMatches[0];
  const latestRow = playerRows[0];
  const coachingPlan = latestRow ? buildPlayerCoachingPlan(latestRow) : null;

  const avgTacklePct = avg(playerRows.map((r) => r.tacklePct));
  const avgCarriesPerMin = avg(playerRows.map((r) => r.carriesPerMin));
  const avgInvPerMin = avg(playerRows.map((r) => r.involvementsPerMin));

  const prevRow = playerRows[1] ?? null;
  const gradeTrend = latestRow && prevRow
    ? gradeToScore(latestRow.overallGrade) - gradeToScore(prevRow.overallGrade)
    : 0;

  const focusChips: string[] = latestRow ? [
    ...(latestRow.tacklePctGrade === "Below" || latestRow.tacklePctGrade === "Poor" ? ["Tackle Accuracy"] : []),
    ...(latestRow.carriesPerMinGrade === "Below" || latestRow.carriesPerMinGrade === "Poor" ? ["Carry Volume"] : []),
    ...(latestRow.workRateGrade === "Below" || latestRow.workRateGrade === "Poor" ? ["Work Rate"] : []),
    ...(latestRow.tacklesPerMinGrade === "Below" || latestRow.tacklesPerMinGrade === "Poor" ? ["Tackle Frequency"] : []),
  ] : [];

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-strong">
            Welcome back, {currentPlayer.preferredName || currentPlayer.fullName}
          </h1>
          <p className="mt-1 text-sm text-muted">{currentPlayer.primaryPosition}</p>
        </div>
        <PageHelp {...PLAYER_PAGE_HELP["/player"]} />
      </div>

      {/* Latest match */}
      {latestMatch && latestRow ? (
        <div className="rounded-xl border border-border bg-panel p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">Latest match</p>
              <p className="mt-1 text-base font-semibold text-foreground-strong">
                vs {latestMatch.opponent || "Opponent"}
              </p>
              <p className="text-xs text-muted">{formatDate(latestMatch.matchDate)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <GradeBadge grade={latestRow.overallGrade} />
                {gradeTrend !== 0 && (
                  <span className={`text-xs font-semibold ${gradeTrend > 0 ? "text-success" : "text-danger"}`}>
                    {gradeTrend > 0 ? "↑" : "↓"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-2">
                Overall grade{gradeTrend !== 0 && prevRow ? ` · ${gradeTrend > 0 ? "up" : "down"} from ${prevRow.overallGrade}` : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tackle %", value: `${latestRow.tacklePct.toFixed(0)}%` },
              { label: "Carries", value: String(latestRow.carries) },
              { label: "Involvements", value: String(latestRow.involvements) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-panel-2 px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-foreground-strong">{value}</p>
                <p className="text-[11px] text-muted-2 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <Link
            href={`/player/games/${latestMatch.id}`}
            className="block text-center text-xs text-muted hover:text-foreground transition-colors duration-150"
          >
            View full game breakdown →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">No matches tagged yet.</p>
          <p className="mt-1 text-xs text-muted-2">Ask your coach to tag you in a game.</p>
        </div>
      )}

      {/* Season averages */}
      {playerRows.length >= 2 && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-3">Season averages · {playerRows.length} games</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg tackle %", value: `${avgTacklePct.toFixed(0)}%` },
              { label: "Carries/min", value: avgCarriesPerMin.toFixed(2) },
              { label: "Inv/min", value: avgInvPerMin.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-panel-2 px-3 py-2.5 text-center">
                <p className="text-base font-semibold text-foreground-strong">{value}</p>
                <p className="text-[11px] text-muted-2 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Focus Areas */}
      {focusChips.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-warning">Focus Areas This Week</p>
          <div className="flex flex-wrap gap-2">
            {focusChips.map((chip) => (
              <span key={chip} className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                {chip}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personal coaching plan */}
      {coachingPlan && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">
            Your coaching plan
          </p>
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground-strong">What went well</h2>
              <ul className="mt-2 space-y-2">
                {coachingPlan.whatWentWell.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <h2 className="text-sm font-semibold text-foreground-strong">Main focus</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{coachingPlan.mainFocus}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground-strong">Next week targets</h2>
              <ul className="mt-2 space-y-2">
                {coachingPlan.nextWeekTargets.map((target) => (
                  <li key={target} className="flex gap-2 text-sm leading-6 text-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    <span>{target}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
