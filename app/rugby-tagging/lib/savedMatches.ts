import type { ClipAnnotation, EventItem, ReviewItem, RosterRow } from "../types";

export const SAVED_MATCHES_KEY = "rugby-tagging-saved-matches-v1";
export const CURRENT_MATCH_ID_KEY = "rugby-tagging-current-match-id";
export const SAVED_MATCHES_CHANGED_EVENT = "rugby-saved-matches-changed";

// Reads the active team ID written by teamContext — no import needed (avoids circular deps).
const ACTIVE_TEAM_ID_KEY = "fynlwhistle-active-team-id";
function getActiveTeamId(): string {
  try { return localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? ""; } catch { return ""; }
}
function scopedMatchIdKey(): string {
  const t = getActiveTeamId();
  return t ? `${CURRENT_MATCH_ID_KEY}-${t}` : CURRENT_MATCH_ID_KEY;
}

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
  videoStoragePath?: string;
};

export function createMatchId() {
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getCurrentMatchId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(scopedMatchIdKey()) || "";
}

export function setCurrentMatchId(matchId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedMatchIdKey(), matchId);
}

export function clearCurrentMatchId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(scopedMatchIdKey());
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

export function subscribeSavedMatchesChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SAVED_MATCHES_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SAVED_MATCHES_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
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
    .then(({ upsertCloudSavedMatch }) => upsertCloudSavedMatch(record))
    .then((result) => {
      if (result && !result.ok) {
        window.dispatchEvent(
          new CustomEvent("fynlwhistle-cloud-sync-error", { detail: [result.error ?? "Cloud sync failed"] })
        );
      }
    })
    .catch((err: unknown) => {
      window.dispatchEvent(
        new CustomEvent("fynlwhistle-cloud-sync-error", { detail: [String(err)] })
      );
    });
}

export function deleteSavedMatch(matchId: string) {
  if (typeof window === "undefined") return;

  const matchToDelete = getSavedMatchById(matchId);
  const nextMatches = getSavedMatches().filter((match) => match.id !== matchId);
  replaceSavedMatches(nextMatches);

  if (matchToDelete?.videoStoragePath) {
    import("@/lib/matchVideoCloud")
      .then(({ deleteMatchVideo }) =>
        deleteMatchVideo(matchToDelete.videoStoragePath!).then((result) => {
          if (!result.ok) console.error("Failed to delete match video", result.error);
        })
      )
      .catch((error) => console.error("Failed to delete match video", error));
  }

  import("@/lib/savedMatchesCloud")
    .then(({ deleteCloudSavedMatch }) => void deleteCloudSavedMatch(matchId))
    .catch(() => {});
}
