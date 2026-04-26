"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePlayer } from "../PlayerContext";
import { PageHelp } from "@/app/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import { PlayerPicker } from "../PlayerPicker";
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const noSubscribe = () => () => {};

export default function GamesPage() {
  const { currentPlayer, ready } = usePlayer();

  const matchesRaw = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const entries = useMemo<{ match: SavedMatchRecord; row: ReportRow }[]>(() => {
    if (!currentPlayer) return [];
    let all: SavedMatchRecord[];
    try { all = JSON.parse(matchesRaw); } catch { return []; }
    return getPlayerMatches(all, currentPlayer)
      .map((m) => ({ match: m, row: getPlayerRow(m, currentPlayer) }))
      .filter((p): p is { match: SavedMatchRecord; row: ReportRow } => p.row !== null);
  }, [matchesRaw, currentPlayer]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground-strong">Your Games</h1>
            <PageHelp {...PLAYER_PAGE_HELP["/player/games"]} />
          </div>
          <p className="mt-1 text-sm text-muted">Every match you&apos;ve been tagged in</p>
        </div>
        {entries.length > 0 && (
          <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs font-semibold text-muted">
            {entries.length} {entries.length === 1 ? "game" : "games"}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No matches found.</p>
          <p className="mt-1 text-xs text-muted-2">Your coach will add you to the roster when you play.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map(({ match, row }) => (
            <Link
              key={match.id}
              href={`/player/games/${match.id}`}
              className="block rounded-xl border border-border bg-panel p-4 transition-all duration-150 hover:border-border-light hover:bg-panel-2 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground-strong">
                    vs {match.opponent || match.matchTitle || "Opponent"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(match.matchDate)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <GradeBadge grade={row.overallGrade} />
                  <span className="text-[11px] text-muted-2">
                    {row.position} · {row.minutes || "—"} min
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted border-t border-border pt-3">
                <span><span className="text-foreground font-medium">{row.tackles}</span> tackles</span>
                <span><span className="text-foreground font-medium">{row.missed}</span> missed</span>
                <span><span className="text-foreground font-medium">{row.carries}</span> carries</span>
                <span><span className="text-foreground font-medium">{row.involvements}</span> inv</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
