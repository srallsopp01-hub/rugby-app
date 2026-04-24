"use client";

import { useMemo, useRef, useState } from "react";
import GameReviewTimelinePanel from "@/app/rugby-tagging/components/GameReviewTimelinePanel";
import CoachReviewPanel from "@/app/rugby-tagging/components/CoachReviewPanel";
import TeamSnapshotPanel from "@/app/rugby-tagging/components/TeamSnapshotPanel";
import { getMatchVideoUrl } from "@/app/rugby-tagging/lib/matchVideoSession";
import { buildMatchConfidenceSummary } from "@/app/rugby-tagging/lib/matchConfidence";
import { DEFAULT_ROSTER_ROWS, STORAGE_KEY } from "@/app/rugby-tagging/constants";
import { formatTime, hydrateRosterRows } from "@/app/rugby-tagging/helpers";
import type { ClipAnnotation, EventItem, RosterRow } from "@/app/rugby-tagging/types";

type CoachReviewNote = {
  id: number;
  timestamp: number;
  text: string;
  rawText?: string;
};

type SavedSession = {
  matchTitle?: string;
  opponent?: string;
  matchDate?: string;
  rosterRows?: RosterRow[];
  events?: EventItem[];
  coachNotes?: CoachReviewNote[];
  showRawTranscript?: boolean;
  clips?: ClipAnnotation[];
};

const CLIP_CATEGORIES = ["Breakdown", "Set Piece", "Kick", "Defence", "Attack", "Other"];
let nextLocalReviewId = 1;

function createLocalReviewId(existingIds: number[]) {
  const maxExisting = existingIds.reduce((max, id) => Math.max(max, id), 0);
  nextLocalReviewId = Math.max(nextLocalReviewId, maxExisting + 1);
  const nextId = nextLocalReviewId;
  nextLocalReviewId += 1;
  return nextId;
}

function loadSavedReviewSession(): SavedSession {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved: SavedSession = JSON.parse(raw);
    return saved && typeof saved === "object" ? saved : {};
  } catch (error) {
    console.error("Failed to load saved session", error);
    return {};
  }
}

function loadSavedReviewVideoSrc() {
  if (typeof window === "undefined") return "";

  try {
    return (
      getMatchVideoUrl() ||
      sessionStorage.getItem("rugby-tagging-video-src") ||
      ""
    );
  } catch (error) {
    console.error("Failed to load video source", error);
    return "";
  }
}

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [savedSession] = useState(loadSavedReviewSession);

  const [matchTitle] = useState(savedSession.matchTitle || "");
  const [opponent] = useState(savedSession.opponent || "");
  const [matchDate] = useState(savedSession.matchDate || "");
  const [rosterRows] = useState<RosterRow[]>(() =>
    savedSession.rosterRows
      ? hydrateRosterRows(savedSession.rosterRows)
      : DEFAULT_ROSTER_ROWS
  );
  const [events] = useState<EventItem[]>(() =>
    Array.isArray(savedSession.events)
      ? savedSession.events.filter((event) => !event.isPending)
      : []
  );
  const [coachNotes, setCoachNotes] = useState<CoachReviewNote[]>(() =>
    Array.isArray(savedSession.coachNotes) ? savedSession.coachNotes : []
  );
  const [showRawTranscript, setShowRawTranscript] = useState(
    typeof savedSession.showRawTranscript === "boolean"
      ? savedSession.showRawTranscript
      : true
  );
  const [videoSrc] = useState(loadSavedReviewVideoSrc);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [coachNoteDraft, setCoachNoteDraft] = useState("");
  const [coachRawDraft, setCoachRawDraft] = useState("");
  const [showCoachRawInput, setShowCoachRawInput] = useState(false);
  const [clips, setClips] = useState<ClipAnnotation[]>(() =>
    Array.isArray(savedSession.clips) ? savedSession.clips : []
  );
  const [clipInProgress, setClipInProgress] = useState<number | null>(null);
  const [pendingEndTime, setPendingEndTime] = useState<number | null>(null);
  const [clipLabelDraft, setClipLabelDraft] = useState("");
  const [clipCategoryDraft, setClipCategoryDraft] = useState("");

  const teamTotals = useMemo(() => {
    const playerEvents = events.filter(
      (event) => !event.isPending && event.category === "player"
    );

    return {
      tackles: playerEvents.filter((event) => event.playerAction === "tackle").length,
      missed: playerEvents.filter((event) => event.playerAction === "missed tackle").length,
      carries: playerEvents.filter((event) => event.playerAction === "carry").length,
      turnovers: playerEvents.filter((event) => event.playerAction === "turnover").length,
    };
  }, [events]);

  const teamEventSummary = useMemo(() => {
    const teamEvents = events.filter(
      (event) => !event.isPending && event.category === "team"
    );

    return {
      penaltiesConceded: teamEvents.filter(
        (event) => event.teamEventType === "penalty conceded"
      ).length,
      triesScored: teamEvents.filter(
        (event) => event.teamEventType === "try scored"
      ).length,
      triesConceded: teamEvents.filter(
        (event) => event.teamEventType === "try conceded"
      ).length,
    };
  }, [events]);

  const setPieceSummary = useMemo(() => {
    const lineouts = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "lineout" &&
        event.setPieceSide === "Easts"
    );

    const scrums = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "scrum" &&
        event.setPieceSide === "Easts"
    );

    const eastsLineoutWon = lineouts.filter(
      (event) => event.lineoutResult === "Won"
    ).length;

    const eastsScrumWon = scrums.filter(
      (event) =>
        event.scrumResult === "Won" || event.scrumResult === "Penalty For"
    ).length;

    return {
      eastsLineoutSuccessPct:
        lineouts.length > 0 ? (eastsLineoutWon / lineouts.length) * 100 : 0,
      eastsScrumSuccessPct:
        scrums.length > 0 ? (eastsScrumWon / scrums.length) * 100 : 0,
    };
  }, [events]);

  const teamTacklePct =
    teamTotals.tackles + teamTotals.missed > 0
      ? (teamTotals.tackles / (teamTotals.tackles + teamTotals.missed)) * 100
      : 0;
  const confidence = useMemo(
    () =>
      buildMatchConfidenceSummary({
        matchTitle,
        opponent,
        matchDate,
        rosterRows,
        events,
        coachNotes,
      }),
    [matchTitle, opponent, matchDate, rosterRows, events, coachNotes]
  );

  const addCoachNote = () => {
    if (!coachNoteDraft.trim() && !coachRawDraft.trim()) return;

    const timestamp = videoRef.current?.currentTime || currentTime;

    const nextNotes = [
      ...coachNotes,
      {
        id: createLocalReviewId(coachNotes.map((note) => note.id)),
        timestamp,
        text: coachNoteDraft.trim() || "Coaching note",
        rawText: coachRawDraft.trim() || undefined,
      },
    ];

    setCoachNotes(nextNotes);
    setCoachNoteDraft("");
    setCoachRawDraft("");

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...saved,
          coachNotes: nextNotes,
        })
      );
    } catch (error) {
      console.error("Failed to save coach notes", error);
    }
  };

  const deleteCoachNote = (id: number) => {
    const nextNotes = coachNotes.filter((note) => note.id !== id);
    setCoachNotes(nextNotes);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...saved,
          coachNotes: nextNotes,
        })
      );
    } catch (error) {
      console.error("Failed to save coach notes", error);
    }
  };

  const saveClipsToStorage = (nextClips: ClipAnnotation[]) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...JSON.parse(raw), clips: nextClips }));
    } catch (error) {
      console.error("Failed to save clips", error);
    }
  };

  const markStart = () => {
    setClipInProgress(videoRef.current?.currentTime ?? currentTime);
    setPendingEndTime(null);
    setClipLabelDraft("");
    setClipCategoryDraft("");
  };

  const markEnd = () => {
    if (clipInProgress === null) return;
    const t = videoRef.current?.currentTime ?? currentTime;
    if (t <= clipInProgress) return;
    setPendingEndTime(t);
  };

  const confirmClip = () => {
    if (clipInProgress === null || pendingEndTime === null) return;
    const next = [
      ...clips,
      {
        id: createLocalReviewId(clips.map((clip) => clip.id)),
        startTime: clipInProgress,
        endTime: pendingEndTime,
        label: clipLabelDraft.trim() || "Clip",
        category: clipCategoryDraft || undefined,
      },
    ];
    setClips(next);
    setClipInProgress(null);
    setPendingEndTime(null);
    setClipLabelDraft("");
    setClipCategoryDraft("");
    saveClipsToStorage(next);
  };

  const cancelClip = () => {
    setClipInProgress(null);
    setPendingEndTime(null);
    setClipLabelDraft("");
    setClipCategoryDraft("");
  };

  const deleteClip = (id: number) => {
    const next = clips.filter((c) => c.id !== id);
    setClips(next);
    saveClipsToStorage(next);
  };

  const jumpVideoBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const nextTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, duration || video.currentTime + seconds)
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const changePlaybackRate = (nextRate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                Review
              </h1>
              <p className="mt-2 text-sm text-muted">
                Film review, timestamped coaching notes, and transcript-based
                match review. Use after tagging in Capture.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              Film review only - no tagging on this screen
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                Current match context
              </div>
              <h2 className="mt-2 text-xl font-semibold text-foreground-strong">
                {confidence.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{confidence.subtitle}</p>
              <p className="mt-2 text-xs text-muted">
                Review uses the current browser session video and local match data.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 xl:w-[620px] xl:grid-cols-4">
              <ReviewContextTile label="Players" value={`${confidence.namedPlayers}/${confidence.totalPlayers}`} />
              <ReviewContextTile label="Events" value={String(confidence.resolvedEvents)} />
              <ReviewContextTile label="Notes" value={String(confidence.notes)} />
              <ReviewContextTile
                label="Report"
                value={confidence.readyLabel}
                tone={confidence.readyTone}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">1. Watch and pause</div>
              <div className="mt-1 text-sm text-muted">
                Review the match footage here with skip and speed controls.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">2. Add coaching notes</div>
              <div className="mt-1 text-sm text-muted">
                Capture timestamped observations for team meetings and review sessions.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 p-4">
              <div className="text-sm font-medium text-foreground">3. Use the timeline</div>
              <div className="mt-1 text-sm text-muted">
                Click transcript timestamps on the right to jump straight to that moment in the video.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground-strong">
                    Match review video
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {[matchTitle || "Match", opponent ? `vs ${opponent}` : "", matchDate]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
                  Click timeline timestamps to jump video
                </div>
              </div>

              {videoSrc ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow-panel)]">
                    <video
                      ref={videoRef}
                      controls
                      src={videoSrc}
                      className="aspect-video min-h-[340px] w-full bg-black object-contain xl:min-h-[460px] 2xl:min-h-[560px]"
                      onLoadedData={() => {
                        if (videoRef.current) {
                          videoRef.current.playbackRate = playbackRate;
                        }
                      }}
                      onTimeUpdate={() =>
                        setCurrentTime(videoRef.current?.currentTime || 0)
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-panel-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => jumpVideoBy(-5)}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                      >
                        -5s
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpVideoBy(5)}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                      >
                        +5s
                      </button>

                      <div className="ml-0 h-6 w-px bg-border md:ml-1" />

                      {[0.5, 0.75, 1, 2].map((rate) => (
                        <button
                          type="button"
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
                            playbackRate === rate
                              ? "border-border-light bg-panel-3 text-foreground"
                              : "border-border text-foreground"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}

                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-muted">{formatTime(currentTime)}</span>
                        <div className="h-6 w-px bg-border" />
                        {clipInProgress === null ? (
                          <button
                            type="button"
                            onClick={markStart}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:text-foreground-strong transition-colors"
                          >
                            Mark Start
                          </button>
                        ) : pendingEndTime === null ? (
                          <button
                            type="button"
                            onClick={markEnd}
                            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            End ({formatTime(clipInProgress)} → ?)
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {pendingEndTime !== null && clipInProgress !== null && (
                    <div className="mt-3 rounded-2xl border border-border bg-panel-2 p-4">
                      <div className="text-sm font-medium text-foreground mb-3">
                        Clip: {formatTime(clipInProgress)} → {formatTime(pendingEndTime)}
                      </div>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {CLIP_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setClipCategoryDraft(clipCategoryDraft === cat ? "" : cat)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              clipCategoryDraft === cat
                                ? "border-border-light bg-panel-3 text-foreground"
                                : "border-border bg-panel text-muted"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={clipLabelDraft}
                          onChange={(e) => setClipLabelDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmClip();
                            if (e.key === "Escape") cancelClip();
                          }}
                          placeholder="Label this clip…"
                          autoFocus
                          className="flex-1 rounded-xl border border-border bg-panel px-3 py-2 text-sm text-foreground"
                        />
                        <button
                          type="button"
                          onClick={confirmClip}
                          className="rounded-xl border border-border-light bg-panel-3 px-4 py-2 text-sm font-medium text-foreground"
                        >
                          Save clip
                        </button>
                        <button
                          type="button"
                          onClick={cancelClip}
                          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  <div className="font-medium text-foreground">No video available yet</div>
                  <p className="mt-2">
                    Load a match video in Capture first, then reopen Review. This page uses the current browser session video rather than cloud storage.
                  </p>
                </div>
              )}
            </div>

            {coachNotes.length === 0 && (
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <h2 className="text-base font-semibold text-foreground-strong">
                  No coaching notes yet
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Start adding timestamped review notes while you watch the video. These notes are useful for team meetings, feedback sessions, and post-match review.
                </p>
              </div>
            )}

            <CoachReviewPanel
              currentTime={currentTime}
              coachNoteDraft={coachNoteDraft}
              coachRawDraft={coachRawDraft}
              showCoachRawInput={showCoachRawInput}
              coachNotes={coachNotes}
              onCoachNoteDraftChange={setCoachNoteDraft}
              onCoachRawDraftChange={setCoachRawDraft}
              onToggleCoachRawInput={() => setShowCoachRawInput((prev) => !prev)}
              onAddCoachNote={addCoachNote}
              onClearDraft={() => {
                setCoachNoteDraft("");
                setCoachRawDraft("");
              }}
              onJumpToTimestamp={(timestamp) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = timestamp;
                  videoRef.current.pause();
                  setCurrentTime(timestamp);
                }
              }}
              onDeleteCoachNote={deleteCoachNote}
            />

            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground-strong">Clip annotations</h2>
                <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
                  {clips.length} clip{clips.length === 1 ? "" : "s"}
                </span>
              </div>
              {clips.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                  No clips marked yet. Use Mark Start / Mark End while watching to annotate a segment.
                </div>
              ) : (
                <div className="space-y-3">
                  {clips.map((clip) => (
                    <div key={clip.id} className="rounded-xl border border-border bg-panel-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = clip.startTime;
                              videoRef.current.pause();
                              setCurrentTime(clip.startTime);
                            }
                          }}
                          className="text-sm font-medium text-muted underline underline-offset-2"
                        >
                          {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteClip(clip.id)}
                          className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-foreground">{clip.label}</span>
                        {clip.category && (
                          <span className="rounded-full border border-border bg-panel px-2 py-0.5 text-xs text-muted">
                            {clip.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5 xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground-strong">
                Review timeline
              </h2>
              <p className="mt-2 text-sm text-muted">
                Use the transcript timeline to revisit match moments quickly. In this beta, Review works from the current saved session and current browser video.
              </p>
            </div>

            <GameReviewTimelinePanel
              events={events}
              showRawTranscript={showRawTranscript}
              onShowRawTranscriptChange={setShowRawTranscript}
              onJumpToTimestamp={(timestamp) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = timestamp;
                  videoRef.current.pause();
                  setCurrentTime(timestamp);
                }
              }}
            />

            <TeamSnapshotPanel
              tackles={teamTotals.tackles}
              missed={teamTotals.missed}
              tacklePct={teamTacklePct}
              carries={teamTotals.carries}
              turnovers={teamTotals.turnovers}
              penaltiesConceded={teamEventSummary.penaltiesConceded}
              scrumSuccessPct={setPieceSummary.eastsScrumSuccessPct}
              lineoutSuccessPct={setPieceSummary.eastsLineoutSuccessPct}
              triesScored={teamEventSummary.triesScored}
              triesConceded={teamEventSummary.triesConceded}
              canCopySummary={false}
              onCopySummary={() => {}}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function ReviewContextTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ready" | "needs-work";
}) {
  const toneClass =
    tone === "ready"
      ? "text-success"
      : tone === "needs-work"
      ? "text-warning"
      : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
