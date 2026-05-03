import type { RosterRow } from "./types";

export const STORAGE_KEY = "rugby-voice-tagging-mvp-v2";
export const CORRECTION_MEMORY_KEY = "rugby-voice-tagging-corrections-v2";
export const TEAM_KEY = "fynlwhistle-team";
/** @deprecated Use TEAM_KEY. Kept as the old localStorage key for migration only. */
export const SQUAD_PROFILE_KEY = "rugby-tagging-squad-profile-v1";
export const ONBOARDING_COMPLETE_KEY = "rugby-onboarding-complete";
export const PLAYER_IDENTITY_KEY = "rugby-player-selected-id";
export const DEFAULT_LEARNED_CORRECTIONS: Record<string, string> = {};

export const POSITION_OPTIONS = [
  "Prop",
  "Hooker",
  "Second Row",
  "Blindside Flanker",
  "Openside Flanker",
  "Number 8",
  "Scrum Half",
  "Fly Half",
  "Wing",
  "Inside Centre",
  "Outside Centre",
  "Fullback",
  "Bench",
];

export const DEFAULT_POSITION_BY_NUMBER: Record<number, string> = {
  1: "Prop",
  2: "Hooker",
  3: "Prop",
  4: "Second Row",
  5: "Second Row",
  6: "Blindside Flanker",
  7: "Openside Flanker",
  8: "Number 8",
  9: "Scrum Half",
  10: "Fly Half",
  11: "Wing",
  12: "Inside Centre",
  13: "Outside Centre",
  14: "Wing",
  15: "Fullback",
  16: "Bench",
  17: "Bench",
  18: "Bench",
  19: "Bench",
  20: "Bench",
  21: "Bench",
  22: "Bench",
  23: "Bench",
};

export const DEFAULT_ROSTER_ROWS: RosterRow[] = Array.from({ length: 23 }, (_, index) => ({
  number: index + 1,
  name: "",
  position: DEFAULT_POSITION_BY_NUMBER[index + 1] || "",
  minutes: "",
}));