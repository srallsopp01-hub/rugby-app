import type { ClipAnnotation, EventItem, ReviewItem, RosterRow } from "../types";

export const SAVED_MATCHES_CHANGED_EVENT = "rugby-saved-matches-changed";
export const CLOUD_SYNC_ERROR_EVENT = "fynlwhistle-cloud-sync-error";

// In-progress capture session ID — scoped per team so switching teams never
// carries over a stale match ID. This is the only localStorage usage kept here;
// the session ID is ephemeral and not part of the persistent data model.
const ACTIVE_TEAM_ID_KEY = "fynlwhistle-active-team-id";
const CURRENT_MATCH_ID_KEY = "rugby-tagging-current-match-id";

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
  ourScore?: number;
  opponentScore?: number;
};

// In-memory cache — populated by MatchesContext after fetching from Supabase.
// Only mutated by setMatchesCache, upsertSavedMatch, and deleteSavedMatch.
// External reads go through useMatches() — do NOT add new getSaved* exports.
let _matchesCache: SavedMatchRecord[] = [];
export function setMatchesCache(matches: SavedMatchRecord[]): void { _matchesCache = matches; }

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

export function upsertSavedMatch(record: SavedMatchRecord) {
  // Optimistic cache update so pages re-render immediately.
  const prev = [..._matchesCache];
  const idx = prev.findIndex((m) => m.id === record.id);
  if (idx >= 0) { prev[idx] = record; } else { prev.unshift(record); }
  setMatchesCache(prev);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_MATCHES_CHANGED_EVENT, { detail: prev }));
  }
  // Persist to Supabase asynchronously.
  import("@/lib/savedMatchesCloud")
    .then(({ upsertCloudSavedMatch }) => upsertCloudSavedMatch(record))
    .then((result) => {
      if (typeof window !== "undefined" && result && !result.ok) {
        window.dispatchEvent(
          new CustomEvent("fynlwhistle-cloud-sync-error", { detail: [result.error ?? "Cloud sync failed"] })
        );
      }
    })
    .catch((err: unknown) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fynlwhistle-cloud-sync-error", { detail: [String(err)] })
        );
      }
    });
}

export function deleteSavedMatch(matchId: string, videoStoragePath?: string) {
  // Optimistic cache update.
  const updated = _matchesCache.filter((m) => m.id !== matchId);
  setMatchesCache(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_MATCHES_CHANGED_EVENT, { detail: updated }));
  }

  if (videoStoragePath) {
    import("@/lib/matchVideoCloud")
      .then(({ deleteMatchVideo }) =>
        deleteMatchVideo(videoStoragePath).then((result) => {
          if (!result.ok) console.error("Failed to delete match video", result.error);
        })
      )
      .catch((error) => console.error("Failed to delete match video", error));
  }

  import("@/lib/savedMatchesCloud")
    .then(({ deleteCloudSavedMatch }) => deleteCloudSavedMatch(matchId))
    .catch(() => {});
}
