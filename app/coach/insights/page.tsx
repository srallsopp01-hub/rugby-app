"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TeamSnapshotPanel from "@/app/rugby-tagging/components/TeamSnapshotPanel";
import {
  getCurrentMatchId,
  getSavedMatchById,
} from "@/app/rugby-tagging/lib/savedMatches";
import { STORAGE_KEY } from "@/app/rugby-tagging/constants";
import { generateTeamAnalyticsWorkbook } from "@/app/rugby-tagging/lib/exports/teamAnalyticsExport";
import { downloadWorkbook } from "@/app/rugby-tagging/lib/exports/downloadWorkbook";
import {
  buildReportRowsFromMatch,
  buildSetPieceSummary,
  buildTeamEventSummary,
  buildTeamTotals,
  buildUnitSummaryRows,
  hydrateRosterRows,
  isForwardPosition,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import type {
  EventItem,
  ReportRow,
  RosterRow,
  UnitSummaryRow,
} from "@/app/rugby-tagging/types";

export default function InsightsPage() {
  const router = useRouter();

  const [matchTitle, setMatchTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [rosterRows, setRosterRows] = useState<RosterRow[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const players = useMemo(
    () => rosterRows.map((row) => row.name.trim()).filter(Boolean),
    [rosterRows]
  );

  const reportRows = useMemo(
    () => buildReportRowsFromMatch(rosterRows, events),
    [rosterRows, events]
  );

  const forwardsRows = useMemo(
    () => reportRows.filter((row) => isForwardPosition(row.position)),
    [reportRows]
  );

  const unitSummaryRows = useMemo(
    () => buildUnitSummaryRows(reportRows),
    [reportRows]
  );

  const teamTotals = useMemo(() => buildTeamTotals(reportRows), [reportRows]);

  const setPieceSummary = useMemo(() => buildSetPieceSummary(events), [events]);

  const teamEventSummary = useMemo(() => buildTeamEventSummary(events), [events]);

  const teamTacklePct = teamTacklePctFromTotals(teamTotals);

  const bestDefender = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.tackles - a.tackles)[0];
  }, [reportRows]);

  const bestCarrier = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.carries - a.carries)[0];
  }, [reportRows]);

  const mostInvolved = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.involvements - a.involvements)[0];
  }, [reportRows]);

  const gameFlowSummary = useMemo(() => {
    if (events.length === 0) return "No game events logged yet.";

    const lines: string[] = [];

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

    if (setPieceSummary.ownLineouts.length > 0) {
      lines.push(
        `Lineout success was ${setPieceSummary.ownLineoutSuccessPct.toFixed(0)}% from ${setPieceSummary.ownLineouts.length} own lineouts logged.`
      );
    }

    if (setPieceSummary.ownScrums.length > 0) {
      lines.push(
        `Scrum success was ${setPieceSummary.ownScrumSuccessPct.toFixed(0)}% from ${setPieceSummary.ownScrums.length} own scrums logged.`
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
      comments.push(
        "Defensive accuracy was competitive but still has room to improve."
      );
    }

    if (setPieceSummary.ownLineouts.length > 0) {
      comments.push(
        setPieceSummary.ownLineoutSuccessPct < 80
          ? "Lineout needs tightening."
          : "Lineout gave a solid platform overall."
      );
    }

    if (setPieceSummary.ownScrums.length > 0) {
      comments.push(
        setPieceSummary.ownScrumSuccessPct < 80
          ? "Scrum outcome was inconsistent."
          : "Scrum platform was generally solid."
      );
    }

    if (teamTotals.carries < Math.max(reportRows.length, 1) * 2) {
      comments.push("Carry volume looks light and could improve.");
    } else {
      comments.push("Carry volume was reasonable across the side.");
    }

    return comments.join(" ");
  }, [
    teamTacklePct,
    setPieceSummary,
    teamTotals.carries,
    reportRows.length,
  ]);

  const headlineInsights = useMemo(() => {
    const insights: string[] = [];

    if (bestDefender) {
      insights.push(
        `${bestDefender.name} was the top tackler with ${bestDefender.tackles}.`
      );
    }

    if (bestCarrier) {
      insights.push(
        `${bestCarrier.name} led carries with ${bestCarrier.carries}.`
      );
    }

    if (mostInvolved) {
      insights.push(
        `${mostInvolved.name} had the highest overall involvement with ${mostInvolved.involvements}.`
      );
    }

    if (teamTotals.missed > 0) {
      insights.push(
        `Team tackle accuracy finished at ${teamTacklePct.toFixed(0)}% with ${teamTotals.missed} missed tackles logged.`
      );
    } else {
      insights.push(
        `No missed tackles were logged, with team tackle accuracy at ${teamTacklePct.toFixed(0)}%.`
      );
    }

    return insights;
  }, [
    bestDefender,
    bestCarrier,
    mostInvolved,
    teamTotals.missed,
    teamTacklePct,
  ]);

  useEffect(() => {
    try {
      const existingMatchId = getCurrentMatchId();

      if (existingMatchId) {
        const savedMatch = getSavedMatchById(existingMatchId);

        if (savedMatch) {
          setMatchTitle(savedMatch.matchTitle || "");
          setOpponent(savedMatch.opponent || "");
          setMatchDate(savedMatch.matchDate || "");
          setRosterRows(hydrateRosterRows(savedMatch.rosterRows));
          setEvents(
            Array.isArray(savedMatch.events)
              ? savedMatch.events.filter((event: EventItem) => !event.isPending)
              : []
          );
          return;
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);
      setMatchTitle(saved.matchTitle || "");
      setOpponent(saved.opponent || "");
      setMatchDate(saved.matchDate || "");
      setRosterRows(hydrateRosterRows(saved.rosterRows));
      setEvents(
        Array.isArray(saved.events)
          ? saved.events.filter((event: EventItem) => !event.isPending)
          : []
      );
    } catch (error) {
      console.error("Failed to load insights session", error);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">

        {/* Header */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
              Insights
            </h1>
            <p className="mt-2 text-sm text-muted">
              Team analytics, player output, unit trends, and match-level
              takeaways. Use after tagging is complete.
            </p>
          </div>
        </div>

        {/* How to use */}
        <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">
                1. Read the match picture
              </div>
              <div className="mt-1 text-sm text-muted">
                Use the headline cards and insights to understand the overall
                story from the tagged match.
              </div>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">
                2. Compare player output
              </div>
              <div className="mt-1 text-sm text-muted">
                Use the player table to scan contribution, output, and overall
                grade across the squad.
              </div>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">
                3. Export the report
              </div>
              <div className="mt-1 text-sm text-muted">
                Download the full match report as a spreadsheet for sharing
                or further analysis.
              </div>
            </div>
          </div>
        </div>

        {/* Export panel */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">
                Export
              </h2>
              <p className="mt-1 text-sm text-muted">
                Download the full match report or export the player stats table
                to a spreadsheet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await generateTeamAnalyticsWorkbook({
                      matchTitle,
                      opponent,
                      matchDate,
                      reportRows,
                      forwardsRows,
                      unitSummaryRows,
                      teamTotals,
                      teamTacklePct,
                      setPieceSummary,
                      teamEventSummary,
                      bestDefender,
                      bestCarrier,
                      mostInvolved,
                      gameCoachingComment,
                      gameFlowSummary,
                      headlineInsights,
                    });
                    const safeTitle =
                      (matchTitle || "match-report").replace(/[^a-z0-9-_]+/gi, "_");
                    downloadWorkbook(blob, `${safeTitle}_TeamReport.xlsx`);
                  } catch (error) {
                    console.error("Failed to generate workbook", error);
                  }
                }}
                disabled={reportRows.length === 0}
                className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↓ Download Full Report (.xlsx)
              </button>
            </div>
          </div>
          {reportRows.length === 0 && (
            <p className="mt-3 text-xs text-muted">
              Complete tagging in Capture and reopen Insights to enable export.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8">

            {/* Match summary */}
            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground-strong">
                    Match summary
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {matchTitle || "Match report"}{" "}
                    {[opponent ? `vs ${opponent}` : "", matchDate]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
                  No video on this screen
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  Tackle %
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground-strong">
                  {teamTacklePct.toFixed(0)}%
                </div>
                <div className="mt-1 text-sm text-muted">
                  {teamTotals.tackles} made / {teamTotals.missed} missed
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  Carries
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground-strong">
                  {teamTotals.carries}
                </div>
                <div className="mt-1 text-sm text-muted">
                  Total logged attacking carries
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  Lineout %
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground-strong">
                  {setPieceSummary.ownLineoutSuccessPct.toFixed(0)}%
                </div>
                <div className="mt-1 text-sm text-muted">
                  {setPieceSummary.ownLineouts.length} own lineouts logged
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  Scrum %
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground-strong">
                  {setPieceSummary.ownScrumSuccessPct.toFixed(0)}%
                </div>
                <div className="mt-1 text-sm text-muted">
                  {setPieceSummary.ownScrums.length} own scrums logged
                </div>
              </div>
            </div>

            {/* Headline insights */}
            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground-strong">
                    Headline insights
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Quick takeaways from the currently tagged match.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
                  Built from current saved session
                </div>
              </div>
              {headlineInsights.length === 0 ? (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  No headline insights yet. Complete tagging in Capture, then
                  reopen Insights.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {headlineInsights.map((insight, index) => (
                    <div
                      key={`${insight}-${index}`}
                      className="rounded-xl border border-border bg-panel-2 p-4 text-sm text-muted"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coaching comment + game flow */}
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

            {/* Player report */}
            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Player report
                </h2>
                <span className="text-xs text-muted">
                  Click a player name to open their dashboard
                </span>
              </div>
              <p className="mb-4 text-sm text-muted">
                T = Tackles · MT = Missed Tackles · C = Carries · TO =
                Turnovers · Inv = Involvements
              </p>
              {reportRows.length === 0 ? (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  No player report data yet. Complete tagging in Capture,
                  check player minutes, then reopen Insights.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="p-2">No.</th>
                        <th className="p-2">Player</th>
                        <th className="p-2">Position</th>
                        <th className="p-2">Unit</th>
                        <th className="p-2">Minutes</th>
                        <th className="p-2">T</th>
                        <th className="p-2">MT</th>
                        <th className="p-2">C</th>
                        <th className="p-2">TO</th>
                        <th className="p-2">Inv</th>
                        <th className="p-2">Tackle %</th>
                        <th className="p-2">Overall</th>
                        <th className="p-2">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row) => (
                        <tr
                          key={row.name}
                          className="border-b border-border/60 align-top"
                        >
                          <td className="p-2 text-muted">{row.number}</td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/coach/players?player=${encodeURIComponent(row.name)}`
                                )
                              }
                              className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {row.name}
                            </button>
                          </td>
                          <td className="p-2 text-muted">{row.position}</td>
                          <td className="p-2 text-muted">{row.unit}</td>
                          <td className="p-2 text-muted">{row.minutes}</td>
                          <td className="p-2 text-muted">{row.tackles}</td>
                          <td className="p-2 text-muted">{row.missed}</td>
                          <td className="p-2 text-muted">{row.carries}</td>
                          <td className="p-2 text-muted">{row.turnovers}</td>
                          <td className="p-2 text-muted">{row.involvements}</td>
                          <td className="p-2 text-muted">
                            {Number.isFinite(row.tacklePct)
                              ? `${row.tacklePct.toFixed(0)}%`
                              : "0%"}
                          </td>
                          <td className="p-2 font-medium text-foreground">
                            {row.overallGrade}
                          </td>
                          <td className="p-2 text-muted">{row.coachComment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Forward snapshot */}
            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Forward pack snapshot
                </h2>
                <span className="text-xs text-muted">Quick forward-only view</span>
              </div>
              {forwardsRows.length === 0 ? (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  No forward data available yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="p-2">Player</th>
                        <th className="p-2">Pos</th>
                        <th className="p-2">Min</th>
                        <th className="p-2">T</th>
                        <th className="p-2">MT</th>
                        <th className="p-2">C</th>
                        <th className="p-2">Inv</th>
                        <th className="p-2">Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forwardsRows.map((row) => (
                        <tr
                          key={row.name}
                          className="border-b border-border/60"
                        >
                          <td className="p-2 font-medium text-foreground">
                            {row.name}
                          </td>
                          <td className="p-2 text-muted">{row.position}</td>
                          <td className="p-2 text-muted">{row.minutes}</td>
                          <td className="p-2 text-muted">{row.tackles}</td>
                          <td className="p-2 text-muted">{row.missed}</td>
                          <td className="p-2 text-muted">{row.carries}</td>
                          <td className="p-2 text-muted">{row.involvements}</td>
                          <td className="p-2 font-medium text-foreground">
                            {row.overallGrade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5 xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground-strong">
                Team snapshot
              </h2>
              <p className="mt-2 text-sm text-muted">
                Quickest read on team output, set-piece success, and unit
                trends from the current saved match.
              </p>
            </div>

            <TeamSnapshotPanel
              tackles={teamTotals.tackles}
              missed={teamTotals.missed}
              tacklePct={teamTacklePct}
              carries={teamTotals.carries}
              turnovers={teamTotals.turnovers}
              penaltiesConceded={teamEventSummary.penaltiesConceded}
              scrumSuccessPct={setPieceSummary.ownScrumSuccessPct}
              lineoutSuccessPct={setPieceSummary.ownLineoutSuccessPct}
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
                <p className="mt-3 text-sm text-muted">
                  No unit summary yet. Add player minutes and tagged events in
                  Capture first.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {unitSummaryRows.map((row) => (
                    <div
                      key={row.unit}
                      className="rounded-xl border border-border bg-panel-2 px-4 py-3"
                    >
                      <div className="font-medium text-foreground">
                        {row.unit}
                      </div>
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

            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Current beta note
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Insights currently works from the saved match on this browser
                and device. Designed for coach review before full cloud storage
                and multi-user sharing are added later.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
