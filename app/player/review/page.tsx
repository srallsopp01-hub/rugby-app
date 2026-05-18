"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/app/components/PageHeader";
import { usePlayer } from "../PlayerContext";
import { PageHelp } from "@/app/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import { PlayerPicker } from "../PlayerPicker";
import { useMatches } from "@/app/providers/MatchesContext";
import {
  upsertSavedMatch,
} from "@/app/rugby-tagging/lib/savedMatches";
import { formatMatchDate, formatTime } from "@/app/rugby-tagging/helpers";
import {
  buildSetPieceReviewMoments,
  filterSetPieceReviewMoments,
  type SetPieceReviewMoment,
  type SetPieceSideFilters,
  type SetPieceTypeFilter,
} from "@/app/rugby-tagging/lib/setPieceReview";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { ClipAnnotation, ClipComment, ClipReaction } from "@/app/rugby-tagging/types";
import { getMatchVideoSignedUrl, refreshVideoSignedUrl, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/matchVideoCloud";
import { markReviewAsSeen } from "../lib/reviewSeen";
import { EmptyState } from "@/app/components/EmptyState";
import { Film } from "lucide-react";

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

function updateClipInSavedMatch(
  match: SavedMatchRecord,
  clipId: number,
  mutate: (clip: ClipAnnotation) => ClipAnnotation
) {
  const nextClips = (match.clips ?? []).map((c) => (c.id === clipId ? mutate(c) : c));
  upsertSavedMatch({ ...match, clips: nextClips, updatedAt: new Date().toISOString() });
}

const NOTE_DEBOUNCE_MS = 600;

function formatCommentTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function ClipRow({
  clip,
  idx,
  isActive,
  canSeek,
  playerId,
  playerName,
  onSeek,
  onSetReaction,
  onAddComment,
  onDeleteComment,
}: {
  clip: ClipAnnotation;
  idx: number;
  isActive: boolean;
  canSeek: boolean;
  playerId: string;
  playerName: string;
  onSeek: () => void;
  onSetReaction: (type: ClipReaction["type"] | null) => void;
  onAddComment: (comment: ClipComment) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const myReaction = clip.reactions?.find((r) => r.playerId === playerId) ?? null;
  const gotItActive = myReaction?.type === "got_it";

  const [commentDraft, setCommentDraft] = useState("");
  const [coachOnly, setCoachOnly] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const visibleComments = (clip.comments ?? []).filter(
    (c) => c.visibility === "team" || c.authorId === playerId
  );
  const commentCount = visibleComments.length;

  function handlePostComment() {
    const text = commentDraft.trim();
    if (!text) return;
    const comment: ClipComment = {
      id: crypto.randomUUID(),
      authorId: playerId,
      authorName: playerName,
      authorRole: "player",
      content: text,
      visibility: coachOnly ? "coach_only" : "team",
      createdAt: new Date().toISOString(),
    };
    onAddComment(comment);
    setCommentDraft("");
  }

  return (
    <div
      data-idx={idx}
      className={`px-5 py-3.5 transition-all duration-150 ${isActive ? "bg-panel-3" : ""}`}
    >
      <button
        type="button"
        onClick={() => { if (canSeek) onSeek(); }}
        className={`w-full flex items-start gap-3 text-left ${
          !canSeek ? "cursor-default" : "cursor-pointer"
        }`}
      >
        <span className="shrink-0 mt-0.5 text-[11px] font-mono tabular-nums text-muted-2 bg-panel-2 border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
          {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
        </span>
        <div className="flex-1 flex flex-col">
          <span className={`text-sm ${isActive ? "text-foreground-strong" : "text-foreground"}`}>
            {clip.label}
          </span>
          {clip.comment && (
            <span className="mt-1 text-xs text-muted">{clip.comment}</span>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {commentCount > 0 && (
            <span className="text-[11px] text-muted-2 border border-border rounded px-1.5 py-0.5">
              💬 {commentCount}
            </span>
          )}
          {clip.category && (
            <span className={`text-[11px] font-medium border rounded px-1.5 py-0.5 ${categoryClass(clip.category)}`}>
              {clip.category}
            </span>
          )}
          {isActive && (
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success" />
          )}
        </div>
      </button>

      <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        {/* Got it acknowledgment */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetReaction(gotItActive ? null : "got_it")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              gotItActive
                ? "border-success bg-success/10 text-success"
                : "border-border bg-panel-2 text-muted hover:text-foreground"
            }`}
          >
            Got it 👍
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            {showComments ? "Hide comments" : `Comments${commentCount > 0 ? ` (${commentCount})` : ""}`}
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="rounded-xl border border-border bg-panel-2 overflow-hidden">
            {visibleComments.length > 0 && (
              <div className="divide-y divide-border">
                {visibleComments.map((c) => (
                  <div key={c.id} className="px-3 py-2.5 flex gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-foreground-strong">{c.authorName}</span>
                        {c.authorRole === "coach" && (
                          <span className="text-[10px] font-medium text-muted-2 border border-border rounded px-1 py-0.5">Coach</span>
                        )}
                        {c.visibility === "coach_only" && (
                          <span className="text-[10px] text-muted-2">🔒 Private</span>
                        )}
                        <span className="text-[10px] text-muted-2">{formatCommentTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-foreground leading-relaxed">{c.content}</p>
                    </div>
                    {c.authorId === playerId && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(c.id)}
                        className="shrink-0 text-muted-2 hover:text-foreground text-xs leading-none mt-0.5"
                        aria-label="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {visibleComments.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-muted-2">No comments yet. Be the first.</p>
            )}
            <div className="border-t border-border px-3 py-2.5 space-y-2">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="w-full rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-2 outline-none focus:border-border-light resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={coachOnly}
                    onChange={(e) => setCoachOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-foreground"
                  />
                  <span className="text-xs text-muted">🔒 Only share with coach</span>
                </label>
                <button
                  type="button"
                  onClick={handlePostComment}
                  disabled={!commentDraft.trim()}
                  className="rounded-lg border border-border bg-panel-3 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-border-light disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { currentPlayer, ready } = usePlayer();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playlistRef = useRef<HTMLDivElement | null>(null);

  // Per-match video blob URLs and active clip indices
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [videoLoading, setVideoLoading] = useState<Record<string, boolean>>({});
  const videoRetryCounts = useRef<Record<string, number>>({});
  const [activeClipIdx, setActiveClipIdx] = useState<Record<string, number | null>>({});
  const [setPieceTypeFilter, setSetPieceTypeFilter] = useState<SetPieceTypeFilter>("All");
  const [setPieceSideFilters, setSetPieceSideFilters] = useState<SetPieceSideFilters>({
    own: true,
    opposition: true,
  });
  // Track which match's video is currently in the video element
  const [activeVideoMatchId, setActiveVideoMatchId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { matches } = useMatches();

  const { clipGroups, totalClips, totalSetPieces } = useMemo(() => {
    const clipResult: ClipGroup[] = [];
    let totalC = 0;
    let totalS = 0;
    for (const match of matches) {
      const clips = [...(match.clips ?? [])].sort((a, b) => a.startTime - b.startTime);
      const setPieceMoments = buildSetPieceReviewMoments(match.events ?? []);
      if (clips.length > 0 || setPieceMoments.length > 0) {
        clipResult.push({ match, clips, setPieceMoments });
        totalC += clips.length;
        totalS += setPieceMoments.length;
      }
    }
    clipResult.sort((a, b) => {
      const aDate = a.match.matchDate || a.match.updatedAt;
      const bDate = b.match.matchDate || b.match.updatedAt;
      return bDate.localeCompare(aDate);
    });
    return { clipGroups: clipResult, totalClips: totalC, totalSetPieces: totalS };
  }, [matches]);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    const urls = videoUrls;
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [videoUrls]);

  // Auto-select the most recent game when clip groups first load or change
  useEffect(() => {
    if (clipGroups.length > 0 && (selectedMatchId === null || !clipGroups.find(g => g.match.id === selectedMatchId))) {
      setSelectedMatchId(clipGroups[0].match.id);
    }
  }, [clipGroups, selectedMatchId]);

  // Mark review as seen on mount so unseen-clip badges clear.
  useEffect(() => {
    if (!ready || !currentPlayer) return;
    markReviewAsSeen(currentPlayer.id);
  }, [ready, currentPlayer]);

  // Auto-load signed URLs for matches that have cloud video but no local blob URL
  useEffect(() => {
    const missing = clipGroups.filter(
      ({ match }) => match.videoStoragePath && !videoUrls[match.id] && !videoLoading[match.id]
    );
    if (missing.length === 0) return;

    setVideoLoading((prev) => {
      const next = { ...prev };
      missing.forEach(({ match }) => { next[match.id] = true; });
      return next;
    });

    void Promise.all(
      missing.map(async ({ match }) => {
        if (!match.videoStoragePath) return;
        const url = await getMatchVideoSignedUrl(match.videoStoragePath, SIGNED_URL_EXPIRY_SECONDS);
        if (url) setVideoUrls((prev) => ({ ...prev, [match.id]: url }));
        setVideoLoading((prev) => ({ ...prev, [match.id]: false }));
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

  const setReaction = useCallback(
    (matchId: string, clipId: number, playerId: string, type: ClipReaction["type"] | null) => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;
      updateClipInSavedMatch(match, clipId, (clip) => {
        const others = (clip.reactions ?? []).filter((r) => r.playerId !== playerId);
        if (type === null) return { ...clip, reactions: others };
        const next: ClipReaction = {
          playerId,
          type,
          createdAt: new Date().toISOString(),
        };
        return { ...clip, reactions: [...others, next] };
      });
    },
    [matches]
  );

  const addComment = useCallback(
    (matchId: string, clipId: number, comment: ClipComment) => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;
      updateClipInSavedMatch(match, clipId, (clip) => ({
        ...clip,
        comments: [...(clip.comments ?? []), comment],
      }));
    },
    [matches]
  );

  const deleteComment = useCallback(
    (matchId: string, clipId: number, commentId: string) => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;
      updateClipInSavedMatch(match, clipId, (clip) => ({
        ...clip,
        comments: (clip.comments ?? []).filter((c) => c.id !== commentId),
      }));
    },
    [matches]
  );

  if (!ready) return null;
  if (!currentPlayer) return <PlayerPicker />;

  const selectedGroup = clipGroups.find(g => g.match.id === selectedMatchId) ?? clipGroups[0] ?? null;

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[800px] space-y-5">
        {/* Header */}
        <PageHeader
          title="Review"
          subtitle={
            totalClips > 0 || totalSetPieces > 0
              ? `${totalClips} ${totalClips === 1 ? "clip" : "clips"} and ${totalSetPieces} set-piece ${totalSetPieces === 1 ? "tag" : "tags"} from review`
              : "Coach clips from film review"
          }
          helpButton={<PageHelp {...PLAYER_PAGE_HELP["/player/review"]} />}
        />

        {/* Game selector + match content */}
        {clipGroups.length > 0 && selectedGroup && (() => {
          const { match, clips, setPieceMoments } = selectedGroup;
          const videoUrl = videoUrls[match.id];
          const isActiveMatch = activeVideoMatchId === match.id;
          const currentIdx = activeClipIdx[match.id] ?? null;
          const filteredSetPieceMoments = filterSetPieceReviewMoments(
            setPieceMoments,
            setPieceTypeFilter,
            setPieceSideFilters
          );

          return (
            <>
              {clipGroups.length > 1 && (
                <section className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-2">Select Game</p>
                  <div className="flex flex-wrap gap-2">
                    {clipGroups.map(({ match: m }) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMatchId(m.id)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedMatchId === m.id
                            ? "border-border-light bg-panel-3 text-foreground-strong"
                            : "border-border bg-panel-2 text-muted hover:border-border-light hover:text-foreground"
                        }`}
                      >
                        vs {m.opponent || m.matchTitle || "Game"}
                        {m.matchDate && (
                          <span className="ml-1.5 text-xs font-normal text-muted-2">{formatMatchDate(m.matchDate)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="rounded-xl border border-border bg-panel overflow-hidden">
                {/* Match header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-panel-2 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground-strong">
                      vs {match.opponent || match.matchTitle || "Game"}
                    </p>
                    {match.matchDate && (
                      <p className="text-xs text-muted-2 mt-0.5">{formatMatchDate(match.matchDate)}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-2">
                    {clips.length} {clips.length === 1 ? "clip" : "clips"}
                  </span>
                </div>

                {/* Video area */}
                <div className="px-5 py-4 border-b border-border space-y-3">
                  {videoLoading[match.id] ? (
                    <div className="flex items-center gap-2 py-1 text-sm text-muted">
                      <svg className="animate-spin h-4 w-4 shrink-0 text-muted-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading video from cloud…
                    </div>
                  ) : !videoUrl ? (
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
                        onError={() => {
                          if (!videoUrl || videoUrl.startsWith("blob:")) return;
                          if (!match.videoStoragePath) return;
                          const retries = videoRetryCounts.current[match.id] ?? 0;
                          if (retries >= 1) return;
                          videoRetryCounts.current[match.id] = retries + 1;
                          void refreshVideoSignedUrl(match.videoStoragePath).then((freshUrl) => {
                            if (freshUrl) setVideoUrls((prev) => ({ ...prev, [match.id]: freshUrl }));
                          });
                        }}
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
                        <ClipRow
                          key={clip.id}
                          clip={clip}
                          idx={idx}
                          isActive={isActive}
                          canSeek={Boolean(videoUrl)}
                          playerId={currentPlayer.id}
                          playerName={currentPlayer.preferredName || currentPlayer.fullName}
                          onSeek={() => activateAndSeekToClip(match.id, clips, idx)}
                          onSetReaction={(type) => setReaction(match.id, clip.id, currentPlayer.id, type)}
                          onAddComment={(comment) => addComment(match.id, clip.id, comment)}
                          onDeleteComment={(commentId) => deleteComment(match.id, clip.id, commentId)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* Empty state — nothing at all */}
        {clipGroups.length === 0 && (
          <EmptyState
            icon={Film}
            title="No review content yet"
            description="When your coach saves clips from this match, they'll appear here for review."
          />
        )}
      </div>
    </main>
  );
}
