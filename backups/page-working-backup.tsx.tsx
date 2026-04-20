"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TeamSheetModal from "./rugby-tagging/components/TeamSheetModal";
import MatchdayRosterPanel from "./rugby-tagging/components/MatchdayRosterPanel";
import {
  CORRECTION_MEMORY_KEY,
  DEFAULT_LEARNED_CORRECTIONS,
  DEFAULT_ROSTER_ROWS,
  POSITION_OPTIONS,
  STORAGE_KEY,
} from "./rugby-tagging/constants";
import {
  blurActiveElement,
  buildBasicStats,
  buildCoachComment,
  buildSetPieceText,
  buildTeamEventText,
  cleanTranscriptText,
  copyTextToClipboard,
  csvEscape,
  downloadFile,
  findMatchingPlayer,
  formatTime,
  getClosestPlayers,
  getSafeRecorderMimeType,
  getSessionStateLabel,
  getUnitFromPosition,
  gradeCarriesPerMin,
  gradeClassName,
  gradeInvPerMin,
  gradeTacklePct,
  gradeTacklesPerMin,
  gradeToScore,
  gradeTurnovers,
  hydrateRosterRows,
  isForwardPosition,
  isInteractiveElement,
  mergeUniqueCandidates,
  normalizeCorrectionKey,
  normalizeForMatch,
  parseTeamSheetText,
  scoreToGrade,
} from "./rugby-tagging/helpers";
import type {
  EventItem,
  LineoutResult,
  PendingResolution,
  PlayerAction,
  PlayerStats,
  ReportRow,
  ReviewItem,
  RosterRow,
  ScrumResult,
  SetPieceSide,
  TeamEventType,
  UnitSummaryRow,
  VoiceResponse,
} from "./rugby-tagging/types";

export default function RugbyVoiceTaggingMVP() {
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

  const [matchTitle, setMatchTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");

  const [rosterRows, setRosterRows] = useState<RosterRow[]>(DEFAULT_ROSTER_ROWS);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [showTeamSheetModal, setShowTeamSheetModal] = useState(true);
  const [teamSheetPaste, setTeamSheetPaste] = useState("");
  const [showReportSetupModal, setShowReportSetupModal] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stats, setStats] = useState<Record<string, PlayerStats> | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [showRawTranscript, setShowRawTranscript] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);

  const [pendingResolution, setPendingResolution] =
    useState<PendingResolution | null>(null);
  const [resolverSelection, setResolverSelection] = useState("");
  const [resolverCandidates, setResolverCandidates] = useState<string[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [learnedCorrections, setLearnedCorrections] =
    useState<Record<string, string>>(DEFAULT_LEARNED_CORRECTIONS);

  const [lineoutSide, setLineoutSide] = useState<SetPieceSide>("Easts");
  const [lineoutResult, setLineoutResult] = useState<LineoutResult>("Won");
  const [lineoutNotes, setLineoutNotes] = useState("");

  const [scrumSide, setScrumSide] = useState<SetPieceSide>("Easts");
  const [scrumResult, setScrumResult] = useState<ScrumResult>("Won");

  const players = rosterRows.map((row) => row.name.trim()).filter(Boolean);
  const playersText = players.join("\n");
  const playersReady = players.length > 0;

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
      (event) => !event.isPending && event.category === "set-piece" && event.setPieceType === "lineout"
    );

    const scrums = events.filter(
      (event) => !event.isPending && event.category === "set-piece" && event.setPieceType === "scrum"
    );

    const eastsLineouts = lineouts.filter((event) => event.setPieceSide === "Easts");
    const eastsScrums = scrums.filter((event) => event.setPieceSide === "Easts");

    const eastsLineoutWon = eastsLineouts.filter(
      (event) => event.lineoutResult === "Won"
    ).length;

    const eastsScrumWon = eastsScrums.filter(
      (event) => event.scrumResult === "Won" || event.scrumResult === "Penalty For"
    ).length;

    return {
      lineouts,
      scrums,
      eastsLineouts,
      eastsScrums,
      eastsLineoutWon,
      eastsScrumWon,
      eastsLineoutSuccessPct:
        eastsLineouts.length > 0 ? (eastsLineoutWon / eastsLineouts.length) * 100 : 0,
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
        (event) => event.category === "player" && event.playerAction === "missed tackle"
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
        `Lineout: Easts success was ${setPieceSummary.eastsLineoutSuccessPct.toFixed(
          0
        )}% from ${setPieceSummary.eastsLineouts.length} logged lineouts.`
      );
    }

    if (setPieceSummary.eastsScrums.length > 0) {
      lines.push(
        `Scrum: Easts success was ${setPieceSummary.eastsScrumSuccessPct.toFixed(
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
      comments.push("Defensive accuracy was competitive but still has room to improve.");
    }

    if (setPieceSummary.eastsLineouts.length > 0) {
      if (setPieceSummary.eastsLineoutSuccessPct < 80) {
        comments.push("Lineout needs tightening, especially on core ball and clarity of call.");
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
      comments.push("Carry count suggests the side could look for more attacking involvements.");
    } else {
      comments.push("Carry volume was reasonable and gave the side some attacking presence.");
    }

    return comments.join(" ");
  }, [teamTacklePct, setPieceSummary, teamTotals.carries, reportRows.length]);

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
      )}%, Carries: ${teamTotals.carries}, Turnovers: ${teamTotals.turnovers}, Penalties Conceded: ${
        teamEventSummary.penaltiesConceded
      }, Easts Scrum %: ${setPieceSummary.eastsScrumSuccessPct.toFixed(
        0
      )}%, Easts Lineout %: ${setPieceSummary.eastsLineoutSuccessPct.toFixed(
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
      const raw = localStorage.getItem(STORAGE_KEY);
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
      setShowRawTranscript(
        typeof saved.showRawTranscript === "boolean"
          ? saved.showRawTranscript
          : true
      );
    } catch (error) {
      console.error("Failed to load saved session", error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CORRECTION_MEMORY_KEY);
      if (!raw) {
        setLearnedCorrections(DEFAULT_LEARNED_CORRECTIONS);
        return;
      }

      const saved = JSON.parse(raw);
      setLearnedCorrections(saved || DEFAULT_LEARNED_CORRECTIONS);
    } catch (error) {
      console.error("Failed to load correction memory", error);
      setLearnedCorrections(DEFAULT_LEARNED_CORRECTIONS);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        CORRECTION_MEMORY_KEY,
        JSON.stringify(learnedCorrections)
      );
    } catch (error) {
      console.error("Failed to save correction memory", error);
    }
  }, [learnedCorrections]);

  useEffect(() => {
    try {
      const persistedEvents = events.filter((event) => !event.isPending);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          matchTitle,
          opponent,
          matchDate,
          rosterRows,
          selectedPlayer,
          events: persistedEvents,
          reviewQueue,
          showRawTranscript,
        })
      );
    } catch (error) {
      console.error("Failed to save session", error);
    }
  }, [
    matchTitle,
    opponent,
    matchDate,
    rosterRows,
    selectedPlayer,
    events,
    reviewQueue,
    showRawTranscript,
  ]);

  useEffect(() => {
    if (playersReady) {
      setShowTeamSheetModal(false);
    }
  }, [playersReady]);

  useEffect(() => {
    return () => {
      if (videoRef.current?.src?.startsWith("blob:")) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (stopTimeoutRef.current) {
        window.clearTimeout(stopTimeoutRef.current);
      }
    };
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
  }, [events.length, pendingResolution, transcribing]);

  const updateRosterRow = (
    number: number,
    field: "name" | "position" | "minutes",
    value: string
  ) => {
    setRosterRows((prev) =>
      prev.map((row) =>
        row.number === number
          ? {
              ...row,
              [field]:
                field === "minutes"
                  ? value === ""
                    ? ""
                    : Math.max(0, Math.min(120, Number(value) || 0))
                  : value,
            }
          : row
      )
    );
  };

  const applyPastedTeamSheet = () => {
    if (!teamSheetPaste.trim()) return;
    setRosterRows((prev) => parseTeamSheetText(teamSheetPaste, prev));
    setStatusMessage("Team sheet paste applied");
  };

  const submitTeamSheet = () => {
    const nextRows = teamSheetPaste.trim()
      ? parseTeamSheetText(teamSheetPaste, rosterRows)
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

  const startNewMatch = () => {
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

    localStorage.removeItem(STORAGE_KEY);

    setMatchTitle("");
    setOpponent("");
    setMatchDate("");
    setRosterRows(hydrateRosterRows(null));
    setSelectedPlayer("");
    setTeamSheetPaste("");
    setShowTeamSheetModal(true);
    setShowReportSetupModal(false);
    setEvents([]);
    setVoiceModeEnabled(false);
    setRecording(false);
    setTranscribing(false);
    setCurrentTime(0);
    setStats(null);
    setShowReportBuilder(false);
    setStatusMessage("Ready");
    setVideoLoaded(false);
    setPendingResolution(null);
    setResolverSelection("");
    setResolverCandidates([]);
    setReviewQueue([]);
    setLineoutSide("Easts");
    setLineoutResult("Won");
    setLineoutNotes("");
    setScrumSide("Easts");
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

    setStats(null);
  };

  const addStructuredPlayerEvent = (
    playerName: string,
    action: PlayerAction,
    timestamp: number,
    rawText?: string
  ) => {
    const text = `${playerName} ${action}`;

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text: cleanTranscriptText(text),
        rawText: rawText?.trim() || undefined,
        category: "player",
        playerName,
        playerAction: action,
      },
    ]);

    setStats(null);
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

  const addTeamEvent = (type: TeamEventType) => {
    const timestamp = videoRef.current?.currentTime || currentTime;
    const text = buildTeamEventText(type);

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp,
        text,
        category: "team",
        teamEventType: type,
      },
    ]);

    setStatusMessage(`${text} logged`);
  };

  const undoLast = () => {
    setEvents((prev) => prev.slice(0, -1));
    setStats(null);
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
    setStats(null);
  };

  const deleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    setStats(null);
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

  const saveReviewItem = (item: ReviewItem) => {
    if (!item.selectedAction) {
      setStatusMessage("Choose an action before saving the review item");
      return;
    }

    if (item.selectedPlayer) {
      rememberCorrection(item.rawText, `${item.selectedPlayer} ${item.selectedAction}`);
      addStructuredPlayerEvent(
        item.selectedPlayer,
        item.selectedAction,
        item.timestamp,
        item.rawText
      );
    } else {
      rememberCorrection(item.rawText, item.selectedAction);
      addEvent(item.selectedAction, item.timestamp, item.rawText);
    }

    setReviewQueue((prev) => prev.filter((x) => x.id !== item.id));
    setStatusMessage("Review item saved");
  };

  const skipReviewItem = (id: number) => {
    setReviewQueue((prev) => prev.filter((x) => x.id !== id));
    setStatusMessage("Review item skipped");
  };

  const submitReport = () => {
    if (reviewQueue.length > 0) {
      setStatusMessage(
        `Resolve ${reviewQueue.length} review item${
          reviewQueue.length === 1 ? "" : "s"
        } before submitting report`
      );
      return;
    }

    if (!playersReady) {
      setStatusMessage("Add a team sheet before submitting report");
      return;
    }

    setShowReportSetupModal(true);
    setStatusMessage("Add or check player minutes before opening report");
  };

  const continueToReport = () => {
    setShowReportSetupModal(false);
    setShowReportBuilder(true);
    setStatusMessage("Report builder opened");
  };

  const generateStats = () => {
    if (reviewQueue.length > 0) {
      setStatusMessage(
        `Resolve ${reviewQueue.length} review item${
          reviewQueue.length === 1 ? "" : "s"
        } before generating final stats`
      );
      setStats(null);
      return;
    }

    if (players.length === 0) {
      setStatusMessage("Add players before generating stats");
      setStats(null);
      return;
    }

    const result = buildBasicStats(players, events);
    setStats(result);
    setStatusMessage("Stats generated");
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

  const getLearnedCorrection = (rawText: string) => {
    const key = normalizeCorrectionKey(rawText);
    return learnedCorrections[key] || null;
  };

  const rememberCorrection = (rawText: string, finalText: string) => {
    const key = normalizeCorrectionKey(rawText);
    if (!key || !finalText.trim()) return;

    setLearnedCorrections((prev) => ({
      ...prev,
      [key]: cleanTranscriptText(finalText),
    }));
  };

  const startVoiceMode = async () => {
    try {
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

    const finalText = resolverSelection
      ? `${resolverSelection} ${pendingResolution.action}`
      : pendingResolution.action;

    rememberCorrection(pendingResolution.rawText, finalText);

    if (pendingResolution.pendingEventId) {
      replacePendingEvent(pendingResolution.pendingEventId, {
        text: finalText,
        rawText: pendingResolution.rawText,
        isPending: false,
        playerName: resolverSelection || undefined,
        playerAction: pendingResolution.action,
      });
    } else if (resolverSelection) {
      addStructuredPlayerEvent(
        resolverSelection,
        pendingResolution.action,
        pendingResolution.timestamp,
        pendingResolution.rawText
      );
    } else {
      addEvent(finalText, pendingResolution.timestamp, pendingResolution.rawText);
    }

    setPendingResolution(null);
    setResolverSelection("");
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
    setResolverCandidates([]);
    setStatusMessage("Previous unresolved tag moved to review");
  };

  const startPushToTalkRecording = () => {
    if (!voiceModeEnabled || recording || transcribing || !streamRef.current) {
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
          formData.append("players", playersText);

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

          const learnedCorrection = getLearnedCorrection(rawText);

          if (learnedCorrection) {
            const matchedPlayer = findMatchingPlayer(players, learnedCorrection);
            const learnedAction =
              (normalizeForMatch(learnedCorrection).includes("missed tackle") &&
                "missed tackle") ||
              (normalizeForMatch(learnedCorrection).includes("tackle") && "tackle") ||
              (normalizeForMatch(learnedCorrection).includes("carry") && "carry") ||
              (normalizeForMatch(learnedCorrection).includes("turnover") && "turnover") ||
              undefined;

            replacePendingEvent(pendingEventId, {
              text: learnedCorrection,
              rawText,
              isPending: false,
              playerName: matchedPlayer || undefined,
              playerAction: learnedAction,
            });
            setStatusMessage(`Tag added: ${learnedCorrection}`);
            return;
          }

          if (!cleanedText) {
            removePendingEvent(pendingEventId);
            setStatusMessage(
              "No speech detected - hold Spacebar, speak clearly, then release"
            );
            return;
          }

          const backendCandidates = (parsed?.candidate_players || []).filter(
            (name) => players.includes(name)
          );
          const frontendCandidates = getClosestPlayers(rawText, players, 3);
          const mergedCandidates = mergeUniqueCandidates(
            backendCandidates,
            frontendCandidates
          );

          const hasKnownAction = !!parsed && parsed.action !== "unknown";
          const parsedPlayerIsValid =
            !!parsed?.player && players.includes(parsed.player);

          const highEnoughConfidence =
            parsed?.confidence === "high" || parsed?.confidence === "medium";

          if (hasKnownAction && parsedPlayerIsValid && highEnoughConfidence) {
            replacePendingEvent(pendingEventId, {
              text: cleanedText,
              rawText,
              isPending: false,
              playerName: parsed?.player || undefined,
              playerAction: parsed?.action as PlayerAction,
            });
            setStatusMessage(`Tag added: ${cleanedText}`);
          } else if (hasKnownAction && mergedCandidates.length > 0) {
            setPendingResolution({
              rawText,
              guessedText: cleanedText,
              timestamp: timestampAtRecordingStartRef.current,
              action: parsed!.action as PlayerAction,
              pendingEventId,
            });
            setResolverCandidates(mergedCandidates);
            setResolverSelection(mergedCandidates[0] || "");
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
    setStatusMessage(success ? "Stats summary copied" : "Could not copy stats summary");
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
      `${(matchTitle || "match-transcript").replace(/\s+/g, "-").toLowerCase()}.txt`,
      content,
      "text/plain;charset=utf-8"
    );
    setStatusMessage("Transcript downloaded");
  };

  const downloadExcelCsv = () => {
    const rows: string[] = [];

    rows.push("SECTION,FIELD,VALUE");
    rows.push(`Snapshot,Tackles Made,${teamTotals.tackles}`);
    rows.push(`Snapshot,Missed Tackles,${teamTotals.missed}`);
    rows.push(`Snapshot,Tackle %,${teamTacklePct.toFixed(0)}%`);
    rows.push(`Snapshot,Total Carries,${teamTotals.carries}`);
    rows.push(`Snapshot,Turnovers Won,${teamTotals.turnovers}`);
    rows.push(`Snapshot,Penalties Conceded,${teamEventSummary.penaltiesConceded}`);
    rows.push(`Snapshot,Easts Scrum Success %,${setPieceSummary.eastsScrumSuccessPct.toFixed(0)}%`);
    rows.push(`Snapshot,Easts Lineout Success %,${setPieceSummary.eastsLineoutSuccessPct.toFixed(0)}%`);
    rows.push(`Snapshot,Tries Scored,${teamEventSummary.triesScored}`);
    rows.push(`Snapshot,Tries Conceded,${teamEventSummary.triesConceded}`);
    rows.push("");

    rows.push(
      [
        "Player Report",
        "No",
        "Player",
        "Position",
        "Unit",
        "Minutes",
        "Tackles",
        "Missed",
        "Carries",
        "Turnovers",
        "Involvements",
        "Tackle %",
        "Tackles/Min",
        "Carries/Min",
        "Inv/Min",
        "Overall",
        "Coach Comment",
      ]
        .map(csvEscape)
        .join(",")
    );

    reportRows.forEach((row) => {
      rows.push(
        [
          "Player Report",
          row.number,
          row.name,
          row.position,
          row.unit,
          row.minutes,
          row.tackles,
          row.missed,
          row.carries,
          row.turnovers,
          row.involvements,
          `${row.tacklePct.toFixed(0)}%`,
          row.tacklesPerMin.toFixed(2),
          row.carriesPerMin.toFixed(2),
          row.involvementsPerMin.toFixed(2),
          row.overallGrade,
          row.coachComment,
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    rows.push("");
    rows.push(
      ["Unit Summary", "Unit", "Players", "Avg Tackles/Min", "Avg Carries/Min", "Avg Inv/Min"]
        .map(csvEscape)
        .join(",")
    );

    unitSummaryRows.forEach((row) => {
      rows.push(
        [
          "Unit Summary",
          row.unit,
          row.players,
          row.avgTacklesPerMin.toFixed(2),
          row.avgCarriesPerMin.toFixed(2),
          row.avgInvolvementsPerMin.toFixed(2),
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    rows.push("");
    rows.push(["Transcript", "Time", "Text"].map(csvEscape).join(","));
    [...events]
      .filter((event) => !event.isPending)
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((event) => {
        rows.push(
          ["Transcript", formatTime(event.timestamp), event.text]
            .map(csvEscape)
            .join(",")
        );
      });

    rows.push("");
    rows.push(["Game Summary", "Comment", gameCoachingComment].map(csvEscape).join(","));
    rows.push(["Game Summary", "Flow", gameFlowSummary].map(csvEscape).join(","));

    downloadFile(
      `${(matchTitle || "match-report").replace(/\s+/g, "-").toLowerCase()}.csv`,
      rows.join("\n"),
      "text/csv;charset=utf-8"
    );

    setStatusMessage("CSV report downloaded");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!voiceModeEnabled) return;
      if (event.code !== "Space") return;
      if (event.repeat) return;
      if (showTeamSheetModal || showReportSetupModal) return;
      if (isInteractiveElement(event.target)) return;
      if (spacebarHeldRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      blurActiveElement();
      pageShellRef.current?.focus();
      spacebarHeldRef.current = true;
      startPushToTalkRecording();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!voiceModeEnabled) return;
      if (event.code !== "Space") return;
      if (showTeamSheetModal || showReportSetupModal) return;
      if (isInteractiveElement(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
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
  }, [voiceModeEnabled, showTeamSheetModal, showReportSetupModal, recording, transcribing, pendingResolution]);

  return (
    <main
      ref={pageShellRef}
      tabIndex={-1}
      className="min-h-screen bg-background px-4 py-6 text-foreground outline-none sm:px-6 lg:px-8"
    >
      <TeamSheetModal
        show={showTeamSheetModal}
        teamSheetPaste={teamSheetPaste}
        rosterRows={rosterRows}
        onTeamSheetPasteChange={setTeamSheetPaste}
        onUpdateRosterRow={updateRosterRow}
        onApplyPastedTeamSheet={applyPastedTeamSheet}
        onSubmitTeamSheet={submitTeamSheet}
      />

      {showReportSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-foreground-strong">
                Submit Report
              </h2>
              <p className="mt-2 text-sm text-muted">
                Add or check player minutes before opening the final report.
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

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowReportSetupModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={continueToReport}
                className="rounded-xl border border-border-light bg-panel-3 px-5 py-2.5 text-sm font-medium text-foreground"
              >
                Open Report
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)]">
            <div className="border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground-strong">
                    Rugby Voice Tagging MVP
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    Watch match footage, tag player actions, log set-piece outcomes,
                    and export a coach-ready report.
                  </p>
                </div>

                <button
                  onClick={startNewMatch}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Start New Match
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
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

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Match details
              </h2>
              <p className="mt-1 text-sm text-muted">
                Basic session information for this analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
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
                      videoRef.current.src = URL.createObjectURL(file);
                      setVideoLoaded(true);
                      setStatusMessage("Video loaded");
                    } else {
                      setVideoLoaded(false);
                    }
                  }}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow-panel)]">
              <video
                ref={videoRef}
                controls
                className="w-full bg-black"
                onLoadedData={() => setVideoLoaded(true)}
                onTimeUpdate={() =>
                  setCurrentTime(videoRef.current?.currentTime || 0)
                }
              />
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-panel-2 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                    Current video time
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground-strong">
                    {formatTime(currentTime)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                </div>
              </div>

              <div className="mt-4 text-sm text-muted">
                {voiceModeEnabled ? (
                  <span>
                    Voice mode is on. Hold{" "}
                    <strong className="text-foreground">Spacebar</strong> to
                    talk, release to submit. Spacebar is disabled while typing in
                    fields.
                  </span>
                ) : (
                  <span>Voice mode is off.</span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                {voiceModeEnabled && !recording && !transcribing && !pendingResolution && (
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
            </div>

            <div className="mt-4 rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
              <span className="font-medium text-foreground">Status:</span>{" "}
              {statusMessage}
            </div>

            {pendingResolution && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-2">
                      Confirm player
                    </div>
                    <div className="text-sm text-muted">
                      Raw:{" "}
                      <strong className="text-foreground">
                        {pendingResolution.rawText}
                      </strong>
                    </div>
                    <div className="text-sm text-muted">
                      Action:{" "}
                      <strong className="text-foreground">
                        {pendingResolution.action}
                      </strong>
                    </div>
                    <div className="text-sm text-muted">
                      Time:{" "}
                      <strong className="text-foreground">
                        {formatTime(pendingResolution.timestamp)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={resolverSelection}
                      onChange={(e) => setResolverSelection(e.target.value)}
                      className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                    >
                      {resolverCandidates.map((player) => (
                        <option key={player} value={player}>
                          {player}
                        </option>
                      ))}
                      <option value="">No player</option>
                    </select>

                    <button
                      onClick={commitResolvedTag}
                      className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                    >
                      Confirm
                    </button>

                    <button
                      onClick={() => {
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
                        setResolverCandidates([]);
                        setStatusMessage("Moved to review queue");
                      }}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                    >
                      Review later
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-panel-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">Log lineout</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={lineoutSide}
                    onChange={(e) => setLineoutSide(e.target.value as SetPieceSide)}
                    className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="Easts">Easts</option>
                    <option value="Opposition">Opposition</option>
                  </select>

                  <select
                    value={lineoutResult}
                    onChange={(e) => setLineoutResult(e.target.value as LineoutResult)}
                    className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                    <option value="Penalty">Penalty</option>
                    <option value="Not Straight">Not Straight</option>
                    <option value="Steal">Steal</option>
                  </select>

                  <input
                    value={lineoutNotes}
                    onChange={(e) => setLineoutNotes(e.target.value)}
                    className="sm:col-span-2 rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                    placeholder="Lineout call / notes"
                  />
                </div>

                <button
                  onClick={addSetPieceEvent}
                  className="mt-3 rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Add lineout
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-panel-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">Log scrum</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={scrumSide}
                    onChange={(e) => setScrumSide(e.target.value as SetPieceSide)}
                    className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="Easts">Easts</option>
                    <option value="Opposition">Opposition</option>
                  </select>

                  <select
                    value={scrumResult}
                    onChange={(e) => setScrumResult(e.target.value as ScrumResult)}
                    className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                    <option value="Penalty For">Penalty For</option>
                    <option value="Penalty Against">Penalty Against</option>
                    <option value="Free Kick">Free Kick</option>
                  </select>
                </div>

                <button
                  onClick={addScrumEvent}
                  className="mt-3 rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Add scrum
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-panel-2 p-4">
              <h3 className="text-sm font-semibold text-foreground">Team events</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  onClick={() => addTeamEvent("penalty conceded")}
                  className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  + Penalty Conceded
                </button>
                <button
                  onClick={() => addTeamEvent("try scored")}
                  className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  + Try Scored
                </button>
                <button
                  onClick={() => addTeamEvent("try conceded")}
                  className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  + Try Conceded
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <MatchdayRosterPanel
            rosterRows={rosterRows}
            playersCount={players.length}
            selectedPlayer={selectedPlayer}
            showRawTranscript={showRawTranscript}
            onUpdateRosterRow={updateRosterRow}
            onSelectedPlayerChange={setSelectedPlayer}
            onShowRawTranscriptChange={setShowRawTranscript}
            onQuickTag={addQuickTag}
          />

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Transcript
              </h2>
              <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
                {events.length} item{events.length === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-2 text-xs text-muted">
              Player tags, set-piece logs, and team events all appear in one timeline.
            </p>

            <div
              ref={transcriptListRef}
              className="mt-4 max-h-96 min-h-24 space-y-2 overflow-y-auto pr-1"
            >
              {events.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                  No transcript items yet
                </div>
              )}

              {events.map((event, index) => {
                const isLatestEvent = index === events.length - 1;

                return (
                  <div
                    key={event.id}
                    className={`rounded-xl border p-3 ${
                      event.isPending
                        ? "border-blue-500/20 bg-blue-500/5"
                        : event.category === "set-piece"
                        ? "border-purple-500/20 bg-purple-500/5"
                        : event.category === "team"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-border bg-panel-2"
                    } ${isLatestEvent ? "ring-1 ring-emerald-400/50" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        {isLatestEvent && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                            Latest
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = event.timestamp;
                            videoRef.current.pause();
                            setCurrentTime(event.timestamp);
                          }
                        }}
                        className="w-14 text-xs font-medium text-muted underline underline-offset-2"
                        title="Jump to timestamp"
                      >
                        {formatTime(event.timestamp)}
                      </button>

                      <input
                        value={event.text}
                        onChange={(e) => updateEvent(event.id, e.target.value)}
                        className={`flex-1 rounded-lg border border-border bg-panel px-2.5 py-2 text-sm ${
                          event.isPending ? "text-muted" : "text-foreground"
                        }`}
                        readOnly={!!event.isPending}
                      />

                      {!event.isPending && (
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-xs font-medium text-muted hover:text-foreground"
                        >
                          delete
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {event.isPending ? (
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-300">
                          Processing
                        </span>
                      ) : event.category === "set-piece" ? (
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] text-purple-300">
                          Set piece
                        </span>
                      ) : event.category === "team" ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                          Team event
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                          Player tag
                        </span>
                      )}
                    </div>

                    {event.isPending && (
                      <div className="mt-2 text-xs text-muted">
                        Waiting for transcription...
                      </div>
                    )}

                    {showRawTranscript &&
                      !event.isPending &&
                      event.rawText &&
                      event.rawText !== event.text && (
                        <div className="mt-2 rounded-lg border border-border bg-panel px-2 py-1.5 text-xs text-muted">
                          Raw: {event.rawText}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={generateStats}
                className="w-full rounded-xl border border-border-light bg-panel-3 py-2.5 text-sm font-medium text-foreground"
              >
                Generate Stats
              </button>

              <button
                onClick={submitReport}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
              >
                Submit Report
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Needs Review
              </h2>
              <span className="rounded-full border border-border bg-panel-2 px-3 py-1 text-xs text-muted">
                {reviewQueue.length} item{reviewQueue.length === 1 ? "" : "s"}
              </span>
            </div>

            {reviewQueue.length === 0 && (
              <p className="text-sm text-muted">No review items</p>
            )}

            <div className="space-y-3">
              {reviewQueue.map((item, index) => {
                const closest = getClosestPlayers(item.rawText, players, 3);
                const isNewestReview = index === reviewQueue.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 ${
                      isNewestReview ? "ring-1 ring-amber-400/50" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        {isNewestReview && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                            Newest review
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = item.timestamp;
                          videoRef.current.pause();
                          setCurrentTime(item.timestamp);
                        }
                      }}
                      className="text-sm font-medium text-muted underline underline-offset-2"
                      title="Jump to timestamp"
                    >
                      {formatTime(item.timestamp)}
                    </button>

                    <div className="mt-2 text-sm text-muted">
                      Raw: {item.rawText}
                    </div>

                    {item.guessedText && item.guessedText !== item.rawText && (
                      <div className="mt-2 text-sm text-muted">
                        Guess: {item.guessedText}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select
                        value={item.selectedPlayer}
                        onChange={(e) =>
                          setReviewQueue((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? { ...x, selectedPlayer: e.target.value }
                                : x
                            )
                          )
                        }
                        className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                      >
                        <option value="">No player</option>
                        {closest.map((player) => (
                          <option key={player} value={player}>
                            {player}
                          </option>
                        ))}
                        {players
                          .filter((p) => !closest.includes(p))
                          .map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                      </select>

                      <select
                        value={item.selectedAction}
                        onChange={(e) =>
                          setReviewQueue((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? {
                                    ...x,
                                    selectedAction:
                                      e.target.value as ReviewItem["selectedAction"],
                                  }
                                : x
                            )
                          )
                        }
                        className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm text-foreground"
                      >
                        <option value="">Select action</option>
                        <option value="tackle">tackle</option>
                        <option value="missed tackle">missed tackle</option>
                        <option value="carry">carry</option>
                        <option value="turnover">turnover</option>
                      </select>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => saveReviewItem(item)}
                        className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                      >
                        Save tag
                      </button>
                      <button
                        onClick={() => skipReviewItem(item.id)}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Team Snapshot
              </h2>
              <button
                onClick={handleCopyStatsSummary}
                disabled={reportRows.length === 0}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50"
              >
                Copy summary
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Tackles Made</div>
                <div className="mt-1 font-semibold text-foreground">{teamTotals.tackles}</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Missed Tackles</div>
                <div className="mt-1 font-semibold text-foreground">{teamTotals.missed}</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Tackle %</div>
                <div className="mt-1 font-semibold text-foreground">{teamTacklePct.toFixed(0)}%</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Total Carries</div>
                <div className="mt-1 font-semibold text-foreground">{teamTotals.carries}</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Turnovers Won</div>
                <div className="mt-1 font-semibold text-foreground">{teamTotals.turnovers}</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Penalties Conceded</div>
                <div className="mt-1 font-semibold text-foreground">{teamEventSummary.penaltiesConceded}</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Easts Scrum %</div>
                <div className="mt-1 font-semibold text-foreground">{setPieceSummary.eastsScrumSuccessPct.toFixed(0)}%</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Easts Lineout %</div>
                <div className="mt-1 font-semibold text-foreground">{setPieceSummary.eastsLineoutSuccessPct.toFixed(0)}%</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Tries Scored</div>
                <div className="mt-1 font-semibold text-foreground">{teamEventSummary.triesScored}</div>
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="text-muted">Tries Conceded</div>
                <div className="mt-1 font-semibold text-foreground">{teamEventSummary.triesConceded}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground-strong">
                Stats
              </h2>
              <button
                onClick={downloadExcelCsv}
                disabled={reportRows.length === 0}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50"
              >
                Download Excel CSV
              </button>
            </div>

            {!stats && (
              <p className="text-sm text-muted">No stats generated yet</p>
            )}

            {stats && (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-panel-2">
                    <tr>
                      <th className="p-2 text-left">Player</th>
                      <th className="p-2 text-center">Tackles</th>
                      <th className="p-2 text-center">Missed</th>
                      <th className="p-2 text-center">Carries</th>
                      <th className="p-2 text-center">TO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats).map(([player, stat]) => (
                      <tr key={player} className="border-t border-border">
                        <td className="p-2">{player}</td>
                        <td className="p-2 text-center">{stat.tackles}</td>
                        <td className="p-2 text-center">{stat.missed}</td>
                        <td className="p-2 text-center">{stat.carries}</td>
                        <td className="p-2 text-center">{stat.turnovers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showReportBuilder && (
            <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-panel)]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground-strong">
                  Report Builder
                </h2>
                <button
                  onClick={() => setShowReportBuilder(false)}
                  className="text-xs font-medium text-muted hover:text-foreground"
                >
                  close
                </button>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 p-4 text-sm text-foreground">
                <div className="font-semibold">Game coaching comment</div>
                <p className="mt-2 text-muted">{gameCoachingComment}</p>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-panel-2 p-4 text-sm text-foreground">
                <div className="font-semibold">Game flow summary</div>
                <p className="mt-2 text-muted">{gameFlowSummary}</p>
              </div>

              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Unit summary
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-panel-2">
                      <tr>
                        <th className="p-2 text-left">Unit</th>
                        <th className="p-2 text-center">Players</th>
                        <th className="p-2 text-center">Avg T/Min</th>
                        <th className="p-2 text-center">Avg C/Min</th>
                        <th className="p-2 text-center">Avg Inv/Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitSummaryRows.map((row) => (
                        <tr key={row.unit} className="border-t border-border">
                          <td className="p-2">{row.unit}</td>
                          <td className="p-2 text-center">{row.players}</td>
                          <td className="p-2 text-center">{row.avgTacklesPerMin.toFixed(2)}</td>
                          <td className="p-2 text-center">{row.avgCarriesPerMin.toFixed(2)}</td>
                          <td className="p-2 text-center">{row.avgInvolvementsPerMin.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Full team report
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-panel-2">
                      <tr>
                        <th className="p-2 text-left">No.</th>
                        <th className="p-2 text-left">Player</th>
                        <th className="p-2 text-left">Pos</th>
                        <th className="p-2 text-left">Unit</th>
                        <th className="p-2 text-center">Min</th>
                        <th className="p-2 text-center">T</th>
                        <th className="p-2 text-center">MT</th>
                        <th className="p-2 text-center">Carries</th>
                        <th className="p-2 text-center">TO</th>
                        <th className="p-2 text-center">Inv</th>
                        <th className="p-2 text-center">T%</th>
                        <th className="p-2 text-center">T/Min</th>
                        <th className="p-2 text-center">C/Min</th>
                        <th className="p-2 text-center">Inv/Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row) => (
                        <tr key={row.number} className="border-t border-border">
                          <td className="p-2">{row.number}</td>
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.position}</td>
                          <td className="p-2">{row.unit}</td>
                          <td className="p-2 text-center">{row.minutes}</td>
                          <td className="p-2 text-center">{row.tackles}</td>
                          <td className="p-2 text-center">{row.missed}</td>
                          <td className="p-2 text-center">{row.carries}</td>
                          <td className="p-2 text-center">{row.turnovers}</td>
                          <td className="p-2 text-center">{row.involvements}</td>
                          <td className="p-2 text-center">{row.tacklePct.toFixed(0)}%</td>
                          <td className="p-2 text-center">{row.tacklesPerMin.toFixed(2)}</td>
                          <td className="p-2 text-center">{row.carriesPerMin.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            {row.involvementsPerMin.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Forwards analysis
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-panel-2">
                      <tr>
                        <th className="p-2 text-left">Player</th>
                        <th className="p-2 text-left">Pos</th>
                        <th className="p-2 text-center">Min</th>
                        <th className="p-2 text-center">T</th>
                        <th className="p-2 text-center">MT</th>
                        <th className="p-2 text-center">T%</th>
                        <th className="p-2 text-center">T% Grade</th>
                        <th className="p-2 text-center">T/Min</th>
                        <th className="p-2 text-center">T/Min Grade</th>
                        <th className="p-2 text-center">Carries</th>
                        <th className="p-2 text-center">C/Min</th>
                        <th className="p-2 text-center">C/Min Grade</th>
                        <th className="p-2 text-center">TO</th>
                        <th className="p-2 text-center">Inv</th>
                        <th className="p-2 text-center">Inv/Min</th>
                        <th className="p-2 text-center">Work Rate</th>
                        <th className="p-2 text-center">Overall</th>
                        <th className="p-2 text-left">Coach comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forwardsRows.map((row) => (
                        <tr key={row.number} className="border-t border-border">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.position}</td>
                          <td className="p-2 text-center">{row.minutes}</td>
                          <td className="p-2 text-center">{row.tackles}</td>
                          <td className="p-2 text-center">{row.missed}</td>
                          <td className="p-2 text-center">{row.tacklePct.toFixed(0)}%</td>
                          <td className={`p-2 text-center ${gradeClassName(row.tacklePctGrade)}`}>
                            {row.tacklePctGrade}
                          </td>
                          <td className="p-2 text-center">{row.tacklesPerMin.toFixed(2)}</td>
                          <td className={`p-2 text-center ${gradeClassName(row.tacklesPerMinGrade)}`}>
                            {row.tacklesPerMinGrade}
                          </td>
                          <td className="p-2 text-center">{row.carries}</td>
                          <td className="p-2 text-center">{row.carriesPerMin.toFixed(2)}</td>
                          <td className={`p-2 text-center ${gradeClassName(row.carriesPerMinGrade)}`}>
                            {row.carriesPerMinGrade}
                          </td>
                          <td className="p-2 text-center">{row.turnovers}</td>
                          <td className="p-2 text-center">{row.involvements}</td>
                          <td className="p-2 text-center">
                            {row.involvementsPerMin.toFixed(2)}
                          </td>
                          <td className={`p-2 text-center ${gradeClassName(row.workRateGrade)}`}>
                            {row.workRateGrade}
                          </td>
                          <td className={`p-2 text-center ${gradeClassName(row.overallGrade)}`}>
                            {row.overallGrade}
                          </td>
                          <td className="min-w-[18rem] p-2">{row.coachComment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}