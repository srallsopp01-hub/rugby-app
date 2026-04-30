"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { PageHelp } from "@/app/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlayerPicker } from "../PlayerPicker";
import { usePlayer } from "../PlayerContext";
import {
  SAVED_MATCHES_KEY,
  subscribeSavedMatchesChanged,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import {
  buildReportRowsFromMatch,
  buildSetPieceSummary,
  buildTeamEventSummary,
  buildTeamTotals,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import type { EventItem, ReportRow } from "@/app/rugby-tagging/types";

type Tab = "overview" | "players" | "trends";

function parseMatches(snapshot: string): SavedMatchRecord[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortNewest(matches: SavedMatchRecord[]) {
  return [...matches].sort((a, b) => {
    const aKey = (a.matchDate || a.updatedAt || a.createdAt || "").trim();
    const bKey = (b.matchDate || b.updatedAt || b.createdAt || "").trim();
    return bKey.localeCompare(aKey);
  });
}

function matchLabel(match: SavedMatchRecord) {
  return match.matchTitle?.trim() || match.opponent?.trim() || match.matchDate || "Saved match";
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground-strong">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function PlayerTable({ rows }: { rows: ReportRow[] }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground-strong">Player output</h2>
        <p className="mt-1 text-sm text-muted">Read-only team table from the latest saved match.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-2">Player</th>
              <th className="p-2">Unit</th>
              <th className="p-2 text-right">Tackle %</th>
              <th className="p-2 text-right">Tackles</th>
              <th className="p-2 text-right">Carries</th>
              <th className="p-2 text-right">Inv</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-border/60">
                <td className="p-2 font-medium text-foreground-strong">{row.name}</td>
                <td className="p-2 text-muted">{row.unit}</td>
                <td className="p-2 text-right text-muted">{row.tacklePct.toFixed(0)}%</td>
                <td className="p-2 text-right text-muted">{row.tackles}</td>
                <td className="p-2 text-right text-muted">{row.carries}</td>
                <td className="p-2 text-right text-muted">{row.involvements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PlayerTeamAnalyticsPage() {
  const { currentPlayer, ready } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const matchesRaw = useSyncExternalStore(
    subscribeSavedMatchesChanged,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const matches = useMemo(() => sortNewest(parseMatches(matchesRaw)), [matchesRaw]);
  const selectedMatch =
    matches.find((match) => match.id === selectedMatchId) || matches[0] || null;
  const resolvedEvents = useMemo<EventItem[]>(
    () => (selectedMatch?.events || []).filter((event) => !event.isPending),
    [selectedMatch]
  );
  const reportRows = useMemo(
    () => selectedMatch ? buildReportRowsFromMatch(selectedMatch.rosterRows, resolvedEvents) : [],
    [selectedMatch, resolvedEvents]
  );
  const totals = useMemo(() => buildTeamTotals(reportRows), [reportRows]);
  const setPiece = useMemo(() => buildSetPieceSummary(resolvedEvents), [resolvedEvents]);
  const teamEvents = useMemo(() => buildTeamEventSummary(resolvedEvents), [resolvedEvents]);
  const tacklePct = teamTacklePctFromTotals(totals);

  const topPlayers = useMemo(
    () =>
      [...reportRows]
        .filter((row) => row.minutes > 0)
        .sort((a, b) => b.involvements - a.involvements)
        .slice(0, 5),
    [reportRows]
  );

  const latestChartData = useMemo(
    () =>
      topPlayers.map((row) => ({
        name: row.name.split(" ").slice(-1)[0] || row.name,
        involvements: row.involvements,
        carries: row.carries,
        tackles: row.tackles,
      })),
    [topPlayers]
  );

  const trendData = useMemo(() => {
    const chronological = [...matches].reverse();
    return chronological.map((match) => {
      const events = (match.events || []).filter((event) => !event.isPending);
      const rows = buildReportRowsFromMatch(match.rosterRows, events);
      const matchTotals = buildTeamTotals(rows);
      const matchSetPiece = buildSetPieceSummary(events);
      const matchTeamEvents = buildTeamEventSummary(events);

      return {
        name: (match.matchTitle?.trim() || match.opponent || match.matchDate || `M${match.id.slice(-4)}`).slice(0, 16),
        tacklePct: Math.round(teamTacklePctFromTotals(matchTotals)),
        lineoutPct: Math.round(matchSetPiece.ownLineoutSuccessPct),
        triesScored: matchTeamEvents.triesScored,
        triesConceded: matchTeamEvents.triesConceded,
      };
    });
  }, [matches]);

  const headline = useMemo(() => {
    if (!selectedMatch) return "No saved match data yet.";
    const bestCarrier = [...reportRows].sort((a, b) => b.carries - a.carries)[0];
    const bestDefender = [...reportRows].sort((a, b) => b.tackles - a.tackles)[0];
    const lines = [];
    if (bestDefender) lines.push(`${bestDefender.name} led tackles with ${bestDefender.tackles}.`);
    if (bestCarrier) lines.push(`${bestCarrier.name} led carries with ${bestCarrier.carries}.`);
    lines.push(`Team tackle accuracy was ${tacklePct.toFixed(0)}%.`);
    return lines.join(" ");
  }, [selectedMatch, reportRows, tacklePct]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-xl border border-border bg-panel p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground-strong">Team Analytics</h1>
                <PageHelp {...PLAYER_PAGE_HELP["/player/team-analytics"]} />
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Team-level match analysis shared into the player app. This is read-only and uses saved coach match data.
              </p>
            </div>
            {matches.length > 0 ? (
              <label className="block min-w-[260px]">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                  Match
                </span>
                <select
                  value={selectedMatch?.id || ""}
                  onChange={(event) => setSelectedMatchId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-foreground"
                >
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {matchLabel(match)}
                      {match.matchDate ? ` - ${match.matchDate}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </header>

        {matches.length === 0 || !selectedMatch ? (
          <section className="rounded-xl border border-dashed border-border bg-panel p-8 text-center">
            <p className="text-sm font-medium text-foreground">No saved team analytics yet.</p>
            <p className="mt-1 text-xs text-muted">Ask your coach to save a tagged match first.</p>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-panel p-4">
              <div className="inline-flex rounded-xl border border-border bg-panel-2 p-1">
                {[
                  ["overview", "Overview"],
                  ["players", "Players"],
                  ["trends", "Trends"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id as Tab)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === id ? "bg-panel-3 text-foreground-strong" : "text-muted hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "overview" ? (
              <>
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Tackle %" value={`${tacklePct.toFixed(0)}%`} detail={`${totals.tackles} made / ${totals.missed} missed`} />
                  <StatCard label="Carries" value={String(totals.carries)} detail="Team carries logged" />
                  <StatCard label="Lineout %" value={`${setPiece.ownLineoutSuccessPct.toFixed(0)}%`} detail={`${setPiece.ownLineouts.length} own lineouts`} />
                  <StatCard label="Scrum %" value={`${setPiece.ownScrumSuccessPct.toFixed(0)}%`} detail={`${setPiece.ownScrums.length} own scrums`} />
                </section>

                <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-xl border border-border bg-panel p-5">
                    <h2 className="text-lg font-semibold text-foreground-strong">Match readout</h2>
                    <p className="mt-3 text-sm leading-6 text-muted">{headline}</p>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <StatCard label="Tries for" value={String(teamEvents.triesScored)} detail="Logged team events" />
                      <StatCard label="Tries against" value={String(teamEvents.triesConceded)} detail="Logged team events" />
                      <StatCard label="Penalties" value={String(teamEvents.penaltiesConceded)} detail="Conceded" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-panel p-5">
                    <h2 className="text-lg font-semibold text-foreground-strong">Top involvement</h2>
                    <div className="mt-4 h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={latestChartData}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                          <Bar dataKey="involvements" radius={[6, 6, 0, 0]}>
                            {latestChartData.map((entry, index) => (
                              <Cell key={entry.name} fill={index === 0 ? "var(--foreground-strong)" : "var(--border-light)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === "players" ? <PlayerTable rows={reportRows} /> : null}

            {activeTab === "trends" ? (
              <section className="rounded-xl border border-border bg-panel p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground-strong">Season trend</h2>
                  <p className="mt-1 text-sm text-muted">
                    {matches.length < 2
                      ? "Save another match to unlock trend comparison."
                      : `${matches.length} saved matches included.`}
                  </p>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                      <Line type="monotone" dataKey="tacklePct" stroke="var(--success)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="lineoutPct" stroke="var(--warning)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
