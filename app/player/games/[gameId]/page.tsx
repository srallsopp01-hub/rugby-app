"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePlayer } from "../../PlayerContext";
import { PlayerPicker } from "../../PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { getSavedMatchById } from "@/app/rugby-tagging/lib/savedMatches";
import { buildReportRowsFromMatch, formatTime } from "@/app/rugby-tagging/helpers";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { ReportRow, EventItem } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

const ACTION_LABELS: Record<string, string> = {
  tackle: "Tackle",
  "missed tackle": "Missed",
  carry: "Carry",
  turnover: "Turnover",
};

const ACTION_COLOURS: Record<string, string> = {
  tackle: "bg-[#7ea37e]/15 text-[#7ea37e] border-[#7ea37e]/25",
  "missed tackle": "bg-[#b16e6e]/15 text-[#b16e6e] border-[#b16e6e]/25",
  carry: "bg-[#b79a63]/15 text-[#b79a63] border-[#b79a63]/25",
  turnover: "bg-[#b79a63]/15 text-[#b79a63] border-[#b79a63]/25",
};

function playerEvents(match: SavedMatchRecord, player: SquadPlayer): EventItem[] {
  return match.events
    .filter(
      (e) =>
        e.category === "player" &&
        (e.playerName === player.fullName || e.playerName === player.preferredName)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function GameDetailPage() {
  const params = useParams();
  const gameId = typeof params.gameId === "string" ? params.gameId : "";
  const { currentPlayer, ready } = usePlayer();
  const [match, setMatch] = useState<SavedMatchRecord | null>(null);
  const [row, setRow] = useState<ReportRow | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!currentPlayer || !gameId) return;
    const m = getSavedMatchById(gameId);
    if (!m) { setNotFound(true); return; }
    const rows = buildReportRowsFromMatch(m.rosterRows, m.events);
    const playerRow = rows.find(
      (r) => r.name === currentPlayer.fullName || r.name === currentPlayer.preferredName
    ) ?? null;
    if (!playerRow) { setNotFound(true); return; }
    setMatch(m);
    setRow(playerRow);
    setEvents(playerEvents(m, currentPlayer));
  }, [currentPlayer, gameId]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  if (notFound) {
    return (
      <div className="p-8 max-w-2xl space-y-4">
        <Link href="/player/games" className="text-xs text-muted hover:text-foreground transition-colors">← Back to Games</Link>
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">Match not found or you weren&apos;t tagged in this game.</p>
        </div>
      </div>
    );
  }

  if (!match || !row) return null;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Link href="/player/games" className="text-xs text-muted hover:text-foreground transition-colors">
        ← Back to Games
      </Link>

      {/* Match header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-strong">
            vs {match.opponent || match.matchTitle || "Opponent"}
          </h1>
          <p className="mt-1 text-sm text-muted">{formatDate(match.matchDate)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <GradeBadge grade={row.overallGrade} />
          <span className="text-xs text-muted-2">Overall grade</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Tackle %", value: `${row.tacklePct.toFixed(0)}%` },
          { label: "Carries", value: String(row.carries) },
          { label: "Involvements", value: String(row.involvements) },
          { label: "Minutes", value: row.minutes ? String(row.minutes) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-panel px-4 py-4">
            <p className="text-2xl font-semibold text-foreground-strong">{value}</p>
            <p className="text-xs text-muted-2 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Coach comment */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-2">Coach comment</p>
        <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{row.coachComment}&rdquo;</p>
      </div>

      {/* Event timeline */}
      {events.length > 0 && (
        <div className="rounded-xl border border-border bg-panel p-5 space-y-4">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">Your moments · {events.length}</p>
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                <span className="shrink-0 text-xs text-muted-2 font-mono mt-0.5 w-10 text-right">
                  {formatTime(e.timestamp)}
                </span>
                {e.playerAction && (
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ACTION_COLOURS[e.playerAction] ?? "border-border text-muted"}`}>
                    {ACTION_LABELS[e.playerAction] ?? e.playerAction}
                  </span>
                )}
                <span className="text-sm text-muted leading-snug">{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach notes */}
      {match.coachNotes && match.coachNotes.length > 0 && (
        <div className="rounded-xl border border-border bg-panel p-5 space-y-3">
          <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">Game notes from your coach</p>
          {[...match.coachNotes].sort((a, b) => a.timestamp - b.timestamp).map((note) => (
            <div key={note.id} className="flex items-start gap-3">
              <span className="shrink-0 text-xs text-muted-2 font-mono mt-0.5 w-10 text-right">
                {formatTime(note.timestamp)}
              </span>
              <span className="text-sm text-muted leading-snug">{note.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
