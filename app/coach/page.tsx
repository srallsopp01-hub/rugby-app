"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { shouldStartCoachOnboarding } from "@/app/rugby-tagging/lib/onboarding";
import {
  CURRENT_MATCH_ID_KEY,
  SAVED_MATCHES_KEY,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import {
  buildMatchConfidenceSummary,
  formatUpdatedLabel,
} from "@/app/rugby-tagging/lib/matchConfidence";
import {
  buildReportRowsFromMatch,
  buildTeamEventSummary,
  buildTeamTotals,
  teamTacklePctFromTotals,
} from "@/app/rugby-tagging/helpers";
import type { EventItem } from "@/app/rugby-tagging/types";
import { PageHelp } from "@/components/PageHelp";
import { COACH_PAGE_HELP } from "./help-content";

const emptyStorageSnapshot = "[]";
const subscribeToStorage = () => () => {};

function getSavedMatchesSnapshot() {
  if (typeof window === "undefined") return emptyStorageSnapshot;
  return localStorage.getItem(SAVED_MATCHES_KEY) || emptyStorageSnapshot;
}

function getCurrentMatchSnapshot() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CURRENT_MATCH_ID_KEY) || "";
}

function parseSavedMatches(snapshot: string): SavedMatchRecord[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const quickLinks = [
  {
    label: "Capture",
    href: "/coach/capture",
    description: "Tag live match events by voice or tap — start here each match day",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/coach/insights",
    description: "KPI cards, player grades, set piece, and season trends",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M2 12l3.5-4 3 2.5L12 5l2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Review",
    href: "/coach/review",
    description: "Watch clips and add coaching notes linked to players",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="2.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5.5 14.5h5M8 11.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M6.5 7L10 5.5 6.5 4v3z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Players",
    href: "/coach/players",
    description: "Full match history, grades, and metric trends per player",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M1.5 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <circle cx="11.5" cy="5" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M13.5 13c0-1.66-1.12-3.07-2.67-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Compare",
    href: "/coach/compare",
    description: "Side-by-side KPI and player comparison across two matches",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M5 3H2.5A.5.5 0 002 3.5v9a.5.5 0 00.5.5H5M11 3h2.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H11M8 2v12M5 6l-2 2 2 2M11 6l2 2-2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Saved Matches",
    href: "/coach/saved-matches",
    description: "Manage, export, or reopen all your saved matches",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function CoachHomePage() {
  const router = useRouter();
  const savedMatchesSnapshot = useSyncExternalStore(
    subscribeToStorage,
    getSavedMatchesSnapshot,
    () => emptyStorageSnapshot
  );
  const currentMatchId = useSyncExternalStore(
    subscribeToStorage,
    getCurrentMatchSnapshot,
    () => ""
  );
  const savedMatches = parseSavedMatches(savedMatchesSnapshot);
  const sortedMatches = [...savedMatches].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });
  const activeMatch =
    sortedMatches.find((match) => match.id === currentMatchId) || null;
  const latestMatch = sortedMatches[0] || null;
  const dashboardMatch = activeMatch || latestMatch;
  const confidence = dashboardMatch
    ? buildMatchConfidenceSummary(dashboardMatch)
    : null;

  const seasonStats = savedMatches.length >= 2
    ? (() => {
        let totalTackles = 0, totalMissed = 0, totalTriesFor = 0, totalTriesAgainst = 0;
        for (const m of savedMatches) {
          const evts = (m.events || []).filter((e: EventItem) => !e.isPending);
          const rows = buildReportRowsFromMatch(m.rosterRows, evts);
          const totals = buildTeamTotals(rows);
          const te = buildTeamEventSummary(evts);
          totalTackles += totals.tackles;
          totalMissed += totals.missed;
          totalTriesFor += te.triesScored;
          totalTriesAgainst += te.triesConceded;
        }
        const avgTacklePct = totalTackles + totalMissed > 0
          ? Math.round((totalTackles / (totalTackles + totalMissed)) * 100)
          : 0;
        return { matches: savedMatches.length, avgTacklePct, totalTriesFor, totalTriesAgainst };
      })()
    : null;

  useEffect(() => {
    if (shouldStartCoachOnboarding()) {
      router.replace("/coach/onboarding");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                  Coach Home
                </h1>
                <PageHelp {...COACH_PAGE_HELP["/coach"]} />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Your coaching control centre. Start a match, reopen analysis,
                or check whether the current saved match is report-ready.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              {savedMatches.length} saved match{savedMatches.length === 1 ? "" : "es"} on this browser
            </div>
          </div>
        </section>

        {/* Season at a Glance */}
        {seasonStats && (
          <section className="rounded-2xl border border-border bg-panel px-5 py-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Season</div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">{seasonStats.matches} matches</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Avg Tackle %</div>
                <div className={`mt-0.5 text-sm font-semibold ${seasonStats.avgTacklePct >= 90 ? "text-success" : seasonStats.avgTacklePct >= 80 ? "text-warning" : "text-danger"}`}>
                  {seasonStats.avgTacklePct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Tries For</div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">{seasonStats.totalTriesFor}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Tries Against</div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">{seasonStats.totalTriesAgainst}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-2">Try Margin</div>
                <div className={`mt-0.5 text-sm font-semibold ${seasonStats.totalTriesFor >= seasonStats.totalTriesAgainst ? "text-success" : "text-danger"}`}>
                  {seasonStats.totalTriesFor >= seasonStats.totalTriesAgainst ? "+" : ""}{seasonStats.totalTriesFor - seasonStats.totalTriesAgainst}
                </div>
              </div>
              <Link
                href="/coach/insights"
                className="ml-auto text-xs text-muted-2 underline-offset-4 hover:text-foreground hover:underline"
              >
                View full season →
              </Link>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                Next action
              </div>
              {confidence ? (
                <>
                  <h2 className="mt-2 text-xl font-semibold text-foreground-strong">
                    {activeMatch ? "Continue active match" : "Review latest saved match"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {confidence.title} - {confidence.subtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/coach/capture"
                      className="rounded-xl border border-border-light bg-panel-3 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-panel-2"
                    >
                      Open Capture
                    </Link>
                    <Link
                      href="/coach/insights"
                      className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Open Insights
                    </Link>
                    <Link
                      href="/coach/review"
                      className="rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel"
                    >
                      Open Review
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-xl font-semibold text-foreground-strong">
                    Start your first saved match
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    No local saved matches were found on this browser yet.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/coach/capture"
                      className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Open Capture
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="grid w-full grid-cols-2 gap-3 xl:w-[620px] xl:grid-cols-4">
              <StatusTile
                label="Last saved"
                value={formatUpdatedLabel(dashboardMatch?.updatedAt)}
              />
              <StatusTile
                label="Events"
                value={confidence ? String(confidence.resolvedEvents) : "0"}
                detail="resolved"
              />
              <StatusTile
                label="Review"
                value={confidence ? String(confidence.unresolvedReview) : "0"}
                detail="open items"
              />
              <StatusTile
                label="Report"
                value={confidence?.readyLabel || "Not ready"}
                tone={confidence?.readyTone}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-panel p-5 hover:border-border-light hover:bg-panel-2 hover:-translate-y-px hover:shadow-[var(--shadow-panel)] transition-all duration-150"
          >
            <div className="mb-3 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-panel-2 text-muted group-hover:text-foreground border border-border transition-colors duration-150">
              {link.icon}
            </div>
            <div className="text-sm font-semibold text-foreground-strong">
              {link.label}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {link.description}
            </div>
          </Link>
        ))}
        </section>

        <section className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">
                Current beta storage
              </h2>
              <p className="mt-1 text-sm text-muted">
                Saved matches are local to this browser and device. Use Saved
                Matches to choose the active match before opening Insights or
                Review.
              </p>
            </div>
            <Link
              href="/coach/saved-matches"
              className="w-fit rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel"
            >
              Manage saved matches
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "ready" | "needs-work";
}) {
  const toneClass =
    tone === "ready"
      ? "text-success"
      : tone === "needs-work"
      ? "text-warning"
      : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
    </div>
  );
}
