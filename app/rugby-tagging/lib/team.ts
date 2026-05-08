import { SQUAD_PROFILE_KEY, TEAM_KEY } from "../constants";
import { levenshtein } from "../helpers";
import type { Fixture, TrainingSession, AvailabilityResponse, SessionLog } from "../types";

export const TEAM_CHANGED_EVENT = "fynlwhistle-team-changed";

// Scope the team profile key per active team so that switching teams never
// reads or writes another team's data. Each team gets its own localStorage slot.
const _ACTIVE_TEAM_ID_LS = "fynlwhistle-active-team-id";
function _getActiveTeamId(): string {
  try { return localStorage.getItem(_ACTIVE_TEAM_ID_LS) ?? ""; } catch { return ""; }
}
function _scopedTeamKey(): string {
  const t = _getActiveTeamId();
  return t ? `${TEAM_KEY}-${t}` : TEAM_KEY;
}

export type SquadPlayerStatus = "active" | "injured" | "unavailable";

export type BuiltinKpiId =
  | "tackle_pct"
  | "tackles_per_min"
  | "carries_per_min"
  | "inv_per_min"
  | "lineout_pct"
  | "scrum_pct";

export type BuiltinKpiTarget = {
  type: "builtin-target";
  id: BuiltinKpiId;
  dominantThreshold: number;
  competitiveThreshold: number;
  belowThreshold: number;
};

export type ManualKpi = {
  type: "manual";
  id: string;
  name: string;
  unit: "%" | "number" | "per_min";
  targetValue: number;
  description?: string;
};

export type CustomKpiConfig = BuiltinKpiTarget | ManualKpi;

export const DEFAULT_BUILTIN_TARGETS: BuiltinKpiTarget[] = [
  { type: "builtin-target", id: "tackle_pct", dominantThreshold: 90, competitiveThreshold: 80, belowThreshold: 70 },
  { type: "builtin-target", id: "tackles_per_min", dominantThreshold: 0.2, competitiveThreshold: 0.15, belowThreshold: 0.1 },
  { type: "builtin-target", id: "carries_per_min", dominantThreshold: 0.18, competitiveThreshold: 0.12, belowThreshold: 0.08 },
  { type: "builtin-target", id: "inv_per_min", dominantThreshold: 0.3, competitiveThreshold: 0.22, belowThreshold: 0.15 },
  { type: "builtin-target", id: "lineout_pct", dominantThreshold: 90, competitiveThreshold: 80, belowThreshold: 70 },
  { type: "builtin-target", id: "scrum_pct", dominantThreshold: 90, competitiveThreshold: 80, belowThreshold: 70 },
];

export type SquadPlayer = {
  id: string;
  fullName: string;
  preferredName: string;
  nicknames: string[];
  primaryPosition: string;
  secondaryPositions: string[];
  jerseyNumber: number | null;
  voiceSamples: string[];
  status: SquadPlayerStatus;
  email?: string;        // set when coach invites this player
  linkedUserId?: string; // set after invite is accepted
};

export type ActionSample = {
  action: string;
  patterns: string[];
};

export type CorrectionMemoryEntry = {
  rawWhisperText: string;
  resolvedPlayerName: string;
  resolvedAction: string;
  count: number;
};

export type Team = {
  id: string;         // teams.id UUID (database primary key)
  profileId: string;  // legacy app-generated id, carried forward for reference
  teamName: string;
  coachName: string;
  primaryColour: string;
  secondaryColour: string;
  logoUrl: string;
  players: SquadPlayer[];
  actionSamples: ActionSample[];
  correctionMemory: CorrectionMemoryEntry[];
  kpiTargets?: CustomKpiConfig[];
  leaguePosition?: number;
  fixtures?: Fixture[];
  trainingSessions?: TrainingSession[];
  availabilityResponses?: AvailabilityResponse[];
  sessionLogs?: SessionLog[];
  aiChatHistory?: { role: "user" | "assistant"; content: string; ts?: string }[];
  createdAt: string;
  updatedAt: string;
};

export function createPlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFixtureId(): string {
  return `fixture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTrainingSessionId(): string {
  return `tsession_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSessionLogId(): string {
  return `slog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultTeam(): Team {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    profileId: "",
    teamName: "",
    coachName: "",
    primaryColour: "",
    secondaryColour: "",
    logoUrl: "",
    players: [],
    actionSamples: [],
    correctionMemory: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Migrates localStorage data from the old SQUAD_PROFILE_KEY to the new TEAM_KEY.
// Runs once per session on first read; safe to call repeatedly.
function migrateTeamLocalStorageKey(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(TEAM_KEY) !== null) return; // already migrated

  const oldRaw = localStorage.getItem(SQUAD_PROFILE_KEY);
  if (!oldRaw) return;

  try {
    // Preserve the raw data as-is under the new key. The cloud sync step will
    // reconcile the old profileId (squad_...) with the DB UUID after first sync.
    localStorage.setItem(TEAM_KEY, oldRaw);
    localStorage.removeItem(SQUAD_PROFILE_KEY);
  } catch {
    // If storage write fails, leave old key in place — next read will retry.
  }
}

/** Returns the localStorage key used for the active team's profile. */
export function getScopedTeamKey(): string { return _scopedTeamKey(); }

export function getTeam(): Team | null {
  if (typeof window === "undefined") return null;

  migrateTeamLocalStorageKey();

  try {
    const raw = localStorage.getItem(_scopedTeamKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.profileId && parsed.id && typeof parsed.id === "string" && !parsed.id.match(/^[0-9a-f-]{36}$/)) {
      parsed.profileId = parsed.id;
    }
    return parsed as Team;
  } catch {
    return null;
  }
}

export function saveTeam(team: Team): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(_scopedTeamKey(), JSON.stringify(team));
  window.dispatchEvent(new Event(TEAM_CHANGED_EVENT));
  import("@/lib/teamCloud")
    .then(({ upsertCloudTeam }) => void upsertCloudTeam(team))
    .catch(() => {});
}

export function clearTeam(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(_scopedTeamKey());
}

export function upsertSquadPlayer(
  team: Team,
  player: SquadPlayer
): Team {
  const exists = team.players.findIndex((p) => p.id === player.id) >= 0;
  const players = exists
    ? team.players.map((p) => (p.id === player.id ? player : p))
    : [...team.players, player];

  return { ...team, players, updatedAt: new Date().toISOString() };
}

export function removeSquadPlayer(
  team: Team,
  playerId: string
): Team {
  return {
    ...team,
    players: team.players.filter((p) => p.id !== playerId),
    updatedAt: new Date().toISOString(),
  };
}

export function findPlayerByName(
  team: Team,
  name: string
): SquadPlayer | null {
  const needle = name.toLowerCase().trim();
  return (
    team.players.find((p) => {
      if (p.fullName.toLowerCase() === needle) return true;
      if (p.preferredName.toLowerCase() === needle) return true;
      return p.nicknames.some((n) => n.toLowerCase() === needle);
    }) ?? null
  );
}

export function resolvePlayerName(
  team: Team,
  name: string
): string | null {
  const exact = findPlayerByName(team, name);
  if (exact) return exact.fullName;

  const needle = name.toLowerCase().trim();
  const surnameMatch = team.players.find((p) => {
    const parts = p.fullName.trim().split(/\s+/);
    const surname = parts[parts.length - 1]?.toLowerCase() ?? "";
    return surname.length > 1 && surname === needle;
  });
  if (surnameMatch) return surnameMatch.fullName;

  // Fuzzy surname fallback: catches Whisper mishearings (e.g. "Thomson" → "Thompson")
  const fuzzyMatch = team.players.find((p) => {
    const parts = p.fullName.trim().split(/\s+/);
    const surname = parts[parts.length - 1]?.toLowerCase() ?? "";
    return surname.length >= 4 && levenshtein(surname, needle) <= 1;
  });

  return fuzzyMatch?.fullName ?? null;
}

export function addCorrectionEntry(
  team: Team,
  rawWhisperText: string,
  resolvedPlayerName: string,
  resolvedAction: string
): Team {
  const existing = team.correctionMemory.find(
    (e) => e.rawWhisperText === rawWhisperText
  );

  const correctionMemory = existing
    ? team.correctionMemory.map((e) =>
        e.rawWhisperText === rawWhisperText ? { ...e, count: e.count + 1 } : e
      )
    : [
        ...team.correctionMemory,
        { rawWhisperText, resolvedPlayerName, resolvedAction, count: 1 },
      ];

  return { ...team, correctionMemory, updatedAt: new Date().toISOString() };
}

const MAX_VOICE_SAMPLES = 20;

export function addVoiceSample(
  team: Team,
  playerId: string,
  sample: string
): Team {
  const players = team.players.map((p) => {
    if (p.id !== playerId) return p;
    if (p.voiceSamples.includes(sample)) return p;

    const voiceSamples = [...p.voiceSamples, sample].slice(-MAX_VOICE_SAMPLES);
    return { ...p, voiceSamples };
  });

  return { ...team, players, updatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Backwards-compatibility aliases — remove in Move 2.5
// ---------------------------------------------------------------------------

/** @deprecated Use Team */
export type SquadProfile = Team;
/** @deprecated Use TEAM_CHANGED_EVENT */
export const SQUAD_PROFILE_CHANGED_EVENT = TEAM_CHANGED_EVENT;
/** @deprecated Use getTeam */
export const getSquadProfile = getTeam;
/** @deprecated Use saveTeam */
export const saveSquadProfile = saveTeam;
/** @deprecated Use clearTeam */
export const clearSquadProfile = clearTeam;
/** @deprecated Use createDefaultTeam */
export const createDefaultSquadProfile = createDefaultTeam;
/** @deprecated Use upsertSquadPlayer (signature unchanged) */
// upsertSquadPlayer already works for both Team and SquadProfile since they're the same type.
// @deprecated Use resolvePlayerName */
// resolvePlayerName already works for both.

/** @deprecated Generates a legacy squad_ id — prefer crypto.randomUUID() */
export function createSquadProfileId(): string {
  return `squad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
