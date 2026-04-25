"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import { getSavedMatches } from "@/app/rugby-tagging/lib/savedMatches";
import { formatTime } from "@/app/rugby-tagging/helpers";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { EventItem } from "@/app/rugby-tagging/types";

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

type MatchGroup = {
  match: SavedMatchRecord;
  events: EventItem[];
};

export default function ReviewPage() {
  const { currentPlayer, ready } = usePlayer();
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    if (!currentPlayer) return;
    const all = getSavedMatches();
    const result: MatchGroup[] = [];
    let total = 0;
    for (const match of all) {
      const events = match.events
        .filter(
          (e) =>
            e.category === "player" &&
            (e.playerName === currentPlayer.fullName || e.playerName === currentPlayer.preferredName)
        )
        .sort((a, b) => a.timestamp - b.timestamp);
      if (events.length > 0) {
        result.push({ match, events });
        total += events.length;
      }
    }
    setGroups(result);
    setTotalEvents(total);
  }, [currentPlayer]);

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Your Moments</h1>
        <p className="mt-1 text-sm text-muted">
          {totalEvents > 0 ? `${totalEvents} tagged ${totalEvents === 1 ? "action" : "actions"} across ${groups.length} ${groups.length === 1 ? "game" : "games"}` : "Every tagged action you've made"}
        </p>
      </div>

      {/* Video note */}
      {groups.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3">
          <svg className="mt-0.5 shrink-0 text-muted-2" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <p className="text-xs text-muted leading-relaxed">
            Reopen a match in <Link href="/coach/review" className="underline underline-offset-2 hover:text-foreground transition-colors">Review</Link> to watch video clips alongside these moments.
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No tagged moments yet.</p>
          <p className="mt-1 text-xs text-muted-2">Ask your coach to tag your actions in a game.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ match, events }) => (
            <div key={match.id} className="rounded-xl border border-border bg-panel overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-panel-2">
                <div>
                  <span className="text-sm font-medium text-foreground-strong">
                    vs {match.opponent || match.matchTitle || "Game"}
                  </span>
                  {match.matchDate && (
                    <span className="ml-2 text-xs text-muted-2">{match.matchDate}</span>
                  )}
                </div>
                <span className="text-xs text-muted-2">{events.length} {events.length === 1 ? "action" : "actions"}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
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
              <div className="px-5 py-3 border-t border-border">
                <Link
                  href={`/player/games/${match.id}`}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  View full game stats →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
