"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppTopNav from "../rugby-tagging/components/AppTopNav";
import TeamSnapshotPanel from "../rugby-tagging/components/TeamSnapshotPanel";
import {
  DEFAULT_ROSTER_ROWS,
  STORAGE_KEY,
} from "../rugby-tagging/constants";
import {
  buildBasicStats,
  buildCoachComment,
  getUnitFromPosition,
  gradeCarriesPerMin,
  gradeInvPerMin,
  gradeTacklePct,
  gradeTacklesPerMin,
  gradeToScore,
  gradeTurnovers,
  hydrateRosterRows,
  scoreToGrade,
} from "../rugby-tagging/helpers";
import type {
  EventItem,
  ReportRow,
  RosterRow,
  UnitSummaryRow,
} from "../rugby-tagging/types";

type SavedSession = {
  matchTitle?: string;
  opponent?: string;
  matchDate?: string;
  rosterRows?: RosterRow[];
  events?: EventItem[];
  coachNotes?: Array<{
    id: number;
    timestamp: number;
    text: string;
    rawText?: string;
  }>;
  reviewQueue?: unknown[];
  selectedPlayer?: string;
  activeMode?: "stat" | "game-review";
  showRawTranscript?: boolean;
};

export default function TeamDashboardPage() {
  const router = useRouter();

  const [matchTitle, setMatchTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [rosterRows, setRosterRows] = useState<RosterRow[]>(DEFAULT_ROSTER_ROWS);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: SavedSession = JSON.parse(raw);
      const safeEvents = Array.isArray(saved.events)
        ? saved.events.filter((event) => !event.isPending)
        : [];

      setMatchTitle(saved.matchTitle || "");
      setOpponent(saved.opponent || "");
      setMatchDate(saved.matchDate || "");
      setRosterRows(hydrateRosterRows(saved.rosterRows));
      setEvents(safeEvents);
    } catch (error) {
      console.error("Failed to load saved session", error);
    }
  }, []);

  const players = rosterRows.map((row) => row.name.trim()).filter(Boolean);

  const reportRows = useMemo(() => {
    const baseStats = buildBasicStats(players, events);

    return rosterRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const name = row.name.trim();
        const playerStats = baseStats[name] || {
          tackles: 0,
          missed: 0,
          carries: 0,
          turnovers: 0,
        };

        const minutes = typeof row.minutes === "number" ? row.minutes : 0;
        const involvements =
          playerStats.tackles +
          playerStats.missed +
          playerStats.carries +
          playerStats.turnovers;

        const tacklePct =
          playerStats.tackles + playerStats.missed > 0
            ? (playerStats.tackles /
                (playerStats.tackles + playerStats.missed)) *
              100
            : 0;

        const tacklesPerMin = minutes > 0 ? playerStats.tackles / minutes : 0;
        const carriesPerMin = minutes > 0 ? playerStats.carries / minutes : 0;
        const involvementsPerMin = minutes > 0 ? involvements / minutes : 0;

        const tacklePctGrade = gradeTacklePct(tacklePct);
        const tacklesPerMinGrade = gradeTacklesPerMin(tacklesPerMin);
        const carriesPerMinGrade = gradeCarriesPerMin(carriesPerMin);
        const workRateGrade = gradeInvPerMin(involvementsPerMin);
        const turnoverGrade = gradeTurnovers(playerStats.turnovers);

        const overallScore =
          (gradeToScore(tacklePctGrade) +
            gradeToScore(tacklesPerMinGrade) +
            gradeToScore(carriesPerMinGrade) +
            gradeToScore(workRateGrade) +
            gradeToScore(turnoverGrade)) /
          5;

        const overallGrade = scoreToGrade(overallScore);

        const reportRow: ReportRow = {
          number: row.number,
          name,
          position: row.position,
          unit: getUnitFromPosition(row.position),
          minutes,
          tackles: playerStats.tackles,
          missed: playerStats.missed,
          carries: playerStats.carries,
          turnovers: playerStats.turnovers,
          involvements,
          tacklePct,
          tacklesPerMin,
          carriesPerMin,
          involvementsPerMin,
          tacklePctGrade,
          tacklesPerMinGrade,
          carriesPerMinGrade,
          workRateGrade,
          overallGrade,
          coachComment: "",
        };

        reportRow.coachComment = buildCoachComment(reportRow);
        return reportRow;
      });
  }, [rosterRows, events, players]);

  const unitSummaryRows = useMemo(() => {
    const unitOrder = [
      "Front Row",
      "Locks",
      "Back Row",
      "Half Backs",
      "Inside Backs",
      "Outside Backs",
      "Bench",
    ];

    return unitOrder
      .map((unit) => {
        const rows = reportRows.filter((row) => row.unit === unit);
        if (rows.length === 0) return null;

        return {
          unit,
          players: rows.length,
          avgTacklesPerMin:
            rows.reduce((acc, row) => acc + row.tacklesPerMin, 0) / rows.length,
          avgCarriesPerMin:
            rows.reduce((acc, row) => acc + row.carriesPerMin, 0) / rows.length,
          avgInvolvementsPerMin:
            rows.reduce((acc, row) => acc + row.involvementsPerMin, 0) / rows.length,
        } as UnitSummaryRow;
      })
      .filter(Boolean) as UnitSummaryRow[];
  }, [reportRows]);

  const teamTotals = useMemo(() => {
    return reportRows.reduce(
      (acc, row) => {
        acc.minutes += row.minutes;
        acc.tackles += row.tackles;
        acc.missed += row.missed;
        acc.carries += row.carries;
        acc.turnovers += row.turnovers;
        acc.involvements += row.involvements;
        return acc;
      },
      {
        minutes: 0,
        tackles: 0,
        missed: 0,
        carries: 0,
        turnovers: 0,
        involvements: 0,
      }
    );
  }, [reportRows]);

  const teamEventSummary = useMemo(() => {
    const teamEvents = events.filter(
      (event) => !event.isPending && event.category === "team"
    );

    return {
      penaltiesConceded: teamEvents.filter(
        (event) => event.teamEventType === "penalty conceded"
      ).length,
      triesScored: teamEvents.filter(
        (event) => event.teamEventType === "try scored"
      ).length,
      triesConceded: teamEvents.filter(
        (event) => event.teamEventType === "try conceded"
      ).length,
    };
  }, [events]);

  const setPieceSummary = useMemo(() => {
    const lineouts = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "lineout"
    );

    const scrums = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "scrum"
    );

    const eastsLineouts = lineouts.filter(
      (event) => event.setPieceSide === "Easts"
    );
    const eastsScrums = scrums.filter((event) => event.setPieceSide === "Easts");

    const eastsLineoutWon = eastsLineouts.filter(
      (event) => event.lineoutResult === "Won"
    ).length;

    const eastsScrumWon = eastsScrums.filter(
      (event) =>
        event.scrumResult === "Won" || event.scrumResult === "Penalty For"
    ).length;

    return {
      eastsLineouts,
      eastsScrums,
      eastsLineoutSuccessPct:
        eastsLineouts.length > 0
          ? (eastsLineoutWon / eastsLineouts.length) * 100
          : 0,
      eastsScrumSuccessPct:
        eastsScrums.length > 0 ? (eastsScrumWon / eastsScrums.length) * 100 : 0,
    };
  }, [events]);

  const teamTacklePct =
    teamTotals.tackles + teamTotals.missed > 0
      ? (teamTotals.tackles / (teamTotals.tackles + teamTotals.missed)) * 100
      : 0;

  const bestDefender = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.tackles - a.tackles)[0];
  }, [reportRows]);

  const bestCarrier = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.carries - a.carries)[0];
  }, [reportRows]);

  const gameFlowSummary = useMemo(() => {
    if (events.length === 0) return "No game events logged yet.";

    const lines: string[] = [];

    if (setPieceSummary.eastsLineouts.length > 0) {
      lines.push(
        `Lineout success was ${setPieceSummary.eastsLineoutSuccessPct.toFixed(
          0
        )}% from ${setPieceSummary.eastsLineouts.length} logged Easts lineouts.`
      );
    }

    if (setPieceSummary.eastsScrums.length > 0) {
      lines.push(
        `Scrum success was ${setPieceSummary.eastsScrumSuccessPct.toFixed(
          0
        )}% from ${setPieceSummary.eastsScrums.length} logged Easts scrums.`
      );
    }

    if (bestDefender) {
      lines.push(
        `${bestDefender.name} led defensive workload with ${bestDefender.tackles} tackles.`
      );
    }

    if (bestCarrier) {
      lines.push(
        `${bestCarrier.name} led carry workload with ${bestCarrier.carries} carries.`
      );
    }

    if (teamEventSummary.triesScored || teamEventSummary.triesConceded) {
      lines.push(
        `${teamEventSummary.triesScored} tries scored and ${teamEventSummary.triesConceded} tries conceded were logged.`
      );
    }

    return lines.join(" ");
  }, [events, setPieceSummary, bestDefender, bestCarrier, teamEventSummary]);

  const gameCoachingComment = useMemo(() => {
    const comments: string[] = [];

    if (teamTacklePct < 80) {
      comments.push("Main team improvement area is defensive accuracy.");
    } else if (teamTacklePct >= 90) {
      comments.push("Defensive accuracy was a genuine strength.");
    } else {
      comments.push("Defensive accuracy was competitive but still has room to improve.");
    }

    if (setPieceSummary.eastsLineouts.length > 0) {
      comments.push(
        setPieceSummary.eastsLineoutSuccessPct < 80
          ? "Lineout needs tightening."
          : "Lineout gave a solid platform overall."
      );
    }

    if (setPieceSummary.eastsScrums.length > 0) {
      comments.push(
        setPieceSummary.eastsScrumSuccessPct < 80
          ? "Scrum outcome was inconsistent."
          : "Scrum platform was generally solid."
      );
    }

    return comments.join(" ");
  }, [teamTacklePct, setPieceSummary]);

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                Team Analytics
              </h1>
              <p className="mt-2 text-sm text-muted">
                Match-level analysis separated from the live tagging workspace and Team Review.
              </p>
            </div>

            <AppTopNav current="team-analytics" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8">
            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Match summary
              </h2>
              <p className="mt-2 text-sm text-muted">
                {matchTitle || "Match report"}{" "}
                {[opponent ? `vs ${opponent}` : "", matchDate].filter(Boolean).join(" • ")}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted">
                Team Analytics is the no-video screen for team stats, player output,
                set-piece outcomes, and KPI-style review. Use Team Review when you
                want to watch the match footage.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Game coaching comment
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {gameCoachingComment || "No coaching summary yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Game flow summary
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {gameFlowSummary || "No game flow summary yet."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Player report
                </h2>
                <span className="text-xs text-muted">
                  Open a player dashboard from this table
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="p-2">No.</th>
                      <th className="p-2">Player</th>
                      <th className="p-2">Position</th>
                      <th className="p-2">Minutes</th>
                      <th className="p-2">T</th>
                      <th className="p-2">MT</th>
                      <th className="p-2">C</th>
                      <th className="p-2">TO</th>
                      <th className="p-2">Inv</th>
                      <th className="p-2">Overall</th>
                      <th className="p-2">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.name} className="border-b border-border/60">
                        <td className="p-2 text-muted">{row.number}</td>
                        <td className="p-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/player-dashboard?player=${encodeURIComponent(row.name)}`
                              )
                            }
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {row.name}
                          </button>
                        </td>
                        <td className="p-2 text-muted">{row.position}</td>
                        <td className="p-2 text-muted">{row.minutes}</td>
                        <td className="p-2 text-muted">{row.tackles}</td>
                        <td className="p-2 text-muted">{row.missed}</td>
                        <td className="p-2 text-muted">{row.carries}</td>
                        <td className="p-2 text-muted">{row.turnovers}</td>
                        <td className="p-2 text-muted">{row.involvements}</td>
                        <td className="p-2 font-medium text-foreground">{row.overallGrade}</td>
                        <td className="p-2 text-muted">{row.coachComment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-5 xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <TeamSnapshotPanel
              tackles={teamTotals.tackles}
              missed={teamTotals.missed}
              tacklePct={teamTacklePct}
              carries={teamTotals.carries}
              turnovers={teamTotals.turnovers}
              penaltiesConceded={teamEventSummary.penaltiesConceded}
              scrumSuccessPct={setPieceSummary.eastsScrumSuccessPct}
              lineoutSuccessPct={setPieceSummary.eastsLineoutSuccessPct}
              triesScored={teamEventSummary.triesScored}
              triesConceded={teamEventSummary.triesConceded}
              canCopySummary={false}
              onCopySummary={() => {}}
            />

            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Unit summary
              </h2>

              {unitSummaryRows.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No unit summary yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {unitSummaryRows.map((row) => (
                    <div
                      key={row.unit}
                      className="rounded-xl border border-border bg-panel-2 px-4 py-3"
                    >
                      <div className="font-medium text-foreground">{row.unit}</div>
                      <div className="mt-1 text-sm text-muted">
                        Players: {row.players}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted">
                        <div>T/M: {row.avgTacklesPerMin.toFixed(2)}</div>
                        <div>C/M: {row.avgCarriesPerMin.toFixed(2)}</div>
                        <div>Inv/M: {row.avgInvolvementsPerMin.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}