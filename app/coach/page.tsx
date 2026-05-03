"use client";

import { useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shouldStartCoachOnboarding } from "@/app/rugby-tagging/lib/onboarding";
import {
  SAVED_MATCHES_KEY,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import { SQUAD_PROFILE_KEY } from "@/app/rugby-tagging/constants";
import {
  saveSquadProfile,
  createSessionLogId,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/team";
import {
  buildReportRowsFromMatch,
  buildTeamTotals,
  buildTeamEventSummary,
  buildSetPieceSummary,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import type { EventItem, SessionLog, TrainingSession } from "@/app/rugby-tagging/types";
import { GradeBadge } from "@/app/components/GradeBadge";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "./help-content";
import { DashboardChat } from "./DashboardChat";
import { upsertCloudSquadProfile } from "@/lib/teamCloud";
import { fetchNotifyRequests } from "@/lib/teamMembersCloud";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOCUS_AREAS = ["Lineout", "Scrum", "Defence", "Attack", "Fitness", "Skills", "Set piece", "Other"];

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const emptyArray = "[]";
const emptyObj = "{}";
const subscribeToStorage = () => () => {};

function getSavedMatchesSnapshot() {
  if (typeof window === "undefined") return emptyArray;
  return localStorage.getItem(SAVED_MATCHES_KEY) || emptyArray;
}
function getSquadProfileSnapshot() {
  if (typeof window === "undefined") return emptyObj;
  return localStorage.getItem(SQUAD_PROFILE_KEY) || emptyObj;
}

function parseSavedMatches(snapshot: string): SavedMatchRecord[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function parseSquadProfile(snapshot: string): SquadProfile | null {
  try {
    const parsed = JSON.parse(snapshot);
    return parsed && typeof parsed === "object" ? (parsed as SquadProfile) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function runAndBlur(handler: () => void, e: React.MouseEvent<HTMLButtonElement>) {
  handler();
  e.currentTarget.blur();
}

const DOW_INDEX: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 0,
};

function isSessionThisWeek(session: TrainingSession): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  if (session.oneOffDate) {
    const d = new Date(session.oneOffDate + "T00:00:00");
    return d >= monday && d <= sunday;
  }

  const sessionDay = DOW_INDEX[session.dayOfWeek ?? ""] ?? -1;
  if (sessionDay === -1) return false;
  const sessionDate = new Date(monday);
  const daysFromMonday = sessionDay === 0 ? 6 : sessionDay - 1;
  sessionDate.setDate(monday.getDate() + daysFromMonday);
  return sessionDate >= monday && sessionDate <= sunday;
}

function formatFixtureDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function compactFixtureDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const weekday = d.toLocaleDateString("en-AU", { weekday: "short" });
    const day = d.getDate();
    return `${weekday} ${day}`;
  } catch {
    return dateStr;
  }
}

function fixtureDay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").getDate().toString();
  } catch {
    return "--";
  }
}

function fixtureMonth(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", { month: "short" }).toUpperCase();
  } catch {
    return "---";
  }
}

function fixtureDayName(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long" });
  } catch {
    return "";
  }
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function todayDow(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

function yesterdayDow(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[(new Date().getDay() + 6) % 7];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

function avatarColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function buildAiRecommendation(
  profile: SquadProfile | null,
  savedMatches: SavedMatchRecord[],
): { text: string; chips: string[] } {
  if (!savedMatches.length || !profile) {
    return {
      text: "No match data yet — capture your first match to get personalised recommendations.",
      chips: ["How do I capture a match?", "What stats does the app track?", "How does grading work?"],
    };
  }

  const lastMatch = [...savedMatches].sort((a, b) =>
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  )[0];

  const events = (lastMatch.events || []).filter((e: EventItem) => !e.isPending);
  const rows = buildReportRowsFromMatch(lastMatch.rosterRows, events);
  const totals = buildTeamTotals(rows);
  const setPiece = buildSetPieceSummary(events);
  const teamEvents = buildTeamEventSummary(events);
  const tacklePct = teamTacklePctFromTotals(totals);

  if (setPiece.ownLineoutSuccessPct > 0 && setPiece.ownLineoutSuccessPct < 80) {
    return {
      text: `Lineout retention is at ${Math.round(setPiece.ownLineoutSuccessPct)}% — below the 80% target. Prioritise lineout set piece this week, focusing on your jumpers and pod timing.`,
      chips: ["Plan a lineout session", "What jumper combinations should I use?", "How do I analyse lineout data?"],
    };
  }
  if (tacklePct > 0 && tacklePct < 85) {
    return {
      text: `Team tackle completion is at ${Math.round(tacklePct)}%. Focus on defensive line organisation and individual tackle technique in your next session.`,
      chips: ["Give me a contact drill", "Which positions are missing most tackles?", "How do I improve tackle rate?"],
    };
  }
  if (teamEvents.triesConceded > teamEvents.triesScored) {
    return {
      text: `You conceded more tries (${teamEvents.triesConceded}) than you scored (${teamEvents.triesScored}) in the last match. Review your defensive line shape and kick-chase organisation.`,
      chips: ["How should I set up defensive review?", "What defensive drills do you recommend?", "Which players to focus on?"],
    };
  }

  return {
    text: `Strong baseline — tackle completion at ${Math.round(tacklePct)}% and lineout at ${Math.round(setPiece.ownLineoutSuccessPct)}%. Push for consistency and look for 1–2% improvements across your KPIs.`,
    chips: ["How should I structure training this week?", "Which players are trending up?", "What should I work on in attack?"],
  };
}

function buildContextString(profile: SquadProfile | null, savedMatches: SavedMatchRecord[]): string {
  const parts: string[] = [];

  const today = todayIso();
  const fixtures = profile?.fixtures ?? [];
  const nextFixture = fixtures
    .filter((f) => f.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (nextFixture) {
    const days = daysUntil(nextFixture.date);
    parts.push(`Next fixture: vs ${nextFixture.opponent} on ${formatFixtureDate(nextFixture.date)} (${days} day${days !== 1 ? "s" : ""} away), ${nextFixture.homeOrAway}${nextFixture.round ? `, Round ${nextFixture.round}` : ""}.`);
  }

  if (savedMatches.length) {
    const lastMatch = [...savedMatches].sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    )[0];
    const events = (lastMatch.events || []).filter((e: EventItem) => !e.isPending);
    const rows = buildReportRowsFromMatch(lastMatch.rosterRows, events);
    const totals = buildTeamTotals(rows);
    const setPiece = buildSetPieceSummary(events);
    const teamEvents = buildTeamEventSummary(events);
    const tacklePct = teamTacklePctFromTotals(totals);
    parts.push(
      `Last match (${lastMatch.opponent || "unknown opponent"}, ${lastMatch.matchDate || "unknown date"}): ` +
      `tackle completion ${Math.round(tacklePct)}%, lineout ${Math.round(setPiece.ownLineoutSuccessPct)}%, ` +
      `scrum ${Math.round(setPiece.ownScrumSuccessPct)}%, tries scored ${teamEvents.triesScored}, tries conceded ${teamEvents.triesConceded}.`
    );
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLog = (profile?.sessionLogs ?? [])
    .filter((l) => l.date >= sevenDaysAgo.toISOString().slice(0, 10))
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (recentLog) {
    parts.push(
      `Last training session (${recentLog.date}): focused on ${recentLog.focusAreas.join(", ")}, rated ${recentLog.sessionRating}${recentLog.playerNotes ? `. Notes: ${recentLog.playerNotes}` : ""}.`
    );
  }

  if (!parts.length) return "";
  return `Team context:\n${parts.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Section label helper
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-2">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard component
// ---------------------------------------------------------------------------

export default function CoachDashboardPage() {
  const router = useRouter();

  const savedMatchesSnapshot = useSyncExternalStore(subscribeToStorage, getSavedMatchesSnapshot, () => emptyArray);
  const squadProfileSnapshot = useSyncExternalStore(subscribeToStorage, getSquadProfileSnapshot, () => emptyObj);

  const savedMatches = useMemo(() => parseSavedMatches(savedMatchesSnapshot), [savedMatchesSnapshot]);
  const profile = useMemo(() => parseSquadProfile(squadProfileSnapshot), [squadProfileSnapshot]);

  const [checkoutSuccess, setCheckoutSuccess] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("checkout") === "success";
  });

  useEffect(() => {
    if (!checkoutSuccess) return;
    window.history.replaceState({}, "", "/coach");
    const t = setTimeout(() => setCheckoutSuccess(false), 6000);
    return () => clearTimeout(t);
  }, [checkoutSuccess]);

  useEffect(() => {
    if (shouldStartCoachOnboarding()) router.replace("/coach/onboarding");
  }, [router]);

  const [notifyRequestCount, setNotifyRequestCount] = useState(0);
  useEffect(() => {
    void fetchNotifyRequests().then((reqs) => setNotifyRequestCount(reqs.length));
  }, []);

  const [showAvailDetails, setShowAvailDetails] = useState(false);
  type RemindStatus = "idle" | "sending" | "sent" | "error";
  const [remindStatus, setRemindStatus] = useState<RemindStatus>("idle");
  const [expandedFixtureId, setExpandedFixtureId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  async function sendAvailabilityReminder(fixtureId: string) {
    setRemindStatus("sending");
    try {
      const res = await fetch("/api/availability/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId }),
      });
      if (!res.ok) throw new Error("Failed");
      setRemindStatus("sent");
      setTimeout(() => setRemindStatus("idle"), 4000);
    } catch {
      setRemindStatus("error");
      setTimeout(() => setRemindStatus("idle"), 4000);
    }
  }

  const today = todayIso();
  const fixtures = useMemo(() => profile?.fixtures ?? [], [profile]);
  const trainingSessions = useMemo(() => profile?.trainingSessions ?? [], [profile]);
  const availabilityResponses = useMemo(() => profile?.availabilityResponses ?? [], [profile]);
  const sessionLogs = useMemo(() => profile?.sessionLogs ?? [], [profile]);

  const sortedFixtures = useMemo(
    () => [...fixtures].sort((a, b) => a.date.localeCompare(b.date)),
    [fixtures]
  );
  const nextFixture = useMemo(
    () => sortedFixtures.find((f) => f.date >= today) ?? null,
    [sortedFixtures, today]
  );
  const thisWeekSessions = useMemo(
    () => trainingSessions.filter(isSessionThisWeek),
    [trainingSessions]
  );

  const sortedMatches = useMemo(
    () => [...savedMatches].sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    ),
    [savedMatches]
  );
  const lastMatch = sortedMatches[0] ?? null;
  const previousMatch = sortedMatches[1] ?? null;

  const lastMatchData = useMemo(() => {
    if (!lastMatch) return null;
    const events = (lastMatch.events || []).filter((e: EventItem) => !e.isPending);
    const rows = buildReportRowsFromMatch(lastMatch.rosterRows, events);
    const totals = buildTeamTotals(rows);
    const teamEvents = buildTeamEventSummary(events);
    return { rows, totals, teamEvents };
  }, [lastMatch]);

  const prevMatchData = useMemo(() => {
    if (!previousMatch) return null;
    const events = (previousMatch.events || []).filter((e: EventItem) => !e.isPending);
    const rows = buildReportRowsFromMatch(previousMatch.rosterRows, events);
    return { rows };
  }, [previousMatch]);

  const seasonStats = useMemo(() => {
    if (!savedMatches.length) return null;
    let wins = 0;
    let totalTriesFor = 0;
    let totalTriesAgainst = 0;
    for (const m of savedMatches) {
      const evts = (m.events || []).filter((e: EventItem) => !e.isPending);
      const te = buildTeamEventSummary(evts);
      if (te.triesScored > te.triesConceded) wins++;
      totalTriesFor += te.triesScored;
      totalTriesAgainst += te.triesConceded;
    }
    return {
      played: savedMatches.length,
      wins,
      losses: savedMatches.length - wins,
      tryDiff: totalTriesFor - totalTriesAgainst,
      totalTriesFor,
      totalTriesAgainst,
    };
  }, [savedMatches]);

  const playersToWatch = useMemo(() => {
    if (!lastMatchData) return null;
    const eligible = lastMatchData.rows.filter((r) => r.minutes >= 20);
    if (!eligible.length) return null;
    const sorted = [...eligible].sort((a, b) => b.tacklePct - a.tacklePct);
    const star = sorted[0];
    const focus = sorted[sorted.length - 1];
    if (star === focus) return { star, focus: null };

    const prevTacklePct = (name: string) => {
      if (!prevMatchData) return null;
      const prev = prevMatchData.rows.find((r) => r.name === name);
      return prev ? prev.tacklePct : null;
    };

    return {
      star,
      starPrevTacklePct: prevTacklePct(star.name),
      focus: focus !== star ? focus : null,
      focusPrevTacklePct: focus !== star ? prevTacklePct(focus.name) : null,
    };
  }, [lastMatchData, prevMatchData]);

  const { text: aiText, chips: aiChips } = useMemo(
    () => buildAiRecommendation(profile, savedMatches),
    [profile, savedMatches]
  );

  const contextString = useMemo(
    () => buildContextString(profile, savedMatches),
    [profile, savedMatches]
  );

  const pendingCheckIn = (() => {
    const todayDowStr = todayDow();
    const yestDowStr = yesterdayDow();
    const todayStr = todayIso();
    const yestStr = yesterdayIso();
    for (const session of trainingSessions) {
      if (!session.dayOfWeek) continue;
      if (session.dayOfWeek !== todayDowStr && session.dayOfWeek !== yestDowStr) continue;
      const sessionDate = session.dayOfWeek === todayDowStr ? todayStr : yestStr;
      const alreadyLogged = sessionLogs.some(
        (l) => l.trainingSessionId === session.id && l.date === sessionDate
      );
      if (!alreadyLogged) return { session, sessionDate };
    }
    return null;
  })();

  const [leaguePositionDraft, setLeaguePositionDraft] = useState<string>(
    profile?.leaguePosition !== undefined ? String(profile.leaguePosition) : ""
  );

  function scrollToChat() {
    document.getElementById("dashboard-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const coachName = profile?.coachName || "";
  const teamName = profile?.teamName || "";
  const greeting = getGreeting();

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">

        {/* Checkout success */}
        {checkoutSuccess && (
          <div className="flex items-center justify-between rounded-xl border border-success/35 bg-success/10 px-5 py-4 text-sm font-semibold text-success">
            <span>Your 14-day free trial has started — you&apos;re all set.</span>
            <button type="button" onClick={(e) => runAndBlur(() => setCheckoutSuccess(false), e)} className="ml-4 text-success/60 hover:text-success">
              Close
            </button>
          </div>
        )}

        {/* Header — personalized greeting */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                  {greeting}{coachName ? `, ${coachName}` : ""}
                </h1>
                <PageHelp {...COACH_PAGE_HELP["/coach"]} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {teamName && <span className="font-medium text-foreground">{teamName}</span>}
                {teamName && " · "}
                {formatToday()}
              </p>
            </div>
          </div>
          {nextFixture && (() => {
            const days = daysUntil(nextFixture.date);
            return (
              <div className="shrink-0 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent">Next match</div>
                <div className="mt-0.5 text-sm font-bold text-accent">
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                </div>
                <div className="text-[10px] text-muted-2">vs {nextFixture.opponent}</div>
              </div>
            );
          })()}
        </div>

        {/* Pending requests notification */}
        {notifyRequestCount > 0 && (
          <Link
            href="/coach/team"
            className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3.5 text-sm transition hover:border-amber-500/60"
          >
            <span className="text-amber-300">
              <span className="font-semibold">{notifyRequestCount} player{notifyRequestCount !== 1 ? "s" : ""}</span>
              {" couldn't find themselves on your squad"}
            </span>
            <span className="shrink-0 font-semibold text-amber-400">View on team page →</span>
          </Link>
        )}

        {/* Season at a glance — only when fixtures exist */}
        {fixtures.length > 0 && (
          <div>
            <SectionLabel>Season at a Glance</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* League position */}
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">League Position</div>
                <input
                  type="number"
                  min={1}
                  value={leaguePositionDraft}
                  onChange={(e) => setLeaguePositionDraft(e.target.value)}
                  onBlur={() => {
                    if (!profile) return;
                    const pos = parseInt(leaguePositionDraft, 10);
                    const updated = { ...profile, leaguePosition: isNaN(pos) ? undefined : pos, updatedAt: new Date().toISOString() };
                    saveSquadProfile(updated);
                  }}
                  placeholder="—"
                  className="mt-0.5 w-full bg-transparent text-xl font-bold text-foreground-strong outline-none placeholder:text-muted"
                />
                {profile?.leaguePosition && (
                  <div className="mt-0.5 text-[10px] text-muted-2">tap to update</div>
                )}
              </div>
              {/* Season record */}
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Season Record</div>
                <div className="mt-0.5 text-xl font-bold text-foreground-strong">
                  {seasonStats ? `${seasonStats.wins}W – ${seasonStats.losses}L` : "—"}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-2">
                  {seasonStats ? `${seasonStats.played} match${seasonStats.played !== 1 ? "es" : ""}` : "no matches yet"}
                </div>
              </div>
              {/* Try difference */}
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Try Difference</div>
                <div className={`mt-0.5 text-xl font-bold ${
                  seasonStats
                    ? seasonStats.tryDiff > 0 ? "text-success" : seasonStats.tryDiff < 0 ? "text-danger" : "text-foreground-strong"
                    : "text-muted"
                }`}>
                  {seasonStats ? `${seasonStats.tryDiff >= 0 ? "+" : ""}${seasonStats.tryDiff}` : "—"}
                </div>
                {seasonStats && (
                  <div className="mt-0.5 text-[10px] text-muted-2">{seasonStats.totalTriesFor} for / {seasonStats.totalTriesAgainst} against</div>
                )}
              </div>
              {/* Next fixture summary */}
              <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Next Fixture</div>
                {nextFixture ? (
                  <>
                    <div className="mt-0.5 text-xl font-bold text-foreground-strong">
                      {compactFixtureDate(nextFixture.date)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-2">vs {nextFixture.opponent}</div>
                  </>
                ) : (
                  <div className="mt-0.5 text-xl font-bold text-muted">—</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next fixture card */}
        <div>
          <SectionLabel>Next Fixture</SectionLabel>
          <section className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
            {nextFixture ? (
              <div className="flex flex-col sm:flex-row">
                {/* Date block */}
                <div className="flex shrink-0 flex-col items-center justify-center bg-accent/10 px-6 py-5 sm:w-24">
                  <span className="text-4xl font-black leading-none text-accent">{fixtureDay(nextFixture.date)}</span>
                  <span className="mt-1 text-xs font-bold uppercase tracking-widest text-accent/70">{fixtureMonth(nextFixture.date)}</span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-foreground-strong">
                          {teamName || "Your team"} vs {nextFixture.opponent}
                        </h2>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
                          nextFixture.homeOrAway === "home"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border bg-panel-2 text-muted"
                        }`}>
                          {nextFixture.homeOrAway}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span>{fixtureDayName(nextFixture.date)}</span>
                        {nextFixture.time && <><span className="text-muted-2">·</span><span>{nextFixture.time}</span></>}
                        {nextFixture.venue && <><span className="text-muted-2">·</span><span>{nextFixture.venue}</span></>}
                        {nextFixture.round && <><span className="text-muted-2">·</span><span>Round {nextFixture.round}</span></>}
                      </div>
                    </div>
                    {/* Availability summary badge */}
                    {(() => {
                      const activePlayers = profile?.players?.filter((p) => p.status === "active") ?? [];
                      const responses = availabilityResponses.filter((r) => r.fixtureId === nextFixture.id);
                      const notResponded = activePlayers.length - responses.length;
                      if (notResponded > 0 && activePlayers.length > 0) {
                        return (
                          <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning">
                            {notResponded} not yet responded
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {/* Availability dot bar */}
                  {(() => {
                    const activePlayers = profile?.players?.filter((p) => p.status === "active") ?? [];
                    if (!activePlayers.length) return null;
                    const responses = availabilityResponses.filter((r) => r.fixtureId === nextFixture.id);
                    const available = responses.filter((r) => r.response === "available").length;
                    const unavailable = responses.filter((r) => r.response === "unavailable").length;
                    const pending = Math.max(0, activePlayers.length - available - unavailable);
                    const yesPlayers = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "available");
                    const noPlayers = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "unavailable");
                    const maybePlayers = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "maybe");
                    const pendingPlayers = activePlayers.filter((p) => !responses.find((r) => r.playerId === p.id));
                    const playerName = (p: { preferredName: string; fullName: string }) => p.preferredName || p.fullName;
                    return (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {activePlayers.map((player) => {
                            const r = responses.find((res) => res.playerId === player.id);
                            const color = !r
                              ? "bg-muted/30"
                              : r.response === "available"
                              ? "bg-success"
                              : r.response === "unavailable"
                              ? "bg-danger"
                              : "bg-warning";
                            return (
                              <span
                                key={player.id}
                                title={`${playerName(player)}: ${r ? r.response : "pending"}`}
                                className={`inline-block h-2 w-2 rounded-full ${color}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="font-semibold text-success">{available} yes</span>
                          <span className="text-muted-2">·</span>
                          <span className="font-semibold text-danger">{unavailable} no</span>
                          <span className="text-muted-2">·</span>
                          <span className="text-muted">{pending} pending</span>
                          <button
                            type="button"
                            onClick={() => setShowAvailDetails((v) => !v)}
                            className="ml-auto text-[11px] text-accent underline-offset-2 hover:underline"
                          >
                            {showAvailDetails ? "Hide" : "Details"}
                          </button>
                        </div>
                        {showAvailDetails && (
                          <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                            {yesPlayers.length > 0 && (
                              <div>
                                <span className="font-semibold text-success">Available · </span>
                                <span className="text-foreground">{yesPlayers.map(playerName).join(", ")}</span>
                              </div>
                            )}
                            {noPlayers.length > 0 && (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-danger">Can&apos;t make it</span>
                                {noPlayers.map((p) => {
                                  const r = responses.find((res) => res.playerId === p.id && res.response === "unavailable");
                                  return (
                                    <div key={p.id} className="text-foreground">
                                      {playerName(p)}
                                      {r?.reason && <span className="ml-1 text-muted-2"> — &ldquo;{r.reason}&rdquo;</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {maybePlayers.length > 0 && (
                              <div>
                                <span className="font-semibold text-warning">Maybe · </span>
                                <span className="text-foreground">{maybePlayers.map(playerName).join(", ")}</span>
                              </div>
                            )}
                            {pendingPlayers.length > 0 && (
                              <div>
                                <span className="font-semibold text-muted">No reply · </span>
                                <span className="text-muted">{pendingPlayers.map(playerName).join(", ")}</span>
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => sendAvailabilityReminder(nextFixture.id)}
                                    disabled={remindStatus === "sending" || remindStatus === "sent"}
                                    className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-panel-3 disabled:opacity-60"
                                  >
                                    {remindStatus === "sending" ? "Sending…" : remindStatus === "sent" ? "Reminder sent ✓" : remindStatus === "error" ? "Failed — try again" : "Send reminder email"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-muted">No upcoming fixtures scheduled.</p>
                <Link href="/coach/team-setup" className="mt-2 inline-block text-xs text-accent underline-offset-4 hover:underline">
                  Add your first fixture in Team Setup →
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Post-session check-in */}
        {pendingCheckIn && (
          <CheckInCard
            session={pendingCheckIn.session}
            sessionDate={pendingCheckIn.sessionDate}
            profile={profile}
          />
        )}

        {/* AI assistant panel — Focus for next game */}
        <div>
          <SectionLabel>AI Assistant</SectionLabel>
          <section className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="flex items-stretch">
              <div className="w-1 shrink-0 bg-accent" />
              <div className="flex-1 min-w-0 px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-2">Focus for next game</div>
                <p className="text-sm leading-relaxed text-foreground">{aiText}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={(e) => runAndBlur(() => scrollToChat(), e)}
                      className="rounded-full border border-border bg-panel-2 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-panel-3 hover:border-border-light"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Training This Week + Players to Watch — two column */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Training this week */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <SectionLabel>Training This Week</SectionLabel>
              <Link href="/coach/team-setup" className="text-[10px] text-muted-2 underline-offset-4 hover:text-foreground hover:underline uppercase tracking-widest">
                Manage →
              </Link>
            </div>
            <section className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
              {thisWeekSessions.length > 0 ? (
                <div className="divide-y divide-border">
                  {thisWeekSessions
                    .sort((a, b) => (DOW_INDEX[a.dayOfWeek ?? ""] ?? 99) - (DOW_INDEX[b.dayOfWeek ?? ""] ?? 99))
                    .map((session) => {
                      const responses = availabilityResponses.filter((r) => r.trainingSessionId === session.id);
                      const activePlayers = profile?.players?.filter((p) => p.status === "active") ?? [];
                      const confirmed = responses.filter((r) => r.response === "available").length;
                      const badgeColor = confirmed >= activePlayers.length * 0.7
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-warning/30 bg-warning/10 text-warning";
                      const sessionLabel = session.dayOfWeek
                        ? session.dayOfWeek.charAt(0).toUpperCase() + session.dayOfWeek.slice(1)
                        : session.oneOffDate ?? "One-off";
                      const sessionExpanded = expandedSessionId === session.id;
                      const sessionYes = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "available");
                      const sessionNo = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "unavailable");
                      const sessionMaybe = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "maybe");
                      const sessionPending = activePlayers.filter((p) => !responses.find((r) => r.playerId === p.id));
                      return (
                        <div key={session.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-semibold text-foreground-strong">{sessionLabel}</span>
                              <span className="ml-2 text-sm text-muted">{session.time}</span>
                              {session.locationName && <div className="mt-0.5 text-xs text-muted-2">{session.locationName}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.currentTarget.blur();
                                  if (!profile) return;
                                  const updated = {
                                    ...profile,
                                    trainingSessions: (profile.trainingSessions ?? []).map((s) =>
                                      s.id === session.id ? { ...s, availabilityRequested: !s.availabilityRequested } : s
                                    ),
                                    updatedAt: new Date().toISOString(),
                                  };
                                  saveSquadProfile(updated);
                                }}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                                  session.availabilityRequested
                                    ? "border-success/30 bg-success/10 text-success"
                                    : "border-border bg-panel-2 text-muted hover:text-foreground"
                                }`}
                              >
                                {session.availabilityRequested ? "Requested ✓" : "Request"}
                              </button>
                              {activePlayers.length > 0 && responses.length > 0 && (
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                                  {confirmed}/{activePlayers.length}
                                </span>
                              )}
                              {responses.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.currentTarget.blur(); setExpandedSessionId(sessionExpanded ? null : session.id); }}
                                  className="text-[11px] text-accent underline-offset-2 hover:underline"
                                >
                                  {sessionExpanded ? "Hide" : "Details"}
                                </button>
                              )}
                            </div>
                          </div>
                          {sessionExpanded && (
                            <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                              {sessionYes.length > 0 && (
                                <div><span className="font-semibold text-success">Going · </span><span className="text-foreground">{sessionYes.map((p) => p.preferredName || p.fullName).join(", ")}</span></div>
                              )}
                              {sessionNo.length > 0 && (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-danger">Can&apos;t make it</span>
                                  {sessionNo.map((p) => {
                                    const r = responses.find((res) => res.playerId === p.id && res.response === "unavailable");
                                    return (
                                      <div key={p.id} className="text-foreground">
                                        {p.preferredName || p.fullName}
                                        {r?.reason && <span className="ml-1 text-muted-2"> — &ldquo;{r.reason}&rdquo;</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {sessionMaybe.length > 0 && (
                                <div><span className="font-semibold text-warning">Maybe · </span><span className="text-foreground">{sessionMaybe.map((p) => p.preferredName || p.fullName).join(", ")}</span></div>
                              )}
                              {sessionPending.length > 0 && (
                                <div><span className="font-semibold text-muted">No reply · </span><span className="text-muted">{sessionPending.map((p) => p.preferredName || p.fullName).join(", ")}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-muted">No training sessions this week.</p>
                  <Link href="/coach/team-setup" className="mt-2 inline-block text-xs text-accent underline-offset-4 hover:underline">
                    Set up sessions in Team Setup →
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Players to watch */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <SectionLabel>Players to Watch</SectionLabel>
              <Link href="/coach/players" className="text-[10px] text-muted-2 underline-offset-4 hover:text-foreground hover:underline uppercase tracking-widest">
                All players →
              </Link>
            </div>
            <section className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
              {playersToWatch ? (
                <div className="divide-y divide-border">
                  {/* Star performer */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(playersToWatch.star.name)}`}>
                      {playerInitials(playersToWatch.star.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground-strong truncate">{playersToWatch.star.name}</span>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-success">Top</span>
                      </div>
                      <div className="text-xs text-muted">
                        {playersToWatch.star.position} · {Math.round(playersToWatch.star.tacklePct)}% tackles
                        {playersToWatch.starPrevTacklePct !== null && playersToWatch.starPrevTacklePct !== undefined && (
                          <span className="ml-1 text-success">
                            (+{Math.round(playersToWatch.star.tacklePct - playersToWatch.starPrevTacklePct)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <GradeBadge grade={playersToWatch.star.overallGrade} />
                  </div>
                  {/* Focus player */}
                  {playersToWatch.focus && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(playersToWatch.focus.name)}`}>
                        {playerInitials(playersToWatch.focus.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground-strong truncate">{playersToWatch.focus.name}</span>
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-warning">Focus</span>
                        </div>
                        <div className="text-xs text-muted">
                          {playersToWatch.focus.position} · {Math.round(playersToWatch.focus.tacklePct)}% tackles
                          {playersToWatch.focusPrevTacklePct !== null && playersToWatch.focusPrevTacklePct !== undefined && (
                            <span className="ml-1 text-danger">
                              ({Math.round(playersToWatch.focus.tacklePct - playersToWatch.focusPrevTacklePct)}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <GradeBadge grade={playersToWatch.focus.overallGrade} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-muted">No match data yet.</p>
                  <Link href="/coach/capture" className="mt-2 inline-block text-xs text-accent underline-offset-4 hover:underline">
                    Capture your first match →
                  </Link>
                </div>
              )}
            </section>
          </div>

        </div>

        {/* Upcoming fixtures list */}
        {sortedFixtures.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <SectionLabel>Upcoming Fixtures</SectionLabel>
              <Link href="/coach/team-setup" className="text-[10px] text-muted-2 underline-offset-4 hover:text-foreground hover:underline uppercase tracking-widest">
                Manage →
              </Link>
            </div>
            <section className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="divide-y divide-border">
                {sortedFixtures.map((fixture) => {
                  const responses = availabilityResponses.filter((r) => r.fixtureId === fixture.id);
                  const available = responses.filter((r) => r.response === "available").length;
                  const activePlayers = profile?.players?.filter((p) => p.status === "active") ?? [];
                  const isPast = fixture.date < today;

                  let badge: { label: string; cls: string };
                  if (!fixture.availabilityRequested) {
                    badge = { label: "Not sent", cls: "border-border bg-panel-3 text-muted-2" };
                  } else if (responses.length === 0) {
                    badge = { label: "Pending", cls: "border-warning/30 bg-warning/10 text-warning" };
                  } else if (available >= activePlayers.length * 0.7) {
                    badge = { label: `${available}/${activePlayers.length} available`, cls: "border-success/30 bg-success/10 text-success" };
                  } else {
                    badge = { label: `${available}/${activePlayers.length} available`, cls: "border-warning/30 bg-warning/10 text-warning" };
                  }

                  const fixtureExpanded = expandedFixtureId === fixture.id;
                  const fYes = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "available");
                  const fNo = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "unavailable");
                  const fMaybe = activePlayers.filter((p) => responses.find((r) => r.playerId === p.id)?.response === "maybe");
                  const fPending = activePlayers.filter((p) => !responses.find((r) => r.playerId === p.id));

                  return (
                    <div key={fixture.id} className={`px-4 py-3 ${isPast ? "opacity-50" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 shrink-0 text-xs font-semibold text-muted">{compactFixtureDate(fixture.date)}</div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground-strong">vs {fixture.opponent}</span>
                            {fixture.round && <span className="ml-1.5 text-xs text-muted-2">Rd {fixture.round}</span>}
                          </div>
                          <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase sm:inline-block ${
                            fixture.homeOrAway === "home" ? "border-success/20 bg-success/10 text-success" : "border-border bg-panel-3 text-muted"
                          }`}>
                            {fixture.homeOrAway}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {responses.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => { e.currentTarget.blur(); setExpandedFixtureId(fixtureExpanded ? null : fixture.id); }}
                              className="text-[11px] text-accent underline-offset-2 hover:underline"
                            >
                              {fixtureExpanded ? "Hide" : "Details"}
                            </button>
                          )}
                        </div>
                      </div>
                      {fixtureExpanded && (
                        <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                          {fYes.length > 0 && (
                            <div><span className="font-semibold text-success">Available · </span><span className="text-foreground">{fYes.map((p) => p.preferredName || p.fullName).join(", ")}</span></div>
                          )}
                          {fNo.length > 0 && (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-danger">Unavailable</span>
                              {fNo.map((p) => {
                                const r = responses.find((res) => res.playerId === p.id && res.response === "unavailable");
                                return (
                                  <div key={p.id} className="text-foreground">
                                    {p.preferredName || p.fullName}
                                    {r?.reason && <span className="ml-1 text-muted-2"> — &ldquo;{r.reason}&rdquo;</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {fMaybe.length > 0 && (
                            <div><span className="font-semibold text-warning">Maybe · </span><span className="text-foreground">{fMaybe.map((p) => p.preferredName || p.fullName).join(", ")}</span></div>
                          )}
                          {fPending.length > 0 && (
                            <div><span className="font-semibold text-muted">No reply · </span><span className="text-muted">{fPending.map((p) => p.preferredName || p.fullName).join(", ")}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* AI assistant chat */}
        <DashboardChat
          contextString={contextString}
          initialMessage={aiText}
          initialHistory={profile?.aiChatHistory}
          onHistoryUpdate={(history) => {
            if (!profile) return;
            const updated = { ...profile, aiChatHistory: history, updatedAt: new Date().toISOString() };
            saveSquadProfile(updated);
            upsertCloudSquadProfile(updated);
          }}
        />

      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// CheckInCard component (Area 5)
// ---------------------------------------------------------------------------

function CheckInCard({
  session,
  sessionDate,
  profile,
}: {
  session: TrainingSession;
  sessionDate: string;
  profile: SquadProfile | null;
}) {
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [playerNotes, setPlayerNotes] = useState("");
  const [sessionRating, setSessionRating] = useState<SessionLog["sessionRating"] | null>(null);
  const [logged, setLogged] = useState(false);

  if (logged) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-5 py-3 text-sm font-semibold text-success">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Session logged for {session.dayOfWeek ? session.dayOfWeek.charAt(0).toUpperCase() + session.dayOfWeek.slice(1) : session.oneOffDate ?? "this session"}
      </div>
    );
  }

  function toggleFocus(area: string) {
    setFocusAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);
  }

  function logSession(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.blur();
    if (!profile || !sessionRating) return;
    const log: SessionLog = {
      id: createSessionLogId(),
      trainingSessionId: session.id,
      date: sessionDate,
      focusAreas,
      playerNotes: playerNotes.trim() || undefined,
      sessionRating,
      loggedAt: new Date().toISOString(),
    };
    const updated = {
      ...profile,
      sessionLogs: [...(profile.sessionLogs ?? []), log],
      updatedAt: new Date().toISOString(),
    };
    saveSquadProfile(updated);
    setLogged(true);
  }

  const dayLabel = session.dayOfWeek
    ? session.dayOfWeek.charAt(0).toUpperCase() + session.dayOfWeek.slice(1)
    : session.oneOffDate ?? "Session";

  return (
    <section className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-1">Post-session check-in</div>
          <h2 className="text-base font-semibold text-foreground-strong">{dayLabel} training</h2>
          <p className="mt-0.5 text-xs text-muted">
            {sessionDate}
            {session.time && ` · ${session.time}`}
            {" · Takes about 30 seconds"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning">
          Not logged yet
        </span>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Focus areas */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">What did you focus on?</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={(e) => runAndBlur(() => toggleFocus(area), e)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  focusAreas.includes(area)
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-panel-2 text-muted hover:border-border-light hover:text-foreground"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Player notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Any players to note? (optional)</label>
          <textarea
            value={playerNotes}
            onChange={(e) => setPlayerNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Smith showed good improvement in contact…"
            className="w-full resize-none rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-border-light"
          />
        </div>

        <div className="border-t border-border" />

        {/* Session rating */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">How did the session go?</label>
          <div className="flex gap-2">
            {(["good", "okay", "tough"] as const).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={(e) => runAndBlur(() => setSessionRating(rating), e)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                  sessionRating === rating
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-panel-2 text-muted hover:border-border-light hover:text-foreground"
                }`}
              >
                {rating === "good" ? "Good" : rating === "okay" ? "Okay" : "Tough"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={logSession}
          disabled={!sessionRating}
          className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Log session
        </button>
      </div>
    </section>
  );
}
