import type { ClipAnnotation, EventItem, ReviewItem, RosterRow } from "../types";

export const SAVED_MATCHES_KEY = "rugby-tagging-saved-matches-v1";
export const CURRENT_MATCH_ID_KEY = "rugby-tagging-current-match-id";
export const SAVED_MATCHES_CHANGED_EVENT = "rugby-saved-matches-changed";

export type SavedCoachReviewNote = {
  id: number;
  timestamp: number;
  text: string;
  rawText?: string;
};

export type SavedMatchRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  matchTitle: string;
  opponent: string;
  matchDate: string;
  activeMode: "stat" | "game-review";
  rosterRows: RosterRow[];
  selectedPlayer: string;
  events: EventItem[];
  reviewQueue: ReviewItem[];
  coachNotes: SavedCoachReviewNote[];
  clips?: ClipAnnotation[];
  showRawTranscript: boolean;
};

export function createMatchId() {
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getCurrentMatchId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CURRENT_MATCH_ID_KEY) || "";
}

export function setCurrentMatchId(matchId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_MATCH_ID_KEY, matchId);
}

export function clearCurrentMatchId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_MATCH_ID_KEY);
}

export function getSavedMatches(): SavedMatchRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SAVED_MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSavedMatchById(matchId: string) {
  return getSavedMatches().find((match) => match.id === matchId) || null;
}

function emitSavedMatchesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SAVED_MATCHES_CHANGED_EVENT));
}

export function replaceSavedMatches(records: SavedMatchRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(records));
  emitSavedMatchesChanged();
}

export function upsertSavedMatch(record: SavedMatchRecord) {
  if (typeof window === "undefined") return;

  const existing = getSavedMatches();
  const index = existing.findIndex((item) => item.id === record.id);

  if (index >= 0) {
    const previous = existing[index];
    existing[index] = {
      ...record,
      createdAt: previous.createdAt,
    };
  } else {
    existing.unshift(record);
  }

  replaceSavedMatches(existing);
  import("@/lib/savedMatchesCloud")
    .then(({ upsertCloudSavedMatch }) => void upsertCloudSavedMatch(record))
    .catch(() => {});
}

export function deleteSavedMatch(matchId: string) {
  if (typeof window === "undefined") return;

  const nextMatches = getSavedMatches().filter((match) => match.id !== matchId);
  replaceSavedMatches(nextMatches);
  import("@/lib/savedMatchesCloud")
    .then(({ deleteCloudSavedMatch }) => void deleteCloudSavedMatch(matchId))
    .catch(() => {});
}
