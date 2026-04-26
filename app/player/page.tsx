"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePlayer } from "./PlayerContext";
import { PlayerPicker } from "./PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
import { buildReportRowsFromMatch } from "@/app/rugby-tagging/helpers";
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

const GRADE_ORDER = ["Dominant", "Competitive", "Below", "Poor"];

function focusTip(row: ReportRow): string {
  const grades = [
    { grade: row.tacklePctGrade, tip: "Work on your tackle accuracy" },
    { grade: row.tacklesPerMinGrade, tip: "Increase your tackle work rate" },
    { grade: row.carriesPerMinGrade, tip: "Look for more carries each game" },
    { grade: row.workRateGrade, tip: "Boost your overall involvement rate" },
  ];
  const sorted = [...grades].sort((a, b) => GRADE_ORDER.indexOf(b.grade) - GRADE_ORDER.indexOf(a.grade));
  return sorted[0].tip;
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

  const avgTacklePct = avg(playerRows.map((r) => r.tacklePct));
  const avgCarriesPerMin = avg(playerRows.map((r) => r.carriesPerMin));
  const avgInvPerMin = avg(playerRows.map((r) => r.involvementsPerMin));

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground-strong">
          Welcome back, {currentPlayer.preferredName || currentPlayer.fullName}
        </h1>
        <p className="mt-1 text-sm text-muted">{currentPlayer.primaryPosition}</p>
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
              <GradeBadge grade={latestRow.overallGrade} />
              <p className="mt-1 text-xs text-muted-2">Overall grade</p>
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

      {/* Coach comment */}
      {latestRow && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-2">Coach comment</p>
          <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{latestRow.coachComment}&rdquo;</p>
        </div>
      )}

      {/* Focus area */}
      {latestRow && (
        <div className="rounded-xl border border-border bg-panel-2 p-5 flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel-3 border border-border">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-1">Focus area</p>
            <p className="text-sm font-medium text-foreground-strong">{focusTip(latestRow)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
