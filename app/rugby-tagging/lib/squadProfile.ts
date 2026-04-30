import { SQUAD_PROFILE_KEY } from "../constants";
import { levenshtein } from "../helpers";
import type { Fixture, TrainingSession, AvailabilityResponse, SessionLog } from "../types";

export const SQUAD_PROFILE_CHANGED_EVENT = "rugby-squad-profile-changed";

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

export type SquadProfile = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export function createPlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSquadProfileId(): string {
  return `squad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

export function createDefaultSquadProfile(): SquadProfile {
  const now = new Date().toISOString();
  return {
    id: createSquadProfileId(),
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

export function getSquadProfile(): SquadProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SQUAD_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SquadProfile;
  } catch {
    return null;
  }
}

export function saveSquadProfile(profile: SquadProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SQUAD_PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(SQUAD_PROFILE_CHANGED_EVENT));
  import("@/lib/squadProfileCloud")
    .then(({ upsertCloudSquadProfile }) => void upsertCloudSquadProfile(profile))
    .catch(() => {});
}

export function clearSquadProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SQUAD_PROFILE_KEY);
}

export function upsertSquadPlayer(
  profile: SquadProfile,
  player: SquadPlayer
): SquadProfile {
  const exists = profile.players.findIndex((p) => p.id === player.id) >= 0;
  const players = exists
    ? profile.players.map((p) => (p.id === player.id ? player : p))
    : [...profile.players, player];

  return { ...profile, players, updatedAt: new Date().toISOString() };
}

export function removeSquadPlayer(
  profile: SquadProfile,
  playerId: string
): SquadProfile {
  return {
    ...profile,
    players: profile.players.filter((p) => p.id !== playerId),
    updatedAt: new Date().toISOString(),
  };
}

export function findPlayerByName(
  profile: SquadProfile,
  name: string
): SquadPlayer | null {
  const needle = name.toLowerCase().trim();
  return (
    profile.players.find((p) => {
      if (p.fullName.toLowerCase() === needle) return true;
      if (p.preferredName.toLowerCase() === needle) return true;
      return p.nicknames.some((n) => n.toLowerCase() === needle);
    }) ?? null
  );
}

export function resolvePlayerName(
  profile: SquadProfile,
  name: string
): string | null {
  const exact = findPlayerByName(profile, name);
  if (exact) return exact.fullName;

  const needle = name.toLowerCase().trim();
  const surnameMatch = profile.players.find((p) => {
    const parts = p.fullName.trim().split(/\s+/);
    const surname = parts[parts.length - 1]?.toLowerCase() ?? "";
    return surname.length > 1 && surname === needle;
  });
  if (surnameMatch) return surnameMatch.fullName;

  // Fuzzy surname fallback: catches Whisper mishearings (e.g. "Thomson" → "Thompson")
  const fuzzyMatch = profile.players.find((p) => {
    const parts = p.fullName.trim().split(/\s+/);
    const surname = parts[parts.length - 1]?.toLowerCase() ?? "";
    return surname.length >= 4 && levenshtein(surname, needle) <= 1;
  });

  return fuzzyMatch?.fullName ?? null;
}

export function addCorrectionEntry(
  profile: SquadProfile,
  rawWhisperText: string,
  resolvedPlayerName: string,
  resolvedAction: string
): SquadProfile {
  const existing = profile.correctionMemory.find(
    (e) => e.rawWhisperText === rawWhisperText
  );

  const correctionMemory = existing
    ? profile.correctionMemory.map((e) =>
        e.rawWhisperText === rawWhisperText ? { ...e, count: e.count + 1 } : e
      )
    : [
        ...profile.correctionMemory,
        { rawWhisperText, resolvedPlayerName, resolvedAction, count: 1 },
      ];

  return { ...profile, correctionMemory, updatedAt: new Date().toISOString() };
}

const MAX_VOICE_SAMPLES = 20;

export function addVoiceSample(
  profile: SquadProfile,
  playerId: string,
  sample: string
): SquadProfile {
  const players = profile.players.map((p) => {
    if (p.id !== playerId) return p;
    if (p.voiceSamples.includes(sample)) return p;

    const voiceSamples = [...p.voiceSamples, sample].slice(-MAX_VOICE_SAMPLES);
    return { ...p, voiceSamples };
  });

  return { ...profile, players, updatedAt: new Date().toISOString() };
}
