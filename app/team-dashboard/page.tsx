"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppTopNav from "../rugby-tagging/components/AppTopNav";
import TeamSnapshotPanel from "../rugby-tagging/components/TeamSnapshotPanel";
import {
  getCurrentMatchId,
  getSavedMatchById,
} from "../rugby-tagging/lib/savedMatches";
import { STORAGE_KEY } from "../rugby-tagging/constants";
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
  isForwardPosition,
  scoreToGrade,
} from "../rugby-tagging/helpers";
import type {
  EventItem,
  ReportRow,
  RosterRow,
  UnitSummaryRow,
} from "../rugby-tagging/types";

export default function TeamDashboardPage() {
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

  const forwardsRows = useMemo(
    () => reportRows.filter((row) => isForwardPosition(row.position)),
    [reportRows]
  );

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

    if (setPieceSummary.eastsLineouts.length > 0) {
      lines.push(
        `Lineout success was ${setPieceSummary.eastsLineoutSuccessPct.toFixed(0)}% from ${setPieceSummary.eastsLineouts.length} logged Easts lineouts.`
      );
    }

    if (setPieceSummary.eastsScrums.length > 0) {
      lines.push(
        `Scrum success was ${setPieceSummary.eastsScrumSuccessPct.toFixed(0)}% from ${setPieceSummary.eastsScrums.length} logged Easts scrums.`
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

    if (teamTotals.carries < Math.max(reportRows.length, 1) * 2) {
      comments.push("Carry volume looks light and could improve.");
    } else {
      comments.push("Carry volume was reasonable across the side.");
    }

    return comments.join(" ");
  }, [teamTacklePct, setPieceSummary, teamTotals.carries, reportRows.length]);

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
  }, [bestDefender, bestCarrier, mostInvolved, teamTotals.missed, teamTacklePct]);

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
      console.error("Failed to load team dashboard session", error);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                Team Analytics
              </h1>
              <p className="mt-2 text-sm text-muted">
                Use this screen for no-video team analysis, player output review, unit trends, and match-level takeaways after tagging is complete.
              </p>
            </div>

            <AppTopNav current="team-analytics" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">1. Read the match picture</div>
              <div className="mt-1 text-sm text-muted">
                Use the headline cards and insights to understand the overall story from the tagged match.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">2. Compare player output</div>
              <div className="mt-1 text-sm text-muted">
                Use the player table to scan contribution, grades, and comments across the squad.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">3. Use this in review meetings</div>
              <div className="mt-1 text-sm text-muted">
                This page is designed as the clean no-video analysis screen for staff and post-match review.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8">
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

              <p className="mt-4 text-sm leading-6 text-muted">
                Team Analytics is the clean no-video screen for team stats, player output,
                set-piece outcomes, and KPI-style review. Use Team Review when you want
                to watch the footage and jump through moments on the timeline.
              </p>
            </div>

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
                  {setPieceSummary.eastsLineoutSuccessPct.toFixed(0)}%
                </div>
                <div className="mt-1 text-sm text-muted">
                  {setPieceSummary.eastsLineouts.length} Easts lineouts logged
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  Scrum %
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground-strong">
                  {setPieceSummary.eastsScrumSuccessPct.toFixed(0)}%
                </div>
                <div className="mt-1 text-sm text-muted">
                  {setPieceSummary.eastsScrums.length} Easts scrums logged
                </div>
              </div>
            </div>

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
                  No headline insights yet. Complete tagging in the Workspace, then reopen Team Analytics.
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
                  Click a player name to open their dashboard
                </span>
              </div>

              <p className="mb-4 text-sm text-muted">
                Use this table to compare player contribution, output, and overall grade across the match.
              </p>

              {reportRows.length === 0 ? (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  No player report data yet. Complete tagging in the Workspace, check player minutes, then reopen Team Analytics.
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
                        <tr key={row.name} className="border-b border-border/60 align-top">
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
                          <td className="p-2 text-muted">{row.unit}</td>
                          <td className="p-2 text-muted">{row.minutes}</td>
                          <td className="p-2 text-muted">{row.tackles}</td>
                          <td className="p-2 text-muted">{row.missed}</td>
                          <td className="p-2 text-muted">{row.carries}</td>
                          <td className="p-2 text-muted">{row.turnovers}</td>
                          <td className="p-2 text-muted">{row.involvements}</td>
                          <td className="p-2 text-muted">
                            {Number.isFinite(row.tacklePct) ? `${row.tacklePct.toFixed(0)}%` : "0%"}
                          </td>
                          <td className="p-2 font-medium text-foreground">{row.overallGrade}</td>
                          <td className="p-2 text-muted">{row.coachComment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Forward pack snapshot
                </h2>
                <span className="text-xs text-muted">
                  Quick forward-only view
                </span>
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
                        <tr key={row.name} className="border-b border-border/60">
                          <td className="p-2 font-medium text-foreground">{row.name}</td>
                          <td className="p-2 text-muted">{row.position}</td>
                          <td className="p-2 text-muted">{row.minutes}</td>
                          <td className="p-2 text-muted">{row.tackles}</td>
                          <td className="p-2 text-muted">{row.missed}</td>
                          <td className="p-2 text-muted">{row.carries}</td>
                          <td className="p-2 text-muted">{row.involvements}</td>
                          <td className="p-2 font-medium text-foreground">{row.overallGrade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5 xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground-strong">
                Team snapshot
              </h2>
              <p className="mt-2 text-sm text-muted">
                Use this sidebar for the quickest read on team output, set-piece success, and unit trends from the current saved match.
              </p>
            </div>

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
                <p className="mt-3 text-sm text-muted">
                  No unit summary yet. Add player minutes and tagged events in the Workspace first.
                </p>
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

            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Current beta note
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Team Analytics currently works from the saved match on this browser and device. It is designed for coach review right now, before full cloud storage and multi-user sharing are added later.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}