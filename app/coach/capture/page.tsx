"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { CLOUD_SYNC_ERROR_EVENT } from "@/app/rugby-tagging/lib/savedMatches";
import { useRouter } from "next/navigation";
import TeamSheetModal from "@/app/rugby-tagging/components/TeamSheetModal";
import MatchdayRosterPanel from "@/app/rugby-tagging/components/MatchdayRosterPanel";
import TranscriptPanel from "@/app/rugby-tagging/components/TranscriptPanel";
import NeedsReviewPanel from "@/app/rugby-tagging/components/NeedsReviewPanel";
import CoachReviewPanel from "@/app/rugby-tagging/components/CoachReviewPanel";
import TeamSnapshotPanel from "@/app/rugby-tagging/components/TeamSnapshotPanel";
import MatchReportModal from "@/app/rugby-tagging/components/MatchReportModal";
import PlayerDrilldownModal from "@/app/rugby-tagging/components/PlayerDrilldownModal";
import GameReviewTimelinePanel from "@/app/rugby-tagging/components/GameReviewTimelinePanel";
import SetPieceLoggingPanel from "@/app/rugby-tagging/components/SetPieceLoggingPanel";
import TeamEventsPanel from "@/app/rugby-tagging/components/TeamEventsPanel";
import MatchMilestonesPanel from "@/app/rugby-tagging/components/MatchMilestonesPanel";
import PendingResolutionPanel from "@/app/rugby-tagging/components/PendingResolutionPanel";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import {
  clearMatchVideoSession,
  setMatchVideoFile,
} from "@/app/rugby-tagging/lib/matchVideoSession";
import {
  clearCurrentMatchId,
  createMatchId,
  getCurrentMatchId,
  getSavedMatchById,
  setCurrentMatchId as persistCurrentMatchId,
  upsertSavedMatch,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import { upsertCloudSavedMatch } from "@/lib/savedMatchesCloud";
import {
  deleteMatchVideo,
  getMatchVideoSignedUrl,
  getMatchVideoSignedUrlWithResult,
  refreshVideoSignedUrl,
  SIGNED_URL_EXPIRY_SECONDS,
  uploadMatchVideoWithResult,
  type VideoUploadResult,
} from "@/lib/matchVideoCloud";
import {
  getSquadProfile,
  resolvePlayerName,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/team";
import {
  CORRECTION_MEMORY_KEY,
  DEFAULT_ROSTER_ROWS,
  STORAGE_KEY,
} from "@/app/rugby-tagging/constants";
import { ACTIVE_TEAM_ID_KEY } from "@/lib/teamContext";
import {
  blurActiveElement,
  buildBasicStats,
  buildCoachComment,
  buildSetPieceText,
  buildMilestoneEventText,
  buildTeamEventText,
  cleanTranscriptText,
  copyTextToClipboard,
  downloadFile,
  findMatchingPlayer,
  formatTime,
  getClosestPlayers,
  getSafeRecorderMimeType,
  getSessionStateLabel,
  getUnitFromPosition,
  gradeCarriesPerMin,
  gradeInvPerMin,
  gradeTacklePct,
  gradeTacklesPerMin,
  gradeToScore,
  gradeTurnovers,
  hydrateRosterRows,
  isForwardPosition,
  mergeUniqueCandidates,
  normalizeCorrectionKey,
  normalizeForMatch,
  parseTeamSheetText,
  scoreToGrade,
} from "@/app/rugby-tagging/helpers";
import type {
  EventItem,
  LineoutResult,
  MilestoneType,
  PendingResolution,
  PlayerAction,
  ReportRow,
  ReviewItem,
  RosterRow,
  ScrumResult,
  SetPieceSide,
  TeamEventType,
  UnitSummaryRow,
  VoiceResponse,
} from "@/app/rugby-tagging/types";

type AppMode = "stat" | "game-review";

type CoachReviewNote = {
  id: number;
  timestamp: number;
  text: string;
  rawText?: string;
};

const HELP_DISMISSED_KEY = "rugby-tagging-help-dismissed";

// Return team-scoped localStorage keys so capture sessions and correction
// memory never bleed between teams when a coach switches team context.
function getScopedStorageKey(): string {
  try {
    const t = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "";
    return t ? `${STORAGE_KEY}-${t}` : STORAGE_KEY;
  } catch { return STORAGE_KEY; }
}
function getScopedCorrectionKey(): string {
  try {
    const t = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "";
    return t ? `${CORRECTION_MEMORY_KEY}-${t}` : CORRECTION_MEMORY_KEY;
  } catch { return CORRECTION_MEMORY_KEY; }
}

export default function RugbyVoiceTaggingMVP() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timestampAtRecordingStartRef = useRef<number>(0);
  const originalVideoVolumeRef = useRef<number>(1);
  const stopTimeoutRef = useRef<number | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const pageShellRef = useRef<HTMLDivElement | null>(null);
  const spacebarHeldRef = useRef(false);
  const pendingVideoFileRef = useRef<File | null>(null);
  const videoUploadPromiseRef = useRef<Promise<VideoUploadResult> | null>(null);

  const [activeMode, setActiveMode] = useState<AppMode>("stat");
  const [videoStoragePath, setVideoStoragePath] = useState("");

  const [matchTitle, setMatchTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [currentMatchId, setCurrentMatchId] = useState("");
  const [squadProfile, setSquadProfile] = useState<SquadProfile | null>(null);

  const [rosterRows, setRosterRows] = useState<RosterRow[]>(DEFAULT_ROSTER_ROWS);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [showTeamSheetModal, setShowTeamSheetModal] = useState(true);
  const [teamSheetPaste, setTeamSheetPaste] = useState("");
  const [showReportSetupModal, setShowReportSetupModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [transcriptImportText, setTranscriptImportText] = useState("");
  const [cleanedTranscriptText, setCleanedTranscriptText] = useState("");
  const [cleanedTranscriptItems, setCleanedTranscriptItems] = useState<
    Array<
      | { type: "event"; event: EventItem; cleanedLine: string }
      | { type: "review"; reviewItem: ReviewItem; cleanedLine: string }
    >
  >([]);
  const [transcriptCleanSummary, setTranscriptCleanSummary] = useState<{
    originalLines: number;
    cleanedLines: number;
    matchedLines: number;
    reviewLikelyLines: number;
  } | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [showRawTranscript, setShowRawTranscript] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [showPlayerDrilldownModal, setShowPlayerDrilldownModal] = useState(false);
  const [drilldownPlayerName, setDrilldownPlayerName] = useState("");

  const [pendingResolution, setPendingResolution] =
    useState<PendingResolution | null>(null);
  const [resolverSelection, setResolverSelection] = useState("");
  const [resolverSecondSelection, setResolverSecondSelection] = useState("");
  const [resolverCandidates, setResolverCandidates] = useState<string[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [learnedCorrections, setLearnedCorrections] =
    useState<Record<string, { playerName: string; action: PlayerAction | "" }>>({});

  const [lineoutSide, setLineoutSide] = useState<SetPieceSide>("Own");
  const [lineoutResult, setLineoutResult] = useState<LineoutResult>("Won");
  const [lineoutNotes, setLineoutNotes] = useState("");

  const [scrumSide, setScrumSide] = useState<SetPieceSide>("Own");
  const [scrumResult, setScrumResult] = useState<ScrumResult>("Won");

  const [coachNotes, setCoachNotes] = useState<CoachReviewNote[]>([]);
  const [coachNoteDraft, setCoachNoteDraft] = useState("");
  const [coachRawDraft, setCoachRawDraft] = useState("");
  const [showCoachRawInput, setShowCoachRawInput] = useState(false);
const [showTranscriptImport, setShowTranscriptImport] = useState(false);

  type VideoUploadStatus = "idle" | "uploading" | "uploaded" | "error";
  const [videoUploadStatus, setVideoUploadStatus] = useState<VideoUploadStatus>("idle");
  const [videoUploadPercent, setVideoUploadPercent] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState("");
  const [matchSubmitStatus, setMatchSubmitStatus] =
    useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [matchSubmitError, setMatchSubmitError] = useState("");
  const [cloudSyncError, setCloudSyncError] = useState("");
  const videoUploadLabel =
    videoUploadPercent >= 100
      ? "Finalising cloud save..."
      : `Uploading... ${videoUploadPercent}%`;

  const players = rosterRows.map((row) => row.name.trim()).filter(Boolean);
  const playersReady = players.length > 0;

  // Enhanced player name list for the transcribe API: includes preferred names
  // and nicknames from the squad profile so GPT can match informal names.
  // resolvePlayerName() maps them back to the full name in the pipeline.
  const enhancedPlayersText = useMemo(() => {
    const names = new Set<string>();
    for (const row of rosterRows) {
      const name = row.name.trim();
      if (!name) continue;
      names.add(name);
      if (squadProfile) {
        const sp = squadProfile.players.find(
          (p) =>
            p.fullName.toLowerCase() === name.toLowerCase() ||
            p.preferredName.toLowerCase() === name.toLowerCase()
        );
        if (sp) {
          if (sp.preferredName) names.add(sp.preferredName);
          sp.nicknames.forEach((n) => { if (n) names.add(n); });
        }
      }
    }
    return [...names].filter(Boolean).join("\n");
  }, [rosterRows, squadProfile]);

  const sessionStateLabel = getSessionStateLabel({
    voiceModeEnabled,
    recording,
    transcribing,
    pendingResolution,
  });

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

  const forwardsRows = useMemo(
    () => reportRows.filter((row) => isForwardPosition(row.position)),
    [reportRows]
  );

  const unitSummaryRows = useMemo(() => {
    const unitOrder = [
      "Front Row",
      "Locks",
      "Back Row",
      "Half Backs",
      "Inside Backs",
      "Outside Backs",
      "Bench",
    ];

    return unitOrder
      .map((unit) => {
        const rows = reportRows.filter((row) => row.unit === unit);
        if (rows.length === 0) return null;

        return {
          unit,
          players: rows.length,
          avgTacklesPerMin:
            rows.reduce((acc, row) => acc + row.tacklesPerMin, 0) / rows.length,
          avgCarriesPerMin:
            rows.reduce((acc, row) => acc + row.carriesPerMin, 0) / rows.length,
          avgInvolvementsPerMin:
            rows.reduce((acc, row) => acc + row.involvementsPerMin, 0) / rows.length,
        } as UnitSummaryRow;
      })
      .filter(Boolean) as UnitSummaryRow[];
  }, [reportRows]);

  const teamTotals = useMemo(() => {
    return reportRows.reduce(
      (acc, row) => {
        acc.minutes += row.minutes;
        acc.tackles += row.tackles;
        acc.missed += row.missed;
        acc.carries += row.carries;
        acc.turnovers += row.turnovers;
        acc.involvements += row.involvements;
        return acc;
      },
      {
        minutes: 0,
        tackles: 0,
        missed: 0,
        carries: 0,
        turnovers: 0,
        involvements: 0,
      }
    );
  }, [reportRows]);

  const setPieceSummary = useMemo(() => {
    const lineouts = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "lineout"
    );

    const scrums = events.filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        event.setPieceType === "scrum"
    );

    const isOwnBall = (e: EventItem) =>
      e.setPieceSide === "Own" || (e.setPieceSide as string) === "Easts";
    const eastsLineouts = lineouts.filter(isOwnBall);
    const eastsScrums = scrums.filter(isOwnBall);

    const eastsLineoutWon = eastsLineouts.filter(
      (event) => event.lineoutResult === "Won"
    ).length;

    const eastsScrumWon = eastsScrums.filter(
      (event) =>
        event.scrumResult === "Won" || event.scrumResult === "Penalty For"
    ).length;

    return {
      lineouts,
      scrums,
      eastsLineouts,
      eastsScrums,
      eastsLineoutWon,
      eastsScrumWon,
      eastsLineoutSuccessPct:
        eastsLineouts.length > 0
          ? (eastsLineoutWon / eastsLineouts.length) * 100
          : 0,
      eastsScrumSuccessPct:
        eastsScrums.length > 0 ? (eastsScrumWon / eastsScrums.length) * 100 : 0,
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

  const teamTacklePct =
    teamTotals.tackles + teamTotals.missed > 0
      ? (teamTotals.tackles / (teamTotals.tackles + teamTotals.missed)) * 100
      : 0;

  const bestDefender = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.tackles - a.tackles)[0];
  }, [reportRows]);

  const bestCarrier = useMemo(() => {
    if (reportRows.length === 0) return null;
    return [...reportRows].sort((a, b) => b.carries - a.carries)[0];
  }, [reportRows]);

  const gameFlowSummary = useMemo(() => {
    if (events.length === 0) return "No game events logged yet.";

    const sorted = [...events]
      .filter((event) => !event.isPending)
      .sort((a, b) => a.timestamp - b.timestamp);

    const firstQuarter = sorted.filter((event) => event.timestamp <= 20 * 60);
    const middleQuarter = sorted.filter(
      (event) => event.timestamp > 20 * 60 && event.timestamp <= 50 * 60
    );
    const lastQuarter = sorted.filter((event) => event.timestamp > 50 * 60);

    const missedByWindow = (windowEvents: EventItem[]) =>
      windowEvents.filter(
        (event) =>
          event.category === "player" && event.playerAction === "missed tackle"
      ).length;

    const carriesByWindow = (windowEvents: EventItem[]) =>
      windowEvents.filter(
        (event) => event.category === "player" && event.playerAction === "carry"
      ).length;

    const lines: string[] = [];

    if (firstQuarter.length > 0) {
      lines.push(
        `Start of game: ${
          missedByWindow(firstQuarter) >= 3
            ? "defensive start looked loose with multiple missed tackles early."
            : "opening period looked relatively controlled defensively."
        }`
      );
    }

    if (middleQuarter.length > 0) {
      lines.push(
        `Middle period: ${
          carriesByWindow(middleQuarter) >= 6
            ? "team generated a decent amount of carry volume through the middle stages."
            : "carry volume through the middle period looked limited."
        }`
      );
    }

    if (lastQuarter.length > 0) {
      lines.push(
        `Final period: ${
          missedByWindow(lastQuarter) >= 3
            ? "late defensive accuracy dropped off."
            : "team held together reasonably well late on."
        }`
      );
    }

    if (setPieceSummary.eastsLineouts.length > 0) {
      lines.push(
        `Lineout: ${squadProfile?.teamName ?? "Own team"} success was ${setPieceSummary.eastsLineoutSuccessPct.toFixed(
          0
        )}% from ${setPieceSummary.eastsLineouts.length} logged lineouts.`
      );
    }

    if (setPieceSummary.eastsScrums.length > 0) {
      lines.push(
        `Scrum: ${squadProfile?.teamName ?? "Own team"} success was ${setPieceSummary.eastsScrumSuccessPct.toFixed(
          0
        )}% from ${setPieceSummary.eastsScrums.length} logged scrums.`
      );
    }

    if (bestDefender) {
      lines.push(
        `Defensive workload leader: ${bestDefender.name} with ${bestDefender.tackles} tackles.`
      );
    }

    if (bestCarrier) {
      lines.push(
        `Carry workload leader: ${bestCarrier.name} with ${bestCarrier.carries} carries.`
      );
    }

    if (teamEventSummary.triesScored || teamEventSummary.triesConceded) {
      lines.push(
        `Score moments logged: ${teamEventSummary.triesScored} tries scored and ${teamEventSummary.triesConceded} tries conceded.`
      );
    }

    return lines.join(" ");
  }, [events, setPieceSummary, bestDefender, bestCarrier, teamEventSummary]);

  const gameCoachingComment = useMemo(() => {
    const comments: string[] = [];

    if (teamTacklePct < 80) {
      comments.push("Main team improvement area is defensive accuracy.");
    } else if (teamTacklePct >= 90) {
      comments.push("Defensive accuracy was a genuine strength.");
    } else {
      comments.push(
        "Defensive accuracy was competitive but still has room to improve."
      );
    }

    if (setPieceSummary.eastsLineouts.length > 0) {
      if (setPieceSummary.eastsLineoutSuccessPct < 80) {
        comments.push(
          "Lineout needs tightening, especially on core ball and clarity of call."
        );
      } else {
        comments.push("Lineout gave a solid platform overall.");
      }
    }

    if (setPieceSummary.eastsScrums.length > 0) {
      if (setPieceSummary.eastsScrumSuccessPct < 80) {
        comments.push("Scrum outcome was inconsistent and needs reviewing.");
      } else {
        comments.push("Scrum platform was generally solid.");
      }
    }

    if (teamTotals.carries < reportRows.length * 2) {
      comments.push(
        "Carry count suggests the side could look for more attacking involvements."
      );
    } else {
      comments.push(
        "Carry volume was reasonable and gave the side some attacking presence."
      );
    }

    return comments.join(" ");
  }, [teamTacklePct, setPieceSummary, teamTotals.carries, reportRows.length]);

  const drilldownPlayerReportRow = useMemo(() => {
    if (!drilldownPlayerName) return null;
    return reportRows.find((row) => row.name === drilldownPlayerName) || null;
  }, [reportRows, drilldownPlayerName]);

  const drilldownPlayerEvents = useMemo(() => {
    if (!drilldownPlayerName) return [];

    return [...events]
      .filter(
        (event) =>
          !event.isPending &&
          event.category === "player" &&
          event.playerName === drilldownPlayerName
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events, drilldownPlayerName]);

  const statsSummaryText = useMemo(() => {
    if (reportRows.length === 0) return "";

    const header = [
      matchTitle || "Match",
      opponent ? `vs ${opponent}` : "",
      matchDate || "",
    ]
      .filter(Boolean)
      .join(" | ");

    const lines = reportRows.map(
      (row) =>
        `${row.number}. ${row.name} - T:${row.tackles} MT:${row.missed} C:${row.carries} TO:${row.turnovers}`
    );

    return [
      header,
      `Team snapshot - Tackles: ${teamTotals.tackles}, Missed: ${teamTotals.missed}, Tackle %: ${teamTacklePct.toFixed(
        0
      )}%, Carries: ${teamTotals.carries}, Turnovers: ${
        teamTotals.turnovers
      }, Penalties Conceded: ${
        teamEventSummary.penaltiesConceded
      }, Scrum %: ${setPieceSummary.eastsScrumSuccessPct.toFixed(
        0
      )}%, Lineout %: ${setPieceSummary.eastsLineoutSuccessPct.toFixed(
        0
      )}%, Tries Scored: ${teamEventSummary.triesScored}, Tries Conceded: ${
        teamEventSummary.triesConceded
      }`,
      "",
      ...lines,
    ].join("\n");
  }, [
    reportRows,
    matchTitle,
    opponent,
    matchDate,
    teamTotals,
    teamTacklePct,
    teamEventSummary,
    setPieceSummary,
  ]);

  useEffect(() => {
    if (!selectedPlayer && players.length > 0) {
      setSelectedPlayer(players[0]);
    }

    if (selectedPlayer && !players.includes(selectedPlayer)) {
      setSelectedPlayer(players[0] || "");
    }
  }, [players, selectedPlayer]);

  useEffect(() => {
    try {
      const existingMatchId = getCurrentMatchId();

      if (existingMatchId) {
        const savedMatch = getSavedMatchById(existingMatchId);

        if (savedMatch) {
          const safeEvents = Array.isArray(savedMatch.events)
            ? savedMatch.events.filter((event: EventItem) => !event.isPending)
            : [];

          setCurrentMatchId(savedMatch.id);
          setMatchTitle(savedMatch.matchTitle || "");
          setOpponent(savedMatch.opponent || "");
          setMatchDate(savedMatch.matchDate || "");
          setRosterRows(hydrateRosterRows(savedMatch.rosterRows));
          setSelectedPlayer(savedMatch.selectedPlayer || "");
          setEvents(safeEvents);
          setReviewQueue(
            Array.isArray(savedMatch.reviewQueue) ? savedMatch.reviewQueue : []
          );
          setCoachNotes(
            Array.isArray(savedMatch.coachNotes) ? savedMatch.coachNotes : []
          );
          setActiveMode(
            savedMatch.activeMode === "game-review" ? "game-review" : "stat"
          );
          setShowRawTranscript(
            typeof savedMatch.showRawTranscript === "boolean"
              ? savedMatch.showRawTranscript
              : true
          );
          setVideoStoragePath(savedMatch.videoStoragePath || "");

          localStorage.setItem(
            getScopedStorageKey(),
            JSON.stringify({
              activeMode:
                savedMatch.activeMode === "game-review" ? "game-review" : "stat",
              matchTitle: savedMatch.matchTitle || "",
              opponent: savedMatch.opponent || "",
              matchDate: savedMatch.matchDate || "",
              rosterRows: savedMatch.rosterRows || [],
              selectedPlayer: savedMatch.selectedPlayer || "",
              events: safeEvents,
              reviewQueue: Array.isArray(savedMatch.reviewQueue)
                ? savedMatch.reviewQueue
                : [],
              coachNotes: Array.isArray(savedMatch.coachNotes)
                ? savedMatch.coachNotes
                : [],
              clips: Array.isArray(savedMatch.clips) ? savedMatch.clips : [],
              showRawTranscript:
                typeof savedMatch.showRawTranscript === "boolean"
                  ? savedMatch.showRawTranscript
                  : true,
              videoStoragePath: savedMatch.videoStoragePath,
            })
          );

          return;
        }
      }

      const raw = localStorage.getItem(getScopedStorageKey());
      if (!raw) return;

      const saved = JSON.parse(raw);
      const safeEvents = Array.isArray(saved.events)
        ? saved.events.filter((event: EventItem) => !event.isPending)
        : [];

      setMatchTitle(saved.matchTitle || "");
      setOpponent(saved.opponent || "");
      setMatchDate(saved.matchDate || "");
      setRosterRows(hydrateRosterRows(saved.rosterRows));
      setSelectedPlayer(saved.selectedPlayer || "");
      setEvents(safeEvents);
      setReviewQueue(Array.isArray(saved.reviewQueue) ? saved.reviewQueue : []);
      setCoachNotes(Array.isArray(saved.coachNotes) ? saved.coachNotes : []);
      setActiveMode(
        saved.activeMode === "game-review" ? "game-review" : "stat"
      );
      setShowRawTranscript(
        typeof saved.showRawTranscript === "boolean"
          ? saved.showRawTranscript
          : true
      );
      setVideoStoragePath(saved.videoStoragePath || "");
    } catch (error) {
      console.error("Failed to load saved session", error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getScopedCorrectionKey());
      if (!raw) {
        setLearnedCorrections({});
      } else {
        const saved = JSON.parse(raw);
        setLearnedCorrections(saved || {});
      }
    } catch (error) {
      console.error("Failed to load correction memory", error);
      setLearnedCorrections({});
    }

    try {
      const helpDismissed = localStorage.getItem(HELP_DISMISSED_KEY);
      setShowHelpModal(helpDismissed !== "true");
    } catch (error) {
      console.error("Failed to load help modal state", error);
      setShowHelpModal(true);
    }

    setSquadProfile(getSquadProfile());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        getScopedCorrectionKey(),
        JSON.stringify(learnedCorrections)
      );
    } catch (error) {
      console.error("Failed to save correction memory", error);
    }
  }, [learnedCorrections]);

  useEffect(() => {
    try {
      const persistedEvents = events.filter((event) => !event.isPending);
      const raw = localStorage.getItem(getScopedStorageKey());
      const existingSession = raw ? JSON.parse(raw) : {};

      localStorage.setItem(
        getScopedStorageKey(),
        JSON.stringify({
          activeMode,
          matchTitle,
          opponent,
          matchDate,
          rosterRows,
          selectedPlayer,
          events: persistedEvents,
          reviewQueue,
          coachNotes,
          clips: Array.isArray(existingSession.clips) ? existingSession.clips : [],
          showRawTranscript,
          videoStoragePath: videoStoragePath || existingSession.videoStoragePath,
        })
      );
    } catch (error) {
      console.error("Failed to save session", error);
    }
  }, [
    activeMode,
    matchTitle,
    opponent,
    matchDate,
    rosterRows,
    selectedPlayer,
    events,
    reviewQueue,
    coachNotes,
    showRawTranscript,
    videoStoragePath,
  ]);

  useEffect(() => {
    if (!videoStoragePath || videoLoaded) return;
    const video = videoRef.current;
    if (!video || video.src?.startsWith("blob:")) return;

    let cancelled = false;
    setStatusMessage("Loading match video from cloud...");

    void getMatchVideoSignedUrlWithResult(videoStoragePath, SIGNED_URL_EXPIRY_SECONDS).then(({ url, error }) => {
      if (cancelled || !url || !videoRef.current) {
        if (!url) setStatusMessage(error ? `Could not load video: ${error}` : "Could not load match video from cloud");
        return;
      }

      videoRef.current.src = url;
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.load();
      setStatusMessage("Cloud video loaded");
    });

    return () => {
      cancelled = true;
    };
  }, [playbackRate, videoLoaded, videoStoragePath]);

  useEffect(() => {
    if (playersReady) {
      setShowTeamSheetModal(false);
    }
  }, [playersReady]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (stopTimeoutRef.current) {
        window.clearTimeout(stopTimeoutRef.current);
      }
    };
  }, []);

  // Warn the coach before navigating away while a video upload is in progress.
  useEffect(() => {
    if (videoUploadStatus !== "uploading") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [videoUploadStatus]);

  // Surface cloud sync failures so the coach knows the match didn't reach the cloud.
  useEffect(() => {
    const handler = () => setCloudSyncError("Match saved locally but not synced to cloud. Check your connection.");
    window.addEventListener(CLOUD_SYNC_ERROR_EVENT, handler);
    return () => window.removeEventListener(CLOUD_SYNC_ERROR_EVENT, handler);
  }, []);

  useLayoutEffect(() => {
    const el = transcriptListRef.current;
    if (!el) return;

    const run = () => {
      el.scrollTop = el.scrollHeight;
    };

    run();
    const timeout = window.setTimeout(run, 0);
    return () => window.clearTimeout(timeout);
  }, [events.length, coachNotes.length, pendingResolution, transcribing]);

  const updateRosterRow = (
    number: number,
    field: "name" | "position" | "minutes",
    value: string
  ) => {
    setRosterRows((prev) =>
      prev.map((row) => {
        if (row.number !== number) return row;
        if (field === "name") {
          const needle = value.toLowerCase().trim();
          const matched = squadProfile?.players.find(
            (p) =>
              p.fullName.toLowerCase() === needle ||
              p.preferredName.toLowerCase() === needle ||
              p.nicknames.some((n) => n.toLowerCase() === needle)
          ) ?? null;
          return { ...row, name: value, playerId: matched?.id };
        }
        return {
          ...row,
          [field]:
            field === "minutes"
              ? value === ""
                ? ""
                : Math.max(0, Math.min(120, Number(value) || 0))
              : value,
        };
      })
    );
  };

  const applyPastedTeamSheet = () => {
    if (!teamSheetPaste.trim()) return;
    setRosterRows((prev) => parseTeamSheetText(teamSheetPaste, prev, squadProfile?.players));
    setStatusMessage("Team sheet paste applied");
  };

  const submitTeamSheet = () => {
    const nextRows = teamSheetPaste.trim()
      ? parseTeamSheetText(teamSheetPaste, rosterRows, squadProfile?.players)
      : rosterRows;

    const namedPlayers = nextRows.filter((row) => row.name.trim()).length;

    if (namedPlayers === 0) {
      setStatusMessage("Paste or enter at least one player before continuing");
      return;
    }

    setRosterRows(nextRows);
    setShowTeamSheetModal(false);
    setShowReportBuilder(false);
    blurActiveElement();
    setStatusMessage("Team sheet loaded");
  };

  const closeHelpModal = () => {
    setShowHelpModal(false);

    try {
      localStorage.setItem(HELP_DISMISSED_KEY, "true");
    } catch (error) {
      console.error("Failed to save help modal state", error);
    }
  };

  const reopenHelpModal = () => {
    setShowHelpModal(true);
  };

  const startNewMatch = () => {
    clearMatchVideoSession();
    clearCurrentMatchId();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;

    if (videoRef.current?.src?.startsWith("blob:")) {
      URL.revokeObjectURL(videoRef.current.src);
    }

    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }

    localStorage.removeItem(getScopedStorageKey());
    sessionStorage.removeItem("rugby-tagging-video-src");

    setActiveMode("stat");
    setCurrentMatchId("");
    setMatchTitle("");
    setOpponent("");
    setMatchDate("");
    setRosterRows(hydrateRosterRows(null));
    setSelectedPlayer("");
    setTeamSheetPaste("");
    setTranscriptImportText("");
    setCleanedTranscriptText("");
    setCleanedTranscriptItems([]);
    setTranscriptCleanSummary(null);
    setShowTeamSheetModal(true);
    setShowReportSetupModal(false);
    setEvents([]);
    setVoiceModeEnabled(false);
    setRecording(false);
    setTranscribing(false);
    setCurrentTime(0);
    setShowReportBuilder(false);
    setShowPlayerDrilldownModal(false);
    setDrilldownPlayerName("");
    setStatusMessage("Ready");
    setVideoLoaded(false);
    setVideoStoragePath("");
    videoUploadPromiseRef.current = null;
    pendingVideoFileRef.current = null;
    setMatchSubmitStatus("idle");
    setMatchSubmitError("");
    setPlaybackRate(1);
    setPendingResolution(null);
    setResolverSelection("");
    setResolverCandidates([]);
    setReviewQueue([]);
    setCoachNotes([]);
    setCoachNoteDraft("");
    setCoachRawDraft("");
    setShowCoachRawInput(false);
    setLineoutSide("Own");
    setLineoutResult("Won");
    setLineoutNotes("");
    setScrumSide("Own");
    setScrumResult("Won");
    spacebarHeldRef.current = false;
    blurActiveElement();
  };

  const addEvent = (text: string, timestamp: number, rawText?: string) => {
    const cleaned = cleanTranscriptText(text);

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text: cleaned,
        rawText: rawText?.trim() || undefined,
        category: "player",
      },
    ]);

  };

  const addStructuredPlayerEvent = (
    playerName: string,
    action: PlayerAction,
    timestamp: number,
    rawText?: string,
    secondPlayerName?: string
  ) => {
    const text =
      action === "tackle" && secondPlayerName
        ? `${playerName} + ${secondPlayerName} tackle`
        : `${playerName} ${action}`;

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text: cleanTranscriptText(text),
        rawText: rawText?.trim() || undefined,
        category: "player",
        playerName,
        secondPlayerName: action === "tackle" ? secondPlayerName : undefined,
        playerAction: action,
      },
    ]);

  };

  const addPendingEvent = (timestamp: number) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setEvents((prev) => [
      ...prev,
      {
        id,
        timestamp,
        text: "Processing...",
        rawText: "",
        isPending: true,
        category: "player",
      },
    ]);

    return id;
  };

  const replacePendingEvent = (
    id: number,
    next: {
      text: string;
      rawText?: string;
      isPending?: boolean;
      playerName?: string;
      secondPlayerName?: string;
      playerAction?: PlayerAction;
    }
  ) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? {
              ...event,
              text: cleanTranscriptText(next.text),
              rawText: next.rawText?.trim() || undefined,
              isPending: next.isPending ?? false,
              category: "player",
              playerName: next.playerName,
              secondPlayerName: next.secondPlayerName,
              playerAction: next.playerAction,
            }
          : event
      )
    );
  };

  const removePendingEvent = (id?: number) => {
    if (!id) return;
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const addQuickTag = (action: PlayerAction) => {
    if (!selectedPlayer) {
      setStatusMessage("Select a player first");
      return;
    }

    const timestamp = videoRef.current?.currentTime || currentTime;
    addStructuredPlayerEvent(selectedPlayer, action, timestamp);
    setStatusMessage(`Quick tag added: ${selectedPlayer} ${action}`);
  };

  const addSetPieceEvent = () => {
    const timestamp = videoRef.current?.currentTime || currentTime;
    const text = buildSetPieceText({
      setPieceType: "lineout",
      setPieceSide: lineoutSide,
      lineoutResult,
      notes: lineoutNotes,
    });

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text,
        category: "set-piece",
        setPieceType: "lineout",
        setPieceSide: lineoutSide,
        lineoutResult,
        notes: lineoutNotes.trim() || undefined,
      },
    ]);

    setLineoutNotes("");
    setStatusMessage("Lineout logged");
  };

  const addScrumEvent = () => {
    const timestamp = videoRef.current?.currentTime || currentTime;
    const text = buildSetPieceText({
      setPieceType: "scrum",
      setPieceSide: scrumSide,
      scrumResult,
    });

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text,
        category: "set-piece",
        setPieceType: "scrum",
        setPieceSide: scrumSide,
        scrumResult,
      },
    ]);

    setStatusMessage("Scrum logged");
  };

  const addTeamEvent = (type: TeamEventType, playerName?: string) => {
    const timestamp = videoRef.current?.currentTime || currentTime;
    const text = buildTeamEventText(type, playerName);

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text,
        category: "team",
        teamEventType: type,
        ...(playerName ? { playerName } : {}),
      },
    ]);

    setStatusMessage(`${text} logged`);
  };

  const addMilestoneEvent = (type: MilestoneType) => {
    const timestamp = videoRef.current?.currentTime || currentTime;
    const text = buildMilestoneEventText(type);

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text,
        category: "milestone",
        milestoneType: type,
      },
    ]);

    setStatusMessage(`${text} logged`);
  };

  const addSubstitutionEvent = (playerNumber: number, position: string) => {
    const player = rosterRows.find((r) => r.number === playerNumber);
    if (!player) return;
    const timestamp = videoRef.current?.currentTime || currentTime;
    const text = `${player.name} on (${position})`;

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text,
        category: "substitution",
        substitutionPlayerOn: player.name,
        substitutionPosition: position,
      },
    ]);

    updateRosterRow(playerNumber, "position", position);
    setStatusMessage(`${player.name} brought on at ${position}`);
  };

  const addCoachNote = () => {
    if (!coachNoteDraft.trim() && !coachRawDraft.trim()) {
      setStatusMessage("Add a coaching note before saving");
      return;
    }

    const timestamp = videoRef.current?.currentTime || currentTime;

    setCoachNotes((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text: cleanTranscriptText(coachNoteDraft.trim() || "Coaching note"),
        rawText: coachRawDraft.trim() || undefined,
      },
    ]);

    setCoachNoteDraft("");
    setCoachRawDraft("");
    setStatusMessage("Coach note saved");
  };

  const deleteCoachNote = (id: number) => {
    setCoachNotes((prev) => prev.filter((note) => note.id !== id));
    setStatusMessage("Coach note deleted");
  };

  const undoLast = () => {
    setEvents((prev) => prev.slice(0, -1));
    setStatusMessage("Last tag removed");
  };

  const updateEvent = (id: number, newText: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? { ...event, text: cleanTranscriptText(newText) }
          : event
      )
    );
  };

  const deleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    setStatusMessage("Tag deleted");
  };

  const addToReviewQueue = (
    rawText: string,
    guessedText: string,
    timestamp: number,
    selectedAction: ReviewItem["selectedAction"]
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const closest = getClosestPlayers(rawText, players, 1);

    setReviewQueue((prev) => [
      ...prev,
      {
        id,
        rawText,
        guessedText,
        timestamp,
        selectedPlayer: closest[0] || "",
        selectedAction,
      },
    ]);
  };

  const updateReviewItem = (id: number, updates: Partial<ReviewItem>) => {
    setReviewQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const saveReviewItem = (
    item: ReviewItem,
    options?: { applyToAllMatching?: boolean }
  ) => {
    const selectedAction = item.selectedAction;
    const selectedPlayer = item.selectedPlayer || "";
    const normalizedRawText = (item.rawText || "").trim();

    if (!selectedAction) {
      setStatusMessage("Choose an action before saving the review item");
      return;
    }

    const matchingItems =
      options?.applyToAllMatching && normalizedRawText
        ? reviewQueue.filter(
            (reviewItem) =>
              (reviewItem.rawText || "").trim() === normalizedRawText
          )
        : [item];

    if (normalizedRawText) {
      rememberCorrection(normalizedRawText, selectedPlayer, selectedAction);
    }

    matchingItems.forEach((reviewItem) => {
      const reviewRawText = (reviewItem.rawText || "").trim();

      if (selectedPlayer) {
        addStructuredPlayerEvent(
          selectedPlayer,
          selectedAction,
          reviewItem.timestamp,
          reviewRawText || undefined,
          selectedAction === "tackle" ? item.secondPlayerName : undefined
        );
      } else {
        addEvent(
          selectedAction,
          reviewItem.timestamp,
          reviewRawText || undefined
        );
      }
    });

    const matchingIds = new Set(
      matchingItems.map((reviewItem) => reviewItem.id)
    );

    setReviewQueue((prev) =>
      prev.filter((reviewItem) => !matchingIds.has(reviewItem.id))
    );

    setStatusMessage(
      options?.applyToAllMatching
        ? `Saved ${matchingItems.length} matching review item${
            matchingItems.length === 1 ? "" : "s"
          }`
        : "Review item saved"
    );
  };

  const skipReviewItem = (id: number) => {
    setReviewQueue((prev) => prev.filter((x) => x.id !== id));
    setStatusMessage("Review item skipped");
  };

  const triggerVideoUpload = (file: File, matchId: string): Promise<VideoUploadResult> => {
    setVideoUploadStatus("uploading");
    setVideoUploadPercent(0);
    setVideoUploadError("");
    const pathTitle = [matchTitle, opponent && `vs_${opponent}`, matchDate].filter(Boolean).join("_") || undefined;
    const uploadPromise = uploadMatchVideoWithResult(matchId, file, (p) => setVideoUploadPercent(p.percent), pathTitle)
      .then((result) => {
        if (result.storagePath) {
          setVideoStoragePath(result.storagePath);
          pendingVideoFileRef.current = null;
          const saved = getSavedMatchById(matchId);
          if (saved) {
            const previousStoragePath = saved.videoStoragePath;
            upsertSavedMatch({ ...saved, videoStoragePath: result.storagePath });
            if (previousStoragePath && previousStoragePath !== result.storagePath) {
              void deleteMatchVideo(previousStoragePath).then((deleteResult) => {
                if (!deleteResult.ok) console.error("Failed to delete previous match video", deleteResult.error);
              });
            }
          }
          setVideoUploadStatus("uploaded");
        } else {
          setVideoUploadError(result.error ?? "Video upload failed");
          setVideoUploadStatus("error");
        }
        return result;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Video upload failed";
        setVideoUploadError(message);
        setVideoUploadStatus("error");
        return { storagePath: null, error: message };
      })
      .finally(() => {
        videoUploadPromiseRef.current = null;
      });

    videoUploadPromiseRef.current = uploadPromise;
    return uploadPromise;
  };

  const buildCurrentMatchRecord = (
    matchId: string,
    nowIso: string,
    nextVideoStoragePath?: string
  ): SavedMatchRecord => {
    const persistedEvents = events.filter((event) => !event.isPending);
    const existing = getSavedMatchById(matchId);

    return {
      id: matchId,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      matchTitle: matchTitle.trim(),
      opponent: opponent.trim(),
      matchDate: matchDate.trim(),
      activeMode,
      rosterRows,
      selectedPlayer,
      events: persistedEvents,
      reviewQueue,
      coachNotes,
      showRawTranscript,
      videoStoragePath: nextVideoStoragePath || videoStoragePath || existing?.videoStoragePath,
    };
  };

  const saveCurrentMatchRecord = (nextVideoStoragePath?: string) => {
    const matchId = currentMatchId || createMatchId();
    const nowIso = new Date().toISOString();
    const record = buildCurrentMatchRecord(matchId, nowIso, nextVideoStoragePath);

    upsertSavedMatch(record);

    persistCurrentMatchId(matchId);
    setCurrentMatchId(matchId);

    // Upload pending video file if we now have a matchId and upload hasn't started
    if (pendingVideoFileRef.current && videoUploadStatus === "idle") {
      triggerVideoUpload(pendingVideoFileRef.current, matchId);
      pendingVideoFileRef.current = null;
    }

    return matchId;
  };

  const submitMatch = async () => {
    if (reviewQueue.length > 0) {
      setStatusMessage(
        `Resolve ${reviewQueue.length} review item${
          reviewQueue.length === 1 ? "" : "s"
        } before submitting the match`
      );
      return;
    }

    if (!playersReady) {
      setStatusMessage("Add a team sheet before submitting the match");
      return;
    }

    setMatchSubmitStatus("submitting");
    setMatchSubmitError("");
    setStatusMessage("Submitting match to the team...");

    const matchId = currentMatchId || createMatchId();
    persistCurrentMatchId(matchId);
    setCurrentMatchId(matchId);

    let submittedVideoStoragePath = videoStoragePath || getSavedMatchById(matchId)?.videoStoragePath || "";

    if (pendingVideoFileRef.current && !videoUploadPromiseRef.current) {
      videoUploadPromiseRef.current = triggerVideoUpload(pendingVideoFileRef.current, matchId);
    }

    if (videoUploadPromiseRef.current) {
      const uploadResult = await videoUploadPromiseRef.current;
      if (!uploadResult.storagePath) {
        const message = uploadResult.error || "Video upload failed";
        setMatchSubmitError(message);
        setMatchSubmitStatus("error");
        setStatusMessage(`Match not submitted - ${message}`);
        return;
      }
      submittedVideoStoragePath = uploadResult.storagePath;
    }

    const nowIso = new Date().toISOString();
    const record = buildCurrentMatchRecord(matchId, nowIso, submittedVideoStoragePath);
    upsertSavedMatch(record);

    const result = await upsertCloudSavedMatch(record);
    if (!result.ok) {
      const message = result.error || "Cloud save failed";
      setMatchSubmitError(message);
      setMatchSubmitStatus("error");
      setStatusMessage(`Match saved locally but not submitted - ${message}`);
      return;
    }

    setVideoStoragePath(submittedVideoStoragePath);
    setMatchSubmitStatus("submitted");
    setStatusMessage("Match submitted to your team");
  };

  const openTeamReview = () => {
    saveCurrentMatchRecord();
    setShowReportSetupModal(false);
    setShowReportBuilder(false);
    setStatusMessage("Saved match and opening team review");
    router.push("/coach/review");
  };

  const openTeamAnalytics = () => {
    saveCurrentMatchRecord();
    setShowReportSetupModal(false);
    setShowReportBuilder(false);
    setStatusMessage("Saved match and opening team analytics");
    router.push("/coach/insights");
  };

  const openPlayerDrilldown = (playerName: string) => {
    if (!playerName) {
      setStatusMessage("Select a player first");
      return;
    }

    setDrilldownPlayerName(playerName);
    setShowPlayerDrilldownModal(true);
    setStatusMessage(`Opened ${playerName} breakdown`);
  };

  const duckVideoAudio = () => {
    if (videoRef.current) {
      originalVideoVolumeRef.current = videoRef.current.volume;
      videoRef.current.volume = 0.1;
    }
  };

  const restoreVideoAudio = () => {
    if (videoRef.current) {
      videoRef.current.volume = originalVideoVolumeRef.current;
    }
  };

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video || !videoLoaded) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const jumpVideoBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) {
      setStatusMessage("Load a video first");
      return;
    }

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const nextTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, duration || video.currentTime + seconds)
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setStatusMessage(
      seconds < 0 ? "Skipped back 5 seconds" : "Skipped forward 5 seconds"
    );
  };

  const changePlaybackRate = (nextRate: number) => {
    const video = videoRef.current;
    if (!video) {
      setStatusMessage("Load a video first");
      return;
    }

    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    setStatusMessage(`Playback speed set to ${nextRate}x`);
  };

  const getLearnedCorrection = (rawText: string) => {
    const key = normalizeCorrectionKey(rawText);
    return learnedCorrections[key] ?? null;
  };

  const rememberCorrection = (rawText: string, playerName: string, action: PlayerAction | "") => {
    const key = normalizeCorrectionKey(rawText);
    if (!key) return;

    setLearnedCorrections((prev) => ({
      ...prev,
      [key]: { playerName: playerName.trim(), action },
    }));
  };

  const startVoiceMode = async () => {
    try {
      if (activeMode !== "stat") {
        setStatusMessage("Voice tagging is only available in Stat Mode right now");
        return;
      }

      if (voiceModeEnabled) return;

      if (!playersReady) {
        setStatusMessage("Add team sheet before using voice mode");
        return;
      }

      if (!videoLoaded) {
        setStatusMessage("Upload a match video before using voice mode");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatusMessage("This browser does not support microphone access");
        return;
      }

      const safeMimeType = getSafeRecorderMimeType();
      if (!safeMimeType) {
        setStatusMessage(
          "This browser/device does not support safe audio recording"
        );
        return;
      }

      blurActiveElement();
      pageShellRef.current?.focus();
      setStatusMessage("Starting voice mode...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setVoiceModeEnabled(true);
      window.focus();
      pageShellRef.current?.focus();
      setStatusMessage("Voice mode ready - hold Spacebar to talk");
    } catch (error) {
      console.error(error);
      setStatusMessage("Microphone access denied or unavailable");
    }
  };

  const endVoiceMode = () => {
    if (recording || transcribing) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    spacebarHeldRef.current = false;
    setVoiceModeEnabled(false);
    setStatusMessage("Voice mode ended");
  };

  const commitResolvedTag = () => {
    if (!pendingResolution) return;

    const isDoubleTackle =
      pendingResolution.action === "tackle" && !!resolverSecondSelection;
    const finalText = resolverSelection
      ? isDoubleTackle
        ? `${resolverSelection} + ${resolverSecondSelection} tackle`
        : `${resolverSelection} ${pendingResolution.action}`
      : pendingResolution.action;

    rememberCorrection(pendingResolution.rawText, resolverSelection, pendingResolution.action);

    if (pendingResolution.pendingEventId) {
      replacePendingEvent(pendingResolution.pendingEventId, {
        text: finalText,
        rawText: pendingResolution.rawText,
        isPending: false,
        playerName: resolverSelection || undefined,
        secondPlayerName: isDoubleTackle ? resolverSecondSelection : undefined,
        playerAction: pendingResolution.action,
      });
    } else if (resolverSelection) {
      addStructuredPlayerEvent(
        resolverSelection,
        pendingResolution.action,
        pendingResolution.timestamp,
        pendingResolution.rawText,
        isDoubleTackle ? resolverSecondSelection : undefined
      );
    } else {
      addEvent(finalText, pendingResolution.timestamp, pendingResolution.rawText);
    }

    setPendingResolution(null);
    setResolverSelection("");
    setResolverSecondSelection("");
    setResolverCandidates([]);
    setStatusMessage("Tag confirmed");
  };

  const movePendingResolutionToReview = () => {
    if (!pendingResolution) return;

    if (pendingResolution.pendingEventId) {
      removePendingEvent(pendingResolution.pendingEventId);
    }

    addToReviewQueue(
      pendingResolution.rawText,
      pendingResolution.guessedText,
      pendingResolution.timestamp,
      pendingResolution.action
    );

    setPendingResolution(null);
    setResolverSelection("");
    setResolverSecondSelection("");
    setResolverCandidates([]);
    setStatusMessage("Previous unresolved tag moved to review");
  };

  const startPushToTalkRecording = () => {
    if (
      activeMode !== "stat" ||
      !voiceModeEnabled ||
      recording ||
      transcribing ||
      !streamRef.current
    ) {
      return;
    }

    if (pendingResolution) {
      movePendingResolutionToReview();
    }

    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      const safeMimeType = getSafeRecorderMimeType();
      if (!safeMimeType) {
        setStatusMessage(
          "Safe recording format not supported on this device/browser"
        );
        return;
      }

      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: safeMimeType,
      });

      audioChunksRef.current = [];
      timestampAtRecordingStartRef.current =
        videoRef.current?.currentTime || currentTime;

      duckVideoAudio();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const pendingEventId = addPendingEvent(
          timestampAtRecordingStartRef.current
        );

        try {
          setTranscribing(true);
          setStatusMessage("Processing last tag...");
          restoreVideoAudio();

          const blob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          const file = new File([blob], "tag.webm", {
            type: "audio/webm",
          });

          if (file.size === 0) {
            removePendingEvent(pendingEventId);
            setStatusMessage("No audio captured");
            return;
          }

          const formData = new FormData();
          formData.append("audio", file);
          formData.append("players", enhancedPlayersText);

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data: VoiceResponse = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Transcription request failed");
          }

          const rawText = data.rawText?.trim() || "";
          const cleanedText = data.text?.trim() || "";
          const parsed = data.parsed || null;

          const learned = getLearnedCorrection(rawText);

          if (learned) {
            const learnedText = learned.playerName
              ? `${learned.playerName} ${learned.action}`
              : learned.action;

            replacePendingEvent(pendingEventId, {
              text: cleanTranscriptText(learnedText),
              rawText,
              isPending: false,
              playerName: learned.playerName || undefined,
              playerAction: learned.action || undefined,
            });
            setStatusMessage(`Tag added: ${cleanTranscriptText(learnedText)}`);
            return;
          }

          if (!cleanedText) {
            removePendingEvent(pendingEventId);
            setStatusMessage(
              "No speech detected - hold Spacebar, speak clearly, then release"
            );
            return;
          }

          const hasKnownAction = !!parsed && parsed.action !== "unknown";

          // Step 3: resolve GPT's parsed.player through squad
          const resolvedPlayerName =
            squadProfile && parsed?.player
              ? resolvePlayerName(squadProfile, parsed.player)
              : null;

          // Step 4a: scan rawText tokens against squad for candidates
          const squadCandidates: string[] = [];
          if (squadProfile) {
            const tokens = normalizeForMatch(rawText).split(" ").filter(Boolean);
            for (const token of tokens) {
              if (token.length < 2) continue;
              const found = resolvePlayerName(squadProfile, token);
              if (found && players.includes(found) && !squadCandidates.includes(found)) {
                squadCandidates.push(found);
              }
            }
          }

          // Step 4b: if GPT found no player but token scan found exactly one, promote it
          const tokenResolvedName =
            !resolvedPlayerName && !parsed?.player && squadCandidates.length === 1
              ? squadCandidates[0]
              : null;

          const effectivePlayerName =
            resolvedPlayerName ?? tokenResolvedName ?? parsed?.player ?? undefined;

          const parsedPlayerIsValid =
            !!resolvedPlayerName ||
            !!tokenResolvedName ||
            (!!parsed?.player && players.includes(parsed.player));

          const highEnoughConfidence =
            parsed?.confidence === "high" || parsed?.confidence === "medium";

          const backendCandidates = (parsed?.candidate_players || []).filter(
            (name) => players.includes(name)
          );
          const frontendCandidates = getClosestPlayers(rawText, players, 3);
          const mergedCandidates = mergeUniqueCandidates(
            squadCandidates,
            backendCandidates,
            frontendCandidates
          );

          if (hasKnownAction && parsedPlayerIsValid && highEnoughConfidence) {
            const effectiveText =
              (resolvedPlayerName || tokenResolvedName) &&
              parsed?.action &&
              parsed.action !== "unknown"
                ? `${resolvedPlayerName ?? tokenResolvedName} ${parsed.action}`
                : cleanedText;

            replacePendingEvent(pendingEventId, {
              text: effectiveText,
              rawText,
              isPending: false,
              playerName: effectivePlayerName,
              playerAction: parsed?.action as PlayerAction,
            });
            setStatusMessage(`Tag added: ${effectiveText}`);
          } else if (hasKnownAction && mergedCandidates.length > 0) {
            setPendingResolution({
              rawText,
              guessedText: cleanedText,
              timestamp: timestampAtRecordingStartRef.current,
              action: parsed!.action as PlayerAction,
              pendingEventId,
              confidence: parsed?.confidence,
            });
            setResolverCandidates(mergedCandidates);
            setResolverSelection(mergedCandidates[0] || "");
            setResolverSecondSelection(
              parsed!.action === "tackle" && squadCandidates.length >= 2
                ? squadCandidates[1]
                : ""
            );
            setStatusMessage("Please confirm player");
          } else {
            removePendingEvent(pendingEventId);
            addToReviewQueue(
              rawText,
              cleanedText || rawText,
              timestampAtRecordingStartRef.current,
              hasKnownAction
                ? (parsed!.action as ReviewItem["selectedAction"])
                : ""
            );
            setStatusMessage("Added to review queue");
          }
        } catch (error) {
          removePendingEvent(pendingEventId);
          console.error(error);
          setStatusMessage(
            error instanceof Error ? error.message : "Transcription failed"
          );
        } finally {
          setRecording(false);
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatusMessage("Recording - release Spacebar to submit tag");
    } catch (error) {
      console.error(error);
      restoreVideoAudio();
      setStatusMessage("Could not start recording on this browser/device");
    }
  };

  const stopPushToTalkRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
    }

    stopTimeoutRef.current = window.setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTimeoutRef.current = null;
    }, 250);
  };

  const handleCopyStatsSummary = async () => {
    const success = await copyTextToClipboard(statsSummaryText);
    setStatusMessage(
      success ? "Stats summary copied" : "Could not copy stats summary"
    );
  };

  const downloadTranscript = () => {
    const lines = [...events]
      .filter((event) => !event.isPending)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((event) => `[${formatTime(event.timestamp)}] ${event.text}`);

    const content = [
      matchTitle || "Match Transcript",
      opponent ? `Opponent: ${opponent}` : "",
      matchDate ? `Date: ${matchDate}` : "",
      "",
      ...lines,
    ]
      .filter(Boolean)
      .join("\n");

    downloadFile(
      `${(matchTitle || "match-transcript")
        .replace(/\s+/g, "-")
        .toLowerCase()}.txt`,
      content,
      "text/plain;charset=utf-8"
    );
    setStatusMessage("Transcript downloaded");
  };

  const downloadCoachNotes = () => {
    const lines = [...coachNotes]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((note) => {
        const main = `[${formatTime(note.timestamp)}] ${note.text}`;
        const raw = note.rawText ? `\nRaw: ${note.rawText}` : "";
        return `${main}${raw}`;
      });

    const content = [
      matchTitle || "Coach Review Notes",
      opponent ? `Opponent: ${opponent}` : "",
      matchDate ? `Date: ${matchDate}` : "",
      "",
      ...lines,
    ]
      .filter(Boolean)
      .join("\n");

    downloadFile(
      `${(matchTitle || "coach-review-notes")
        .replace(/\s+/g, "-")
        .toLowerCase()}.txt`,
      content,
      "text/plain;charset=utf-8"
    );
    setStatusMessage("Coach notes downloaded");
  };

  const parseTranscriptTimestampFromLine = (line: string) => {
    const match = line.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*-?\s*/);
    if (!match) {
      return { timestamp: 0, text: line, hadTimestamp: false };
    }

    const first = Number(match[1]);
    const second = Number(match[2]);
    const third = match[3] ? Number(match[3]) : null;

    const timestamp =
      third === null ? first * 60 + second : first * 3600 + second * 60 + third;

    return {
      timestamp,
      text: line.slice(match[0].length).trim(),
      hadTimestamp: true,
    };
  };

  const detectTranscriptAction = (text: string): PlayerAction | "" => {
    const normalized = normalizeForMatch(text);

    if (
      normalized.includes("missed tackle") ||
      normalized.includes("miss tackle")
    ) {
      return "missed tackle";
    }
    if (normalized.includes("turnover")) {
      return "turnover";
    }
    if (
      normalized.includes("carry") ||
      normalized.includes("carries") ||
      normalized.includes("carried")
    ) {
      return "carry";
    }
    if (normalized.includes("tackle")) {
      return "tackle";
    }

    return "";
  };

  const findTranscriptPlayerMatch = (text: string) => {
    const direct = findMatchingPlayer(players, text);
    if (direct) return direct;

    const normalizedText = normalizeForMatch(text);

    for (const player of players) {
      const normalizedPlayer = normalizeForMatch(player);
      if (!normalizedPlayer) continue;

      if (normalizedText.includes(normalizedPlayer)) {
        return player;
      }

      const firstName = normalizedPlayer.split(" ")[0];
      if (firstName && firstName.length >= 3 && normalizedText.includes(firstName)) {
        return player;
      }
    }

    return "";
  };

  const parseTranscriptLineToEvent = (
    line: string,
    index: number
  ):
    | {
        type: "event";
        event: EventItem;
        cleanedLine: string;
      }
    | {
        type: "review";
        reviewItem: ReviewItem;
        cleanedLine: string;
      } => {
    const { timestamp, text } = parseTranscriptTimestampFromLine(line);
    const cleanedText = cleanTranscriptText(text);
    const normalized = normalizeForMatch(cleanedText);
    const action = detectTranscriptAction(cleanedText);
    const matchedPlayer = findTranscriptPlayerMatch(cleanedText);
    const eventId = Date.now() + index;

    if (matchedPlayer && action) {
      const finalText = `${matchedPlayer} ${action}`;
      return {
        type: "event",
        cleanedLine: `[${formatTime(timestamp)}] ${finalText}`,
        event: {
          id: eventId,
          timestamp,
          text: cleanTranscriptText(finalText),
          rawText: cleanedText,
          category: "player",
          playerName: matchedPlayer,
          playerAction: action,
        },
      };
    }

    if (
      normalized.includes("scrum") &&
      (normalized.includes("won") ||
        normalized.includes("lost") ||
        normalized.includes("penalty for") ||
        normalized.includes("penalty against") ||
        normalized.includes("penalty to"))
    ) {
      const setPieceSide: SetPieceSide =
        normalized.includes("opposition") ? "Opposition" : "Own";

      let scrumDetectedResult: ScrumResult = "Won";
      if (normalized.includes("penalty for")) {
        scrumDetectedResult = "Penalty For";
      } else if (
        normalized.includes("penalty against") ||
        normalized.includes("penalty to opposition") ||
        normalized.includes("opposition penalty")
      ) {
        scrumDetectedResult = "Penalty Against";
      } else if (normalized.includes("lost")) {
        scrumDetectedResult = "Lost";
      }

      const finalText = buildSetPieceText({
        setPieceType: "scrum",
        setPieceSide,
        scrumResult: scrumDetectedResult,
      });

      return {
        type: "event",
        cleanedLine: `[${formatTime(timestamp)}] ${finalText}`,
        event: {
          id: eventId,
          timestamp,
          text: finalText,
          rawText: cleanedText,
          category: "set-piece",
          setPieceType: "scrum",
          setPieceSide,
          scrumResult: scrumDetectedResult,
        },
      };
    }

    if (
      normalized.includes("lineout") &&
      (normalized.includes("won") ||
        normalized.includes("lost") ||
        normalized.includes("not straight"))
    ) {
      const setPieceSide: SetPieceSide =
        normalized.includes("opposition") ? "Opposition" : "Own";

      let detectedLineoutResult: LineoutResult = "Won";
      if (normalized.includes("not straight")) {
        detectedLineoutResult = "Not Straight";
      } else if (normalized.includes("lost")) {
        detectedLineoutResult = "Lost";
      }

      const notes = normalized.includes("front")
        ? "Front"
        : normalized.includes("middle")
        ? "Middle"
        : normalized.includes("back")
        ? "Back"
        : "";

      const finalText = buildSetPieceText({
        setPieceType: "lineout",
        setPieceSide,
        lineoutResult: detectedLineoutResult,
        notes,
      });

      return {
        type: "event",
        cleanedLine: `[${formatTime(timestamp)}] ${finalText}`,
        event: {
          id: eventId,
          timestamp,
          text: finalText,
          rawText: cleanedText,
          category: "set-piece",
          setPieceType: "lineout",
          setPieceSide,
          lineoutResult: detectedLineoutResult,
          notes: notes || undefined,
        },
      };
    }

    if (
      normalized.includes("penalty") &&
      !normalized.includes("scrum") &&
      !normalized.includes("lineout")
    ) {
      const finalText = buildTeamEventText("penalty conceded");

      return {
        type: "event",
        cleanedLine: `[${formatTime(timestamp)}] ${finalText}`,
        event: {
          id: eventId,
          timestamp,
          text: finalText,
          rawText: cleanedText,
          category: "team",
          teamEventType: "penalty conceded",
        },
      };
    }

    if (normalized.includes("try scored")) {
      const finalText = buildTeamEventText("try scored");

      return {
        type: "event",
        cleanedLine: `[${formatTime(timestamp)}] ${finalText}`,
        event: {
          id: eventId,
          timestamp,
          text: finalText,
          rawText: cleanedText,
          category: "team",
          teamEventType: "try scored",
        },
      };
    }

    if (
      normalized.includes("try conceded") ||
      normalized.includes("opposition try")
    ) {
      const finalText = buildTeamEventText("try conceded");

      return {
        type: "event",
        cleanedLine: `[${formatTime(timestamp)}] ${finalText}`,
        event: {
          id: eventId,
          timestamp,
          text: finalText,
          rawText: cleanedText,
          category: "team",
          teamEventType: "try conceded",
        },
      };
    }

    return {
      type: "review",
      cleanedLine: `[${formatTime(timestamp)}] ${cleanedText}`,
      reviewItem: {
        id: Date.now() + 100000 + index,
        rawText: cleanedText,
        guessedText: cleanedText,
        timestamp,
        selectedPlayer: matchedPlayer || "",
        selectedAction: action,
      },
    };
  };

  const cleanTranscriptForImport = () => {
    if (!transcriptImportText.trim()) {
      setStatusMessage("Paste or upload a transcript first");
      return;
    }

    if (!playersReady) {
      setStatusMessage("Load the team sheet before cleaning a transcript");
      return;
    }

    const lines = transcriptImportText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setStatusMessage("No transcript lines found");
      return;
    }

    let matchedLines = 0;
    let reviewLikelyLines = 0;

    const parsedItems = lines.map((line, index) => {
      const parsed = parseTranscriptLineToEvent(line, index);

      if (parsed.type === "event") {
        matchedLines += 1;
      } else {
        reviewLikelyLines += 1;
      }

      return parsed;
    });

    const cleanedLines = parsedItems.map((item) => item.cleanedLine);

    setCleanedTranscriptItems(parsedItems);
    setCleanedTranscriptText(cleanedLines.join("\n"));
    setTranscriptCleanSummary({
      originalLines: lines.length,
      cleanedLines: cleanedLines.length,
      matchedLines,
      reviewLikelyLines,
    });
    setStatusMessage("Transcript cleaned and ready to import");
  };

  const importTranscriptText = (input: string) => {
    if (!input.trim() && cleanedTranscriptItems.length === 0) {
      setStatusMessage("Paste or upload a transcript first");
      return;
    }

    if (!playersReady) {
      setStatusMessage("Load the team sheet before importing a transcript");
      return;
    }

    const nextEvents: EventItem[] = [];
    const nextReviewItems: ReviewItem[] = [];

    if (cleanedTranscriptItems.length > 0) {
      cleanedTranscriptItems.forEach((item) => {
        if (item.type === "event") {
          nextEvents.push(item.event);
        } else {
          nextReviewItems.push(item.reviewItem);
        }
      });
    } else {
      const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setStatusMessage("No transcript lines found");
        return;
      }

      lines.forEach((line, index) => {
        const parsed = parseTranscriptLineToEvent(line, index);

        if (parsed.type === "event") {
          nextEvents.push(parsed.event);
        } else {
          nextReviewItems.push(parsed.reviewItem);
        }
      });
    }

    setEvents((prev) => [...prev, ...nextEvents]);
    setReviewQueue((prev) => [...prev, ...nextReviewItems]);
    setCleanedTranscriptItems([]);
    setCleanedTranscriptText("");
    setTranscriptCleanSummary(null);

    setStatusMessage(
      `Transcript imported: ${nextEvents.length} event${
        nextEvents.length === 1 ? "" : "s"
      } added, ${nextReviewItems.length} line${
        nextReviewItems.length === 1 ? "" : "s"
      } sent to review`
    );
  };

  

  useEffect(() => {
    const isSpacebar = (event: KeyboardEvent) =>
      event.code === "Space" || event.key === " ";

    // Only treat real text-entry fields as "typing" — NOT buttons, selects, etc.
    const isTypingField = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return false;

      const tag = target.tagName;

      if (tag === "TEXTAREA") return true;

      if (tag === "INPUT") {
        const inputType = (target as HTMLInputElement).type?.toLowerCase();
        // Text-like inputs where spacebar should type a space
        const textLikeTypes = [
          "text",
          "search",
          "email",
          "url",
          "tel",
          "password",
          "number",
        ];
        return textLikeTypes.includes(inputType || "text");
      }

      // Contenteditable divs / rich text
      if (target.isContentEditable) return true;

      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z: undo last tag
      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        if (isTypingField(event)) return;
        event.preventDefault();
        undoLast();
        return;
      }

      if (!isSpacebar(event)) return;

      // If the user is typing in a text field, let spacebar work normally.
      if (isTypingField(event)) return;

      // If a setup modal is open, let spacebar work normally.
      if (showTeamSheetModal || showReportSetupModal) return;

      // From here on, spacebar is OUR key. Kill the browser's default
      // behaviour (page scroll + button re-click on focused elements)
      // BEFORE any other logic.
      event.preventDefault();
      event.stopPropagation();
      blurActiveElement();

      // Voice recording logic runs only if voice mode is armed.
      if (activeMode !== "stat") return;
      if (!voiceModeEnabled) return;
      if (event.repeat) return;
      if (spacebarHeldRef.current) return;

      pageShellRef.current?.focus();
      spacebarHeldRef.current = true;
      startPushToTalkRecording();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isSpacebar(event)) return;
      if (isTypingField(event)) return;
      if (showTeamSheetModal || showReportSetupModal) return;

      event.preventDefault();
      event.stopPropagation();
      blurActiveElement();

      if (activeMode !== "stat") return;
      if (!voiceModeEnabled) return;

      spacebarHeldRef.current = false;
      stopPushToTalkRecording();
    };

    const handleWindowBlur = () => {
      spacebarHeldRef.current = false;
      stopPushToTalkRecording();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, voiceModeEnabled, showTeamSheetModal, showReportSetupModal, recording, transcribing, pendingResolution]);

  return (
    <main
      ref={pageShellRef}
      tabIndex={-1}
      className="min-h-screen bg-background px-4 py-5 text-foreground outline-none sm:px-6 lg:px-8"
    >
      <TeamSheetModal
        show={showTeamSheetModal}
        teamSheetPaste={teamSheetPaste}
        rosterRows={rosterRows}
        onTeamSheetPasteChange={setTeamSheetPaste}
        onUpdateRosterRow={updateRosterRow}
        onApplyPastedTeamSheet={applyPastedTeamSheet}
        onSubmitTeamSheet={submitTeamSheet}
        onSkip={() => setShowTeamSheetModal(false)}
      />

      <MatchReportModal
        show={showReportBuilder}
        matchTitle={matchTitle}
        opponent={opponent}
        matchDate={matchDate}
        gameCoachingComment={gameCoachingComment}
        gameFlowSummary={gameFlowSummary}
        unitSummaryRows={unitSummaryRows}
        reportRows={reportRows}
        forwardsRows={forwardsRows}
        lineoutEvents={events.filter(
          (e) => e.category === "set-piece" && e.setPieceType === "lineout"
        )}
        onClose={() => setShowReportBuilder(false)}
        onOpenPlayer={(playerName) => {
          setShowReportBuilder(false);
          openPlayerDrilldown(playerName);
        }}
      />

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-foreground-strong">
                Welcome to the Rugby Analysis beta
              </h2>
              <p className="mt-2 text-sm text-muted">
                This is an early coach beta built for desktop and laptop use. It is designed to help coaches tag matches, review video, and build player and team analysis faster.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-panel-2 p-4">
                <h3 className="text-base font-semibold text-foreground-strong">
                  What this app currently does
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>• Upload a match video and review it inside the app</li>
                  <li>• Build a team sheet and match-day roster</li>
                  <li>• Tag player events such as tackles, missed tackles, carries, and turnovers</li>
                  <li>• Import transcript text from pasted notes or a .txt file</li>
                  <li>• Log lineouts, scrums, penalties, and tries</li>
                  <li>• Open separate Team Review, Team Analytics, and Player Dashboard screens</li>
                  <li>• Save and reopen matches on the same browser and device</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-panel-2 p-4">
                <h3 className="text-base font-semibold text-foreground-strong">
                  Best workflow
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>• Start by loading your team sheet</li>
                  <li>• Add match title, opponent, and date</li>
                  <li>• Upload the match video</li>
                  <li>• Use Stat Mode for tagging player and team events</li>
                  <li>• Use Game Review Mode for coaching notes and phase review</li>
                  <li>• Resolve anything in Needs Review before submitting the report</li>
                  <li>• Then open Team Review or Team Analytics</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-panel-2 p-4">
                <h3 className="text-base font-semibold text-foreground-strong">
                  Important beta limitations
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>• Saved matches are currently stored in the browser on the same device only</li>
                  <li>• Match records sync to your coach account; video files stay on this device</li>
                  <li>• Player share links and multi-user team access are not live yet</li>
                  <li>• Transcript import works, but untimed lines currently import at 0:00</li>
                  <li>• Voice tagging is still a beta workflow and works best with a clear microphone and reduced background noise</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-panel-2 p-4">
                <h3 className="text-base font-semibold text-foreground-strong">
                  Best practices
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>• Use on desktop or laptop rather than mobile</li>
                  <li>• Keep match names clear so saved matches are easy to find</li>
                  <li>• Check player minutes before opening the next screen</li>
                  <li>• Review transcript lines and correction items before final analysis</li>
                  <li>• Use this as a working beta tool, not yet as a final shared player platform</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-panel-2 p-4">
              <h3 className="text-base font-semibold text-foreground-strong">
                What each screen is for
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-panel p-3">
                  <div className="font-medium text-foreground">Workspace</div>
                  <div className="mt-1 text-sm text-muted">
                    Main tagging screen for video, transcript, roster, and live event logging.
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-panel p-3">
                  <div className="font-medium text-foreground">Team Review</div>
                  <div className="mt-1 text-sm text-muted">
                    Separate review screen for video-based team review and coaching notes.
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-panel p-3">
                  <div className="font-medium text-foreground">Team Analytics</div>
                  <div className="mt-1 text-sm text-muted">
                    Cleaner team analysis screen without video, built for reviewing team and player output.
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-panel p-3">
                  <div className="font-medium text-foreground">Saved Matches</div>
                  <div className="mt-1 text-sm text-muted">
                    Reopen or delete saved matches synced to this coach account.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={closeHelpModal}
                className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <PlayerDrilldownModal
        show={showPlayerDrilldownModal}
        playerName={drilldownPlayerName}
        playerRow={drilldownPlayerReportRow}
        playerEvents={drilldownPlayerEvents}
        formatTime={formatTime}
        onClose={() => setShowPlayerDrilldownModal(false)}
        onJumpToTimestamp={(timestamp) => {
          if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
            videoRef.current.pause();
            setCurrentTime(timestamp);
          }
          setShowPlayerDrilldownModal(false);
        }}
      />

      {showReportSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-foreground-strong">
                Save Match and Open Next Screen
              </h2>
              <p className="mt-2 text-sm text-muted">
                Check player minutes, save this match snapshot, then choose whether to open Team Review or Team Analytics.
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-panel-2">
                  <tr>
                    <th className="p-2 text-left">No.</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Position</th>
                    <th className="p-2 text-left">Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterRows
                    .filter((row) => row.name.trim())
                    .map((row) => (
                      <tr key={row.number} className="border-t border-border">
                        <td className="p-2 text-muted">{row.number}</td>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.position}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={row.minutes === "" ? "" : row.minutes}
                            onChange={(e) =>
                              updateRosterRow(row.number, "minutes", e.target.value)
                            }
                            className="w-24 rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-foreground"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setShowReportSetupModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={openTeamReview}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground"
              >
                Open Team Review
              </button>
              <button
                onClick={openTeamAnalytics}
                className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground"
              >
                Open Team Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1900px] space-y-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)]">
          <div className="border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground-strong md:text-3xl">
                    Capture
                  </h1>
                  <PageHelp {...COACH_PAGE_HELP["/coach/capture"]} />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted md:text-base">
                  Tag stats in Stat Mode, switch to Game Review Mode for
                  timestamped coaching notes, and build a cleaner match analysis
                  workflow from the same match file.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={reopenHelpModal}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Help
                </button>

                <button
                  type="button"
                  onClick={startNewMatch}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Start New Match
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
              <div className="rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-muted">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Screen
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  Workspace
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-muted">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Players
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {playersReady ? "Ready" : "Missing"}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-muted">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Video
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {videoLoaded ? "Loaded" : "Missing"}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-muted">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Voice
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {voiceModeEnabled ? "On" : "Off"}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-muted">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Review
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {reviewQueue.length}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-muted">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                  Session
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {sessionStateLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-8 2xl:col-span-9">
            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-panel)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Match details
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Basic session information for this analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                  placeholder="Match title"
                />

                <input
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                  placeholder="Opponent"
                />

                <input
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground"
                  placeholder="Date"
                />
              </div>

             <div className="mt-5">
  <button
    onClick={() => setShowTranscriptImport((prev) => !prev)}
    className="flex w-full items-center justify-between rounded-2xl border border-border bg-panel-2 px-4 py-3 text-left"
  >
    <div>
      <span className="text-sm font-semibold text-foreground">Import transcript</span>
      <span className="ml-3 text-xs text-muted">
        {showTranscriptImport ? "Hide" : "Paste or upload a .txt file to import match events"}
      </span>
    </div>
    <span className="text-sm text-muted">{showTranscriptImport ? "▲" : "▼"}</span>
  </button>

  {showTranscriptImport && (
    <div className="mt-2 rounded-2xl border border-border bg-panel-2 p-4">
      <p className="mb-4 text-sm text-muted">
        Paste transcript text or upload a .txt file. Then press Clean Transcript so the app can sort player actions, team events, and set-piece moments before import. Timed lines keep their timestamp. Untimed lines import at 0:00 for now.
      </p>

      <div className="grid grid-cols-1 gap-4">
        <input
          type="file"
          accept=".txt,text/plain"
          className="block w-full cursor-pointer text-sm text-muted file:mr-4 file:rounded-lg file:border file:border-border-light file:bg-panel-3 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              setTranscriptImportText(text);
              setCleanedTranscriptText("");
              setCleanedTranscriptItems([]);
              setTranscriptCleanSummary(null);
              setStatusMessage(`Transcript file loaded: ${file.name}`);
            } catch (error) {
              console.error(error);
              setStatusMessage("Could not read transcript file");
            }
          }}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">Raw transcript</label>
              <span className="text-xs text-muted">Paste or upload first</span>
            </div>
            <textarea
              value={transcriptImportText}
              onChange={(e) => {
                setTranscriptImportText(e.target.value);
                setCleanedTranscriptText("");
                setCleanedTranscriptItems([]);
                setTranscriptCleanSummary(null);
              }}
              className="min-h-[220px] w-full rounded-xl border border-border bg-panel px-3 py-3 text-sm text-foreground"
              placeholder="Paste transcript here. Example:
[00:14] Ruby tackle
[00:21] Marion carry
Ellie missed tackle"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">Cleaned transcript preview</label>
              <span className="text-xs text-muted">Built for easier import</span>
            </div>
            <textarea
              value={cleanedTranscriptText}
              readOnly
              className="min-h-[220px] w-full rounded-xl border border-border bg-panel-2 px-3 py-3 text-sm text-foreground"
              placeholder="Press Clean Transcript to preview a cleaned version here"
            />
          </div>
        </div>

        {transcriptCleanSummary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-panel px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">Raw lines</div>
              <div className="mt-1 text-sm font-medium text-foreground">{transcriptCleanSummary.originalLines}</div>
            </div>
            <div className="rounded-xl border border-border bg-panel px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">Cleaned lines</div>
              <div className="mt-1 text-sm font-medium text-foreground">{transcriptCleanSummary.cleanedLines}</div>
            </div>
            <div className="rounded-xl border border-border bg-panel px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">Matched</div>
              <div className="mt-1 text-sm font-medium text-foreground">{transcriptCleanSummary.matchedLines}</div>
            </div>
            <div className="rounded-xl border border-border bg-panel px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">Review likely</div>
              <div className="mt-1 text-sm font-medium text-foreground">{transcriptCleanSummary.reviewLikelyLines}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={cleanTranscriptForImport}
            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Clean Transcript
          </button>
          <button
            onClick={() => importTranscriptText(cleanedTranscriptText || transcriptImportText)}
            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Import Cleaned Transcript
          </button>
          <button
            onClick={() => {
              setTranscriptImportText("");
              setCleanedTranscriptText("");
              setCleanedTranscriptItems([]);
              setTranscriptCleanSummary(null);
            }}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Clear
          </button>
        </div>

        <p className="text-sm text-muted">
          Best flow: paste transcript, press <span className="font-medium text-foreground">Clean Transcript</span>, check the cleaned preview, then press <span className="font-medium text-foreground">Import Cleaned Transcript</span>.
        </p>
      </div>
    </div>
  )}
</div>
            </div>

            <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Match video
                </label>
                <div className="rounded-xl border border-dashed border-border-light bg-panel-2 px-4 py-4">
                  <input
                    type="file"
                    accept="video/*"
                    className="block w-full cursor-pointer text-sm text-muted file:mr-4 file:rounded-lg file:border file:border-border-light file:bg-panel-3 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && videoRef.current) {
                        if (videoRef.current.src?.startsWith("blob:")) {
                          URL.revokeObjectURL(videoRef.current.src);
                        }
                        const nextVideoSrc = setMatchVideoFile(file);
                        videoRef.current.src = nextVideoSrc;
                        sessionStorage.setItem("rugby-tagging-video-src", nextVideoSrc);
                        videoRef.current.playbackRate = 1;
                        setPlaybackRate(1);
                        setCurrentTime(0);
                        setVideoLoaded(true);
                        setIsVideoPlaying(false);
                        setVideoDuration(0);
                        setVideoUploadStatus("idle");
                        setVideoUploadPercent(0);
                        setVideoUploadError("");
                        setMatchSubmitStatus("idle");
                        setMatchSubmitError("");
                        setStatusMessage("Video loaded");
                        pendingVideoFileRef.current = file;
                        // Upload immediately if match is already saved, otherwise queue
                        if (currentMatchId) {
                          void triggerVideoUpload(file, currentMatchId);
                        }
                      } else {
                        setVideoLoaded(false);
                        setIsVideoPlaying(false);
                        setVideoDuration(0);
                        setPlaybackRate(1);
                        setVideoUploadStatus("idle");
                        setVideoUploadError("");
                        setMatchSubmitStatus("idle");
                        setMatchSubmitError("");
                        pendingVideoFileRef.current = null;
                        sessionStorage.removeItem("rugby-tagging-video-src");
                      }
                    }}
                  />
                  {videoUploadStatus !== "idle" && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {videoUploadStatus === "uploading" && (
                        <>
                          <span className="text-amber-400">{videoUploadLabel}</span>
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all"
                              style={{ width: `${videoUploadPercent}%` }}
                            />
                          </div>
                        </>
                      )}
                      {videoUploadStatus === "uploaded" && (
                        <span className="text-success">Synced to cloud</span>
                      )}
                      {videoUploadStatus === "error" && (
                        <span className="text-danger">
                          Upload failed - {videoUploadError || "video not saved to cloud"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow-panel)]">
                <video
                  ref={videoRef}
                  className="aspect-video min-h-[340px] w-full cursor-pointer bg-black object-contain xl:min-h-[460px] 2xl:min-h-[560px]"
                  onLoadedData={() => {
                    setVideoLoaded(true);
                    if (videoRef.current) {
                      videoRef.current.playbackRate = playbackRate;
                    }
                  }}
                  onLoadedMetadata={() => {
                    setVideoDuration(videoRef.current?.duration || 0);
                  }}
                  onTimeUpdate={() =>
                    setCurrentTime(videoRef.current?.currentTime || 0)
                  }
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onError={() => {
                    if (!videoStoragePath || videoRef.current?.src?.startsWith("blob:")) return;
                    setStatusMessage("Could not load match video from cloud");
                  }}
                  onClick={toggleVideoPlayback}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-panel-2 p-4">
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-panel px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { toggleVideoPlayback(); e.currentTarget.blur(); }}
                      disabled={!videoLoaded}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                      aria-label={isVideoPlaying ? "Pause" : "Play"}
                    >
                      {isVideoPlaying ? "⏸" : "▶"}
                    </button>

                    <div className="h-6 w-px bg-border" />

                    <button
                      type="button"
                      onClick={(e) => { jumpVideoBy(-5); e.currentTarget.blur(); }}
                      disabled={!videoLoaded}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                    >
                      -5s
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { jumpVideoBy(5); e.currentTarget.blur(); }}
                      disabled={!videoLoaded}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                    >
                      +5s
                    </button>

                    <div className="ml-0 h-6 w-px bg-border md:ml-1" />

                    {[0.5, 0.75, 1, 2].map((rate) => (
                      <button
                        type="button"
                        key={rate}
                        onClick={(e) => { changePlaybackRate(rate); e.currentTarget.blur(); }}
                        disabled={!videoLoaded}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                          playbackRate === rate
                            ? "border-border-light bg-panel-3 text-foreground"
                            : "border-border text-foreground"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-16 text-right text-xs tabular-nums text-muted">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 1}
                      step={0.5}
                      value={currentTime}
                      disabled={!videoLoaded}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        if (videoRef.current) videoRef.current.currentTime = t;
                        setCurrentTime(t);
                      }}
                      className="h-1.5 flex-1 cursor-pointer accent-foreground disabled:opacity-40"
                    />
                    <span className="w-16 text-xs tabular-nums text-muted">
                      {formatTime(videoDuration)}
                    </span>
                  </div>

                  <p className="text-sm text-muted">
                    Click video or ▶ to play. Spacebar tags while video plays when voice mode is on.
                  </p>
                </div>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                      Current video time
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground-strong">
                      {formatTime(currentTime)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeMode === "stat" ? (
                      <>
                        {!voiceModeEnabled ? (
                          <button
                            onClick={startVoiceMode}
                            disabled={transcribing}
                            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                          >
                            Start Voice Mode
                          </button>
                        ) : (
                          <button
                            onClick={endVoiceMode}
                            disabled={recording || transcribing}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
                          >
                            End Voice Mode
                          </button>
                        )}

                        <button
                          onClick={undoLast}
                          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                        >
                          Undo last tag
                        </button>

                        <button
                          onClick={downloadTranscript}
                          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                        >
                          Download transcript
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={downloadCoachNotes}
                          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                        >
                          Download coach notes
                        </button>
                        <button
                          onClick={downloadTranscript}
                          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                        >
                          Download stat transcript
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-sm text-muted">
                  {activeMode === "stat" ? (
                    voiceModeEnabled ? (
                      <span>
                        Voice mode is on. Hold{" "}
                        <strong className="text-foreground">Spacebar</strong> to
                        talk, release to submit. Spacebar is disabled while typing
                        in fields.
                      </span>
                    ) : (
                      <span>Voice mode is off.</span>
                    )
                  ) : (
                    <span>
                      Game Review Mode is for timestamped coaching notes and phase
                      observations while watching the video.
                    </span>
                  )}
                </div>

                {activeMode === "stat" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    {voiceModeEnabled &&
                      !recording &&
                      !transcribing &&
                      !pendingResolution && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[13px] text-emerald-300">
                          Ready to tag
                        </span>
                      )}
                    {recording && (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[13px] text-rose-300">
                        Recording
                      </span>
                    )}
                    {transcribing && (
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[13px] text-blue-300">
                        Processing last tag
                      </span>
                    )}
                    {pendingResolution && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[13px] text-amber-300">
                        Confirm player
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
                <span className="font-medium text-foreground">Status:</span>{" "}
                {statusMessage}
              </div>

              {activeMode === "stat" && (
                <PendingResolutionPanel
                  pendingResolution={pendingResolution}
                  resolverSelection={resolverSelection}
                  resolverSecondSelection={resolverSecondSelection}
                  resolverCandidates={resolverCandidates}
                  onResolverSelectionChange={setResolverSelection}
                  onResolverSecondSelectionChange={setResolverSecondSelection}
                  onConfirm={commitResolvedTag}
                  onReviewLater={() => {
                    if (!pendingResolution) return;

                    if (pendingResolution.pendingEventId) {
                      removePendingEvent(pendingResolution.pendingEventId);
                    }

                    addToReviewQueue(
                      pendingResolution.rawText,
                      pendingResolution.guessedText,
                      pendingResolution.timestamp,
                      pendingResolution.action
                    );
                    setPendingResolution(null);
                    setResolverSelection("");
                    setResolverSecondSelection("");
                    setResolverCandidates([]);
                    setStatusMessage("Moved to review queue");
                  }}
                />
              )}
            </div>

            {activeMode === "stat" ? (
              <>
                <div className="mb-1">
                  <h2 className="text-lg font-semibold text-foreground-strong">
                    Match-day tagging tools
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Fast correction and logging tools that sit under the main review area.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <NeedsReviewPanel
                    reviewQueue={reviewQueue}
                    players={players}
                    videoRef={videoRef}
                    onJumpToTimestamp={(timestamp) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = timestamp;
                        videoRef.current.pause();
                        setCurrentTime(timestamp);
                      }
                    }}
                    onUpdateReviewItem={updateReviewItem}
                    onSaveReviewItem={saveReviewItem}
                    onSkipReviewItem={skipReviewItem}
                  />

                  <SetPieceLoggingPanel
                    lineoutSide={lineoutSide}
                    lineoutResult={lineoutResult}
                    lineoutNotes={lineoutNotes}
                    scrumSide={scrumSide}
                    scrumResult={scrumResult}
                    lineoutPct={setPieceSummary.eastsLineouts.length > 0 ? setPieceSummary.eastsLineoutSuccessPct : null}
                    scrumPct={setPieceSummary.eastsScrums.length > 0 ? setPieceSummary.eastsScrumSuccessPct : null}
                    teamName={squadProfile?.teamName ?? "Our Team"}
                    onLineoutSideChange={setLineoutSide}
                    onLineoutResultChange={setLineoutResult}
                    onLineoutNotesChange={setLineoutNotes}
                    onAddLineout={addSetPieceEvent}
                    onScrumSideChange={setScrumSide}
                    onScrumResultChange={setScrumResult}
                    onAddScrum={addScrumEvent}
                  />
                </div>

                <MatchMilestonesPanel
                  onAddMilestone={addMilestoneEvent}
                />

                <TeamEventsPanel
                  squad={squadProfile?.players ?? []}
                  onAddPenaltyFor={() => addTeamEvent("penalty for")}
                  onAddPenaltyConceded={(name) => addTeamEvent("penalty conceded", name)}
                  onAddTryScored={(name) => addTeamEvent("try scored", name)}
                  onAddTryConceded={() => addTeamEvent("try conceded")}
                />

                <MatchdayRosterPanel
                  rosterRows={rosterRows}
                  playersCount={players.length}
                  selectedPlayer={selectedPlayer}
                  showRawTranscript={showRawTranscript}
                  onUpdateRosterRow={updateRosterRow}
                  onSelectedPlayerChange={setSelectedPlayer}
                  onShowRawTranscriptChange={setShowRawTranscript}
                  onQuickTag={addQuickTag}
                  onBringOn={addSubstitutionEvent}
                />
              </>
            ) : (
              <CoachReviewPanel
                currentTime={currentTime}
                coachNoteDraft={coachNoteDraft}
                coachRawDraft={coachRawDraft}
                showCoachRawInput={showCoachRawInput}
                coachNotes={coachNotes}
                onCoachNoteDraftChange={setCoachNoteDraft}
                onCoachRawDraftChange={setCoachRawDraft}
                onToggleCoachRawInput={() =>
                  setShowCoachRawInput((prev) => !prev)
                }
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
            )}
          </section>

          <aside className="space-y-5 self-start xl:col-span-4 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1 2xl:col-span-3">
            {activeMode === "stat" ? (
              <>
                <TranscriptPanel
                  events={events}
                  showRawTranscript={showRawTranscript}
                  transcriptListRef={transcriptListRef}
                  videoRef={videoRef}
                  onJumpToTimestamp={(timestamp) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = timestamp;
                      videoRef.current.pause();
                      setCurrentTime(timestamp);
                    }
                  }}
                  onUpdateEvent={updateEvent}
                  onDeleteEvent={deleteEvent}
                  onSubmitMatch={submitMatch}
                  submitMatchDisabled={matchSubmitStatus === "submitting"}
                  submitMatchStatus={matchSubmitStatus}
                  submitMatchError={matchSubmitError}
                />

                {cloudSyncError && (
                  <div className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-xs text-amber-300">{cloudSyncError}</span>
                    <button type="button" onClick={() => setCloudSyncError("")} className="text-xs text-amber-400 hover:text-amber-200">Dismiss</button>
                  </div>
                )}

                <TeamSnapshotPanel
                  teamName={squadProfile?.teamName ?? "Our Team"}
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
                  canCopySummary={reportRows.length > 0}
                  onCopySummary={handleCopyStatsSummary}
                />
              </>
            ) : (
              <>
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
                  teamName={squadProfile?.teamName ?? "Our Team"}
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
                  canCopySummary={reportRows.length > 0}
                  onCopySummary={handleCopyStatsSummary}
                />
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
