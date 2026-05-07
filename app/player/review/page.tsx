"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePlayer } from "../PlayerContext";
import { PageHelp } from "@/app/components/PageHelp";
import { PLAYER_PAGE_HELP } from "../help-content";
import { PlayerPicker } from "../PlayerPicker";
import {
  SAVED_MATCHES_KEY,
  subscribeSavedMatchesChanged,
  getSavedMatchById,
  upsertSavedMatch,
} from "@/app/rugby-tagging/lib/savedMatches";
import { formatTime } from "@/app/rugby-tagging/helpers";
import {
  buildSetPieceReviewMoments,
  filterSetPieceReviewMoments,
  type SetPieceReviewMoment,
  type SetPieceSideFilters,
  type SetPieceTypeFilter,
} from "@/app/rugby-tagging/lib/setPieceReview";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { ClipAnnotation, ClipPlayerNote, ClipReaction } from "@/app/rugby-tagging/types";
import { getMatchVideoSignedUrl, refreshVideoSignedUrl, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/matchVideoCloud";
import { markReviewAsSeen } from "../lib/reviewSeen";

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
  matchId: string,
  clipId: number,
  mutate: (clip: ClipAnnotation) => ClipAnnotation
) {
  const match = getSavedMatchById(matchId);
  if (!match) return;
  const nextClips = (match.clips ?? []).map((c) => (c.id === clipId ? mutate(c) : c));
  upsertSavedMatch({ ...match, clips: nextClips, updatedAt: new Date().toISOString() });
}

const NOTE_DEBOUNCE_MS = 600;

function ClipRow({
  clip,
  idx,
  isActive,
  canSeek,
  playerId,
  onSeek,
  onSetReaction,
  onSetNote,
}: {
  clip: ClipAnnotation;
  idx: number;
  isActive: boolean;
  canSeek: boolean;
  playerId: string;
  onSeek: () => void;
  onSetReaction: (type: ClipReaction["type"] | null, note?: string) => void;
  onSetNote: (text: string) => void;
}) {
  const myReaction = clip.reactions?.find((r) => r.playerId === playerId) ?? null;
  const myNote = clip.playerNotes?.find((n) => n.playerId === playerId)?.text ?? "";

  const [noteDraft, setNoteDraft] = useState(myNote);
  const [questionDraft, setQuestionDraft] = useState(myReaction?.type === "question" ? myReaction.note ?? "" : "");
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
      if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
    };
  }, []);

  function handleReactionClick(type: ClipReaction["type"]) {
    if (myReaction?.type === type) {
      onSetReaction(null);
      if (type === "question") setQuestionDraft("");
      return;
    }
    if (type === "got_it") {
      setQuestionDraft("");
      onSetReaction("got_it");
    } else {
      onSetReaction("question", questionDraft.trim() || undefined);
    }
  }

  function handleNoteChange(value: string) {
    setNoteDraft(value);
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(() => {
      onSetNote(value);
    }, NOTE_DEBOUNCE_MS);
  }

  function handleQuestionChange(value: string) {
    setQuestionDraft(value);
    if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
    questionTimeoutRef.current = setTimeout(() => {
      onSetReaction("question", value.trim() || undefined);
    }, NOTE_DEBOUNCE_MS);
  }

  const gotItActive = myReaction?.type === "got_it";
  const questionActive = myReaction?.type === "question";

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
        {clip.category && (
          <span className={`shrink-0 mt-0.5 text-[11px] font-medium border rounded px-1.5 py-0.5 ${categoryClass(clip.category)}`}>
            {clip.category}
          </span>
        )}
        {isActive && (
          <span className="shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-success" />
        )}
      </button>

      <div className="mt-3 flex flex-wrap items-start gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleReactionClick("got_it")}
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
              onClick={() => handleReactionClick("question")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                questionActive
                  ? "border-warning bg-warning/10 text-warning"
                  : "border-border bg-panel-2 text-muted hover:text-foreground"
              }`}
            >
              Question 🤔
            </button>
          </div>
          {questionActive && (
            <textarea
              value={questionDraft}
              onChange={(e) => handleQuestionChange(e.target.value)}
              placeholder="What's your question?"
              rows={2}
              className="w-full sm:w-72 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-2 outline-none focus:border-border-light resize-none"
            />
          )}
        </div>

        <label className="flex-1 min-w-[200px] flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-2">Your note</span>
          <textarea
            value={noteDraft}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Notes for yourself"
            rows={2}
            className="w-full rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-2 outline-none focus:border-border-light resize-none"
          />
        </label>
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
  const [activeClipIdx, setActiveClipIdx] = useState<Record<string, number | null>>({});
  const [setPieceTypeFilter, setSetPieceTypeFilter] = useState<SetPieceTypeFilter>("All");
  const [setPieceSideFilters, setSetPieceSideFilters] = useState<SetPieceSideFilters>({
    own: true,
    opposition: true,
  });
  // Track which match's video is currently in the video element
  const [activeVideoMatchId, setActiveVideoMatchId] = useState<string | null>(null);

  const matchesRaw = useSyncExternalStore(
    subscribeSavedMatchesChanged,
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
    (matchId: string, clipId: number, playerId: string, type: ClipReaction["type"] | null, note?: string) => {
      updateClipInSavedMatch(matchId, clipId, (clip) => {
        const others = (clip.reactions ?? []).filter((r) => r.playerId !== playerId);
        if (type === null) return { ...clip, reactions: others };
        const next: ClipReaction = {
          playerId,
          type,
          note: type === "question" ? note : undefined,
          createdAt: new Date().toISOString(),
        };
        return { ...clip, reactions: [...others, next] };
      });
    },
    []
  );

  const setPlayerNote = useCallback(
    (matchId: string, clipId: number, playerId: string, text: string) => {
      updateClipInSavedMatch(matchId, clipId, (clip) => {
        const trimmed = text.trim();
        const others = (clip.playerNotes ?? []).filter((n) => n.playerId !== playerId);
        if (!trimmed) return { ...clip, playerNotes: others };
        const existing = (clip.playerNotes ?? []).find((n) => n.playerId === playerId);
        const now = new Date().toISOString();
        const note: ClipPlayerNote = {
          playerId,
          text: trimmed,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        return { ...clip, playerNotes: [...others, note] };
      });
    },
    []
  );

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
                          setVideoUrls((prev) => { const n = { ...prev }; delete n[match.id]; return n; });
                          setVideoLoading((prev) => ({ ...prev, [match.id]: true }));
                          void refreshVideoSignedUrl(match.videoStoragePath).then((freshUrl) => {
                            if (freshUrl) setVideoUrls((prev) => ({ ...prev, [match.id]: freshUrl }));
                            setVideoLoading((prev) => ({ ...prev, [match.id]: false }));
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
                          onSeek={() => activateAndSeekToClip(match.id, clips, idx)}
                          onSetReaction={(type, note) => setReaction(match.id, clip.id, currentPlayer.id, type, note)}
                          onSetNote={(text) => setPlayerNote(match.id, clip.id, currentPlayer.id, text)}
                        />
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
