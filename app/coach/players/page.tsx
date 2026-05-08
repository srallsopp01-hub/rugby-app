"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import { useRouter, useSearchParams } from "next/navigation";
import { getMatchVideoUrl } from "@/app/rugby-tagging/lib/matchVideoSession";
import {
  STORAGE_KEY,
  DEFAULT_ROSTER_ROWS,
} from "@/app/rugby-tagging/constants";
import { ACTIVE_TEAM_ID_KEY } from "@/lib/teamContext";
import {
  CURRENT_MATCH_ID_KEY,
  getScopedSavedMatchesKey,
  subscribeSavedMatchesChanged,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import {
  getMatchVideoSignedUrl,
  getMatchVideoSignedUrlWithResult,
  refreshVideoSignedUrl,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@/lib/matchVideoCloud";
import {
  buildBasicStats,
  buildCoachComment,
  formatTime,
  getUnitFromPosition,
  gradeCarriesPerMin,
  gradeInvPerMin,
  gradeTacklePct,
  gradeTacklesPerMin,
  gradeToScore,
  gradeTurnovers,
  hydrateRosterRows,
  scoreToGrade,
} from "@/app/rugby-tagging/helpers";
import type {
  EventItem,
  ReportRow,
  RosterRow,
} from "@/app/rugby-tagging/types";

type SavedSession = {
  matchTitle?: string;
  opponent?: string;
  matchDate?: string;
  rosterRows?: RosterRow[];
  events?: EventItem[];
};

function getScopedStorageKey(): string {
  try {
    const t = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "";
    return t ? `${STORAGE_KEY}-${t}` : STORAGE_KEY;
  } catch { return STORAGE_KEY; }
}

function loadPlayersSession(): SavedSession {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(getScopedStorageKey());
    if (!raw) return {};
    const saved: SavedSession = JSON.parse(raw);
    return saved && typeof saved === "object" ? saved : {};
  } catch (error) {
    console.error("Failed to load saved session", error);
    return {};
  }
}

function loadPlayersVideoSrc() {
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

const emptyArraySnapshot = "[]";
const subscribeToStorage = () => () => {};

function getStorageSnapshot(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
}

function parseSavedMatches(snapshot: string): SavedMatchRecord[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersLoading />}>
      <PlayersContent />
    </Suspense>
  );
}

function PlayersLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
            Players
          </h1>
          <p className="mt-2 text-sm text-muted">Loading player data...</p>
        </div>
      </div>
    </main>
  );
}

function PlayersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [savedSession] = useState(loadPlayersSession);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const savedMatchesSnapshot = useSyncExternalStore(
    subscribeSavedMatchesChanged,
    () => getStorageSnapshot(getScopedSavedMatchesKey(), emptyArraySnapshot),
    () => emptyArraySnapshot
  );
  const currentMatchId = useSyncExternalStore(
    subscribeToStorage,
    () => getStorageSnapshot(CURRENT_MATCH_ID_KEY, ""),
    () => ""
  );
  const allMatches = useMemo(() => parseSavedMatches(savedMatchesSnapshot), [savedMatchesSnapshot]);
  const effectiveMatchId = selectedMatchId || currentMatchId || allMatches[0]?.id || "";
  const selectedMatch = useMemo(
    () => allMatches.find((m) => m.id === effectiveMatchId) || null,
    [allMatches, effectiveMatchId]
  );

  const matchTitle = selectedMatch?.matchTitle ?? savedSession.matchTitle ?? "";
  const opponent = selectedMatch?.opponent ?? savedSession.opponent ?? "";
  const matchDate = selectedMatch?.matchDate ?? savedSession.matchDate ?? "";
  const rosterRows = useMemo<RosterRow[]>(
    () =>
      selectedMatch?.rosterRows
        ? hydrateRosterRows(selectedMatch.rosterRows)
        : savedSession.rosterRows
          ? hydrateRosterRows(savedSession.rosterRows)
          : DEFAULT_ROSTER_ROWS,
    [selectedMatch, savedSession.rosterRows]
  );
  const events = useMemo<EventItem[]>(
    () =>
      Array.isArray(selectedMatch?.events)
        ? selectedMatch.events.filter((e: EventItem) => !e.isPending)
        : Array.isArray(savedSession.events)
          ? savedSession.events.filter((e) => !e.isPending)
          : [],
    [selectedMatch, savedSession.events]
  );
  const [videoSrc, setVideoSrc] = useState(loadPlayersVideoSrc);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoCloudStatus, setVideoCloudStatus] =
    useState<"idle" | "loading" | "loaded" | "unavailable">("idle");
  const [videoCloudError, setVideoCloudError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  const players = rosterRows.map((row) => row.name.trim()).filter(Boolean);
  const selectedPlayerName = searchParams.get("player") || players[0] || "";

  useEffect(() => {
    let cancelled = false;

    if (!selectedMatch?.videoStoragePath) {
      queueMicrotask(() => {
        if (cancelled) return;
        setActiveEventIndex(0);
        setCurrentTime(0);
        setVideoSrc(loadPlayersVideoSrc());
        setVideoCloudStatus("idle");
        setVideoLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setActiveEventIndex(0);
      setCurrentTime(0);
      setVideoLoading(true);
      setVideoCloudStatus("loading");
    });
    void getMatchVideoSignedUrlWithResult(selectedMatch.videoStoragePath, SIGNED_URL_EXPIRY_SECONDS).then(({ url, error }) => {
      if (cancelled) return;
      if (url) {
        setVideoSrc(url);
        setVideoCloudStatus("loaded");
        setVideoCloudError(null);
      } else {
        setVideoSrc(loadPlayersVideoSrc());
        setVideoCloudStatus("unavailable");
        setVideoCloudError(error ?? null);
      }
      setVideoLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedMatch?.id, selectedMatch?.videoStoragePath]);

  const reportRows = useMemo(() => {
    const baseStats = buildBasicStats(players, events);

    return rosterRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const name = row.name.trim();
        const playerStats = baseStats[name] || {
          tackles: 0,
          missed: 0,
          carries: 0,
          turnovers: 0,
        };

        const minutes = typeof row.minutes === "number" ? row.minutes : 0;
        const involvements =
          playerStats.tackles +
          playerStats.missed +
          playerStats.carries +
          playerStats.turnovers;

        const tacklePct =
          playerStats.tackles + playerStats.missed > 0
            ? (playerStats.tackles /
                (playerStats.tackles + playerStats.missed)) *
              100
            : 0;

        const tacklesPerMin = minutes > 0 ? playerStats.tackles / minutes : 0;
        const carriesPerMin = minutes > 0 ? playerStats.carries / minutes : 0;
        const involvementsPerMin = minutes > 0 ? involvements / minutes : 0;

        const tacklePctGrade = gradeTacklePct(tacklePct);
        const tacklesPerMinGrade = gradeTacklesPerMin(tacklesPerMin);
        const carriesPerMinGrade = gradeCarriesPerMin(carriesPerMin);
        const workRateGrade = gradeInvPerMin(involvementsPerMin);
        const turnoverGrade = gradeTurnovers(playerStats.turnovers);

        const overallScore =
          (gradeToScore(tacklePctGrade) +
            gradeToScore(tacklesPerMinGrade) +
            gradeToScore(carriesPerMinGrade) +
            gradeToScore(workRateGrade) +
            gradeToScore(turnoverGrade)) /
          5;

        const overallGrade = scoreToGrade(overallScore);

        const reportRow: ReportRow = {
          number: row.number,
          name,
          position: row.position,
          unit: getUnitFromPosition(row.position),
          minutes,
          tackles: playerStats.tackles,
          missed: playerStats.missed,
          carries: playerStats.carries,
          turnovers: playerStats.turnovers,
          involvements,
          tacklePct,
          tacklesPerMin,
          carriesPerMin,
          involvementsPerMin,
          tacklePctGrade,
          tacklesPerMinGrade,
          carriesPerMinGrade,
          workRateGrade,
          overallGrade,
          coachComment: "",
        };

        reportRow.coachComment = buildCoachComment(reportRow);
        return reportRow;
      });
  }, [rosterRows, events, players]);

  const playerRow = useMemo(
    () => reportRows.find((row) => row.name === selectedPlayerName) || null,
    [reportRows, selectedPlayerName]
  );

  const playerEvents = useMemo(() => {
    return [...events]
      .filter(
        (event) =>
          !event.isPending &&
          event.category === "player" &&
          event.playerName === selectedPlayerName
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events, selectedPlayerName]);

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

  const jumpToEventIndex = (index: number) => {
    const event = playerEvents[index];
    if (!event || !videoRef.current) return;

    videoRef.current.currentTime = event.timestamp;
    videoRef.current.pause();
    setCurrentTime(event.timestamp);
    setActiveEventIndex(index);
  };

  const safeActiveEventIndex =
    playerEvents.length === 0
      ? 0
      : Math.min(activeEventIndex, playerEvents.length - 1);
  const selectedEvent = playerEvents[safeActiveEventIndex] || null;

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                Players
              </h1>
              <PageHelp {...COACH_PAGE_HELP["/coach/players"]} />
            </div>
            <p className="mt-2 text-sm text-muted">
              Single-game player review with video and involvement playlist.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
            {allMatches.length >= 2 && (
              <div className="xl:col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Match
                </label>
                <select
                  value={effectiveMatchId}
                  onChange={(e) => {
                    setSelectedMatchId(e.target.value);
                    const newMatch = allMatches.find((m) => m.id === e.target.value);
                    const firstPlayer = newMatch?.rosterRows?.[0]?.name?.trim() || "";
                    router.push(`/coach/players${firstPlayer ? `?player=${encodeURIComponent(firstPlayer)}` : ""}`);
                  }}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                >
                  {allMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {[m.matchTitle, m.opponent ? `vs ${m.opponent}` : "", m.matchDate].filter(Boolean).join(" · ") || m.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Player
              </label>
              <select
                value={selectedPlayerName}
                onChange={(e) =>
                  router.push(
                    `/coach/players?player=${encodeURIComponent(e.target.value)}`
                  )
                }
                className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
              >
                {players.map((player) => (
                  <option key={player} value={player}>
                    {player}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
              {[matchTitle || "Match", opponent ? `vs ${opponent}` : "", matchDate]
                .filter(Boolean)
                .join(" • ")}
            </div>
          </div>
        </div>

        {playerRow ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <section className="space-y-5 xl:col-span-8">
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                {videoLoading ? (
                  <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                    Loading match video from cloud...
                  </div>
                ) : videoSrc ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow-panel)]">
                      <video
                        ref={videoRef}
                        controls
                        src={videoSrc}
                        className="aspect-video min-h-[320px] w-full bg-black object-contain xl:min-h-[440px]"
                        onLoadedData={() => {
                          if (videoRef.current) {
                            videoRef.current.playbackRate = playbackRate;
                          }
                        }}
                        onTimeUpdate={() =>
                          setCurrentTime(videoRef.current?.currentTime || 0)
                        }
                        onError={() => {
                          if (!selectedMatch?.videoStoragePath || videoSrc.startsWith("blob:")) return;
                          setVideoLoading(true);
                          setVideoCloudStatus("loading");
                          void refreshVideoSignedUrl(selectedMatch.videoStoragePath).then((url) => {
                            if (url) {
                              setVideoSrc(url);
                              setVideoCloudStatus("loaded");
                            } else {
                              setVideoCloudStatus("unavailable");
                            }
                            setVideoLoading(false);
                          });
                        }}
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
                        <div className="ml-auto text-sm text-muted">
                          {formatTime(currentTime)}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                    {videoCloudStatus === "unavailable"
                      ? videoCloudError
                        ? `Could not load video: ${videoCloudError}`
                        : "Could not load this match video from cloud. Check the submitted match video and try again."
                      : "No video is available for this match yet. Submit the match with a video from Capture first."}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground-strong">
                    Involvement playlist
                  </h2>
                  <span className="text-xs text-muted">
                    {playerEvents.length} logged event{playerEvents.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => jumpToEventIndex(Math.max(safeActiveEventIndex - 1, 0))}
                    disabled={playerEvents.length === 0 || safeActiveEventIndex === 0}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                  >
                    Previous clip
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      jumpToEventIndex(
                        Math.min(safeActiveEventIndex + 1, playerEvents.length - 1)
                      )
                    }
                    disabled={
                      playerEvents.length === 0 ||
                      safeActiveEventIndex >= playerEvents.length - 1
                    }
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                  >
                    Next clip
                  </button>
                </div>

                {selectedEvent ? (
                  <div className="mb-4 rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
                    <span className="font-medium text-foreground">Current clip:</span>{" "}
                    {selectedEvent.text} • {formatTime(selectedEvent.timestamp)}
                  </div>
                ) : null}

                {playerEvents.length === 0 ? (
                  <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                    No structured involvements logged for this player yet.
                  </div>
                ) : (
                  <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                    {playerEvents.map((event, index) => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => jumpToEventIndex(index)}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          index === safeActiveEventIndex
                            ? "border-border-light bg-panel text-foreground"
                            : "border-border bg-panel-2 hover:border-border-light hover:bg-panel"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {event.text}
                          </div>
                          {event.playerAction ? (
                            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                              {event.playerAction}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 rounded-lg border border-border bg-panel px-2 py-1 text-xs font-medium text-foreground">
                          {formatTime(event.timestamp)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5 xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
              <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  {playerRow.number}. {playerRow.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {playerRow.position || "No position set"} • {playerRow.minutes} mins • {playerRow.unit}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Tackles
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {playerRow.tackles}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Missed
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {playerRow.missed}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Carries
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {playerRow.carries}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Turnovers
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {playerRow.turnovers}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Involvements
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {playerRow.involvements}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Overall
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {playerRow.overallGrade}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Coaching comment
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {playerRow.coachComment}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Match context
                </h2>
                <p className="mt-3 text-sm text-muted">
                  {[matchTitle || "Match", opponent ? `vs ${opponent}` : "", matchDate]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)] text-sm text-muted">
            No player data is available yet.
          </div>
        )}
      </div>
    </main>
  );
}
