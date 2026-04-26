"use client";

import { useEffect, useRef, useState } from "react";
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

const ACTION_BADGE_ACTIVE: Record<string, string> = {
  tackle: "bg-[#7ea37e]/30 text-[#7ea37e] border-[#7ea37e]/50",
  "missed tackle": "bg-[#b16e6e]/30 text-[#b16e6e] border-[#b16e6e]/50",
  carry: "bg-[#b79a63]/30 text-[#b79a63] border-[#b79a63]/50",
  turnover: "bg-[#b79a63]/30 text-[#b79a63] border-[#b79a63]/50",
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [activeEventIdx, setActiveEventIdx] = useState<number | null>(null);
  const playlistRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setActiveEventIdx(null);
    e.target.value = "";
  }

  function seekToEvent(idx: number) {
    const ev = events[idx];
    if (!videoRef.current || !ev) return;
    videoRef.current.currentTime = Math.max(0, ev.timestamp - 3);
    videoRef.current.play();
    setActiveEventIdx(idx);
    // Scroll the playlist item into view
    setTimeout(() => {
      const item = playlistRef.current?.querySelector(`[data-idx="${idx}"]`);
      item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  }

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

  const spEvents = match.events.filter((e) => e.category === "set-piece");
  const lineouts = spEvents.filter((e) => e.setPieceType === "lineout");
  const lineoutsWon = lineouts.filter((e) => e.lineoutResult === "Won").length;
  const scrums = spEvents.filter((e) => e.setPieceType === "scrum");
  const scrumsWon = scrums.filter((e) => e.scrumResult === "Won").length;

  return (
    <div className="p-6 max-w-3xl space-y-5">
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

      {/* Video player + playlist */}
      {videoUrl ? (
        <div className="rounded-xl border border-border bg-panel overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video bg-black"
            controls
          />

          {events.length > 0 && (
            <div className="border-t border-border">
              {/* Playlist header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground-strong uppercase tracking-wider">
                    Your moments
                  </p>
                  <p className="text-[11px] text-muted-2 mt-0.5">
                    {activeEventIdx !== null ? `${activeEventIdx + 1} of ${events.length}` : `${events.length} tagged actions`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => seekToEvent(activeEventIdx !== null && activeEventIdx > 0 ? activeEventIdx - 1 : 0)}
                    disabled={activeEventIdx === null || activeEventIdx === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition-all duration-150 hover:border-border-light hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeEventIdx === null) seekToEvent(0);
                      else if (activeEventIdx < events.length - 1) seekToEvent(activeEventIdx + 1);
                    }}
                    disabled={activeEventIdx !== null && activeEventIdx >= events.length - 1}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition-all duration-150 hover:border-border-light hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Playlist items */}
              <div ref={playlistRef} className="max-h-56 overflow-y-auto">
                {events.map((e, idx) => {
                  const isActive = activeEventIdx === idx;
                  const badgeClass = e.playerAction
                    ? (isActive ? ACTION_BADGE_ACTIVE[e.playerAction] : ACTION_COLOURS[e.playerAction]) ?? "border-border text-muted"
                    : "border-border text-muted";
                  return (
                    <button
                      key={e.id}
                      type="button"
                      data-idx={idx}
                      onClick={() => seekToEvent(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border last:border-0 ${
                        isActive ? "bg-panel-3" : "hover:bg-panel-2"
                      }`}
                    >
                      <span className="shrink-0 text-[11px] text-muted-2 font-mono w-10 text-right tabular-nums">
                        {formatTime(e.timestamp)}
                      </span>
                      {e.playerAction && (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                          {ACTION_LABELS[e.playerAction] ?? e.playerAction}
                        </span>
                      )}
                      <span className={`text-sm leading-snug truncate ${isActive ? "text-foreground" : "text-muted"}`}>
                        {e.text}
                      </span>
                      {isActive && (
                        <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-[#7ea37e]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Change video link */}
          <div className="px-4 py-2.5 border-t border-border">
            <label className="cursor-pointer text-xs text-muted-2 hover:text-muted transition-colors">
              Load different video
              <input type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
            </label>
          </div>
        </div>
      ) : (
        /* No video — invite to load */
        <label className="block cursor-pointer">
          <input type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
          <div className="rounded-xl border border-dashed border-border bg-panel-2/50 px-6 py-8 text-center transition-colors hover:border-border-light hover:bg-panel-2">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel-3">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <polygon points="5,2 13,8 5,14" fill="currentColor" className="text-muted-2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Load match video</p>
            <p className="mt-1 text-xs text-muted-2">Select the video file to watch and step through your tagged moments</p>
          </div>
        </label>
      )}

      {/* Stat grid */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-2">Your stats</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Tackle %", value: `${row.tacklePct.toFixed(0)}%`, grade: row.tacklePctGrade },
            { label: "Carries", value: String(row.carries), grade: row.carriesPerMinGrade },
            { label: "Involvements", value: String(row.involvements), grade: row.workRateGrade },
            { label: "Minutes", value: row.minutes ? String(row.minutes) : "—", grade: null },
          ].map(({ label, value, grade }) => (
            <div key={label} className="rounded-xl border border-border bg-panel px-4 py-4">
              <p className="text-2xl font-semibold text-foreground-strong">{value}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted-2">{label}</p>
                {grade && <GradeBadge grade={grade} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team set piece */}
      {spEvents.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-2">Team Set Piece</p>
          <div className="grid grid-cols-2 gap-3">
            {lineouts.length > 0 && (
              <div className="rounded-xl border border-border bg-panel px-4 py-4">
                <p className="text-2xl font-semibold text-foreground-strong">
                  {Math.round((lineoutsWon / lineouts.length) * 100)}%
                </p>
                <p className="text-xs text-muted-2 mt-1">Lineout %</p>
                <p className="text-[11px] text-muted mt-0.5">{lineoutsWon} / {lineouts.length} won</p>
              </div>
            )}
            {scrums.length > 0 && (
              <div className="rounded-xl border border-border bg-panel px-4 py-4">
                <p className="text-2xl font-semibold text-foreground-strong">
                  {Math.round((scrumsWon / scrums.length) * 100)}%
                </p>
                <p className="text-xs text-muted-2 mt-1">Scrum %</p>
                <p className="text-[11px] text-muted mt-0.5">{scrumsWon} / {scrums.length} won</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coach comment */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <p className="text-xs text-muted-2 uppercase tracking-wider font-medium mb-2">Coach comment</p>
        <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{row.coachComment}&rdquo;</p>
      </div>

      {/* Event timeline — shown when no video loaded */}
      {!videoUrl && events.length > 0 && (
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
