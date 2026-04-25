"use client";

import { useEffect, useState } from "react";
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
import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { getSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
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

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function matchLabel(match: SavedMatchRecord): string {
  return match.opponent || match.matchTitle || "Game";
}

type TrendEntry = {
  match: SavedMatchRecord;
  row: ReportRow;
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
        ? `Your tackle accuracy improved last game (${latest.tacklePct.toFixed(0)}% vs ${avgTacklePct.toFixed(0)}% average)`
        : `Your tackle accuracy dipped last game (${latest.tacklePct.toFixed(0)}% vs ${avgTacklePct.toFixed(0)}% average)`,
    });
  } else {
    insights.push({ dot: "bg-muted", text: `Tackle accuracy consistent with your average (${avgTacklePct.toFixed(0)}%)` });
  }

  const carryDiff = latest.carries - avgCarries;
  if (Math.abs(carryDiff) >= 2) {
    insights.push({
      dot: carryDiff > 0 ? "bg-success" : "bg-warning",
      text: carryDiff > 0
        ? `Carry output up last game (${latest.carries} vs ${avgCarries.toFixed(1)} average)`
        : `Carry output down last game (${latest.carries} vs ${avgCarries.toFixed(1)} average) — look for more touches`,
    });
  }

  const invDiff = latest.involvementsPerMin - avgInv;
  if (Math.abs(invDiff) >= 0.05) {
    insights.push({
      dot: invDiff > 0 ? "bg-success" : "bg-warning",
      text: invDiff > 0
        ? "Work rate up from your season average — keep it going"
        : "Involvement rate dropped — aim to be more active in the game",
    });
  }

  return insights;
}

export default function PerformancePage() {
  const { currentPlayer, ready } = usePlayer();
  const [entries, setEntries] = useState<TrendEntry[]>([]);

  useEffect(() => {
    if (!currentPlayer) return;
    const all = getSavedMatches();
    const filtered = getPlayerMatches(all, currentPlayer);
    const pairs = filtered
      .map((m) => ({ match: m, row: getPlayerRow(m, currentPlayer) }))
      .filter((p): p is TrendEntry => p.row !== null);
    setEntries(pairs);
  }, [currentPlayer]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const rows = entries.map((e) => e.row);
  const avgTacklePct = avg(rows.map((r) => r.tacklePct));
  const avgTacklesPerMin = avg(rows.map((r) => r.tacklesPerMin));
  const avgCarriesPerMin = avg(rows.map((r) => r.carriesPerMin));
  const avgInvPerMin = avg(rows.map((r) => r.involvementsPerMin));

  const chartData = [...entries].reverse().map((e) => ({
    name: matchLabel(e.match),
    tacklePct: parseFloat(e.row.tacklePct.toFixed(1)),
    carries: e.row.carries,
  }));

  const insights = buildTrendInsights(entries);

  const locked = entries.length < 2;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Performance</h1>
        <p className="mt-1 text-sm text-muted">
          {entries.length === 0 ? "No matches tagged yet" : `${entries.length} ${entries.length === 1 ? "game" : "games"} tagged`}
        </p>
      </div>

      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No data yet.</p>
          <p className="mt-1 text-xs text-muted-2">Ask your coach to tag you in a game.</p>
        </div>
      )}

      {/* Trend insights */}
      {!locked && insights.length > 0 && (
        <div className="rounded-xl border border-border bg-panel p-5 space-y-3">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">How you&apos;re trending</p>
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ins.dot}`} />
              <p className="text-sm text-foreground leading-snug">{ins.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Season averages */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-3">Season averages</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tackle %", value: `${avgTacklePct.toFixed(0)}%` },
              { label: "Tackles / min", value: avgTacklesPerMin.toFixed(2) },
              { label: "Carries / min", value: avgCarriesPerMin.toFixed(2) },
              { label: "Inv / min", value: avgInvPerMin.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-panel-2 px-3 py-3">
                <p className="text-xl font-semibold text-foreground-strong">{value}</p>
                <p className="text-[11px] text-muted-2 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {locked ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">Play in 2 or more tagged matches to unlock season trend charts.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-panel p-5">
            <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-4">Tackle % per game</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#98a0ab", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#98a0ab", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, "Tackle %"]} />
                <Bar dataKey="tacklePct" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.tacklePct >= 90 ? "#7ea37e" : entry.tacklePct >= 80 ? "#b79a63" : "#b16e6e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-panel p-5">
            <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-4">Carries per game</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#373c44" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#98a0ab", fontSize: 11 }} />
                <YAxis tick={{ fill: "#98a0ab", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#17191d", border: "1px solid #373c44", borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, "Carries"]} />
                <Bar dataKey="carries" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#b79a63" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Grade progression table */}
      {!locked && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-3">Grade progression</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-2 font-medium pb-2 pr-3">Game</th>
                  <th className="text-center text-muted-2 font-medium pb-2 px-2">Tackle%</th>
                  <th className="text-center text-muted-2 font-medium pb-2 px-2">Carries</th>
                  <th className="text-center text-muted-2 font-medium pb-2 px-2">Work rate</th>
                  <th className="text-center text-muted-2 font-medium pb-2 pl-2">Overall</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(({ match, row }) => (
                  <tr key={match.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 text-muted">vs {matchLabel(match)}</td>
                    <td className="py-2.5 px-2 text-center"><GradeBadge grade={row.tacklePctGrade} /></td>
                    <td className="py-2.5 px-2 text-center"><GradeBadge grade={row.carriesPerMinGrade} /></td>
                    <td className="py-2.5 px-2 text-center"><GradeBadge grade={row.workRateGrade} /></td>
                    <td className="py-2.5 pl-2 text-center"><GradeBadge grade={row.overallGrade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
