import type { EventItem, RosterRow } from "../types";

export type MatchConfidenceSummary = {
  title: string;
  subtitle: string;
  updatedLabel: string;
  namedPlayers: number;
  totalPlayers: number;
  minutesComplete: number;
  resolvedEvents: number;
  pendingEvents: number;
  unresolvedReview: number;
  notes: number;
  isReadyForReport: boolean;
  readyLabel: string;
  readyTone: "ready" | "needs-work";
};

type MatchLike = {
  matchTitle?: string;
  opponent?: string;
  matchDate?: string;
  updatedAt?: string;
  rosterRows?: RosterRow[];
  events?: EventItem[];
  reviewQueue?: unknown[];
  coachNotes?: unknown[];
};

export function formatMatchTitle(match: MatchLike | null | undefined) {
  const title = match?.matchTitle?.trim();
  return title || "Untitled match";
}

export function formatMatchSubtitle(match: MatchLike | null | undefined) {
  const parts = [
    match?.opponent?.trim() ? `vs ${match.opponent.trim()}` : "",
    match?.matchDate?.trim() || "",
  ].filter(Boolean);

  return parts.join(" - ") || "No opponent or date added";
}

export function formatUpdatedLabel(updatedAt?: string) {
  if (!updatedAt) return "Not saved yet";

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Not saved yet";

  return date.toLocaleString();
}

export function countNamedPlayers(rosterRows?: RosterRow[]) {
  if (!Array.isArray(rosterRows)) return 0;
  return rosterRows.filter((row) => row.name.trim()).length;
}

export function countCompletedMinutes(rosterRows?: RosterRow[]) {
  if (!Array.isArray(rosterRows)) return 0;
  return rosterRows.filter(
    (row) => row.name.trim() && typeof row.minutes === "number"
  ).length;
}

export function getResolvedEvents(events?: EventItem[]) {
  if (!Array.isArray(events)) return [];
  return events.filter((event) => !event.isPending);
}

export function countPendingEvents(events?: EventItem[]) {
  if (!Array.isArray(events)) return 0;
  return events.filter((event) => event.isPending).length;
}

export function buildMatchConfidenceSummary(
  match: MatchLike | null | undefined
): MatchConfidenceSummary {
  const rosterRows = Array.isArray(match?.rosterRows) ? match.rosterRows : [];
  const events = Array.isArray(match?.events) ? match.events : [];
  const namedPlayers = countNamedPlayers(rosterRows);
  const minutesComplete = countCompletedMinutes(rosterRows);
  const resolvedEvents = getResolvedEvents(events).length;
  const pendingEvents = countPendingEvents(events);
  const unresolvedReview = Array.isArray(match?.reviewQueue)
    ? match.reviewQueue.length
    : 0;
  const notes = Array.isArray(match?.coachNotes) ? match.coachNotes.length : 0;
  const isReadyForReport =
    namedPlayers > 0 &&
    resolvedEvents > 0 &&
    pendingEvents === 0 &&
    unresolvedReview === 0;

  return {
    title: formatMatchTitle(match),
    subtitle: formatMatchSubtitle(match),
    updatedLabel: formatUpdatedLabel(match?.updatedAt),
    namedPlayers,
    totalPlayers: rosterRows.length,
    minutesComplete,
    resolvedEvents,
    pendingEvents,
    unresolvedReview,
    notes,
    isReadyForReport,
    readyLabel: isReadyForReport ? "Ready for report" : "Needs review",
    readyTone: isReadyForReport ? "ready" : "needs-work",
  };
}
