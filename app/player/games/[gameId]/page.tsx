"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePlayer } from "../../PlayerContext";
import { PlayerPicker } from "../../PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { PageHeader } from "@/app/components/PageHeader";
import { useMatches } from "@/app/providers/MatchesContext";
import { buildReportRowsFromMatch, formatTime, findMatchingPlayer } from "@/app/rugby-tagging/helpers";
import { buildPlayerCoachingPlan } from "../../playerCoachingPlan";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { EventItem } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";
import { getMatchVideoSignedUrlWithResult, refreshVideoSignedUrl, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/matchVideoCloud";
import { VideoPlayer } from "@/app/components/VideoPlayer";

function playerNameSet(player: SquadPlayer): Set<string> {
  return new Set([
    player.fullName.toLowerCase().trim(),
    player.preferredName.toLowerCase().trim(),
    ...player.nicknames.map((n) => n.toLowerCase().trim()),
  ]);
}

function playerEvents(match: SavedMatchRecord, player: SquadPlayer, rosterName: string): EventItem[] {
  const names = playerNameSet(player);
  const rosterPlayers = match.rosterRows.map((r) => r.name);

  function resolveToRosterName(event: EventItem): string | null {
    let resolved: string | null = event.playerName || findMatchingPlayer(rosterPlayers, event.text);
    if (resolved && !rosterPlayers.includes(resolved)) {
      // playerName set but not a roster key — mirror buildBasicStats fuzzy fallback
      resolved = findMatchingPlayer(rosterPlayers, resolved) ?? findMatchingPlayer(rosterPlayers, event.text);
    }
    return resolved;
  }

  function isOurPlayer(resolvedName: string): boolean {
    const n = resolvedName.toLowerCase().trim();
    return n === rosterName.toLowerCase().trim() || names.has(n);
  }

  return match.events
    .filter((e) => {
      if (e.category !== "player" || e.isPending) return false;
      const resolved = resolveToRosterName(e);
      return resolved !== null && isOurPlayer(resolved);
    })
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

  const { matches } = useMatches();

  const { match, row, events, notFound } = useMemo(() => {
    if (!currentPlayer || !gameId) return { match: null, row: null, events: [], notFound: false };
    const m = matches.find((s) => s.id === gameId) ?? null;
    if (!m) return { match: null, row: null, events: [], notFound: true };
    const rows = buildReportRowsFromMatch(m.rosterRows, m.events);
    const names = playerNameSet(currentPlayer);
    const playerRow =
      rows.find((r) => r.playerId && r.playerId === currentPlayer.id) ??
      rows.find((r) => names.has(r.name.toLowerCase().trim())) ??
      null;
    if (!playerRow) return { match: null, row: null, events: [], notFound: true };
    return { match: m, row: playerRow, events: playerEvents(m, currentPlayer, playerRow.name), notFound: false };
  }, [matches, currentPlayer, gameId]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeEventIdx, setActiveEventIdx] = useState<number | null>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const videoRetryCount = useRef(0);

  useEffect(() => {
    videoRetryCount.current = 0;
    setVideoError(null);
  }, [match?.videoStoragePath]);

  useEffect(() => {
    return () => { if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  useEffect(() => {
    if (videoUrl || videoError || !match?.videoStoragePath) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setVideoLoading(true);
    });
    void getMatchVideoSignedUrlWithResult(match.videoStoragePath, SIGNED_URL_EXPIRY_SECONDS).then(({ url, error }) => {
      if (cancelled) return;
      if (url) setVideoUrl(url);
      if (error) setVideoError(error);
      setVideoLoading(false);
    });
    return () => { cancelled = true; };
  }, [match?.videoStoragePath, videoUrl]);

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
    if (!ev) return;
    setActiveEventIdx(idx);
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, ev.timestamp - 3);
      videoRef.current.play();
    }
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
  const coachingPlan = buildPlayerCoachingPlan(row);
  const safeActiveIdx = activeEventIdx ?? 0;
  const selectedEvent = activeEventIdx !== null ? (events[activeEventIdx] ?? null) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: back link + match header */}
      <div className="flex-shrink-0 space-y-3 px-6 pt-6">
        <Link href="/player/games" className="text-xs text-muted hover:text-foreground transition-colors">
          ← Back to Games
        </Link>
        <PageHeader
          title={`vs ${match.opponent || match.matchTitle || "Opponent"}`}
          subtitle={formatDate(match.matchDate)}
          status={
            <div className="flex flex-col items-end gap-1">
              <GradeBadge grade={row.overallGrade} />
              <span className="text-xs text-muted-2">Overall grade</span>
            </div>
          }
        />
      </div>

      {/* Body: left (video + stats + coaching) + right (playlist) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Video player */}
          {videoLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-panel px-5 py-4 text-sm text-muted">
              <svg className="animate-spin h-4 w-4 shrink-0 text-muted-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading video from cloud…
            </div>
          ) : videoUrl ? (
            <div className="rounded-xl border border-border bg-panel overflow-hidden">
              <VideoPlayer
                ref={videoRef}
                src={videoUrl}
                className="rounded-none"
                enableFullscreen
                onError={() => {
                  if (!videoUrl || videoUrl.startsWith("blob:")) return;
                  if (!match?.videoStoragePath) return;
                  if (videoRetryCount.current >= 1) {
                    setVideoError("Video could not be loaded from cloud");
                    return;
                  }
                  videoRetryCount.current += 1;
                  void refreshVideoSignedUrl(match.videoStoragePath).then((url) => {
                    if (url) setVideoUrl(url);
                    else setVideoError("Video could not be loaded from cloud");
                  });
                }}
              />
              <div className="px-4 py-2.5 border-t border-border">
                <label className="cursor-pointer text-xs text-muted-2 hover:text-muted transition-colors">
                  Load different video
                  <input type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {videoError && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
                  Could not load video: {videoError}
                </p>
              )}
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
            </div>
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

          {/* Personal coaching plan */}
          <div className="rounded-xl border border-border bg-panel p-5">
            <p className="text-xs text-muted-2 uppercase tracking-wider font-medium">
              Your coaching plan
            </p>
            <div className="mt-4 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground-strong">What went well</h2>
                <ul className="mt-2 space-y-2">
                  {coachingPlan.whatWentWell.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-4">
                <h2 className="text-sm font-semibold text-foreground-strong">Main focus</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{coachingPlan.mainFocus}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground-strong">Next week targets</h2>
                <ul className="mt-2 space-y-2">
                  {coachingPlan.nextWeekTargets.map((target) => (
                    <li key={target} className="flex gap-2 text-sm leading-6 text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      <span>{target}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-panel p-4 text-xs leading-5 text-muted">
            Match-level coach notes are hidden in the player app until notes can be
            assigned to a specific player. Your personal coaching plan above is
            generated only from your own match stats.
          </div>
        </div>

        {/* Right column: involvement playlist */}
        <div className="w-[360px] flex-shrink-0 border-l border-border overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground-strong">Involvement playlist</h2>
            <span className="text-xs text-muted">
              {events.length} logged event{events.length === 1 ? "" : "s"}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
              No tagged involvements in this match.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => seekToEvent(Math.max(safeActiveIdx - 1, 0))}
                  disabled={activeEventIdx === null || safeActiveIdx === 0}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                >
                  Previous clip
                </button>
                <button
                  type="button"
                  onClick={() => seekToEvent(activeEventIdx === null ? 0 : Math.min(safeActiveIdx + 1, events.length - 1))}
                  disabled={activeEventIdx !== null && safeActiveIdx >= events.length - 1}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                >
                  Next clip
                </button>
              </div>

              {selectedEvent && (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
                  <span className="font-medium text-foreground">Current clip:</span>{" "}
                  {selectedEvent.text} • {formatTime(selectedEvent.timestamp)}
                </div>
              )}

              <div ref={playlistRef} className="space-y-2 pr-1">
                {events.map((event, index) => {
                  const isActive = activeEventIdx === index;
                  return (
                    <button
                      type="button"
                      key={event.id}
                      data-idx={index}
                      onClick={() => seekToEvent(index)}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-border-light bg-panel text-foreground"
                          : "border-border bg-panel-2 hover:border-border-light hover:bg-panel"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{event.text}</div>
                        {event.playerAction && (
                          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                            {event.playerAction}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 rounded-lg border border-border bg-panel px-2 py-1 text-xs font-medium text-foreground">
                        {formatTime(event.timestamp)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
