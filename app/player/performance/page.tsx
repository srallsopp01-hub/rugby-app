"use client";

import { useMemo, useSyncExternalStore } from "react";
import { PageHelp } from "@/app/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import Link from "next/link";
import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
import { buildReportRowsFromMatch } from "@/app/rugby-tagging/helpers";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { Grade, ReportRow } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

function getPlayerMatches(matches: SavedMatchRecord[], player: SquadPlayer) {
  return matches.filter((m) =>
    m.rosterRows.some((r) => r.name === player.fullName || r.name === player.preferredName)
  );
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function sum(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0);
}

function matchLabel(match: SavedMatchRecord): string {
  return match.opponent || match.matchTitle || "Game";
}

type TrendEntry = {
  match: SavedMatchRecord;
  row: ReportRow;
  teamAvgTacklePct: number;
  teamAvgCarries: number;
};

const GRADE_BORDER: Record<Grade, string> = {
  Dominant: "border-[#7ea37e] bg-[#7ea37e]/5",
  Competitive: "border-border",
  Below: "border-[#b79a63] bg-[#b79a63]/5",
  Poor: "border-[#b16e6e] bg-[#b16e6e]/5",
};

const GRADE_VALUE_COLOUR: Record<Grade, string> = {
  Dominant: "text-[#7ea37e]",
  Competitive: "text-foreground-strong",
  Below: "text-[#b79a63]",
  Poor: "text-[#b16e6e]",
};

function buildTrendInsights(entries: TrendEntry[]): { dot: string; text: string }[] {
  if (entries.length < 2) return [];
  const latest = entries[0].row;
  const rest = entries.slice(1);
  const avgTacklePct = avg(rest.map((e) => e.row.tacklePct));
  const avgCarries = avg(rest.map((e) => e.row.carries));
  const avgInv = avg(rest.map((e) => e.row.involvementsPerMin));

  const insights: { dot: string; text: string }[] = [];

  const tackleDiff = latest.tacklePct - avgTacklePct;
  if (Math.abs(tackleDiff) >= 5) {
    insights.push({
      dot: tackleDiff > 0 ? "bg-success" : "bg-danger",
      text: tackleDiff > 0
        ? `Tackle accuracy up last game — ${latest.tacklePct.toFixed(0)}% vs your ${avgTacklePct.toFixed(0)}% average`
        : `Tackle accuracy dipped last game — ${latest.tacklePct.toFixed(0)}% vs your ${avgTacklePct.toFixed(0)}% average`,
    });
  } else {
    insights.push({ dot: "bg-muted-2", text: `Tackle accuracy consistent at around ${avgTacklePct.toFixed(0)}%` });
  }

  const carryDiff = latest.carries - avgCarries;
  if (Math.abs(carryDiff) >= 2) {
    insights.push({
      dot: carryDiff > 0 ? "bg-success" : "bg-warning",
      text: carryDiff > 0
        ? `Carry output up last game — ${latest.carries} carries vs ${avgCarries.toFixed(1)} average`
        : `Carry output down last game — ${latest.carries} carries vs ${avgCarries.toFixed(1)} average`,
    });
  }

  const invDiff = latest.involvementsPerMin - avgInv;
  if (Math.abs(invDiff) >= 0.05) {
    insights.push({
      dot: invDiff > 0 ? "bg-success" : "bg-warning",
      text: invDiff > 0
        ? "Work rate up from your season average — keep it going"
        : "Involvement rate dropped last game — aim to be more active",
    });
  }

  return insights;
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 0.01) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? "text-[#7ea37e]" : "text-[#b16e6e]"}`}>
      {up ? "↑" : "↓"} {Math.abs(value).toFixed(suffix === "%" ? 0 : 2)}{suffix} vs prev
    </span>
  );
}

const noSubscribe = () => () => {};

export default function PerformancePage() {
  const { currentPlayer, ready } = usePlayer();

  const matchesRaw = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const entries = useMemo<TrendEntry[]>(() => {
    if (!currentPlayer) return [];
    let all: SavedMatchRecord[];
    try { all = JSON.parse(matchesRaw); } catch { return []; }
    const filtered = getPlayerMatches(all, currentPlayer);
    const pairs: TrendEntry[] = [];
    for (const m of filtered) {
      const allRows = buildReportRowsFromMatch(m.rosterRows, m.events);
      const row = allRows.find((r) => r.name === currentPlayer.fullName || r.name === currentPlayer.preferredName) ?? null;
      if (!row) continue;
      pairs.push({
        match: m,
        row,
        teamAvgTacklePct: avg(allRows.map((r) => r.tacklePct)),
        teamAvgCarries: avg(allRows.map((r) => r.carries)),
      });
    }
    return pairs;
  }, [matchesRaw, currentPlayer]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const rows = entries.map((e) => e.row);
  const avgTacklePct = avg(rows.map((r) => r.tacklePct));
  const avgTacklesPerMin = avg(rows.map((r) => r.tacklesPerMin));
  const avgCarriesPerMin = avg(rows.map((r) => r.carriesPerMin));
  const avgInvPerMin = avg(rows.map((r) => r.involvementsPerMin));

  const totalTackles = sum(rows.map((r) => r.tackles));
  const totalMissed = sum(rows.map((r) => r.missed));
  const totalCarries = sum(rows.map((r) => r.carries));
  const totalTurnovers = sum(rows.map((r) => r.turnovers));
  const totalInvolvements = sum(rows.map((r) => r.involvements));

  // Season bests
  const bestTacklePctEntry = entries.length > 0
    ? entries.reduce((best, e) => e.row.tacklePct > best.row.tacklePct ? e : best)
    : null;
  const mostCarriesEntry = entries.length > 0
    ? entries.reduce((best, e) => e.row.carries > best.row.carries ? e : best)
    : null;
  const mostInvEntry = entries.length > 0
    ? entries.reduce((best, e) => e.row.involvements > best.row.involvements ? e : best)
    : null;

  // Latest vs previous for deltas
  const latestRow = entries[0]?.row ?? null;
  const prevRow = entries[1]?.row ?? null;

  const chartData = [...entries].reverse().map((e) => ({
    name: matchLabel(e.match),
    tacklePct: parseFloat(e.row.tacklePct.toFixed(1)),
    carries: e.row.carries,
    teamAvgTacklePct: parseFloat(e.teamAvgTacklePct.toFixed(1)),
    teamAvgCarries: parseFloat(e.teamAvgCarries.toFixed(1)),
  }));

  const insights = buildTrendInsights(entries);
  const locked = entries.length < 2;

  // Metric profile cards (season averages with context)
  const metricCards = rows.length > 0 ? [
    {
      label: "Tackle %",
      value: `${avgTacklePct.toFixed(0)}%`,
      grade: rows[0].tacklePctGrade,
      threshold: "≥90% Dominant · ≥80% Competitive",
      delta: latestRow && prevRow ? latestRow.tacklePct - prevRow.tacklePct : null,
      suffix: "%",
    },
    {
      label: "Tackles / min",
      value: avgTacklesPerMin.toFixed(2),
      grade: rows[0].tacklesPerMinGrade,
      threshold: "≥0.20 Dominant · ≥0.15 Competitive",
      delta: latestRow && prevRow ? latestRow.tacklesPerMin - prevRow.tacklesPerMin : null,
      suffix: "",
    },
    {
      label: "Carries / min",
      value: avgCarriesPerMin.toFixed(2),
      grade: rows[0].carriesPerMinGrade,
      threshold: "≥0.18 Dominant · ≥0.12 Competitive",
      delta: latestRow && prevRow ? latestRow.carriesPerMin - prevRow.carriesPerMin : null,
      suffix: "",
    },
    {
      label: "Work rate / min",
      value: avgInvPerMin.toFixed(2),
      grade: rows[0].workRateGrade,
      threshold: "≥0.30 Dominant · ≥0.22 Competitive",
      delta: latestRow && prevRow ? latestRow.involvementsPerMin - prevRow.involvementsPerMin : null,
      suffix: "",
    },
  ] : [];

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-strong">Performance</h1>

          <p className="mt-1 text-sm text-muted">
            {entries.length === 0
              ? "No matches tagged yet"
              : `${entries.length} ${entries.length === 1 ? "game" : "games"} · ${currentPlayer.primaryPosition || "Player"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latestRow && (
            <div className="flex flex-col items-end gap-1">
              <GradeBadge grade={latestRow.overallGrade} />
              <span className="text-[10px] text-muted-2">Last game</span>
            </div>
          )}
          <PageHelp {...PLAYER_PAGE_HELP["/player/performance"]} />
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel-3">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-2"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" className="text-muted-2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No data yet</p>
            <p className="mt-1 text-xs text-muted">Ask your coach to tag you in a game and save the match.</p>
          </div>
        </div>
      )}

      {/* Season totals strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Tackles", value: totalTackles },
            { label: "Carries", value: totalCarries },
            { label: "Turnovers", value: totalTurnovers },
            { label: "Involvements", value: totalInvolvements },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-panel px-3 py-3 text-center">
              <p className="text-xl font-bold text-foreground-strong tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-2 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Metric grade profile */}
      {metricCards.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-2">Season averages</p>
          <div className="grid grid-cols-2 gap-3">
            {metricCards.map(({ label, value, grade, threshold, delta, suffix }) => (
              <div key={label} className={`rounded-xl border p-4 ${GRADE_BORDER[grade]}`}>
                <div className="flex items-start justify-between mb-1">
                  <p className={`text-2xl font-bold tabular-nums ${GRADE_VALUE_COLOUR[grade]}`}>{value}</p>
                  <GradeBadge grade={grade} />
                </div>
                <p className="text-xs font-medium text-foreground-strong">{label}</p>
                <p className="text-[10px] text-muted-2 mt-0.5 leading-snug">{threshold}</p>
                {delta !== null && <div className="mt-1.5"><DeltaBadge value={delta} suffix={suffix} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season bests */}
      {entries.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-2">Season bests</p>
          <div className="rounded-xl border border-border bg-panel overflow-hidden divide-y divide-border">
            {bestTacklePctEntry && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">Best tackle accuracy</p>
                  <p className="text-xs text-muted-2 mt-0.5">vs {matchLabel(bestTacklePctEntry.match)}{bestTacklePctEntry.match.matchDate ? ` · ${bestTacklePctEntry.match.matchDate}` : ""}</p>
                </div>
                <Link href={`/player/games/${bestTacklePctEntry.match.id}`} className="text-lg font-bold text-[#7ea37e] hover:text-[#7ea37e]/80 transition-colors tabular-nums">
                  {bestTacklePctEntry.row.tacklePct.toFixed(0)}%
                </Link>
              </div>
            )}
            {mostCarriesEntry && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">Most carries</p>
                  <p className="text-xs text-muted-2 mt-0.5">vs {matchLabel(mostCarriesEntry.match)}{mostCarriesEntry.match.matchDate ? ` · ${mostCarriesEntry.match.matchDate}` : ""}</p>
                </div>
                <Link href={`/player/games/${mostCarriesEntry.match.id}`} className="text-lg font-bold text-[#b79a63] hover:text-[#b79a63]/80 transition-colors tabular-nums">
                  {mostCarriesEntry.row.carries}
                </Link>
              </div>
            )}
            {mostInvEntry && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">Most involvements</p>
                  <p className="text-xs text-muted-2 mt-0.5">vs {matchLabel(mostInvEntry.match)}{mostInvEntry.match.matchDate ? ` · ${mostInvEntry.match.matchDate}` : ""}</p>
                </div>
                <Link href={`/player/games/${mostInvEntry.match.id}`} className="text-lg font-bold text-foreground-strong hover:text-foreground transition-colors tabular-nums">
                  {mostInvEntry.row.involvements}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trend insights */}
      {!locked && insights.length > 0 && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-2 mb-3">How you&apos;re trending</p>
          <div className="space-y-2.5">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ins.dot}`} />
                <p className="text-sm text-foreground leading-snug">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {locked && rows.length > 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">Play in 2 or more tagged matches to unlock season trend charts.</p>
        </div>
      ) : !locked ? (
        <>
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Tackle % per game</p>
              <span className="text-[10px] text-muted-2">Season avg: {avgTacklePct.toFixed(0)}%</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#7e8793", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#7e8793", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => [`${v}%`, name === "teamAvgTacklePct" ? "Team avg" : "You"]}
                />
                <Bar dataKey="tacklePct" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.tacklePct >= 90 ? "#7ea37e" : entry.tacklePct >= 80 ? "#b79a63" : "#b16e6e"} />
                  ))}
                </Bar>
                <Line dataKey="teamAvgTacklePct" stroke="#505762" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[10px] text-muted-2">You (coloured) &middot; <span className="inline-block w-5 border-t border-dashed border-[#505762] align-middle mx-0.5" /> Team avg</p>
          </div>

          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Carries per game</p>
              <span className="text-[10px] text-muted-2">Season avg: {avg(rows.map(r => r.carries)).toFixed(1)}</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#7e8793", fontSize: 11 }} />
                <YAxis tick={{ fill: "#7e8793", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => [v, name === "teamAvgCarries" ? "Team avg" : "You"]}
                />
                <Bar dataKey="carries" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#b79a63" />
                  ))}
                </Bar>
                <Line dataKey="teamAvgCarries" stroke="#505762" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[10px] text-muted-2">You &middot; <span className="inline-block w-5 border-t border-dashed border-[#505762] align-middle mx-0.5" /> Team avg</p>
          </div>
        </>
      ) : null}

      {/* Grade progression table */}
      {!locked && (
        <div className="rounded-xl border border-border bg-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Grade by game</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-2 font-medium py-2.5 pl-5 pr-3">Game</th>
                  <th className="text-center text-muted-2 font-medium py-2.5 px-2">Tackle%</th>
                  <th className="text-center text-muted-2 font-medium py-2.5 px-2">Carries</th>
                  <th className="text-center text-muted-2 font-medium py-2.5 px-2">Work rate</th>
                  <th className="text-center text-muted-2 font-medium py-2.5 pr-5 pl-2">Overall</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(({ match, row }, idx) => (
                  <tr key={match.id} className="border-b border-border last:border-0 hover:bg-panel-2 transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <Link href={`/player/games/${match.id}`} className="text-muted hover:text-foreground transition-colors">
                        vs {matchLabel(match)}
                      </Link>
                      {idx === 0 && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-muted-2 bg-panel-3 border border-border rounded px-1 py-0.5">Latest</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center"><GradeBadge grade={row.tacklePctGrade} /></td>
                    <td className="py-3 px-2 text-center"><GradeBadge grade={row.carriesPerMinGrade} /></td>
                    <td className="py-3 px-2 text-center"><GradeBadge grade={row.workRateGrade} /></td>
                    <td className="py-3 pr-5 pl-2 text-center"><GradeBadge grade={row.overallGrade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Missed tackles footnote */}
          <div className="px-5 py-3 border-t border-border">
            <p className="text-[10px] text-muted-2">
              Season: {totalTackles} tackles · {totalMissed} missed · {((totalTackles / (totalTackles + totalMissed || 1)) * 100).toFixed(0)}% overall accuracy
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
