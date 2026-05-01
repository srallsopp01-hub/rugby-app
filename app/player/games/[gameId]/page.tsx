"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePlayer } from "../../PlayerContext";
import { PlayerPicker } from "../../PlayerPicker";
import { GradeBadge } from "@/app/components/GradeBadge";
import { SAVED_MATCHES_KEY, subscribeSavedMatchesChanged } from "@/app/rugby-tagging/lib/savedMatches";
import { buildReportRowsFromMatch, formatTime } from "@/app/rugby-tagging/helpers";
import { buildPlayerCoachingPlan } from "../../playerCoachingPlan";
import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { EventItem } from "@/app/rugby-tagging/types";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";
import { getMatchVideoSignedUrlWithResult, refreshVideoSignedUrl, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/matchVideoCloud";

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

  const matchesRaw = useSyncExternalStore(
    subscribeSavedMatchesChanged,
    () => localStorage.getItem(SAVED_MATCHES_KEY) ?? "[]",
    () => "[]"
  );

  const { match, row, events, notFound } = useMemo(() => {
    if (!currentPlayer || !gameId) return { match: null, row: null, events: [], notFound: false };
    let all: SavedMatchRecord[];
    try { all = JSON.parse(matchesRaw); } catch { return { match: null, row: null, events: [], notFound: true }; }
    const m = all.find((s) => s.id === gameId) ?? null;
    if (!m) return { match: null, row: null, events: [], notFound: true };
    const rows = buildReportRowsFromMatch(m.rosterRows, m.events);
    const playerRow = rows.find(
      (r) => r.name === currentPlayer.fullName || r.name === currentPlayer.preferredName
    ) ?? null;
    if (!playerRow) return { match: null, row: null, events: [], notFound: true };
    return { match: m, row: playerRow, events: playerEvents(m, currentPlayer), notFound: false };
  }, [matchesRaw, currentPlayer, gameId]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeEventIdx, setActiveEventIdx] = useState<number | null>(null);
  const playlistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  // Auto-load from cloud if match has a stored video path and no local URL yet
  useEffect(() => {
    if (videoUrl || !match?.videoStoragePath) return;
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
    return () => {
      cancelled = true;
    };
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
  const coachingPlan = buildPlayerCoachingPlan(row);

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
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video bg-black"
            controls
            onError={() => {
              if (!videoUrl || videoUrl.startsWith("blob:")) return;
              if (!match?.videoStoragePath) return;
              setVideoUrl("");
              setVideoLoading(true);
              void refreshVideoSignedUrl(match.videoStoragePath).then((url) => {
                if (url) setVideoUrl(url);
                setVideoLoading(false);
              });
            }}
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

      <div className="rounded-xl border border-dashed border-border bg-panel p-4 text-xs leading-5 text-muted">
        Match-level coach notes are hidden in the player app until notes can be
        assigned to a specific player. Your personal coaching plan above is
        generated only from your own match stats.
      </div>
    </div>
  );
}
