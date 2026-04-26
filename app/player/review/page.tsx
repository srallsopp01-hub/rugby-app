"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePlayer } from "../PlayerContext";
import { PlayerPicker } from "../PlayerPicker";
import { SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
import { formatTime } from "@/app/rugby-tagging/helpers";
import type { SavedMatchRecord, SavedCoachReviewNote } from "@/app/rugby-tagging/lib/savedMatches";
import type { ClipAnnotation } from "@/app/rugby-tagging/types";

type NoteGroup = {
  match: SavedMatchRecord;
  notes: SavedCoachReviewNote[];
};

type ClipGroup = {
  match: SavedMatchRecord;
  clips: ClipAnnotation[];
};

const CATEGORY_COLOUR: Record<string, string> = {
  Attack: "text-success border-success/30 bg-success/5",
  Defence: "text-warning border-warning/30 bg-warning/5",
};

function categoryClass(cat: string | undefined) {
  if (!cat) return "text-muted-2 border-border bg-panel-2";
  return CATEGORY_COLOUR[cat] ?? "text-muted-2 border-border bg-panel-2";
}

const noSubscribe = () => () => {};

export default function ReviewPage() {
  const { currentPlayer, ready } = usePlayer();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playlistRef = useRef<HTMLDivElement | null>(null);

  // Per-match video blob URLs and active clip indices
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [activeClipIdx, setActiveClipIdx] = useState<Record<string, number | null>>({});
  // Track which match's video is currently in the video element
  const [activeVideoMatchId, setActiveVideoMatchId] = useState<string | null>(null);

  const matchesRaw = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const { groups, totalNotes, clipGroups, totalClips } = useMemo(() => {
    let all: SavedMatchRecord[];
    try { all = JSON.parse(matchesRaw); } catch { return { groups: [], totalNotes: 0, clipGroups: [], totalClips: 0 }; }
    const noteResult: NoteGroup[] = [];
    let totalN = 0;
    const clipResult: ClipGroup[] = [];
    let totalC = 0;
    for (const match of all) {
      const notes = [...(match.coachNotes ?? [])].sort((a, b) => a.timestamp - b.timestamp);
      if (notes.length > 0) { noteResult.push({ match, notes }); totalN += notes.length; }
      const clips = [...(match.clips ?? [])].sort((a, b) => a.startTime - b.startTime);
      if (clips.length > 0) { clipResult.push({ match, clips }); totalC += clips.length; }
    }
    return { groups: noteResult, totalNotes: totalN, clipGroups: clipResult, totalClips: totalC };
  }, [matchesRaw]);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    const urls = videoUrls;
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [videoUrls]);

  function handleVideoFile(matchId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUrls((prev) => {
      if (prev[matchId]) URL.revokeObjectURL(prev[matchId]);
      return { ...prev, [matchId]: URL.createObjectURL(file) };
    });
    setActiveClipIdx((prev) => ({ ...prev, [matchId]: null }));
    setActiveVideoMatchId(matchId);
    e.target.value = "";
  }

  function seekToClip(matchId: string, clips: ClipAnnotation[], idx: number) {
    const clip = clips[idx];
    if (!videoRef.current || !clip) return;
    videoRef.current.currentTime = Math.max(0, clip.startTime - 3);
    videoRef.current.play();
    setActiveClipIdx((prev) => ({ ...prev, [matchId]: idx }));
    setTimeout(() => {
      playlistRef.current?.querySelector(`[data-idx="${idx}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  }

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  return (
    <div className="p-8 max-w-3xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground-strong">Review</h1>
        <p className="mt-1 text-sm text-muted">
          {totalClips > 0 || totalNotes > 0
            ? [
                totalClips > 0 && `${totalClips} ${totalClips === 1 ? "clip" : "clips"}`,
                totalNotes > 0 && `${totalNotes} ${totalNotes === 1 ? "note" : "notes"}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Coach clips and match observations from film review"}
        </p>
      </div>

      {/* ── Clips section ── */}
      {clipGroups.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground-strong uppercase tracking-widest">
            Coaching Clips
          </h2>

          {clipGroups.map(({ match, clips }) => {
            const videoUrl = videoUrls[match.id];
            const isActiveMatch = activeVideoMatchId === match.id;
            const currentIdx = activeClipIdx[match.id] ?? null;

            return (
              <div key={match.id} className="rounded-xl border border-border bg-panel overflow-hidden">
                {/* Match header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-panel-2 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground-strong">
                      vs {match.opponent || match.matchTitle || "Game"}
                    </p>
                    {match.matchDate && (
                      <p className="text-xs text-muted-2 mt-0.5">{match.matchDate}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-2">
                    {clips.length} {clips.length === 1 ? "clip" : "clips"}
                  </span>
                </div>

                {/* Video area */}
                <div className="px-5 py-4 border-b border-border space-y-3">
                  {!videoUrl ? (
                    <label className="flex items-center gap-3 cursor-pointer group w-fit">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel-2 transition-all duration-150 group-hover:border-border-light group-hover:bg-panel-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-foreground-strong transition-colors">
                          Load match video to watch clips
                        </p>
                        <p className="text-xs text-muted-2">Select the video file for this game</p>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        onChange={(e) => handleVideoFile(match.id, e)}
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <video
                        ref={isActiveMatch ? videoRef : undefined}
                        src={videoUrl}
                        controls
                        className="w-full rounded-lg bg-black aspect-video"
                        onPlay={() => setActiveVideoMatchId(match.id)}
                      />
                      {/* Prev / Next */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => seekToClip(match.id, clips, Math.max(0, (currentIdx ?? 0) - 1))}
                          disabled={currentIdx === null || currentIdx === 0}
                          className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition-all duration-150 hover:border-border-light hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentIdx === null) seekToClip(match.id, clips, 0);
                            else if (currentIdx < clips.length - 1) seekToClip(match.id, clips, currentIdx + 1);
                          }}
                          disabled={currentIdx !== null && currentIdx >= clips.length - 1}
                          className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition-all duration-150 hover:border-border-light hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next →
                        </button>
                        {currentIdx !== null && (
                          <span className="text-xs text-muted-2 ml-1">
                            Clip {currentIdx + 1} of {clips.length}
                          </span>
                        )}
                        <label className="ml-auto cursor-pointer text-xs text-muted-2 hover:text-muted transition-colors">
                          Change video
                          <input
                            type="file"
                            accept="video/*"
                            className="sr-only"
                            onChange={(e) => handleVideoFile(match.id, e)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clip playlist */}
                <div ref={playlistRef} className="divide-y divide-border">
                  {clips.map((clip, idx) => {
                    const isActive = isActiveMatch && currentIdx === idx;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        data-idx={idx}
                        onClick={() => {
                          // If video not yet loaded for this match, can't seek — noop
                          if (videoUrl) seekToClip(match.id, clips, idx);
                        }}
                        className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all duration-150 ${
                          isActive ? "bg-panel-3" : "hover:bg-panel-2"
                        } ${!videoUrl ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {/* Time range */}
                        <span className="shrink-0 mt-0.5 text-[11px] font-mono tabular-nums text-muted-2 bg-panel-2 border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
                          {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                        </span>
                        {/* Label */}
                        <span className={`flex-1 text-sm ${isActive ? "text-foreground-strong" : "text-foreground"}`}>
                          {clip.label}
                        </span>
                        {/* Category badge */}
                        {clip.category && (
                          <span className={`shrink-0 mt-0.5 text-[11px] font-medium border rounded px-1.5 py-0.5 ${categoryClass(clip.category)}`}>
                            {clip.category}
                          </span>
                        )}
                        {/* Active dot */}
                        {isActive && (
                          <span className="shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-success" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Coach notes section ── */}
      {groups.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground-strong uppercase tracking-widest">
            Match Notes
          </h2>

          {/* What this section is */}
          <div className="rounded-xl border border-border bg-panel-2 p-4 flex items-start gap-3">
            <div className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-panel-3 border border-border">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-2" />
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" className="text-muted-2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Timestamped match observations</p>
              <p className="mt-0.5 text-xs text-muted leading-relaxed">
                Notes your coach wrote during film review, tagged to moments in the match video.
                Open a game in{" "}
                <Link href="/player/games" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Games
                </Link>{" "}
                to watch the video alongside these notes.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {groups.map(({ match, notes }) => (
              <div key={match.id} className="rounded-xl border border-border bg-panel overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 bg-panel-2 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground-strong">
                      vs {match.opponent || match.matchTitle || "Game"}
                    </p>
                    {match.matchDate && (
                      <p className="text-xs text-muted-2 mt-0.5">{match.matchDate}</p>
                    )}
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
        </section>
      )}

      {/* Empty state — nothing at all */}
      {clipGroups.length === 0 && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel-3">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" className="text-muted-2" />
              <path d="M6.5 6.5l4 2-4 2V6.5z" fill="currentColor" className="text-muted-2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No review content yet</p>
            <p className="mt-1 text-xs text-muted">
              Your coach hasn&apos;t created clips or added film review notes yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
