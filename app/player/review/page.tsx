"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePlayer } from "../PlayerContext";
import { PageHelp } from "@/app/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import { PlayerPicker } from "../PlayerPicker";
import { SAVED_MATCHES_KEY } from "@/app/rugby-tagging/lib/savedMatches";
import { formatTime } from "@/app/rugby-tagging/helpers";
import {
  buildSetPieceReviewMoments,
  filterSetPieceReviewMoments,
  type SetPieceReviewMoment,
  type SetPieceSideFilters,
  type SetPieceTypeFilter,
} from "@/app/rugby-tagging/lib/setPieceReview";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { ClipAnnotation } from "@/app/rugby-tagging/types";
import { getMatchVideoSignedUrl } from "@/lib/matchVideoCloud";

type ClipGroup = {
  match: SavedMatchRecord;
  clips: ClipAnnotation[];
  setPieceMoments: SetPieceReviewMoment[];
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
  const [setPieceTypeFilter, setSetPieceTypeFilter] = useState<SetPieceTypeFilter>("All");
  const [setPieceSideFilters, setSetPieceSideFilters] = useState<SetPieceSideFilters>({
    own: true,
    opposition: true,
  });
  // Track which match's video is currently in the video element
  const [activeVideoMatchId, setActiveVideoMatchId] = useState<string | null>(null);

  const matchesRaw = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const { clipGroups, totalClips, totalSetPieces } = useMemo(() => {
    let all: SavedMatchRecord[];
    try { all = JSON.parse(matchesRaw); } catch { return { clipGroups: [], totalClips: 0, totalSetPieces: 0 }; }
    const clipResult: ClipGroup[] = [];
    let totalC = 0;
    let totalS = 0;
    for (const match of all) {
      const clips = [...(match.clips ?? [])].sort((a, b) => a.startTime - b.startTime);
      const setPieceMoments = buildSetPieceReviewMoments(match.events ?? []);
      if (clips.length > 0 || setPieceMoments.length > 0) {
        clipResult.push({ match, clips, setPieceMoments });
        totalC += clips.length;
        totalS += setPieceMoments.length;
      }
    }
    return { clipGroups: clipResult, totalClips: totalC, totalSetPieces: totalS };
  }, [matchesRaw]);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    const urls = videoUrls;
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [videoUrls]);

  // Auto-load signed URLs for matches that have cloud video but no local blob URL
  useEffect(() => {
    const missing = clipGroups.filter(
      ({ match }) => match.videoStoragePath && !videoUrls[match.id]
    );
    if (missing.length === 0) return;

    void Promise.all(
      missing.map(async ({ match }) => {
        if (!match.videoStoragePath) return;
        const url = await getMatchVideoSignedUrl(match.videoStoragePath, 14400);
        if (url) {
          setVideoUrls((prev) => ({ ...prev, [match.id]: url }));
        }
      })
    );
  // Re-run when clipGroups changes (new matches loaded), but not on every videoUrls change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipGroups]);

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

  function seekToSetPiece(matchId: string, timestamp: number) {
    if (!videoRef.current || activeVideoMatchId !== matchId) return;
    videoRef.current.currentTime = Math.max(0, timestamp - 3);
    videoRef.current.play();
  }

  function activateAndSeekToClip(matchId: string, clips: ClipAnnotation[], idx: number) {
    setActiveVideoMatchId(matchId);
    window.setTimeout(() => seekToClip(matchId, clips, idx), 0);
  }

  function activateAndSeekToSetPiece(matchId: string, timestamp: number) {
    setActiveVideoMatchId(matchId);
    window.setTimeout(() => seekToSetPiece(matchId, timestamp), 0);
  }

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  return (
    <div className="p-8 max-w-3xl space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground-strong">Review</h1>
          <PageHelp {...PLAYER_PAGE_HELP["/player/review"]} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {totalClips > 0 || totalSetPieces > 0
            ? `${totalClips} ${totalClips === 1 ? "clip" : "clips"} and ${totalSetPieces} set-piece ${totalSetPieces === 1 ? "tag" : "tags"} from review`
            : "Coach clips from film review"}
        </p>
      </div>

      {/* ── Clips section ── */}
      {clipGroups.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground-strong uppercase tracking-widest">
            Review Moments
          </h2>

          {clipGroups.map(({ match, clips, setPieceMoments }) => {
            const videoUrl = videoUrls[match.id];
            const isActiveMatch = activeVideoMatchId === match.id;
            const currentIdx = activeClipIdx[match.id] ?? null;
            const filteredSetPieceMoments = filterSetPieceReviewMoments(
              setPieceMoments,
              setPieceTypeFilter,
              setPieceSideFilters
            );

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
                          onClick={() => activateAndSeekToClip(match.id, clips, Math.max(0, (currentIdx ?? 0) - 1))}
                          disabled={currentIdx === null || currentIdx === 0}
                          className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition-all duration-150 hover:border-border-light hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentIdx === null) activateAndSeekToClip(match.id, clips, 0);
                            else if (currentIdx < clips.length - 1) activateAndSeekToClip(match.id, clips, currentIdx + 1);
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
                <div className="border-b border-border">
                  <div className="flex items-center justify-between px-5 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-2">Set-piece tags</h3>
                    <span className="text-xs text-muted-2">
                      {setPieceMoments.length} {setPieceMoments.length === 1 ? "tag" : "tags"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                    {(["All", "Scrum", "Lineout"] as SetPieceTypeFilter[]).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSetPieceTypeFilter(filter)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          setPieceTypeFilter === filter ? "border-border-light bg-panel-3 text-foreground" : "border-border bg-panel-2 text-muted"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                    {[
                      ["own", "Own"],
                      ["opposition", "Opposition"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-panel-2 px-3 py-1 text-xs font-medium text-muted"
                      >
                        <input
                          type="checkbox"
                          checked={setPieceSideFilters[key as keyof SetPieceSideFilters]}
                          onChange={(event) =>
                            setSetPieceSideFilters((prev) => ({
                              ...prev,
                              [key]: event.target.checked,
                            }))
                          }
                          className="h-3.5 w-3.5 rounded accent-foreground"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {filteredSetPieceMoments.length === 0 ? (
                    <p className="px-5 pb-4 text-sm text-muted">
                      {setPieceMoments.length === 0 ? "No scrum or lineout tags logged for this match." : "No set-piece tags match these filters."}
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredSetPieceMoments.map((moment) => (
                        <button
                          key={moment.id}
                          type="button"
                          onClick={() => {
                            if (videoUrl) activateAndSeekToSetPiece(match.id, moment.timestamp);
                          }}
                          className={`w-full px-5 py-3 text-left transition-all duration-150 ${
                            videoUrl ? "cursor-pointer hover:bg-panel-2" : "cursor-default"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-2">{formatTime(moment.timestamp)}</span>
                            <span className="text-sm font-medium text-foreground">{moment.label}</span>
                            <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted">{moment.side}</span>
                          </div>
                          {moment.notes && <p className="mt-1 text-xs text-muted">Call: {moment.notes}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {clips.length > 0 && (
                  <div ref={playlistRef} className="divide-y divide-border">
                    {clips.map((clip, idx) => {
                      const isActive = isActiveMatch && currentIdx === idx;
                      return (
                        <button
                          key={clip.id}
                          type="button"
                          data-idx={idx}
                          onClick={() => {
                            if (videoUrl) activateAndSeekToClip(match.id, clips, idx);
                          }}
                          className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all duration-150 ${
                            isActive ? "bg-panel-3" : "hover:bg-panel-2"
                          } ${!videoUrl ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <span className="shrink-0 mt-0.5 text-[11px] font-mono tabular-nums text-muted-2 bg-panel-2 border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
                            {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                          </span>
                          <span className={`flex-1 text-sm ${isActive ? "text-foreground-strong" : "text-foreground"}`}>
                            {clip.label}
                          </span>
                          {clip.category && (
                            <span className={`shrink-0 mt-0.5 text-[11px] font-medium border rounded px-1.5 py-0.5 ${categoryClass(clip.category)}`}>
                              {clip.category}
                            </span>
                          )}
                          {isActive && (
                            <span className="shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-success" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Empty state — nothing at all */}
      {clipGroups.length === 0 && (
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
              Your coach hasn&apos;t created shared clips yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
