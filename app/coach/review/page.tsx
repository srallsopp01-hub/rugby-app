"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import GameReviewTimelinePanel from "@/app/rugby-tagging/components/GameReviewTimelinePanel";
import CoachReviewPanel from "@/app/rugby-tagging/components/CoachReviewPanel";
import TeamSnapshotPanel from "@/app/rugby-tagging/components/TeamSnapshotPanel";
import { getMatchVideoUrl } from "@/app/rugby-tagging/lib/matchVideoSession";
import { buildMatchConfidenceSummary } from "@/app/rugby-tagging/lib/matchConfidence";
import { DEFAULT_ROSTER_ROWS, STORAGE_KEY } from "@/app/rugby-tagging/constants";
import { formatTime, hydrateRosterRows } from "@/app/rugby-tagging/helpers";
import { getCurrentMatchId, getSavedMatchById, upsertSavedMatch } from "@/app/rugby-tagging/lib/savedMatches";
import {
  buildSetPieceReviewMoments,
  filterSetPieceReviewMoments,
  type SetPieceSideFilters,
  type SetPieceTypeFilter,
} from "@/app/rugby-tagging/lib/setPieceReview";
import { getMatchVideoSignedUrl, refreshVideoSignedUrl, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/matchVideoCloud";
import type { ClipAnnotation, EventItem, RosterRow, VideoAnnotation } from "@/app/rugby-tagging/types";

type CoachReviewNote = {
  id: number;
  timestamp: number;
  text: string;
  rawText?: string;
};

type SavedSession = {
  activeMode?: "stat" | "game-review";
  matchTitle?: string;
  opponent?: string;
  matchDate?: string;
  rosterRows?: RosterRow[];
  selectedPlayer?: string;
  events?: EventItem[];
  reviewQueue?: unknown[];
  coachNotes?: CoachReviewNote[];
  showRawTranscript?: boolean;
  clips?: ClipAnnotation[];
  videoStoragePath?: string;
};

type AnnotationTool = VideoAnnotation["type"] | null;
type ClipFilter = "All" | "Attack" | "Defence" | "Scrum" | "Lineout";

const CLIP_CATEGORIES = ["Breakdown", "Scrum", "Lineout", "Kick", "Defence", "Attack", "Other"];
const CLIP_FILTERS: ClipFilter[] = ["All", "Attack", "Defence", "Scrum", "Lineout"];
const ANNOTATION_COLOURS: Record<VideoAnnotation["type"], string> = {
  arrow: "#f4d35e",
  circle: "#7dd3fc",
  highlight: "rgba(126, 163, 126, 0.34)",
};

let nextLocalReviewId = 1;

function createLocalReviewId(existingIds: number[]) {
  const maxExisting = existingIds.reduce((max, id) => Math.max(max, id), 0);
  nextLocalReviewId = Math.max(nextLocalReviewId, maxExisting + 1);
  const nextId = nextLocalReviewId;
  nextLocalReviewId += 1;
  return nextId;
}

function safeClips(clips: unknown): ClipAnnotation[] {
  if (!Array.isArray(clips)) return [];
  return clips
    .filter((clip): clip is ClipAnnotation => {
      if (!clip || typeof clip !== "object") return false;
      const candidate = clip as ClipAnnotation;
      return (
        typeof candidate.id === "number" &&
        typeof candidate.startTime === "number" &&
        typeof candidate.endTime === "number"
      );
    })
    .map((clip) => ({
      ...clip,
      label: clip.label || "Clip",
      annotations: Array.isArray(clip.annotations) ? clip.annotations : [],
    }));
}

function loadSavedReviewSession(): SavedSession {
  if (typeof window === "undefined") return {};

  try {
    const matchId = getCurrentMatchId();
    const savedMatch = matchId ? getSavedMatchById(matchId) : null;
    if (savedMatch) {
      return {
        ...savedMatch,
        events: Array.isArray(savedMatch.events)
          ? savedMatch.events.filter((event) => !event.isPending)
          : [],
        clips: safeClips(savedMatch.clips),
      };
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved: SavedSession = JSON.parse(raw);
    return saved && typeof saved === "object"
      ? { ...saved, clips: safeClips(saved.clips) }
      : {};
  } catch (error) {
    console.error("Failed to load saved session", error);
    return {};
  }
}

function loadSavedReviewVideoSrc() {
  if (typeof window === "undefined") return "";

  try {
    return getMatchVideoUrl() || sessionStorage.getItem("rugby-tagging-video-src") || "";
  } catch (error) {
    console.error("Failed to load video source", error);
    return "";
  }
}

function parseTimeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!trimmed.includes(":")) return Number(trimmed) || 0;
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function formatTimeInput(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable;
}

function clampRange(start: number, end: number, duration: number) {
  const max = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const safeStart = Math.max(0, Math.min(start, Math.max(0, max - 1)));
  const safeEnd = Math.max(safeStart + 1, Math.min(end, max));
  return { startTime: safeStart, endTime: safeEnd };
}

function annotationLabel(type: VideoAnnotation["type"]) {
  if (type === "arrow") return "Arrow";
  if (type === "circle") return "Circle";
  return "Highlight";
}

function buildEventSummary(event: EventItem) {
  if (event.category === "player" && event.playerName && event.playerAction) {
    const action =
      event.playerAction === "missed tackle" ? "Missed tackle" :
      event.playerAction === "tackle" ? "Tackle" :
      event.playerAction === "carry" ? "Carry" : "Turnover";
    return `${action}: ${event.playerName}`;
  }
  if (event.category === "set-piece" && event.setPieceType) {
    const result = event.lineoutResult || event.scrumResult || "logged";
    return `${event.setPieceType === "lineout" ? "Lineout" : "Scrum"} ${result}`;
  }
  if (event.category === "team" && event.teamEventType) return event.teamEventType;
  return event.text;
}

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);
  const [savedSession] = useState(loadSavedReviewSession);

  const [matchTitle] = useState(savedSession.matchTitle || "");
  const [opponent] = useState(savedSession.opponent || "");
  const [matchDate] = useState(savedSession.matchDate || "");
  const [rosterRows] = useState<RosterRow[]>(() =>
    savedSession.rosterRows ? hydrateRosterRows(savedSession.rosterRows) : DEFAULT_ROSTER_ROWS
  );
  const [selectedPlayer] = useState(savedSession.selectedPlayer || "");
  const [events] = useState<EventItem[]>(() =>
    Array.isArray(savedSession.events)
      ? savedSession.events.filter((event) => !event.isPending)
      : []
  );
  const [reviewQueue] = useState(savedSession.reviewQueue || []);
  const [coachNotes, setCoachNotes] = useState<CoachReviewNote[]>(() =>
    Array.isArray(savedSession.coachNotes) ? savedSession.coachNotes : []
  );
  const [showRawTranscript, setShowRawTranscript] = useState(
    typeof savedSession.showRawTranscript === "boolean" ? savedSession.showRawTranscript : true
  );
  const [videoSrc, setVideoSrc] = useState(loadSavedReviewVideoSrc);
  const [videoCloudStatus, setVideoCloudStatus] = useState<"idle" | "loading" | "loaded" | "unavailable">("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [coachNoteDraft, setCoachNoteDraft] = useState("");
  const [coachRawDraft, setCoachRawDraft] = useState("");
  const [showCoachRawInput, setShowCoachRawInput] = useState(false);
  const [clips, setClips] = useState<ClipAnnotation[]>(() => safeClips(savedSession.clips));
  const [clipInProgress, setClipInProgress] = useState<number | null>(null);
  const [pendingEndTime, setPendingEndTime] = useState<number | null>(null);
  const [clipLabelDraft, setClipLabelDraft] = useState("");
  const [clipCommentDraft, setClipCommentDraft] = useState("");
  const [clipCategoryDraft, setClipCategoryDraft] = useState("");
  const [activeClipId, setActiveClipId] = useState<number | null>(null);
  const [clipFilter, setClipFilter] = useState<ClipFilter>("All");
  const [setPieceTypeFilter, setSetPieceTypeFilter] = useState<SetPieceTypeFilter>("All");
  const [setPieceSideFilters, setSetPieceSideFilters] = useState<SetPieceSideFilters>({
    own: true,
    opposition: true,
  });
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>(null);
  const [draftAnnotation, setDraftAnnotation] = useState<VideoAnnotation | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState("Saved locally");
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [presentationPaused, setPresentationPaused] = useState(false);
  const presentationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<"clips" | "byPlayer">("clips");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [savedFromEventIds, setSavedFromEventIds] = useState<Set<number>>(() => new Set());

  const persistReviewState = useCallback(
    (next: Partial<SavedSession>) => {
      const nextCoachNotes = next.coachNotes ?? coachNotes;
      const nextClips = safeClips(next.clips ?? clips);
      const nextShowRawTranscript =
        typeof next.showRawTranscript === "boolean" ? next.showRawTranscript : showRawTranscript;

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : {};
        const payload = {
          ...existing,
          activeMode: existing.activeMode || savedSession.activeMode || "game-review",
          matchTitle,
          opponent,
          matchDate,
          rosterRows,
          selectedPlayer,
          events,
          reviewQueue,
          coachNotes: nextCoachNotes,
          clips: nextClips,
          showRawTranscript: nextShowRawTranscript,
          videoStoragePath: existing.videoStoragePath || savedSession.videoStoragePath,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.error("Failed to save review session", error);
        setAutosaveStatus("Autosave failed");
        return;
      }

      try {
        const matchId = getCurrentMatchId();
        const record = matchId ? getSavedMatchById(matchId) : null;
        if (record) {
          upsertSavedMatch({
            ...record,
            updatedAt: new Date().toISOString(),
            coachNotes: nextCoachNotes,
            clips: nextClips,
            showRawTranscript: nextShowRawTranscript,
          });
          setAutosaveStatus("Saved to match");
        } else {
          setAutosaveStatus("Saved locally");
        }
      } catch (error) {
        console.error("Failed to persist review to saved match", error);
        setAutosaveStatus("Saved locally");
      }
    },
    [
      clips,
      coachNotes,
      events,
      matchDate,
      matchTitle,
      opponent,
      reviewQueue,
      rosterRows,
      savedSession.activeMode,
      savedSession.videoStoragePath,
      selectedPlayer,
      showRawTranscript,
    ]
  );

  const activeClip = useMemo(
    () => clips.find((clip) => clip.id === activeClipId) || clips.find((clip) => currentTime >= clip.startTime && currentTime <= clip.endTime) || null,
    [activeClipId, clips, currentTime]
  );

  const filteredClips = useMemo(
    () =>
      [...clips]
        .sort((a, b) => a.startTime - b.startTime)
        .filter((clip) => clipFilter === "All" || clip.category === clipFilter),
    [clipFilter, clips]
  );
  const setPieceMoments = useMemo(() => buildSetPieceReviewMoments(events), [events]);
  const filteredSetPieceMoments = useMemo(
    () => filterSetPieceReviewMoments(setPieceMoments, setPieceTypeFilter, setPieceSideFilters),
    [setPieceMoments, setPieceSideFilters, setPieceTypeFilter]
  );

  const teamTotals = useMemo(() => {
    const playerEvents = events.filter((event) => !event.isPending && event.category === "player");
    return {
      tackles: playerEvents.filter((event) => event.playerAction === "tackle").length,
      missed: playerEvents.filter((event) => event.playerAction === "missed tackle").length,
      carries: playerEvents.filter((event) => event.playerAction === "carry").length,
      turnovers: playerEvents.filter((event) => event.playerAction === "turnover").length,
    };
  }, [events]);

  const teamEventSummary = useMemo(() => {
    const teamEvents = events.filter((event) => !event.isPending && event.category === "team");
    return {
      penaltiesConceded: teamEvents.filter((event) => event.teamEventType === "penalty conceded").length,
      triesScored: teamEvents.filter((event) => event.teamEventType === "try scored").length,
      triesConceded: teamEvents.filter((event) => event.teamEventType === "try conceded").length,
    };
  }, [events]);

  const setPieceSummary = useMemo(() => {
    const lineouts = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "lineout" &&
        event.setPieceSide === "Own"
    );
    const scrums = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "scrum" &&
        event.setPieceSide === "Own"
    );
    return {
      eastsLineoutSuccessPct:
        lineouts.length > 0
          ? (lineouts.filter((event) => event.lineoutResult === "Won").length / lineouts.length) * 100
          : 0,
      eastsScrumSuccessPct:
        scrums.length > 0
          ? (scrums.filter((event) => event.scrumResult === "Won" || event.scrumResult === "Penalty For").length / scrums.length) * 100
          : 0,
    };
  }, [events]);

  const groupedInsights = useMemo(() => {
    const groups = [
      { title: "Tackles", items: events.filter((event) => event.playerAction === "tackle") },
      { title: "Missed tackles", items: events.filter((event) => event.playerAction === "missed tackle") },
      { title: "Carries", items: events.filter((event) => event.playerAction === "carry") },
      { title: "Turnovers", items: events.filter((event) => event.playerAction === "turnover") },
      { title: "Set piece", items: events.filter((event) => event.category === "set-piece") },
      { title: "Team events", items: events.filter((event) => event.category === "team") },
    ];
    return groups
      .map((group) => ({ ...group, items: group.items.sort((a, b) => a.timestamp - b.timestamp).slice(0, 6) }))
      .filter((group) => group.items.length > 0);
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

  const drawAnnotation = useCallback((ctx: CanvasRenderingContext2D, annotation: VideoAnnotation, width: number, height: number) => {
    const [start, end] = annotation.points;
    if (!start || !end) return;
    const x1 = start.x * width;
    const y1 = start.y * height;
    const x2 = end.x * width;
    const y2 = end.y * height;
    ctx.save();
    ctx.strokeStyle = annotation.color || ANNOTATION_COLOURS[annotation.type];
    ctx.fillStyle = annotation.color || ANNOTATION_COLOURS[annotation.type];
    ctx.lineWidth = annotation.type === "highlight" ? 18 : 4;
    ctx.lineCap = "round";

    if (annotation.type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 18;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (annotation.type === "circle") {
      const radius = Math.hypot(x2 - x1, y2 - y1);
      ctx.beginPath();
      ctx.arc(x1, y1, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const redrawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const rect = video.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const visible = clips
      .filter((clip) => currentTime >= clip.startTime && currentTime <= clip.endTime)
      .flatMap((clip) => clip.annotations ?? []);
    visible.forEach((annotation) => drawAnnotation(ctx, annotation, width, height));
    if (draftAnnotation) drawAnnotation(ctx, draftAnnotation, width, height);
  }, [clips, currentTime, draftAnnotation, drawAnnotation]);

  // Load video from cloud if no local session video is available
  useEffect(() => {
    if (videoSrc) return;
    const matchId = getCurrentMatchId();
    if (!matchId) return;
    const match = getSavedMatchById(matchId);
    if (!match?.videoStoragePath) return;

    setVideoCloudStatus("loading");
    void getMatchVideoSignedUrl(match.videoStoragePath, SIGNED_URL_EXPIRY_SECONDS).then((url) => {
      if (url) {
        setVideoSrc(url);
        setVideoCloudStatus("loaded");
      } else {
        setVideoCloudStatus("unavailable");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redrawAnnotations();
    window.addEventListener("resize", redrawAnnotations);
    return () => window.removeEventListener("resize", redrawAnnotations);
  }, [redrawAnnotations]);

  useEffect(() => {
    if (!isPresenting) return;
    if (presentationPaused) return;
    if (presentationTimerRef.current) return;
    const clip = filteredClips[presentationIndex];
    if (!clip) return;
    if (currentTime < clip.endTime) return;
    const video = videoRef.current;
    video?.pause();
    presentationTimerRef.current = setTimeout(() => {
      presentationTimerRef.current = null;
      const nextIndex = presentationIndex + 1;
      if (nextIndex >= filteredClips.length) {
        setIsPresenting(false);
        setPresentationPaused(false);
        return;
      }
      const nextClip = filteredClips[nextIndex];
      setPresentationIndex(nextIndex);
      if (videoRef.current && nextClip) {
        videoRef.current.currentTime = nextClip.startTime;
        setCurrentTime(nextClip.startTime);
        setActiveClipId(nextClip.id);
        void videoRef.current.play();
      }
    }, 1500);
  }, [currentTime, filteredClips, isPresenting, presentationIndex, presentationPaused]);

  useEffect(() => {
    return () => {
      if (presentationTimerRef.current) {
        clearTimeout(presentationTimerRef.current);
        presentationTimerRef.current = null;
      }
    };
  }, []);

  const presentingFilterRef = useRef<ClipFilter | null>(null);
  useEffect(() => {
    if (!isPresenting) {
      presentingFilterRef.current = null;
      return;
    }
    if (presentingFilterRef.current === null) {
      presentingFilterRef.current = clipFilter;
      return;
    }
    if (presentingFilterRef.current !== clipFilter) {
      if (presentationTimerRef.current) {
        clearTimeout(presentationTimerRef.current);
        presentationTimerRef.current = null;
      }
      setIsPresenting(false);
      setPresentationPaused(false);
      presentingFilterRef.current = null;
    }
  }, [clipFilter, isPresenting]);

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
    persistReviewState({ coachNotes: nextNotes });
  };

  const deleteCoachNote = (id: number) => {
    const nextNotes = coachNotes.filter((note) => note.id !== id);
    setCoachNotes(nextNotes);
    persistReviewState({ coachNotes: nextNotes });
  };

  const updateShowRawTranscript = (nextValue: boolean) => {
    setShowRawTranscript(nextValue);
    persistReviewState({ showRawTranscript: nextValue });
  };

  function currentVideoTime() {
    return videoRef.current?.currentTime ?? currentTime;
  }

  function markStart() {
    setClipInProgress(currentVideoTime());
    setPendingEndTime(null);
    setClipLabelDraft("");
    setClipCommentDraft("");
    setClipCategoryDraft("");
  }

  function markEnd() {
    if (clipInProgress === null) return;
    const t = currentVideoTime();
    if (t <= clipInProgress) return;
    setPendingEndTime(t);
    videoRef.current?.pause();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      const video = videoRef.current;

      if (event.code === "Space") {
        if (isPresenting) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        if (!video) return;
        if (clipInProgress === null) {
          markStart();
        } else if (pendingEndTime === null) {
          markEnd();
        }
        return;
      }

      if (isPresenting) {
        if (event.code === "ArrowDown" || event.code === "KeyN") {
          event.preventDefault();
          goToPresentationClip(presentationIndex + 1);
          return;
        }
        if (event.code === "ArrowUp" || event.code === "KeyP") {
          event.preventDefault();
          goToPresentationClip(presentationIndex - 1);
          return;
        }
        if (event.code === "Escape") {
          event.preventDefault();
          exitPresentation();
          return;
        }
      }

      if (!video) return;

      if (!isPresenting && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
        if (!video.paused) return;
        event.preventDefault();
        const delta = event.code === "ArrowRight" ? 1 / 30 : -1 / 30;
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const next = Math.max(0, Math.min(video.currentTime + delta, duration || video.currentTime + delta));
        video.currentTime = next;
        setCurrentTime(next);
        return;
      }

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
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const confirmClip = () => {
    if (clipInProgress === null || pendingEndTime === null) return;
    const range = clampRange(clipInProgress, pendingEndTime, videoDuration);
    const nextClip: ClipAnnotation = {
      id: createLocalReviewId(clips.map((clip) => clip.id)),
      startTime: range.startTime,
      endTime: range.endTime,
      label: clipLabelDraft.trim() || "Clip",
      category: clipCategoryDraft || undefined,
      comment: clipCommentDraft.trim() || undefined,
      annotations: [],
    };
    const next = [...clips, nextClip].sort((a, b) => a.startTime - b.startTime);
    setClips(next);
    setActiveClipId(nextClip.id);
    setClipInProgress(null);
    setPendingEndTime(null);
    setClipLabelDraft("");
    setClipCommentDraft("");
    setClipCategoryDraft("");
    persistReviewState({ clips: next });
  };

  const cancelClip = () => {
    setClipInProgress(null);
    setPendingEndTime(null);
    setClipLabelDraft("");
    setClipCommentDraft("");
    setClipCategoryDraft("");
  };

  const updateClip = (id: number, patch: Partial<ClipAnnotation>) => {
    const next = clips.map((clip) => {
      if (clip.id !== id) return clip;
      const merged = { ...clip, ...patch };
      const range = clampRange(merged.startTime, merged.endTime, videoDuration);
      return { ...merged, ...range, annotations: Array.isArray(merged.annotations) ? merged.annotations : [] };
    });
    setClips(next);
    persistReviewState({ clips: next });
  };

  const deleteClip = (id: number) => {
    const next = clips.filter((clip) => clip.id !== id);
    setClips(next);
    if (activeClipId === id) setActiveClipId(null);
    persistReviewState({ clips: next });
  };

  function playerActionLabel(action: EventItem["playerAction"]) {
    if (action === "tackle") return "Tackle";
    if (action === "missed tackle") return "Missed tackle";
    if (action === "carry") return "Carry";
    if (action === "turnover") return "Turnover";
    return null;
  }

  function categoryForAction(action: EventItem["playerAction"]) {
    if (action === "tackle" || action === "missed tackle") return "Defence";
    if (action === "carry" || action === "turnover") return "Attack";
    return undefined;
  }

  const sortedRosterPlayers = useMemo(
    () =>
      [...rosterRows]
        .filter((row) => row.name && row.name.trim().length > 0)
        .sort((a, b) => {
          if (typeof a.number === "number" && typeof b.number === "number") {
            return a.number - b.number;
          }
          return a.name.localeCompare(b.name);
        }),
    [rosterRows]
  );

  const selectedPlayerRow = useMemo(
    () => sortedRosterPlayers.find((row) => (row.playerId ?? row.name) === selectedPlayerId) ?? null,
    [selectedPlayerId, sortedRosterPlayers]
  );

  const playerInvolvements = useMemo(() => {
    if (!selectedPlayerRow) return [] as EventItem[];
    const targetName = selectedPlayerRow.name.trim().toLowerCase();
    return events
      .filter((event) => {
        if (event.category !== "player") return false;
        if (!event.playerAction) return false;
        if (!playerActionLabel(event.playerAction)) return false;
        const eventName = (event.playerName ?? "").trim().toLowerCase();
        return eventName === targetName;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events, selectedPlayerRow]);

  const buildClipFromEvent = (event: EventItem, existingIds: number[]): ClipAnnotation | null => {
    if (!selectedPlayerRow) return null;
    const action = playerActionLabel(event.playerAction);
    if (!action) return null;
    const rawStart = event.timestamp - 3;
    const rawEnd = event.timestamp + 7;
    const range = clampRange(Math.max(0, rawStart), rawEnd, videoDuration);
    return {
      id: createLocalReviewId(existingIds),
      startTime: range.startTime,
      endTime: range.endTime,
      label: `${selectedPlayerRow.name} — ${action}`,
      category: categoryForAction(event.playerAction),
      comment: undefined,
      annotations: [],
    };
  };

  const saveEventAsClip = (event: EventItem) => {
    const newClip = buildClipFromEvent(event, clips.map((clip) => clip.id));
    if (!newClip) return;
    const next = [...clips, newClip].sort((a, b) => a.startTime - b.startTime);
    setClips(next);
    setSavedFromEventIds((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(event.id);
      return nextSet;
    });
    persistReviewState({ clips: next });
  };

  const saveAllEventsAsClips = () => {
    const remaining = playerInvolvements.filter((event) => !savedFromEventIds.has(event.id));
    if (remaining.length === 0) return;
    const existingIds = clips.map((clip) => clip.id);
    const newClips: ClipAnnotation[] = [];
    remaining.forEach((event) => {
      const allIds = existingIds.concat(newClips.map((clip) => clip.id));
      const built = buildClipFromEvent(event, allIds);
      if (built) newClips.push(built);
    });
    if (newClips.length === 0) return;
    const next = [...clips, ...newClips].sort((a, b) => a.startTime - b.startTime);
    setClips(next);
    setSavedFromEventIds((prev) => {
      const nextSet = new Set(prev);
      remaining.forEach((event) => nextSet.add(event.id));
      return nextSet;
    });
    persistReviewState({ clips: next });
  };

  const seekToClip = (clip: ClipAnnotation) => {
    if (videoRef.current) {
      videoRef.current.currentTime = clip.startTime;
      videoRef.current.pause();
    }
    setCurrentTime(clip.startTime);
    setActiveClipId(clip.id);
  };

  const clearPresentationTimer = () => {
    if (presentationTimerRef.current) {
      clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
  };

  const seekAndPlayClip = (clip: ClipAnnotation) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clip.startTime;
    setCurrentTime(clip.startTime);
    setActiveClipId(clip.id);
    void video.play();
  };

  const startPresentation = () => {
    if (filteredClips.length === 0) return;
    clearPresentationTimer();
    setIsPresenting(true);
    setPresentationPaused(false);
    setPresentationIndex(0);
    seekAndPlayClip(filteredClips[0]);
  };

  const exitPresentation = () => {
    clearPresentationTimer();
    setIsPresenting(false);
    setPresentationPaused(false);
  };

  const goToPresentationClip = (nextIndex: number) => {
    clearPresentationTimer();
    if (filteredClips.length === 0) {
      exitPresentation();
      return;
    }
    if (nextIndex >= filteredClips.length) {
      exitPresentation();
      return;
    }
    const safeIndex = Math.max(0, nextIndex);
    setPresentationIndex(safeIndex);
    seekAndPlayClip(filteredClips[safeIndex]);
  };

  const togglePresentationPaused = () => {
    const video = videoRef.current;
    setPresentationPaused((prev) => {
      const next = !prev;
      if (next) {
        clearPresentationTimer();
        video?.pause();
      } else {
        void video?.play();
      }
      return next;
    });
  };

  const seekToSetPieceMoment = (timestamp: number) => {
    const nextTime = Math.max(0, timestamp - 3);
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
      videoRef.current.pause();
    }
    setCurrentTime(nextTime);
  };

  const jumpVideoBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const nextTime = Math.max(0, Math.min(video.currentTime + seconds, duration || video.currentTime + seconds));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const changePlaybackRate = (nextRate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const selectAnnotationTool = (tool: AnnotationTool) => {
    if (!activeClip) return;
    setAnnotationTool((current) => (current === tool ? null : tool));
    videoRef.current?.pause();
  };

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const addAnnotationToClip = (annotation: VideoAnnotation) => {
    if (!activeClip) return;
    const next = clips.map((clip) =>
      clip.id === activeClip.id
        ? { ...clip, annotations: [...(clip.annotations ?? []), annotation] }
        : clip
    );
    setClips(next);
    persistReviewState({ clips: next });
  };

  const deleteAnnotation = (clipId: number, annotationId: number) => {
    const next = clips.map((clip) =>
      clip.id === clipId
        ? { ...clip, annotations: (clip.annotations ?? []).filter((annotation) => annotation.id !== annotationId) }
        : clip
    );
    setClips(next);
    persistReviewState({ clips: next });
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !activeClip) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingStartRef.current = getCanvasPoint(event);
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !activeClip || !drawingStartRef.current) return;
    setDraftAnnotation({
      id: -1,
      type: annotationTool,
      timestamp: currentVideoTime(),
      points: [drawingStartRef.current, getCanvasPoint(event)],
      color: ANNOTATION_COLOURS[annotationTool],
    });
  };

  const handleCanvasPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !activeClip || !drawingStartRef.current) return;
    const end = getCanvasPoint(event);
    const start = drawingStartRef.current;
    drawingStartRef.current = null;
    setDraftAnnotation(null);
    if (Math.abs(end.x - start.x) < 0.01 && Math.abs(end.y - start.y) < 0.01) return;
    addAnnotationToClip({
      id: createLocalReviewId((activeClip.annotations ?? []).map((annotation) => annotation.id)),
      type: annotationTool,
      timestamp: currentVideoTime(),
      points: [start, end],
      color: ANNOTATION_COLOURS[annotationTool],
    });
  };

  const annotationCount = activeClip?.annotations?.length ?? 0;

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">Coach Review</h1>
                <PageHelp {...COACH_PAGE_HELP["/coach/review"]} />
              </div>
              <p className="mt-2 text-sm text-muted">
                Team meeting film room with flexible clips, coaching notes, and lightweight telestration.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              {autosaveStatus}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Current match context</div>
              <h2 className="mt-2 text-xl font-semibold text-foreground-strong">{confidence.title}</h2>
              <p className="mt-1 text-sm text-muted">{confidence.subtitle}</p>
              <p className="mt-2 text-xs text-muted">
                Spacebar starts and ends clips on this screen only. Capture voice tagging is unchanged.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 xl:w-[620px] xl:grid-cols-4">
              <ReviewContextTile label="Players" value={`${confidence.namedPlayers}/${confidence.totalPlayers}`} />
              <ReviewContextTile label="Events" value={String(confidence.resolvedEvents)} />
              <ReviewContextTile label="Notes" value={String(confidence.notes)} />
              <ReviewContextTile label="Report" value={confidence.readyLabel} tone={confidence.readyTone} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground-strong">Match review video</h2>
                  <p className="mt-1 text-sm text-muted">
                    {[matchTitle || "Match", opponent ? `vs ${opponent}` : "", matchDate].filter(Boolean).join(" - ")}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
                  {activeClip ? `Active clip: ${activeClip.label}` : "Select a clip to annotate"}
                </div>
              </div>

              {videoCloudStatus === "loading" && (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
                  Loading video from cloud…
                </div>
              )}

              {videoSrc ? (
                <>
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow-panel)]">
                    <video
                      ref={videoRef}
                      controls
                      src={videoSrc}
                      className="aspect-video min-h-[340px] w-full bg-black object-contain xl:min-h-[460px] 2xl:min-h-[560px]"
                      onError={() => {
                        if (!videoSrc || videoSrc.startsWith("blob:")) return;
                        const matchId = getCurrentMatchId();
                        if (!matchId) return;
                        const m = getSavedMatchById(matchId);
                        if (!m?.videoStoragePath) return;
                        setVideoSrc("");
                        setVideoCloudStatus("loading");
                        void refreshVideoSignedUrl(m.videoStoragePath).then((url) => {
                          if (url) { setVideoSrc(url); setVideoCloudStatus("loaded"); }
                          else setVideoCloudStatus("unavailable");
                        });
                      }}
                      onLoadedData={() => {
                        if (videoRef.current) {
                          videoRef.current.playbackRate = playbackRate;
                          setVideoDuration(Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
                        }
                        redrawAnnotations();
                      }}
                      onTimeUpdate={() => {
                        const nextTime = videoRef.current?.currentTime || 0;
                        setCurrentTime(nextTime);
                        const inRange = clips.find((clip) => nextTime >= clip.startTime && nextTime <= clip.endTime);
                        if (inRange) setActiveClipId(inRange.id);
                      }}
                    />
                    <canvas
                      ref={canvasRef}
                      className={`absolute inset-0 h-full w-full ${annotationTool && activeClip ? "cursor-crosshair" : "pointer-events-none"}`}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                    />
                    <button
                      type="button"
                      title="Fullscreen"
                      onClick={async () => {
                        const container = videoRef.current?.parentElement;
                        if (!container) return;
                        try {
                          await container.requestFullscreen();
                        } catch (error) {
                          console.error("Failed to enter fullscreen", error);
                        }
                      }}
                      className="absolute right-3 top-3 z-10 rounded-lg border border-border bg-panel/90 backdrop-blur px-2 py-1.5 text-foreground hover:bg-panel"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 5V2h3" />
                        <path d="M12 5V2H9" />
                        <path d="M2 9v3h3" />
                        <path d="M12 9v3H9" />
                      </svg>
                    </button>
                    {isPresenting && filteredClips[presentationIndex] && (
                      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-border bg-background/85 px-4 py-3 backdrop-blur">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs uppercase tracking-widest text-muted-2">
                              Clip {presentationIndex + 1} of {filteredClips.length}
                            </div>
                            <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                              {filteredClips[presentationIndex].label}
                            </div>
                            {filteredClips[presentationIndex].comment && (
                              <div className="mt-0.5 truncate text-xs text-muted">
                                {filteredClips[presentationIndex].comment}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => goToPresentationClip(presentationIndex - 1)}
                              disabled={presentationIndex === 0}
                              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
                            >
                              Previous
                            </button>
                            <button
                              type="button"
                              onClick={togglePresentationPaused}
                              className="rounded-xl border border-border-light bg-panel-3 px-3 py-1.5 text-xs font-medium text-foreground"
                            >
                              {presentationPaused ? "Play" : "Pause"}
                            </button>
                            <button
                              type="button"
                              onClick={() => goToPresentationClip(presentationIndex + 1)}
                              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                            >
                              Next
                            </button>
                            <button
                              type="button"
                              onClick={exitPresentation}
                              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                            >
                              Exit
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-panel-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => jumpVideoBy(-5)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground">
                        -5s
                      </button>
                      <button type="button" onClick={() => jumpVideoBy(5)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground">
                        +5s
                      </button>

                      <div className="ml-0 h-6 w-px bg-border md:ml-1" />

                      {[0.25, 0.5, 0.75, 1, 2].map((rate) => (
                        <button
                          type="button"
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
                            playbackRate === rate ? "border-border-light bg-panel-3 text-foreground" : "border-border text-foreground"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}

                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-muted">{formatTime(currentTime)}</span>
                        <div className="h-6 w-px bg-border" />
                        {clipInProgress === null ? (
                          <button type="button" onClick={markStart} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground">
                            Mark Start
                          </button>
                        ) : pendingEndTime === null ? (
                          <button type="button" onClick={markEnd} className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground">
                            End ({formatTime(clipInProgress)} - ?)
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-border bg-panel-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Annotate</span>
                      {(["arrow", "circle", "highlight"] as const).map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          disabled={!activeClip}
                          onClick={() => selectAnnotationTool(tool)}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            annotationTool === tool ? "border-border-light bg-panel-3 text-foreground" : "border-border text-muted"
                          }`}
                        >
                          {annotationLabel(tool)}
                        </button>
                      ))}
                      <span className="text-xs text-muted">
                        {activeClip ? `${annotationCount} saved on selected clip` : "Select a clip first"}
                      </span>
                    </div>
                  </div>

                  {pendingEndTime !== null && clipInProgress !== null && (
                    <div className="mt-3 rounded-2xl border border-border bg-panel-2 p-4">
                      <div className="mb-3 text-sm font-medium text-foreground">
                        Clip: {formatTime(clipInProgress)} - {formatTime(pendingEndTime)}
                      </div>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {CLIP_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setClipCategoryDraft(clipCategoryDraft === cat ? "" : cat)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              clipCategoryDraft === cat ? "border-border-light bg-panel-3 text-foreground" : "border-border bg-panel text-muted"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          type="text"
                          value={clipLabelDraft}
                          onChange={(event) => setClipLabelDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") confirmClip();
                            if (event.key === "Escape") cancelClip();
                          }}
                          placeholder="Label this clip..."
                          autoFocus
                          className="flex-1 rounded-xl border border-border bg-panel px-3 py-2 text-sm text-foreground"
                        />
                        <button type="button" onClick={confirmClip} className="rounded-xl border border-border-light bg-panel-3 px-4 py-2 text-sm font-medium text-foreground">
                          Save clip
                        </button>
                        <button type="button" onClick={cancelClip} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground">
                          Cancel
                        </button>
                      </div>
                      <textarea
                        value={clipCommentDraft}
                        onChange={(event) => setClipCommentDraft(event.target.value)}
                        placeholder="Coach comment for this clip…"
                        rows={2}
                        className="mt-2 w-full rounded-xl border border-border bg-panel px-3 py-2 text-sm text-foreground resize-none"
                      />
                    </div>
                  )}
                </>
              ) : videoCloudStatus !== "loading" ? (
                <div className="rounded-xl border border-border bg-panel-2 px-4 py-4 text-sm text-muted">
                  <div className="font-medium text-foreground">No video available yet</div>
                  <p className="mt-2">
                    {videoCloudStatus === "unavailable"
                      ? "Could not load the match video from cloud. Check your connection and try reloading the page."
                      : "Load a match video in Capture first, then reopen Review."}
                  </p>
                </div>
              ) : null}
            </div>

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

            <CoachingInsights events={events} groups={groupedInsights} />
          </section>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:col-span-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="flex flex-wrap gap-1.5">
              {(["clips", "byPlayer"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    viewMode === mode ? "border-border-light bg-panel-3 text-foreground" : "border-border bg-panel-2 text-muted"
                  }`}
                >
                  {mode === "clips" ? "Clips" : "By Player"}
                </button>
              ))}
            </div>

            {viewMode === "byPlayer" ? (
              <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground-strong">By Player</h2>
                  {selectedPlayerRow && playerInvolvements.length > 0 && (
                    <button
                      type="button"
                      onClick={saveAllEventsAsClips}
                      className="rounded-xl border border-border-light bg-panel-3 px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      Save all as clips
                    </button>
                  )}
                </div>

                <select
                  value={selectedPlayerId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedPlayerId(value || null);
                    setSavedFromEventIds(new Set());
                  }}
                  className="mb-3 w-full rounded-xl border border-border bg-panel-2 px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Pick a player…</option>
                  {sortedRosterPlayers.map((row) => {
                    const value = row.playerId ?? row.name;
                    return (
                      <option key={value} value={value}>
                        {row.number ? `#${row.number} ` : ""}{row.name}
                        {row.position ? ` · ${row.position}` : ""}
                      </option>
                    );
                  })}
                </select>

                {!selectedPlayerRow ? (
                  <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                    Pick a player to see their involvements
                  </div>
                ) : playerInvolvements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                    No logged involvements for this player yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playerInvolvements.map((event) => {
                      const action = playerActionLabel(event.playerAction);
                      const saved = savedFromEventIds.has(event.id);
                      return (
                        <div
                          key={event.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-panel-2 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-2">{formatTime(event.timestamp)}</span>
                            <span className="truncate text-sm text-foreground">{action}</span>
                          </div>
                          {saved ? (
                            <span className="text-xs text-muted">Saved ✓</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => saveEventAsClip(event)}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                            >
                              Save as clip
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground-strong">Clip playlist</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startPresentation}
                    disabled={filteredClips.length === 0}
                    className="rounded-xl border border-border-light bg-panel-3 px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
                  >
                    Present clips
                  </button>
                  <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
                    {clips.length} clip{clips.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {CLIP_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setClipFilter(filter)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      clipFilter === filter ? "border-border-light bg-panel-3 text-foreground" : "border-border bg-panel-2 text-muted"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {filteredClips.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                  {clips.length === 0 ? "No clips yet. Press spacebar once to start and again to end." : "No clips match this filter."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClips.map((clip) => {
                    const isActive = activeClip?.id === clip.id || (currentTime >= clip.startTime && currentTime <= clip.endTime);
                    return (
                      <div key={clip.id} className={`rounded-xl border p-3 ${isActive ? "border-border-light bg-panel-3" : "border-border bg-panel-2"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <button type="button" onClick={() => seekToClip(clip)} className="text-left text-sm font-medium text-foreground underline underline-offset-2">
                            {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                          </button>
                          <button type="button" onClick={() => deleteClip(clip.id)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                            Delete
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="text-xs text-muted">
                            Start
                            <input
                              type="text"
                              value={formatTimeInput(clip.startTime)}
                              onChange={(event) => updateClip(clip.id, { startTime: parseTimeInput(event.target.value) })}
                              className="mt-1 w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                            />
                          </label>
                          <label className="text-xs text-muted">
                            End
                            <input
                              type="text"
                              value={formatTimeInput(clip.endTime)}
                              onChange={(event) => updateClip(clip.id, { endTime: parseTimeInput(event.target.value) })}
                              className="mt-1 w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                            />
                          </label>
                        </div>

                        <input
                          type="text"
                          value={clip.label}
                          onChange={(event) => updateClip(clip.id, { label: event.target.value || "Clip" })}
                          className="mt-2 w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                        />

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {CLIP_CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => updateClip(clip.id, { category: clip.category === cat ? undefined : cat })}
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                clip.category === cat ? "border-border-light bg-panel text-foreground" : "border-border bg-panel text-muted"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={clip.comment ?? ""}
                          onChange={(event) => updateClip(clip.id, { comment: event.target.value || undefined })}
                          placeholder="Coach comment for this clip…"
                          rows={2}
                          className="mt-2 w-full rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground resize-none"
                        />

                        {(clip.annotations ?? []).length > 0 && (
                          <div className="mt-3 space-y-1.5 border-t border-border pt-2">
                            {(clip.annotations ?? []).map((annotation) => (
                              <div key={annotation.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                                <span>{annotationLabel(annotation.type)} at {formatTime(annotation.timestamp)}</span>
                                <button type="button" onClick={() => deleteAnnotation(clip.id, annotation.id)} className="underline underline-offset-2">
                                  remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground-strong">Set-piece tags</h2>
                <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
                  {setPieceMoments.length} tag{setPieceMoments.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
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
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  ["own", "Own"],
                  ["opposition", "Opposition"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs font-medium text-muted"
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
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                  {setPieceMoments.length === 0 ? "No scrum or lineout tags logged yet." : "No set-piece tags match these filters."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSetPieceMoments.map((moment) => (
                    <button
                      key={moment.id}
                      type="button"
                      onClick={() => seekToSetPieceMoment(moment.timestamp)}
                      className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2 text-left transition hover:border-border-light hover:bg-panel-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-2">{formatTime(moment.timestamp)}</span>
                        <span className="text-sm font-medium text-foreground">{moment.label}</span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">{moment.side}</span>
                      </div>
                      {moment.notes && <p className="mt-1 text-xs text-muted">Call: {moment.notes}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground-strong">Review timeline</h2>
              <p className="mt-2 text-sm text-muted">
                Structured match moments stay below the clip playlist so the meeting flow remains focused.
              </p>
            </div>

            <GameReviewTimelinePanel
              events={events}
              showRawTranscript={showRawTranscript}
              onShowRawTranscriptChange={updateShowRawTranscript}
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

function CoachingInsights({ events, groups }: { events: EventItem[]; groups: { title: string; items: EventItem[] }[] }) {
  const empty = events.length === 0;
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground-strong">Coaching notes cleanup</h2>
        <p className="mt-1 text-sm text-muted">
          Structured actions are grouped first so review reads like coaching cues, not raw transcript noise.
        </p>
      </div>

      {empty ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
          No structured match events available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.title} className="rounded-xl border border-border bg-panel-2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                <span className="text-xs text-muted-2">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((event) => (
                  <div key={event.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-2">{formatTime(event.timestamp)}</span>
                    <span className="text-muted">{buildEventSummary(event)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const toneClass = tone === "ready" ? "text-success" : tone === "needs-work" ? "text-warning" : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
