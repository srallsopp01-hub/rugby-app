"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export type VideoPlayerProps = {
  src: string | null | undefined;
  // Callbacks
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onLoadedData?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onPlaybackRateChange?: (rate: number) => void;
  // Feature flags (all false by default)
  enablePlaybackRates?: boolean;
  enableFrameStep?: boolean;
  enableJKL?: boolean;
  enableFullscreen?: boolean;
  enableSkipButtons?: boolean;
  // Content
  loadingHint?: string;
  emptyState?: React.ReactNode;
  overlay?: React.ReactNode;
  // Styling
  className?: string;
  videoClassName?: string;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) ||
    target.isContentEditable
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const VideoPlayer = React.forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer(
    {
      src,
      onTimeUpdate,
      onLoadedMetadata,
      onLoadedData,
      onPlay,
      onPause,
      onEnded,
      onError,
      onPlaybackRateChange,
      enablePlaybackRates = false,
      enableFrameStep = false,
      enableJKL = false,
      enableFullscreen = false,
      enableSkipButtons = false,
      loadingHint,
      emptyState,
      overlay,
      className = "",
      videoClassName = "",
    },
    ref
  ) {
    const internalRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDraggingRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [seekHoverTime, setSeekHoverTime] = useState<number | null>(null);
    const [seekHoverX, setSeekHoverX] = useState(0);
    const [controlsVisible, setControlsVisible] = useState(true);

    // Merged ref: populates both internalRef and the forwarded ref
    const setVideoRef = useCallback(
      (el: HTMLVideoElement | null) => {
        (internalRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
        if (typeof ref === "function") {
          ref(el);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
        }
      },
      [ref]
    );

    const showControls = useCallback(() => {
      setControlsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        if (internalRef.current && !internalRef.current.paused) {
          setControlsVisible(false);
        }
      }, 3000);
    }, []);

    // Keyboard shortcuts (J/K/L and frame-step)
    useEffect(() => {
      if (!enableJKL && !enableFrameStep) return;

      function onKeyDown(event: KeyboardEvent) {
        if (isTypingTarget(event.target)) return;
        const video = internalRef.current;
        if (!video) return;

        if (
          enableFrameStep &&
          (event.code === "ArrowLeft" || event.code === "ArrowRight")
        ) {
          if (!video.paused) return;
          event.preventDefault();
          const delta = event.code === "ArrowRight" ? 1 / 30 : -1 / 30;
          const dur = Number.isFinite(video.duration) ? video.duration : 0;
          const next = Math.max(
            0,
            Math.min(video.currentTime + delta, dur || video.currentTime + delta)
          );
          video.currentTime = next;
          setCurrentTime(next);
          return;
        }

        if (enableJKL) {
          if (event.code === "KeyJ") {
            event.preventDefault();
            const delta = video.paused ? -2 : -5;
            const next = Math.max(0, video.currentTime + delta);
            video.currentTime = next;
            setCurrentTime(next);
            return;
          }
          if (event.code === "KeyK") {
            event.preventDefault();
            if (video.paused) {
              void video.play();
            } else {
              video.pause();
            }
            return;
          }
          if (event.code === "KeyL") {
            event.preventDefault();
            if (video.paused) {
              void video.play();
              return;
            }
            const nextRate = Math.min(4, video.playbackRate * 2);
            video.playbackRate = nextRate;
            setPlaybackRate(nextRate);
            onPlaybackRateChange?.(nextRate);
            return;
          }
        }
      }

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [enableJKL, enableFrameStep, onPlaybackRateChange]);

    // Fullscreen state sync
    useEffect(() => {
      function onFullscreenChange() {
        setIsFullscreen(!!document.fullscreenElement);
      }
      document.addEventListener("fullscreenchange", onFullscreenChange);
      return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    // Cleanup auto-hide timeout on unmount
    useEffect(() => {
      return () => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      };
    }, []);

    // Seek bar pointer handlers
    function seekTo(clientX: number) {
      const bar = seekBarRef.current;
      const video = internalRef.current;
      if (!bar || !video || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const t = (x / rect.width) * duration;
      video.currentTime = t;
      setCurrentTime(t);
    }

    function handleSeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      isDraggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekTo(e.clientX);
    }

    function handleSeekPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const bar = seekBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSeekHoverX(x);
      setSeekHoverTime(duration > 0 ? (x / rect.width) * duration : null);
      if (isDraggingRef.current) seekTo(e.clientX);
    }

    function handleSeekPointerUp() {
      isDraggingRef.current = false;
    }

    function handleSeekPointerLeave() {
      if (!isDraggingRef.current) setSeekHoverTime(null);
    }

    function togglePlayPause() {
      const video = internalRef.current;
      if (!video) return;
      if (video.paused) void video.play();
      else video.pause();
    }

    const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const hoverPct =
      seekHoverTime !== null && duration > 0
        ? (seekHoverTime / duration) * 100
        : 0;

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-2xl ${
          src
            ? `group bg-black ${className}`
            : `border border-border bg-panel ${className}`
        }`}
        onMouseMove={src ? showControls : undefined}
        onMouseEnter={src ? showControls : undefined}
        onMouseLeave={src ? () => {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          if (!internalRef.current?.paused) setControlsVisible(false);
          setSeekHoverTime(null);
        } : undefined}
      >
        {/* Video element — always mounted so the forwarded ref is always populated */}
        <video
          ref={setVideoRef}
          src={src ?? undefined}
          className={`aspect-video w-full object-contain ${src ? "cursor-pointer" : "invisible"} ${videoClassName}`}
          onClick={src ? togglePlayPause : undefined}
          onPlay={() => {
            setIsPlaying(true);
            onPlay?.();
            showControls();
          }}
          onPause={() => {
            setIsPlaying(false);
            setControlsVisible(true);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            onPause?.();
          }}
          onTimeUpdate={() => {
            const t = internalRef.current?.currentTime ?? 0;
            setCurrentTime(t);
            onTimeUpdate?.(t);
          }}
          onLoadedMetadata={() => {
            const raw = internalRef.current?.duration;
            const d = Number.isFinite(raw) ? (raw ?? 0) : 0;
            setDuration(d);
            onLoadedMetadata?.(d);
          }}
          onLoadedData={() => {
            onLoadedData?.();
          }}
          onEnded={() => {
            setIsPlaying(false);
            setControlsVisible(true);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            onEnded?.();
          }}
          onError={() => {
            onError?.();
          }}
          onRateChange={() => {
            const rate = internalRef.current?.playbackRate ?? 1;
            setPlaybackRate(rate);
          }}
          onVolumeChange={() => {
            const video = internalRef.current;
            if (!video) return;
            setVolume(video.volume);
            setIsMuted(video.muted);
          }}
        />

        {/* Empty / loading overlay — shown when no src; sits over the inert invisible video */}
        {!src && (
          <div className="absolute inset-0 flex items-center justify-center">
            {loadingHint ? (
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="h-8 w-8 animate-spin text-accent"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-sm text-muted">{loadingHint}</span>
              </div>
            ) : (emptyState ?? (
              <div className="flex flex-col items-center gap-2 text-center">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-muted-2"
                  aria-hidden="true"
                >
                  <rect x="3" y="9" width="38" height="26" rx="3" />
                  <path d="M17 16l12 6-12 6V16z" />
                </svg>
                <span className="text-sm text-muted">No video loaded</span>
              </div>
            ))}
          </div>
        )}

        {/* Parent-supplied overlay (e.g. annotation canvas) */}
        {src && overlay}

        {/* Controls overlay */}
        {src && <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200 ${
            controlsVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.8) 100%)",
          }}
        >
          <div className="pointer-events-auto">
            {/* Seek bar */}
            <div className="px-3 pb-1 pt-6">
              <div
                ref={seekBarRef}
                className="group/seek relative h-1 w-full cursor-pointer rounded-full bg-white/25 transition-all duration-100 hover:h-1.5"
                onPointerDown={handleSeekPointerDown}
                onPointerMove={handleSeekPointerMove}
                onPointerUp={handleSeekPointerUp}
                onPointerLeave={handleSeekPointerLeave}
              >
                {/* Hover ghost */}
                {seekHoverTime !== null && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                    style={{ width: `${hoverPct}%` }}
                  />
                )}
                {/* Played portion */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent"
                  style={{ width: `${playedPct}%` }}
                />
                {/* Scrubber thumb */}
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-accent opacity-0 shadow transition-opacity group-hover/seek:opacity-100"
                  style={{ left: `${playedPct}%` }}
                />
                {/* Hover time tooltip */}
                {seekHoverTime !== null && (
                  <div
                    className="pointer-events-none absolute bottom-5 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-foreground shadow"
                    style={{ left: `${seekHoverX}px` }}
                  >
                    {formatTime(seekHoverTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Control bar */}
            <div className="flex items-center gap-1 px-2 pb-2.5">
              {/* Play / Pause */}
              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlayPause}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white transition-colors hover:text-accent"
              >
                {isPlaying ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="3" y="2" width="4" height="12" rx="1" />
                    <rect x="9" y="2" width="4" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
                  </svg>
                )}
              </button>

              {/* Skip buttons */}
              {enableSkipButtons && (
                <>
                  <button
                    type="button"
                    aria-label="Skip back 5 seconds"
                    onClick={() => {
                      const video = internalRef.current;
                      if (video) video.currentTime = Math.max(0, video.currentTime - 5);
                    }}
                    className="flex h-8 shrink-0 items-center justify-center rounded px-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    aria-label="Skip forward 5 seconds"
                    onClick={() => {
                      const video = internalRef.current;
                      if (video)
                        video.currentTime = Math.min(duration, video.currentTime + 5);
                    }}
                    className="flex h-8 shrink-0 items-center justify-center rounded px-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
                  >
                    +5s
                  </button>
                </>
              )}

              {/* Time display */}
              <span className="ml-1 shrink-0 tabular-nums text-xs text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Volume */}
              <div
                className="relative flex shrink-0 items-center"
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  type="button"
                  aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  onClick={() => {
                    const video = internalRef.current;
                    if (!video) return;
                    video.muted = !video.muted;
                  }}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="flex h-8 w-8 items-center justify-center rounded text-white/80 transition-colors hover:text-white"
                >
                  {isMuted || volume === 0 ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6H1v4h2l4 3V3L5 6H3z" />
                      <line x1="13" y1="6" x2="9" y2="10" />
                      <line x1="9" y1="6" x2="13" y2="10" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6H1v4h2l4 3V3L5 6H3z" />
                      <path d="M11 9a2 2 0 000-3" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6H1v4h2l4 3V3L5 6H3z" />
                      <path d="M11 9a2 2 0 000-3" />
                      <path d="M13 11a4 4 0 000-6" />
                    </svg>
                  )}
                </button>

                {showVolumeSlider && (
                  <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border border-border bg-panel-2 p-2 shadow">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      style={{
                        writingMode: "vertical-lr",
                        direction: "rtl",
                        accentColor: "var(--accent)",
                        height: "80px",
                        width: "16px",
                        cursor: "pointer",
                      }}
                      onChange={(e) => {
                        const video = internalRef.current;
                        if (!video) return;
                        const v = Number(e.target.value);
                        video.volume = v;
                        video.muted = v === 0;
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Playback rate buttons */}
              {enablePlaybackRates && (
                <div className="flex shrink-0 items-center gap-0.5">
                  {([0.25, 0.5, 0.75, 1, 2] as const).map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        const video = internalRef.current;
                        if (!video) return;
                        video.playbackRate = rate;
                        setPlaybackRate(rate);
                        onPlaybackRateChange?.(rate);
                      }}
                      className={`h-7 rounded px-1.5 text-xs font-medium transition-colors ${
                        playbackRate === rate
                          ? "bg-accent text-white"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}

              {/* Fullscreen */}
              {enableFullscreen && (
                <button
                  type="button"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  onClick={async () => {
                    const container = containerRef.current;
                    if (!container) return;
                    try {
                      if (document.fullscreenElement) {
                        await document.exitFullscreen();
                      } else {
                        await container.requestFullscreen();
                      }
                    } catch {
                      // fullscreen not supported or denied — silent fail
                    }
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white/80 transition-colors hover:text-white"
                >
                  {isFullscreen ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 2H2v3" />
                      <path d="M9 2h3v3" />
                      <path d="M5 12H2V9" />
                      <path d="M9 12h3V9" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 5V2h3" />
                      <path d="M12 5V2H9" />
                      <path d="M2 9v3h3" />
                      <path d="M12 9v3H9" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>}
      </div>
    );
  }
);
