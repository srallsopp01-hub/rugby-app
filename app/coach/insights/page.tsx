"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMatches } from "@/app/providers/MatchesContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { getCurrentMatchId } from "@/app/rugby-tagging/lib/savedMatches";
import { STORAGE_KEY } from "@/app/rugby-tagging/constants";
import type { ManualKpi, BuiltinKpiTarget } from "@/app/rugby-tagging/lib/team";
import { DEFAULT_BUILTIN_TARGETS, getTeam } from "@/app/rugby-tagging/lib/team";
import { buildMatchConfidenceSummary } from "@/app/rugby-tagging/lib/matchConfidence";
import { generateTeamAnalyticsWorkbook } from "@/app/rugby-tagging/lib/exports/teamAnalyticsExport";
import { downloadWorkbook } from "@/app/rugby-tagging/lib/exports/downloadWorkbook";
import {
  buildReportRowsFromMatch,
  buildSetPieceSummary,
  buildTeamEventSummary,
  buildTeamTotals,
  buildUnitSummaryRows,
  formatMatchDate,
  gradeClassName,
  gradeToScore,
  hydrateRosterRows,
  isForwardPosition,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import type { EventItem, RosterRow } from "@/app/rugby-tagging/types";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import { GradeBadge } from "@/app/components/GradeBadge";
import { StatusPill } from "@/app/components/StatusPill";
import { PageHelp } from "@/app/components/PageHelp";
import { PageHeader } from "@/app/components/PageHeader";
import { COACH_PAGE_HELP } from "../help-content";
import { EmptyState as SharedEmptyState } from "@/app/components/EmptyState";
import { Award, AlertTriangle, Lightbulb, Users, LineChart } from "lucide-react";

type Tab = "overview" | "game" | "players" | "trends";
type PlayerFilter = "all" | "forwards" | "backs";

type SavedSession = {
  matchTitle?: string;
  opponent?: string;
  matchDate?: string;
  rosterRows?: RosterRow[];
  events?: EventItem[];
  reviewQueue?: unknown[];
  coachNotes?: unknown[];
};

const ACTIVE_TEAM_ID_KEY = "fynlwhistle-active-team-id";
function scopedSessionKey(): string {
  try { const t = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? ""; return t ? `${STORAGE_KEY}-${t}` : STORAGE_KEY; }
  catch { return STORAGE_KEY; }
}

function parseSavedSession(snapshot: string): SavedSession | null {
  try {
    const parsed = JSON.parse(snapshot);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function trendArrow(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const d = values[values.length - 1] - values[values.length - 2];
  if (d > 0.001) return "up";
  if (d < -0.001) return "down";
  return "flat";
}

export default function InsightsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [expandedTrendPlayer, setExpandedTrendPlayer] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const { matches: allMatches } = useMatches();
  const [currentMatchId] = useState(() => getCurrentMatchId());

  // Reset manual match selection when the match list changes (e.g. team switch).
  useEffect(() => { setSelectedMatchId(null); }, [allMatches]);
  const [sessionMatch] = useState<SavedSession | null>(() => {
    if (typeof window === "undefined") return null;
    return parseSavedSession(localStorage.getItem(scopedSessionKey()) ?? "{}");
  });

  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const effectiveMatchId = selectedMatchId ?? currentMatchId;
  const activeMatch = useMemo(
    () => allMatches.find((m) => m.id === effectiveMatchId) || null,
    [allMatches, effectiveMatchId]
  );
  const currentMatch = activeMatch || sessionMatch;
  const matchTitle = currentMatch?.matchTitle || "";
  const opponent = currentMatch?.opponent || "";
  const matchDate = currentMatch?.matchDate || "";

  const rosterRows = useMemo(
    () => hydrateRosterRows(currentMatch?.rosterRows),
    [currentMatch]
  );
  const events = useMemo(
    () =>
      Array.isArray(currentMatch?.events)
        ? currentMatch.events.filter((e: EventItem) => !e.isPending)
        : [],
    [currentMatch]
  );
  const confidence = useMemo(
    () => buildMatchConfidenceSummary(currentMatch),
    [currentMatch]
  );
  const reportRows = useMemo(
    () => buildReportRowsFromMatch(rosterRows, events),
    [rosterRows, events]
  );
  const forwardsRows = useMemo(
    () => reportRows.filter((r) => isForwardPosition(r.position)),
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

  const penaltiesFor = useMemo(
    () => events.filter((e) => e.category === "team" && e.teamEventType === "penalty for").length,
    [events]
  );

  const topPerformers = useMemo(
    () =>
      [...reportRows]
        .filter((r) => r.minutes > 0)
        .sort((a, b) => gradeToScore(b.overallGrade) - gradeToScore(a.overallGrade))
        .slice(0, 3),
    [reportRows]
  );

  const needsAttention = useMemo(
    () =>
      [...reportRows]
        .filter(
          (r) =>
            r.minutes > 0 &&
            (r.overallGrade === "Below" || r.overallGrade === "Poor")
        )
        .sort((a, b) => gradeToScore(a.overallGrade) - gradeToScore(b.overallGrade)),
    [reportRows]
  );

  const filteredPlayerRows = useMemo(() => {
    if (playerFilter === "forwards") return forwardsRows;
    if (playerFilter === "backs") return reportRows.filter((r) => !isForwardPosition(r.position));
    return reportRows;
  }, [reportRows, forwardsRows, playerFilter]);

  const bestDefender = useMemo(
    () =>
      reportRows.length === 0
        ? null
        : [...reportRows].sort((a, b) => b.tackles - a.tackles)[0],
    [reportRows]
  );
  const bestCarrier = useMemo(
    () =>
      reportRows.length === 0
        ? null
        : [...reportRows].sort((a, b) => b.carries - a.carries)[0],
    [reportRows]
  );
  const mostInvolved = useMemo(
    () =>
      reportRows.length === 0
        ? null
        : [...reportRows].sort((a, b) => b.involvements - a.involvements)[0],
    [reportRows]
  );

  const gameFlowSummary = useMemo(() => {
    if (events.length === 0) return "No game events logged yet.";
    const lines: string[] = [];
    if (bestDefender)
      lines.push(`${bestDefender.name} led defensive workload with ${bestDefender.tackles} tackles.`);
    if (bestCarrier)
      lines.push(`${bestCarrier.name} led carry workload with ${bestCarrier.carries} carries.`);
    if (teamEventSummary.triesScored || teamEventSummary.triesConceded)
      lines.push(`${teamEventSummary.triesScored} tries scored and ${teamEventSummary.triesConceded} tries conceded were logged.`);
    if (setPieceSummary.ownLineouts.length > 0)
      lines.push(`Lineout success was ${setPieceSummary.ownLineoutSuccessPct.toFixed(0)}% from ${setPieceSummary.ownLineouts.length} own lineouts logged.`);
    if (setPieceSummary.ownScrums.length > 0)
      lines.push(`Scrum success was ${setPieceSummary.ownScrumSuccessPct.toFixed(0)}% from ${setPieceSummary.ownScrums.length} own scrums logged.`);
    return lines.join(" ");
  }, [events, setPieceSummary, bestDefender, bestCarrier, teamEventSummary]);

  const gameCoachingComment = useMemo(() => {
    const comments: string[] = [];
    if (teamTacklePct < 80) comments.push("Main team improvement area is defensive accuracy.");
    else if (teamTacklePct >= 90) comments.push("Defensive accuracy was a genuine strength.");
    else comments.push("Defensive accuracy was competitive but still has room to improve.");
    if (setPieceSummary.ownLineouts.length > 0)
      comments.push(setPieceSummary.ownLineoutSuccessPct < 80 ? "Lineout needs tightening." : "Lineout gave a solid platform overall.");
    if (setPieceSummary.ownScrums.length > 0)
      comments.push(setPieceSummary.ownScrumSuccessPct < 80 ? "Scrum outcome was inconsistent." : "Scrum platform was generally solid.");
    if (teamTotals.carries < Math.max(reportRows.length, 1) * 2)
      comments.push("Carry volume looks light and could improve.");
    else comments.push("Carry volume was reasonable across the side.");
    return comments.join(" ");
  }, [teamTacklePct, setPieceSummary, teamTotals.carries, reportRows.length]);

  const headlineInsights = useMemo(() => {
    const insights: string[] = [];
    if (bestDefender)
      insights.push(`${bestDefender.name} was the top tackler with ${bestDefender.tackles}.`);
    if (bestCarrier)
      insights.push(`${bestCarrier.name} led carries with ${bestCarrier.carries}.`);
    if (mostInvolved)
      insights.push(`${mostInvolved.name} had the highest overall involvement with ${mostInvolved.involvements}.`);
    if (teamTotals.missed > 0)
      insights.push(`Team tackle accuracy finished at ${teamTacklePct.toFixed(0)}% with ${teamTotals.missed} missed tackles logged.`);
    else
      insights.push(`No missed tackles were logged, with team tackle accuracy at ${teamTacklePct.toFixed(0)}%.`);
    return insights;
  }, [bestDefender, bestCarrier, mostInvolved, teamTotals.missed, teamTacklePct]);

  const trendData = useMemo(() => {
    if (allMatches.length < 2) return null;
    const sorted = [...allMatches].sort((a, b) => {
      const ak = (a.matchDate || a.updatedAt || "").trim();
      const bk = (b.matchDate || b.updatedAt || "").trim();
      return ak.localeCompare(bk);
    });
    const matchSnapshots = sorted.map((m) => ({
      label: m.matchTitle?.trim() || formatMatchDate(m.matchDate) || `Match ${m.id.slice(-4)}`,
      date: m.matchDate || m.updatedAt,
      rows: buildReportRowsFromMatch(m.rosterRows, m.events),
    }));
    const playerCount: Record<string, number> = {};
    for (const snap of matchSnapshots)
      for (const row of snap.rows)
        playerCount[row.name] = (playerCount[row.name] || 0) + 1;
    const eligiblePlayers = Object.entries(playerCount)
      .filter(([, c]) => c >= 2)
      .map(([n]) => n)
      .sort();
    return { matchSnapshots, eligiblePlayers };
  }, [allMatches]);

  const seasonChartData = useMemo(() => {
    if (allMatches.length < 2) return null;
    const sorted = [...allMatches].sort((a, b) => {
      const ak = (a.matchDate || a.updatedAt || "").trim();
      const bk = (b.matchDate || b.updatedAt || "").trim();
      return ak.localeCompare(bk);
    });
    return sorted.map((m) => {
      const resolvedEvts = (m.events || []).filter((e: EventItem) => !e.isPending);
      const rows = buildReportRowsFromMatch(m.rosterRows, resolvedEvts);
      const totals = buildTeamTotals(rows);
      const sp = buildSetPieceSummary(resolvedEvts);
      const te = buildTeamEventSummary(resolvedEvts);
      const tp = teamTacklePctFromTotals(totals);
      return {
        name: (m.matchTitle?.trim() || formatMatchDate(m.matchDate) || `M${m.id.slice(-4)}`).slice(0, 14),
        tacklePct: Math.round(tp),
        lineoutPct: Math.round(sp.ownLineoutSuccessPct),
        triesFor: te.triesScored,
        triesAgainst: te.triesConceded,
      };
    });
  }, [allMatches]);

  const seasonAvg = useMemo(() => {
    if (!seasonChartData || seasonChartData.length < 2) return null;
    const n = seasonChartData.length;
    return {
      matches: n,
      tacklePct: Math.round(seasonChartData.reduce((s, d) => s + d.tacklePct, 0) / n),
      lineoutPct: Math.round(seasonChartData.reduce((s, d) => s + d.lineoutPct, 0) / n),
      avgTriesFor: (seasonChartData.reduce((s, d) => s + d.triesFor, 0) / n).toFixed(1),
      avgTriesAgainst: (seasonChartData.reduce((s, d) => s + d.triesAgainst, 0) / n).toFixed(1),
    };
  }, [seasonChartData]);

  const squadProfile = useMemo(() => {
    if (!mounted) return null;
    return getTeam() as { kpiTargets?: Array<BuiltinKpiTarget | ManualKpi> } | null;
  }, [mounted]);

  const kpiTargets = squadProfile?.kpiTargets ?? [];
  const manualKpis = kpiTargets.filter((k): k is ManualKpi => k.type === "manual");

  function getBuiltinTarget(id: string): BuiltinKpiTarget {
    const custom = kpiTargets.find((k): k is BuiltinKpiTarget => k.type === "builtin-target" && k.id === id);
    return custom ?? DEFAULT_BUILTIN_TARGETS.find((d) => d.id === id)!;
  }

  const kpiDeltas = useMemo(() => {
    if (!seasonChartData || seasonChartData.length < 2) return null;
    const last = seasonChartData[seasonChartData.length - 1];
    const prev = seasonChartData[seasonChartData.length - 2];
    return {
      tacklePct: last.tacklePct - prev.tacklePct,
      lineoutPct: last.lineoutPct - prev.lineoutPct,
      triesFor: last.triesFor - prev.triesFor,
      triesAgainst: last.triesAgainst - prev.triesAgainst,
    };
  }, [seasonChartData]);

  const keyTakeaways = useMemo(() => {
    const items: { tone: "positive" | "warning"; text: string }[] = [];
    const tacklTarget = getBuiltinTarget("tackle_pct");
    if (teamTacklePct >= tacklTarget.dominantThreshold) {
      items.push({ tone: "positive", text: `Tackle rate ${teamTacklePct.toFixed(0)}% — above your Dominant target of ${tacklTarget.dominantThreshold}%.` });
    } else if (teamTacklePct < tacklTarget.belowThreshold) {
      items.push({ tone: "warning", text: `Tackle rate ${teamTacklePct.toFixed(0)}% — below the ${tacklTarget.belowThreshold}% floor. Defensive accuracy needs urgent attention.` });
    } else if (teamTacklePct < tacklTarget.competitiveThreshold) {
      items.push({ tone: "warning", text: `Tackle rate ${teamTacklePct.toFixed(0)}% — in the Below range. Target is ${tacklTarget.competitiveThreshold}%+.` });
    }
    if (kpiDeltas && Math.abs(kpiDeltas.lineoutPct) >= 5) {
      items.push({
        tone: kpiDeltas.lineoutPct >= 0 ? "positive" : "warning",
        text: `Lineout efficiency ${kpiDeltas.lineoutPct >= 0 ? "up" : "down"} ${Math.abs(kpiDeltas.lineoutPct)}% from last match.`,
      });
    }
    if (kpiDeltas && Math.abs(kpiDeltas.tacklePct) >= 5) {
      items.push({
        tone: kpiDeltas.tacklePct >= 0 ? "positive" : "warning",
        text: `Tackle rate ${kpiDeltas.tacklePct >= 0 ? "improved" : "dropped"} ${Math.abs(kpiDeltas.tacklePct)}% from last match.`,
      });
    }
    if (teamEventSummary.penaltiesConceded >= 9) {
      items.push({ tone: "warning", text: `${teamEventSummary.penaltiesConceded} penalties conceded — high discipline cost, review set piece and breakdown.` });
    }
    if (teamEventSummary.triesScored > teamEventSummary.triesConceded && teamEventSummary.triesScored > 0) {
      items.push({ tone: "positive", text: `Positive try margin: ${teamEventSummary.triesScored} scored vs ${teamEventSummary.triesConceded} conceded.` });
    } else if (teamEventSummary.triesConceded > teamEventSummary.triesScored) {
      items.push({ tone: "warning", text: `Negative try margin: ${teamEventSummary.triesScored} scored vs ${teamEventSummary.triesConceded} conceded.` });
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamTacklePct, kpiDeltas, teamEventSummary, kpiTargets]);

  const lineoutWon = setPieceSummary.ownLineouts.filter((e) => e.lineoutResult === "Won").length;
  const lineoutLost = setPieceSummary.ownLineouts.filter((e) => e.lineoutResult !== "Won").length;
  const scrumWon = setPieceSummary.ownScrums.filter(
    (e) => e.scrumResult === "Won" || e.scrumResult === "Penalty For"
  ).length;
  const scrumLost = setPieceSummary.ownScrums.filter(
    (e) => e.scrumResult !== "Won" && e.scrumResult !== "Penalty For"
  ).length;

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "game", label: "Game Analysis" },
    { id: "players", label: "Players", badge: reportRows.length > 0 ? String(reportRows.length) : undefined },
    { id: "trends", label: "Season Trends", badge: allMatches.length > 0 ? `${allMatches.length}` : undefined },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1900px]">

        {/* Page header */}
        <PageHeader
          className="px-6 pt-5"
          title="Team Analytics"
          subtitle={
            allMatches.length < 2
              ? [matchTitle, opponent ? `vs ${opponent}` : "", formatMatchDate(matchDate)].filter(Boolean).join(" · ") ||
                "No match loaded — open a saved match or complete tagging in Capture"
              : undefined
          }
          helpButton={<PageHelp {...COACH_PAGE_HELP["/coach/insights"]} />}
          status={
            <StatusPill
              variant={confidence.readyTone === "ready" ? "success" : "warning"}
              size="md"
            >
              {confidence.readyLabel}
            </StatusPill>
          }
          secondaryAction={
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
                  const safeTitle = (matchTitle || "match-report").replace(/[^a-z0-9-_]+/gi, "_");
                  downloadWorkbook(blob, `${safeTitle}_TeamReport.xlsx`);
                } catch (err) {
                  console.error("Failed to generate workbook", err);
                }
              }}
              disabled={reportRows.length === 0}
              className="rounded-xl border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border-light hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↓ Export Report
            </button>
          }
          primaryAction={
            <button
              type="button"
              onClick={async () => {
                setPdfExporting(true);
                try {
                  const { generateMatchReportPdf } = await import("@/app/rugby-tagging/lib/exports/matchReportPdf");
                  const { downloadPdf } = await import("@/app/rugby-tagging/lib/exports/downloadPdf");
                  const blob = await generateMatchReportPdf({
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
                  const safeTitle = (matchTitle || "match-report").replace(/[^a-z0-9-_]+/gi, "_");
                  downloadPdf(blob, `${safeTitle}_MatchReport.pdf`);
                } catch (err) {
                  console.error("Failed to generate PDF", err);
                } finally {
                  setPdfExporting(false);
                }
              }}
              disabled={reportRows.length === 0 || pdfExporting}
              className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pdfExporting ? "Generating…" : "↓ Export PDF"}
            </button>
          }
          belowHeader={
            allMatches.length >= 2 ? (
              <div className="pb-4">
                <select
                  value={effectiveMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="rounded-lg border border-border bg-panel-2 px-2 py-1 text-sm text-foreground"
                >
                  {allMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {[m.matchTitle, m.opponent ? `vs ${m.opponent}` : "", formatMatchDate(m.matchDate)].filter(Boolean).join(" · ") || m.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : undefined
          }
        />

        {/* Match confidence strip */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-panel px-6 py-3">
          {[
            { label: "Players", value: `${confidence.namedPlayers}/${confidence.totalPlayers}` },
            { label: "Minutes", value: `${confidence.minutesComplete}/${confidence.namedPlayers}` },
            { label: "Events", value: String(confidence.resolvedEvents) },
            { label: "Pending", value: String(confidence.pendingEvents) },
            { label: "Review Queue", value: String(confidence.unresolvedReview) },
          ].map((item) => (
            <div key={item.label} className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-2">{item.label}</span>
              <span className="rounded bg-panel-2 px-2 py-0.5 text-xs font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
          <div className="ml-auto shrink-0 text-xs text-muted-2">
            Last saved {confidence.updatedLabel} · Local storage only
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 pb-3 pt-4 pr-5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-foreground-strong text-foreground-strong"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-2">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 py-6">

          {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-6">

              {/* Season snapshot (2+ matches only) */}
              {seasonAvg && (
                <div className="rounded-2xl border border-border bg-panel px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-2">Season</div>
                      <div className="mt-0.5 text-sm font-semibold text-foreground">{seasonAvg.matches} matches</div>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <SeasonStat label="Avg Tackle %" value={`${seasonAvg.tacklePct}%`} />
                    <SeasonStat label="Avg Lineout %" value={`${seasonAvg.lineoutPct}%`} />
                    <SeasonStat label="Avg Tries Scored" value={seasonAvg.avgTriesFor} />
                    <SeasonStat label="Avg Tries Conceded" value={seasonAvg.avgTriesAgainst} />
                    <button
                      type="button"
                      onClick={() => setActiveTab("trends")}
                      className="ml-auto text-xs text-muted-2 underline-offset-4 hover:text-foreground hover:underline"
                    >
                      View season trends →
                    </button>
                  </div>
                </div>
              )}

              {/* Key Takeaways */}
              {keyTakeaways.length > 0 && reportRows.length > 0 && (
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-2">Key Takeaways</p>
                  <div className="space-y-2">
                    {keyTakeaways.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${item.tone === "positive" ? "bg-success" : "bg-warning"}`} />
                        <p className="text-sm text-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hero KPI row */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                  label="Tackle %"
                  value={`${teamTacklePct.toFixed(0)}%`}
                  sub={`${teamTotals.tackles} made · ${teamTotals.missed} missed`}
                  accent={teamTacklePct >= getBuiltinTarget("tackle_pct").dominantThreshold ? "green" : teamTacklePct >= getBuiltinTarget("tackle_pct").competitiveThreshold ? "gold" : "red"}
                  trend={kpiDeltas ? { delta: kpiDeltas.tacklePct, suffix: "%" } : undefined}
                />
                <KpiCard
                  label="Tries Scored"
                  value={String(teamEventSummary.triesScored)}
                  sub="this match"
                  accent="green"
                />
                <KpiCard
                  label="Tries Conceded"
                  value={String(teamEventSummary.triesConceded)}
                  sub="this match"
                  accent={teamEventSummary.triesConceded === 0 ? "green" : "red"}
                />
                <KpiCard
                  label="Penalties Conceded"
                  value={String(teamEventSummary.penaltiesConceded)}
                  sub="this match"
                  accent={teamEventSummary.penaltiesConceded <= 4 ? "green" : teamEventSummary.penaltiesConceded <= 8 ? "gold" : "red"}
                />
              </div>

              {/* Set piece KPIs */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                  label="Lineout %"
                  value={`${setPieceSummary.ownLineoutSuccessPct.toFixed(0)}%`}
                  sub={`${setPieceSummary.ownLineouts.length} own lineouts`}
                  accent={setPieceSummary.ownLineouts.length === 0 ? "none" : setPieceSummary.ownLineoutSuccessPct >= getBuiltinTarget("lineout_pct").competitiveThreshold ? "green" : "gold"}
                  trend={kpiDeltas ? { delta: kpiDeltas.lineoutPct, suffix: "%" } : undefined}
                />
                <KpiCard
                  label="Scrum %"
                  value={`${setPieceSummary.ownScrumSuccessPct.toFixed(0)}%`}
                  sub={`${setPieceSummary.ownScrums.length} own scrums`}
                  accent={setPieceSummary.ownScrums.length === 0 ? "none" : setPieceSummary.ownScrumSuccessPct >= getBuiltinTarget("scrum_pct").competitiveThreshold ? "green" : "gold"}
                />
                <KpiCard
                  label="Total Carries"
                  value={String(teamTotals.carries)}
                  sub="attacking carries"
                  accent="none"
                />
                <KpiCard
                  label="Turnovers Won"
                  value={String(teamTotals.turnovers)}
                  sub="by the team"
                  accent="none"
                />
              </div>

              {/* Top performers + needs attention */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Top performers */}
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground-strong">Top Performers</h2>
                    <span className="text-xs text-muted-2">By overall grade this match</span>
                  </div>
                  {topPerformers.length === 0 ? (
                    <SharedEmptyState
                      icon={Award}
                      title="Tagging incomplete"
                      description="Complete tagging and add player minutes in Capture to see top performers."
                      size="sm"
                    />
                  ) : (
                    <div className="space-y-3">
                      {topPerformers.map((player, i) => (
                        <div key={player.name} className="flex items-center gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel-3 text-xs font-bold text-muted">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/coach/players?player=${encodeURIComponent(player.name)}`)}
                                className="truncate font-semibold text-foreground-strong underline-offset-4 hover:underline"
                              >
                                {player.name}
                              </button>
                              <GradeBadge grade={player.overallGrade} />
                            </div>
                            <div className="mt-0.5 text-xs text-muted-2">
                              {player.position} · {player.minutes}min · {player.tackles}T · {player.carries}C · {Number.isFinite(player.tacklePct) ? `${player.tacklePct.toFixed(0)}%` : "0%"} tackle
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Players needing attention */}
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground-strong">Needs Attention</h2>
                    <span className="text-xs text-muted-2">Below or Poor grade this match</span>
                  </div>
                  {needsAttention.length === 0 && reportRows.length === 0 ? (
                    <SharedEmptyState
                      icon={AlertTriangle}
                      title="Tagging incomplete"
                      description="Complete tagging and add player minutes in Capture first."
                      size="sm"
                    />
                  ) : needsAttention.length === 0 ? (
                    <div className="flex h-[80px] items-center justify-center rounded-xl border border-[#7ea37e]/30 bg-[#7ea37e]/5 text-sm text-[#7ea37e]">
                      All players graded Competitive or above this match
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {needsAttention.map((player) => (
                        <div key={player.name} className="flex items-center gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/coach/players?player=${encodeURIComponent(player.name)}`)}
                                className="truncate font-semibold text-foreground-strong underline-offset-4 hover:underline"
                              >
                                {player.name}
                              </button>
                              <GradeBadge grade={player.overallGrade} />
                            </div>
                            <div className="mt-0.5 text-xs text-muted-2">
                              {player.position} · {player.minutes}min · {player.coachComment}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Team numbers */}
              <div className="rounded-2xl border border-border bg-panel p-5">
                <h2 className="mb-4 text-base font-semibold text-foreground-strong">Team by the Numbers</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <BigNumber label="Total Tackles" value={teamTotals.tackles} />
                  <BigNumber label="Missed Tackles" value={teamTotals.missed} />
                  <BigNumber label="Total Carries" value={teamTotals.carries} />
                  <BigNumber label="Turnovers Won" value={teamTotals.turnovers} />
                </div>
              </div>

              {/* Unit summary */}
              {unitSummaryRows.length > 0 && (
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <h2 className="mb-4 text-base font-semibold text-foreground-strong">Unit Performance</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {unitSummaryRows.map((row) => (
                      <div key={row.unit} className="rounded-xl border border-border bg-panel-2 p-3">
                        <div className="text-sm font-medium text-foreground">{row.unit}</div>
                        <div className="mt-0.5 text-xs text-muted-2">{row.players} player{row.players !== 1 ? "s" : ""}</div>
                        <div className="mt-2 space-y-1 text-xs text-muted">
                          <div className="flex justify-between">
                            <span>Tackles/min</span>
                            <span className="font-medium text-foreground">{row.avgTacklesPerMin.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Carries/min</span>
                            <span className="font-medium text-foreground">{row.avgCarriesPerMin.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Inv/min</span>
                            <span className="font-medium text-foreground">{row.avgInvolvementsPerMin.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Custom Tracking KPIs */}
              {manualKpis.length > 0 && (
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground-strong">Custom Tracking KPIs</h2>
                    <span className="text-xs text-muted-2">Track these manually after each match</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {manualKpis.map((kpi) => (
                      <div key={kpi.id} className="rounded-xl border border-dashed border-border bg-panel-2 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">{kpi.name}</div>
                        <div className="mt-2 text-xl font-bold text-muted">
                          Target: {kpi.targetValue}{kpi.unit === "%" ? "%" : kpi.unit === "per_min" ? "/min" : ""}
                        </div>
                        {kpi.description && <div className="mt-1 text-xs text-muted-2">{kpi.description}</div>}
                        <div className="mt-2 text-[10px] text-muted-2">Enter value in match notes</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── GAME ANALYSIS TAB ─────────────────────────────────── */}
          {activeTab === "game" && (
            <div className="space-y-6">

              {/* Headline insights */}
              <div className="rounded-2xl border border-border bg-panel p-5">
                <h2 className="mb-4 text-base font-semibold text-foreground-strong">Headline Insights</h2>
                {headlineInsights.length === 0 ? (
                  <SharedEmptyState
                    icon={Lightbulb}
                    title="No insights yet"
                    description="Complete tagging in Capture, then reopen Insights."
                    size="sm"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {headlineInsights.map((insight, i) => (
                      <div key={i} className="rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
                        {insight}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Coaching comment + game flow */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <h2 className="text-base font-semibold text-foreground-strong">Game Coaching Comment</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{gameCoachingComment || "No coaching summary yet."}</p>
                </div>
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <h2 className="text-base font-semibold text-foreground-strong">Game Flow Summary</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{gameFlowSummary || "No game flow summary yet."}</p>
                </div>
              </div>

              {/* Set piece breakdown */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* Lineout */}
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground-strong">Lineout</h2>
                    <span className={`text-2xl font-bold ${setPieceSummary.ownLineouts.length === 0 ? "text-muted" : setPieceSummary.ownLineoutSuccessPct >= 80 ? "text-[#7ea37e]" : "text-[#b79a63]"}`}>
                      {setPieceSummary.ownLineoutSuccessPct.toFixed(0)}%
                    </span>
                  </div>
                  {setPieceSummary.ownLineouts.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">No own lineouts logged for this match.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <PercentBar label="Win rate" value={setPieceSummary.ownLineoutSuccessPct} />
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
                          <div className="text-xl font-bold text-foreground">{setPieceSummary.ownLineouts.length}</div>
                          <div className="text-xs text-muted-2">Total</div>
                        </div>
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
                          <div className="text-xl font-bold text-[#7ea37e]">{lineoutWon}</div>
                          <div className="text-xs text-muted-2">Won</div>
                        </div>
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
                          <div className="text-xl font-bold text-[#b16e6e]">{lineoutLost}</div>
                          <div className="text-xs text-muted-2">Lost</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrum */}
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground-strong">Scrum</h2>
                    <span className={`text-2xl font-bold ${setPieceSummary.ownScrums.length === 0 ? "text-muted" : setPieceSummary.ownScrumSuccessPct >= 80 ? "text-[#7ea37e]" : "text-[#b79a63]"}`}>
                      {setPieceSummary.ownScrumSuccessPct.toFixed(0)}%
                    </span>
                  </div>
                  {setPieceSummary.ownScrums.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">No own scrums logged for this match.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <PercentBar label="Win rate" value={setPieceSummary.ownScrumSuccessPct} />
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
                          <div className="text-xl font-bold text-foreground">{setPieceSummary.ownScrums.length}</div>
                          <div className="text-xs text-muted-2">Total</div>
                        </div>
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
                          <div className="text-xl font-bold text-[#7ea37e]">{scrumWon}</div>
                          <div className="text-xs text-muted-2">Won</div>
                        </div>
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
                          <div className="text-xl font-bold text-[#b16e6e]">{scrumLost}</div>
                          <div className="text-xs text-muted-2">Lost</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Discipline */}
              <div className="rounded-2xl border border-border bg-panel p-5">
                <h2 className="mb-4 text-base font-semibold text-foreground-strong">Discipline &amp; Score</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <DisciplineTile
                    label="Penalties For"
                    value={penaltiesFor}
                    tone="positive"
                  />
                  <DisciplineTile
                    label="Penalties Conceded"
                    value={teamEventSummary.penaltiesConceded}
                    tone={teamEventSummary.penaltiesConceded <= 4 ? "neutral" : "negative"}
                  />
                  <DisciplineTile
                    label="Tries Scored"
                    value={teamEventSummary.triesScored}
                    tone="positive"
                  />
                  <DisciplineTile
                    label="Tries Conceded"
                    value={teamEventSummary.triesConceded}
                    tone={teamEventSummary.triesConceded === 0 ? "neutral" : "negative"}
                  />
                </div>
              </div>

              {/* Unit performance table */}
              {unitSummaryRows.length > 0 && (
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <h2 className="mb-4 text-base font-semibold text-foreground-strong">Unit Performance</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-2">Unit</th>
                          <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-2">Players</th>
                          <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-2">Tackles/min</th>
                          <th className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-2">Carries/min</th>
                          <th className="pb-3 pl-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-2">Inv/min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitSummaryRows.map((row) => (
                          <tr key={row.unit} className="border-b border-border/50">
                            <td className="py-3 pr-4 font-medium text-foreground">{row.unit}</td>
                            <td className="py-3 px-4 text-right text-muted">{row.players}</td>
                            <td className="py-3 px-4 text-right text-muted">{row.avgTacklesPerMin.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-muted">{row.avgCarriesPerMin.toFixed(2)}</td>
                            <td className="py-3 pl-4 text-right text-muted">{row.avgInvolvementsPerMin.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLAYERS TAB ───────────────────────────────────────── */}
          {activeTab === "players" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                {(["all", "forwards", "backs"] as PlayerFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPlayerFilter(f)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      playerFilter === f
                        ? "bg-foreground-strong text-background"
                        : "bg-panel-2 text-muted hover:text-foreground"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-2">{filteredPlayerRows.length} players</span>
              </div>

              <div className="rounded-2xl border border-border bg-panel p-5">
                {filteredPlayerRows.length === 0 ? (
                  <SharedEmptyState
                    icon={Users}
                    title="No player data yet"
                    description="Complete tagging in Capture, add player minutes, then reopen Insights."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          {["No.", "Player", "Pos", "Unit", "Min", "T", "MT", "Carry", "TO", "Inv", "Tackle%", "Inv/min", "Grade"].map((h) => (
                            <th key={h} className="pb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-2 first:pl-0">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayerRows.map((row) => (
                          <tr key={row.name} className="border-b border-border/50 align-middle hover:bg-panel-2/40">
                            <td className="py-3 px-2 text-muted first:pl-0">{row.number}</td>
                            <td className="py-3 px-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/coach/players?player=${encodeURIComponent(row.name)}`)}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                              >
                                {row.name}
                              </button>
                            </td>
                            <td className="py-3 px-2 text-muted">{row.position}</td>
                            <td className="py-3 px-2 text-muted">{row.unit}</td>
                            <td className="py-3 px-2 text-muted">{row.minutes}</td>
                            <td className="py-3 px-2 text-muted">{row.tackles}</td>
                            <td className="py-3 px-2 text-muted">{row.missed}</td>
                            <td className="py-3 px-2 text-muted">{row.carries}</td>
                            <td className="py-3 px-2 text-muted">{row.turnovers}</td>
                            <td className="py-3 px-2 text-muted">{row.involvements}</td>
                            <td className="py-3 px-2">
                              <span className={`font-medium ${gradeClassName(row.tacklePctGrade)}`}>
                                {Number.isFinite(row.tacklePct) ? `${row.tacklePct.toFixed(0)}%` : "0%"}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-muted">{row.involvementsPerMin.toFixed(2)}</td>
                            <td className="py-3 px-2">
                              <GradeBadge grade={row.overallGrade} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Coach comments */}
              {filteredPlayerRows.filter((r) => r.coachComment).length > 0 && (
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <h2 className="mb-4 text-base font-semibold text-foreground-strong">Player Comments</h2>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredPlayerRows.filter((r) => r.coachComment).map((row) => (
                      <div key={row.name} className="rounded-xl border border-border bg-panel-2 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{row.name}</span>
                          <GradeBadge grade={row.overallGrade} />
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-muted">{row.coachComment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SEASON TRENDS TAB ─────────────────────────────────── */}
          {activeTab === "trends" && (
            <div className="space-y-6">
              {!seasonChartData ? (
                <SharedEmptyState
                  icon={LineChart}
                  title="Season trends unlock at 2 matches"
                  description={`Save at least 2 matches to see how your team's performance changes over time. You currently have ${allMatches.length} saved match${allMatches.length !== 1 ? "es" : ""}.`}
                  size="lg"
                />
              ) : (
                <>
                  {/* Season averages */}
                  {seasonAvg && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <KpiCard label="Avg Tackle %" value={`${seasonAvg.tacklePct}%`} sub={`${seasonAvg.matches} matches`} accent={seasonAvg.tacklePct >= 90 ? "green" : seasonAvg.tacklePct >= 80 ? "gold" : "red"} />
                      <KpiCard label="Avg Lineout %" value={`${seasonAvg.lineoutPct}%`} sub="season average" accent={seasonAvg.lineoutPct >= 80 ? "green" : "gold"} />
                      <KpiCard label="Avg Tries Scored" value={seasonAvg.avgTriesFor} sub="per match" accent="green" />
                      <KpiCard label="Avg Tries Conceded" value={seasonAvg.avgTriesAgainst} sub="per match" accent={parseFloat(seasonAvg.avgTriesAgainst) <= 2 ? "green" : "red"} />
                    </div>
                  )}

                  {/* Tackle % chart */}
                  <div className="rounded-2xl border border-border bg-panel p-5">
                    <h2 className="mb-1 text-base font-semibold text-foreground-strong">Tackle % by Match</h2>
                    <p className="mb-5 text-xs text-muted-2">Team tackle accuracy across saved matches</p>
                    {mounted && (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={seasonChartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#98a0ab", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#98a0ab", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: "#f1f4f8" }}
                            itemStyle={{ color: "#98a0ab" }}
                            formatter={(v) => [`${v}%`, "Tackle %"]}
                          />
                          <Bar dataKey="tacklePct" radius={[4, 4, 0, 0]}>
                            {seasonChartData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.tacklePct >= 90 ? "#7ea37e" : entry.tacklePct >= 80 ? "#b79a63" : "#b16e6e"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <div className="mt-3 flex gap-4 text-xs text-muted-2">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[#7ea37e]" />90%+</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[#b79a63]" />80–89%</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[#b16e6e]" />Below 80%</span>
                    </div>
                  </div>

                  {/* Tries chart */}
                  <div className="rounded-2xl border border-border bg-panel p-5">
                    <h2 className="mb-1 text-base font-semibold text-foreground-strong">Tries Scored vs Conceded</h2>
                    <p className="mb-5 text-xs text-muted-2">Match-by-match scoring comparison</p>
                    {mounted && (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={seasonChartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#98a0ab", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: "#98a0ab", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: "#f1f4f8" }}
                            itemStyle={{ color: "#98a0ab" }}
                          />
                          <Bar dataKey="triesFor" name="Scored" fill="#7ea37e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="triesAgainst" name="Conceded" fill="#b16e6e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <div className="mt-3 flex gap-4 text-xs text-muted-2">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[#7ea37e]" />Scored</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[#b16e6e]" />Conceded</span>
                    </div>
                  </div>

                  {/* Lineout % chart */}
                  {seasonChartData.some((d) => d.lineoutPct > 0) && (
                    <div className="rounded-2xl border border-border bg-panel p-5">
                      <h2 className="mb-1 text-base font-semibold text-foreground-strong">Lineout % by Match</h2>
                      <p className="mb-5 text-xs text-muted-2">Own lineout win rate across saved matches</p>
                      {mounted && (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={seasonChartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: "#98a0ab", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: "#98a0ab", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: "#f1f4f8" }}
                              itemStyle={{ color: "#98a0ab" }}
                              formatter={(v) => [`${v}%`, "Lineout %"]}
                            />
                            <Bar dataKey="lineoutPct" radius={[4, 4, 0, 0]}>
                              {seasonChartData.map((entry, i) => (
                                <Cell
                                  key={i}
                                  fill={entry.lineoutPct >= 80 ? "#7ea37e" : entry.lineoutPct >= 60 ? "#b79a63" : "#b16e6e"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {/* Player grade progression */}
                  {trendData && trendData.eligiblePlayers.length > 0 && (
                    <div className="rounded-2xl border border-border bg-panel p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-foreground-strong">Player Grade Progression</h2>
                        <span className="text-xs text-muted-2">Across {trendData.matchSnapshots.length} matches · click to expand</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-2">Player</th>
                              {trendData.matchSnapshots.map((snap) => (
                                <th key={snap.label} className="pb-3 px-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                                  <div className="truncate max-w-[80px]">{snap.label}</div>
                                  {snap.date && <div className="text-[10px] font-normal text-muted-2">{snap.date}</div>}
                                </th>
                              ))}
                              <th className="pb-3 pl-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trendData.eligiblePlayers.map((playerName) => {
                              const appearances = trendData.matchSnapshots.map((snap) =>
                                snap.rows.find((r) => r.name === playerName) ?? null
                              );
                              const tacklePcts = appearances
                                .filter((r): r is NonNullable<typeof r> => r !== null)
                                .map((r) => r.tacklePct);
                              const trend = trendArrow(tacklePcts);
                              const isExpanded = expandedTrendPlayer === playerName;
                              const totalCols = trendData.matchSnapshots.length + 2;
                              return (
                                <>
                                  <tr
                                    key={playerName}
                                    className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-panel-2/60 ${isExpanded ? "bg-panel-2/60" : ""}`}
                                    onClick={() => setExpandedTrendPlayer(isExpanded ? null : playerName)}
                                  >
                                    <td className="py-3 pr-4 font-medium text-foreground">
                                      <span className="mr-1.5 text-xs text-muted-2">{isExpanded ? "▾" : "▸"}</span>
                                      {playerName}
                                    </td>
                                    {appearances.map((row, i) => (
                                      <td key={i} className="py-3 px-3 text-center">
                                        {row ? (
                                          <div>
                                            <div className="text-xs text-muted">{row.tacklePct.toFixed(0)}%</div>
                                            <div className="text-xs text-muted">{row.carries}c</div>
                                            <GradeBadge grade={row.overallGrade} />
                                          </div>
                                        ) : (
                                          <span className="text-muted-2">—</span>
                                        )}
                                      </td>
                                    ))}
                                    <td className="py-3 pl-3 text-center text-base">
                                      {trend === "up" && <span className="text-[#7ea37e]">↑</span>}
                                      {trend === "down" && <span className="text-[#b16e6e]">↓</span>}
                                      {trend === "flat" && <span className="text-muted">→</span>}
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr key={`${playerName}-detail`} className="border-b border-border/50 bg-panel-2/40">
                                      <td colSpan={totalCols} className="px-3 py-3">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="text-left text-muted-2">
                                              <th className="pb-1 pr-3 font-normal">Match</th>
                                              <th className="pb-1 px-2 text-center font-normal">Tackles</th>
                                              <th className="pb-1 px-2 text-center font-normal">Missed</th>
                                              <th className="pb-1 px-2 text-center font-normal">Carries</th>
                                              <th className="pb-1 px-2 text-center font-normal">Turnovers</th>
                                              <th className="pb-1 px-2 text-center font-normal">Involvements</th>
                                              <th className="pb-1 pl-2 text-center font-normal">Grade</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {trendData.matchSnapshots.map((snap, i) => {
                                              const row = appearances[i];
                                              return (
                                                <tr key={snap.label} className="border-t border-border/40">
                                                  <td className="py-1 pr-3 text-muted">{snap.label}</td>
                                                  {row ? (
                                                    <>
                                                      <td className="py-1 px-2 text-center text-foreground">{row.tackles}</td>
                                                      <td className="py-1 px-2 text-center text-foreground">{row.missed}</td>
                                                      <td className="py-1 px-2 text-center text-foreground">{row.carries}</td>
                                                      <td className="py-1 px-2 text-center text-foreground">{row.turnovers}</td>
                                                      <td className="py-1 px-2 text-center text-foreground">{row.involvements}</td>
                                                      <td className="py-1 pl-2 text-center">
                                                        <GradeBadge grade={row.overallGrade} />
                                                      </td>
                                                    </>
                                                  ) : (
                                                    <td colSpan={6} className="py-1 px-2 text-center text-muted-2">Did not play</td>
                                                  )}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────


function KpiCard({
  label,
  value,
  sub,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "green" | "gold" | "red" | "none";
  trend?: { delta: number; suffix?: string; invert?: boolean };
}) {
  const accentColor = {
    green: "#7ea37e",
    gold: "#b79a63",
    red: "#b16e6e",
    none: "transparent",
  }[accent];

  const trendPositive = trend ? (trend.invert ? trend.delta < 0 : trend.delta > 0) : null;
  const trendColor = trendPositive === true ? "#7ea37e" : trendPositive === false ? "#b16e6e" : undefined;

  return (
    <div
      className="rounded-2xl border border-border bg-panel p-5"
      style={{ borderLeftColor: accentColor, borderLeftWidth: accent !== "none" ? 3 : 1 }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">{label}</div>
      <div className="mt-2 text-3xl font-bold" style={{ color: accent !== "none" ? accentColor : undefined }}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-muted">{sub}</span>
        {trend && trend.delta !== 0 && (
          <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
            {trend.delta > 0 ? "↑" : "↓"} {Math.abs(trend.delta).toFixed(0)}{trend.suffix ?? ""} vs prev
          </span>
        )}
      </div>
    </div>
  );
}

function PercentBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#7ea37e" : value >= 60 ? "#b79a63" : "#b16e6e";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-2">
        <span>{label}</span>
        <span style={{ color }}>{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-panel-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DisciplineTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
}) {
  const color = tone === "positive" ? "#7ea37e" : tone === "negative" ? "#b16e6e" : "#98a0ab";
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-4 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="mt-1 text-xs text-muted-2">{label}</div>
    </div>
  );
}

function BigNumber({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-4 text-center">
      <div className="text-3xl font-bold text-foreground-strong">{value}</div>
      <div className="mt-1 text-xs text-muted-2">{label}</div>
    </div>
  );
}

function SeasonStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-2">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

