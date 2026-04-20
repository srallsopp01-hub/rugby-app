import { DEFAULT_POSITION_BY_NUMBER, DEFAULT_ROSTER_ROWS, POSITION_OPTIONS } from "./constants";
import type {
  EventItem,
  Grade,
  PendingResolution,
  PlayerStats,
  ReportRow,
  RosterRow,
  ScrumResult,
  SetPieceSide,
  SetPieceType,
  TeamEventType,
} from "./types";

export function formatTime(sec: number) {
  const safe = Math.max(0, Math.floor(sec));
  const s = (safe % 60).toString().padStart(2, "0");
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleCase(text: string) {
  return text
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
    )
    .join(" ");
}

export function cleanTranscriptText(text: string) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/[.?!,]+$/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");

  const words = cleaned.split(" ");
  if (words.length > 0) {
    words[0] = titleCase(words[0]);
  }

  return words.join(" ");
}

export function findMatchingPlayer(players: string[], text: string) {
  const normalizedText = ` ${normalizeForMatch(text)} `;

  for (const player of players) {
    const normalizedPlayer = normalizeForMatch(player);
    if (normalizedText.includes(` ${normalizedPlayer} `)) {
      return player;
    }
  }

  const words = normalizeForMatch(text).split(" ").filter(Boolean);
  const firstWord = words[0] || "";
  if (!firstWord) return null;

  const firstNameMatches = players.filter((player) => {
    const normalizedPlayer = normalizeForMatch(player);
    const playerFirstWord = normalizedPlayer.split(" ")[0] || "";
    return playerFirstWord === firstWord;
  });

  if (firstNameMatches.length === 1) {
    return firstNameMatches[0];
  }

  return null;
}

export function detectStats(text: string) {
  const normalized = normalizeForMatch(text);

  return {
    missedTackle:
      normalized.includes("missed tackle") ||
      normalized.includes("miss tackle"),
    tackle:
      normalized.includes("tackle") &&
      !normalized.includes("missed tackle") &&
      !normalized.includes("miss tackle"),
    carry: normalized.includes("carry") || normalized.includes("run"),
    turnover: normalized.includes("turnover") || normalized.includes("jackal"),
  };
}

export function getSafeRecorderMimeType() {
  const preferred = ["audio/webm;codecs=opus", "audio/webm"];

  for (const type of preferred) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }

  return null;
}

export function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}

export function getClosestPlayers(rawText: string, players: string[], limit = 3) {
  const normalizedRaw = normalizeForMatch(rawText);
  const firstWord = normalizedRaw.split(" ")[0] || "";

  if (!firstWord || players.length === 0) return [];

  const scored = players.map((player) => {
    const normalizedPlayer = normalizeForMatch(player);
    const playerFirstWord = normalizedPlayer.split(" ")[0] || normalizedPlayer;

    return {
      player,
      score: levenshtein(firstWord, playerFirstWord),
    };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.player);
}

export function mergeUniqueCandidates(...lists: string[][]) {
  const merged: string[] = [];

  for (const list of lists) {
    for (const item of list) {
      if (item && !merged.includes(item)) {
        merged.push(item);
      }
    }
  }

  return merged.slice(0, 3);
}

export function normalizeCorrectionKey(text: string) {
  return normalizeForMatch(text);
}

export function hydrateRosterRows(input: unknown): RosterRow[] {
  const base = DEFAULT_ROSTER_ROWS.map((row) => ({ ...row }));

  if (!Array.isArray(input)) return base;

  input.slice(0, 23).forEach((rawRow, index) => {
    const row = rawRow as Partial<RosterRow> | null | undefined;
    if (!row) return;

    const number =
      typeof row.number === "number" && row.number >= 1 && row.number <= 23
        ? row.number
        : index + 1;

    const safeIndex = number - 1;

    base[safeIndex] = {
      number,
      name: typeof row.name === "string" ? row.name : "",
      position:
        typeof row.position === "string" && row.position
          ? row.position
          : DEFAULT_POSITION_BY_NUMBER[number] || "",
      minutes:
        typeof row.minutes === "number"
          ? Math.max(0, Math.min(120, row.minutes))
          : "",
    };
  });

  return base;
}

export function parseTeamSheetText(input: string, existingRows: RosterRow[]) {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const nextRows = hydrateRosterRows(existingRows);

  lines.slice(0, 23).forEach((line, index) => {
    const rowIndex = index;
    const defaultNumber = rowIndex + 1;

    let number = defaultNumber;
    let name = line;
    let position = "";

    const commaParts = line
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (commaParts.length >= 2) {
      const possibleNumber = Number(commaParts[0]);

      if (!Number.isNaN(possibleNumber)) {
        number = possibleNumber;
        name = commaParts[1] || "";
        position = commaParts[2] || "";
      } else {
        name = commaParts[0] || "";
        position = commaParts[1] || "";
      }
    } else {
      const match = line.match(/^(\d{1,2})\s+(.*)$/);

      if (match) {
        number = Number(match[1]);
        const remainder = match[2].trim();
        const words = remainder.split(/\s+/);

        if (words.length >= 2) {
          const maybeTwoWordPosition = words.slice(-2).join(" ");
          const maybeOneWordPosition = words.slice(-1).join(" ");

          if (POSITION_OPTIONS.includes(maybeTwoWordPosition)) {
            name = words.slice(0, -2).join(" ");
            position = maybeTwoWordPosition;
          } else if (POSITION_OPTIONS.includes(maybeOneWordPosition)) {
            name = words.slice(0, -1).join(" ");
            position = maybeOneWordPosition;
          } else {
            name = remainder;
          }
        } else {
          name = remainder;
        }
      }
    }

    const safeRowIndex = Math.max(0, Math.min(22, number - 1));
    nextRows[safeRowIndex] = {
      ...nextRows[safeRowIndex],
      number: safeRowIndex + 1,
      name,
      position: position || DEFAULT_POSITION_BY_NUMBER[safeRowIndex + 1] || "",
    };
  });

  return nextRows;
}

export function blurActiveElement() {
  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.blur === "function") {
    active.blur();
  }
}

export function getUnitFromPosition(position: string) {
  switch (position) {
    case "Prop":
    case "Hooker":
      return "Front Row";
    case "Second Row":
      return "Locks";
    case "Blindside Flanker":
    case "Openside Flanker":
    case "Number 8":
      return "Back Row";
    case "Scrum Half":
    case "Fly Half":
      return "Half Backs";
    case "Inside Centre":
    case "Outside Centre":
      return "Inside Backs";
    case "Wing":
    case "Fullback":
      return "Outside Backs";
    default:
      return "Bench";
  }
}

export function isForwardPosition(position: string) {
  return [
    "Prop",
    "Hooker",
    "Second Row",
    "Blindside Flanker",
    "Openside Flanker",
    "Number 8",
  ].includes(position);
}

export function gradeFromThresholds(
  value: number,
  dominant: number,
  competitive: number,
  below: number
): Grade {
  if (value >= dominant) return "Dominant";
  if (value >= competitive) return "Competitive";
  if (value >= below) return "Below";
  return "Poor";
}

export function gradeTacklePct(value: number): Grade {
  if (value >= 90) return "Dominant";
  if (value >= 80) return "Competitive";
  if (value >= 70) return "Below";
  return "Poor";
}

export function gradeTacklesPerMin(value: number): Grade {
  return gradeFromThresholds(value, 0.2, 0.15, 0.1);
}

export function gradeCarriesPerMin(value: number): Grade {
  return gradeFromThresholds(value, 0.18, 0.12, 0.08);
}

export function gradeInvPerMin(value: number): Grade {
  return gradeFromThresholds(value, 0.3, 0.22, 0.15);
}

export function gradeTurnovers(value: number): Grade {
  if (value >= 2) return "Dominant";
  if (value >= 1) return "Competitive";
  if (value >= 0.5) return "Below";
  return "Poor";
}

export function gradeToScore(grade: Grade) {
  if (grade === "Dominant") return 4;
  if (grade === "Competitive") return 3;
  if (grade === "Below") return 2;
  return 1;
}

export function scoreToGrade(score: number): Grade {
  if (score >= 3.5) return "Dominant";
  if (score >= 2.5) return "Competitive";
  if (score >= 1.5) return "Below";
  return "Poor";
}

export function gradeClassName(grade: Grade) {
  if (grade === "Dominant") return "text-emerald-400";
  if (grade === "Competitive") return "text-blue-400";
  if (grade === "Below") return "text-amber-400";
  return "text-rose-400";
}

export function getSessionStateLabel(args: {
  voiceModeEnabled: boolean;
  recording: boolean;
  transcribing: boolean;
  pendingResolution: PendingResolution | null;
}) {
  if (args.pendingResolution) return "Confirming player";
  if (args.transcribing) return "Processing";
  if (args.recording) return "Recording";
  if (args.voiceModeEnabled) return "Ready to tag";
  return "Idle";
}

export function isInteractiveElement(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName?.toLowerCase();
  if (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    tag === "button" ||
    el.isContentEditable
  ) {
    return true;
  }

  return !!el.closest(
    'input, textarea, select, button, [contenteditable="true"], [role="button"]'
  );
}

export async function copyTextToClipboard(text: string) {
  if (!text.trim()) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function csvEscape(value: string | number) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCoachComment(row: ReportRow) {
  if (row.overallGrade === "Dominant") {
    if (row.tacklesPerMinGrade === "Dominant") {
      return "High work rate and strong defensive output. Keep leading the line with consistency.";
    }
    if (row.carriesPerMinGrade === "Dominant") {
      return "Excellent carry output. Next step is to keep building defensive work rate.";
    }
    return "Strong all-round contribution. Maintain this level and keep sharpening detail.";
  }

  if (row.tacklePctGrade === "Poor") {
    return "Main improvement area is tackle accuracy. Reduce missed tackles first, then build volume.";
  }

  if (row.workRateGrade === "Poor") {
    return "Needs more involvements for the minutes played. Look to get into actions earlier in phases.";
  }

  if (row.carriesPerMinGrade === "Poor") {
    return "Defensive contribution is okay, but needs more attacking presence and carry volume.";
  }

  if (row.tacklesPerMinGrade === "Poor") {
    return "Needs more defensive presence for the role. Look to get into more tackle actions earlier.";
  }

  return "Solid base. Keep building work rate and quality of actions across both sides of the ball.";
}

export function buildBasicStats(players: string[], events: EventItem[]) {
  const result: Record<string, PlayerStats> = {};

  players.forEach((player) => {
    result[player] = {
      tackles: 0,
      missed: 0,
      carries: 0,
      turnovers: 0,
    };
  });

  events
    .filter((event) => !event.isPending && event.category === "player")
    .forEach((event) => {
      const matchedPlayer = event.playerName || findMatchingPlayer(players, event.text);
      if (!matchedPlayer || !result[matchedPlayer]) return;

      if (event.playerAction === "missed tackle") {
        result[matchedPlayer].missed += 1;
      } else if (event.playerAction === "tackle") {
        result[matchedPlayer].tackles += 1;
      } else if (event.playerAction === "carry") {
        result[matchedPlayer].carries += 1;
      } else if (event.playerAction === "turnover") {
        result[matchedPlayer].turnovers += 1;
      } else {
        const detected = detectStats(event.text);
        if (detected.missedTackle) {
          result[matchedPlayer].missed += 1;
        } else if (detected.tackle) {
          result[matchedPlayer].tackles += 1;
        }
        if (detected.carry) {
          result[matchedPlayer].carries += 1;
        }
        if (detected.turnover) {
          result[matchedPlayer].turnovers += 1;
        }
      }
    });

  return result;
}

export function buildSetPieceText(event: {
  setPieceType: SetPieceType;
  setPieceSide: SetPieceSide;
  lineoutResult?: string;
  scrumResult?: ScrumResult;
  notes?: string;
}) {
  const result =
    event.setPieceType === "lineout" ? event.lineoutResult : event.scrumResult;

  const base = `${event.setPieceSide} ${event.setPieceType} ${result || ""}`.trim();
  return event.notes?.trim() ? `${base} - ${event.notes.trim()}` : base;
}

export function buildTeamEventText(type: TeamEventType) {
  return titleCase(type);
}