"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import { getSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
import { formatTime } from "@/app/rugby-tagging/helpers";
import type { SavedMatchRecord, SavedCoachReviewNote } from "@/app/rugby-tagging/lib/savedMatches";

type NoteGroup = {
  match: SavedMatchRecord;
  notes: SavedCoachReviewNote[];
};

const CATEGORY_ICONS: Record<string, string> = {
  "Phase Play": "⬡",
  "Set Piece": "▲",
  "Defence": "⬡",
  "Attack": "→",
  "Kick": "○",
};

export default function ReviewPage() {
  const { currentPlayer, ready } = usePlayer();
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);

  useEffect(() => {
    const all = getSavedMatches();
    const result: NoteGroup[] = [];
    let total = 0;
    for (const match of all) {
      const notes = [...(match.coachNotes ?? [])].sort((a, b) => a.timestamp - b.timestamp);
      if (notes.length > 0) {
        result.push({ match, notes });
        total += notes.length;
      }
    }
    setGroups(result);
    setTotalNotes(total);
  }, []);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Coach Notes</h1>
        <p className="mt-1 text-sm text-muted">
          {totalNotes > 0
            ? `${totalNotes} coaching ${totalNotes === 1 ? "note" : "notes"} across ${groups.length} ${groups.length === 1 ? "game" : "games"}`
            : "Coaching insights and match observations from your team"}
        </p>
      </div>

      {/* What this section is */}
      <div className="rounded-xl border border-border bg-panel-2 p-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-panel-3 border border-border">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-2"/>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" className="text-muted-2"/>
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Timestamped match observations</p>
          <p className="mt-0.5 text-xs text-muted leading-relaxed">
            These are notes your coach wrote during film review, tagged to moments in the match video.
            Open a game in <Link href="/player/games" className="underline underline-offset-2 hover:text-foreground transition-colors">Games</Link> to watch the video alongside these notes.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel-3">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25" className="text-muted-2"/>
              <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-muted-2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No coach notes yet</p>
            <p className="mt-1 text-xs text-muted">Your coach hasn&apos;t added match notes during film review yet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ match, notes }) => (
            <div key={match.id} className="rounded-xl border border-border bg-panel overflow-hidden">
              {/* Match header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-panel-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground-strong">
                      vs {match.opponent || match.matchTitle || "Game"}
                    </p>
                    {match.matchDate && (
                      <p className="text-xs text-muted-2 mt-0.5">{match.matchDate}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-2">
                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                  </span>
                  <Link
                    href={`/player/games/${match.id}`}
                    className="rounded-lg border border-border bg-panel px-2.5 py-1 text-xs text-muted transition-all duration-150 hover:border-border-light hover:text-foreground"
                  >
                    Watch game →
                  </Link>
                </div>
              </div>

              {/* Notes */}
              <div className="divide-y divide-border">
                {notes.map((note) => (
                  <div key={note.id} className="flex items-start gap-4 px-5 py-3.5">
                    <span className="shrink-0 mt-0.5 text-[11px] text-muted-2 font-mono tabular-nums bg-panel-2 border border-border rounded px-1.5 py-0.5">
                      {formatTime(note.timestamp)}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Future feature note */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
          <p className="text-xs text-muted-2">
            Phase play and set piece analysis videos coming when cloud sharing is added.
          </p>
        </div>
      )}
    </div>
  );
}
