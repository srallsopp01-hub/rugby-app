"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppTopNav from "../rugby-tagging/components/AppTopNav";
import GameReviewTimelinePanel from "../rugby-tagging/components/GameReviewTimelinePanel";
import CoachReviewPanel from "../rugby-tagging/components/CoachReviewPanel";
import TeamSnapshotPanel from "../rugby-tagging/components/TeamSnapshotPanel";
import { getMatchVideoUrl } from "../rugby-tagging/lib/matchVideoSession";
import { DEFAULT_ROSTER_ROWS, STORAGE_KEY } from "../rugby-tagging/constants";
import { formatTime, hydrateRosterRows } from "../rugby-tagging/helpers";
import type { EventItem, RosterRow } from "../rugby-tagging/types";

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
};

export default function GameReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [matchTitle, setMatchTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [rosterRows, setRosterRows] = useState<RosterRow[]>(DEFAULT_ROSTER_ROWS);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [coachNotes, setCoachNotes] = useState<CoachReviewNote[]>([]);
  const [showRawTranscript, setShowRawTranscript] = useState(true);
  const [videoSrc, setVideoSrc] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [coachNoteDraft, setCoachNoteDraft] = useState("");
  const [coachRawDraft, setCoachRawDraft] = useState("");
  const [showCoachRawInput, setShowCoachRawInput] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: SavedSession = JSON.parse(raw);
      const safeEvents = Array.isArray(saved.events)
        ? saved.events.filter((event) => !event.isPending)
        : [];

      setMatchTitle(saved.matchTitle || "");
      setOpponent(saved.opponent || "");
      setMatchDate(saved.matchDate || "");
      setRosterRows(hydrateRosterRows(saved.rosterRows));
      setEvents(safeEvents);
      setCoachNotes(Array.isArray(saved.coachNotes) ? saved.coachNotes : []);
      setShowRawTranscript(
        typeof saved.showRawTranscript === "boolean"
          ? saved.showRawTranscript
          : true
      );
    } catch (error) {
      console.error("Failed to load saved session", error);
    }

    try {
      const savedVideoSrc =
        getMatchVideoUrl() ||
        sessionStorage.getItem("rugby-tagging-video-src") ||
        "";
      setVideoSrc(savedVideoSrc);
    } catch (error) {
      console.error("Failed to load video source", error);
    }
  }, []);

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

  const addCoachNote = () => {
    if (!coachNoteDraft.trim() && !coachRawDraft.trim()) return;

    const timestamp = videoRef.current?.currentTime || currentTime;

    const nextNotes = [
      ...coachNotes,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
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
                Team Review
              </h1>
              <p className="mt-2 text-sm text-muted">
                Use this screen for film review, timestamped coaching notes, and transcript-based match review away from the live tagging workspace.
              </p>
            </div>

            <AppTopNav current="team-review" />
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
                        onClick={() => jumpVideoBy(-5)}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                      >
                        -5s
                      </button>
                      <button
                        onClick={() => jumpVideoBy(5)}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                      >
                        +5s
                      </button>

                      <div className="ml-0 h-6 w-px bg-border md:ml-1" />

                      {[0.5, 0.75, 1, 2].map((rate) => (
                        <button
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

                      <div className="ml-auto text-sm text-muted">
                        {formatTime(currentTime)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  <div className="font-medium text-foreground">No video available yet</div>
                  <p className="mt-2">
                    Load a match video in the Workspace first, then reopen Team Review. This page uses the current browser session video rather than cloud storage.
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
          </section>

          <aside className="space-y-5 xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground-strong">
                Review timeline
              </h2>
              <p className="mt-2 text-sm text-muted">
                Use the transcript timeline to revisit match moments quickly. In this beta, Team Review works from the current saved session and current browser video.
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