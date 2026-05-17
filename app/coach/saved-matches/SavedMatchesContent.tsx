"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MoreHorizontal, Video } from "lucide-react";
import { PageHelp } from "@/app/components/PageHelp";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusPill } from "@/app/components/StatusPill";
import { COACH_PAGE_HELP } from "../help-content";
import {
  clearCurrentMatchId,
  deleteSavedMatch,
  setCurrentMatchId,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import { buildMatchConfidenceSummary } from "@/app/rugby-tagging/lib/matchConfidence";
import { generateMultiMatchWorkbook } from "@/app/rugby-tagging/lib/exports/multiMatchExport";
import { downloadWorkbook } from "@/app/rugby-tagging/lib/exports/downloadWorkbook";
import { useMatches } from "@/app/providers/MatchesContext";
import { EmptyState } from "@/app/components/EmptyState";
import { useTrialQuota } from "@/lib/useTrialQuota";

export default function CoachSavedMatchesPage() {
  const router = useRouter();
  const { matches: savedMatches } = useMatches();
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const quota = useTrialQuota();

  const toggleSelected = (matchId: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
  };

  const clearSelection = () => setSelectedMatchIds([]);

  const toggleExpand = (id: string) =>
    setExpandedMatchId((prev) => (prev === id ? null : id));

  const toggleMenu = (id: string) =>
    setMenuOpenId((prev) => (prev === id ? null : id));

  const closeMenu = () => setMenuOpenId(null);

  const downloadComparison = async () => {
    if (selectedMatchIds.length < 2) return;
    setIsGenerating(true);
    try {
      const selected = savedMatches.filter((m) =>
        selectedMatchIds.includes(m.id)
      );
      const blob = await generateMultiMatchWorkbook(selected);
      const filename = `Comparison_${selected.length}_rounds_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      downloadWorkbook(blob, filename);
    } catch (error) {
      console.error("Failed to generate comparison workbook", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedMatches = useMemo(() => {
    const toMs = (dateStr: string): number => {
      if (!dateStr) return 0;
      // DD/MM/YYYY (free-text input format used by the app)
      const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
      // ISO or any other format
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return [...savedMatches].sort((a, b) => {
      const aMs = toMs(a.matchDate || "") || toMs(a.updatedAt);
      const bMs = toMs(b.matchDate || "") || toMs(b.updatedAt);
      return bMs - aMs;
    });
  }, [savedMatches]);

  const openMatch = (
    matchId: string,
    route: "/coach/capture" | "/coach/review" | "/coach/insights"
  ) => {
    setCurrentMatchId(matchId);
    router.push(route);
  };

  const deleteMatch = (matchId: string) => {
    const matchToDelete = savedMatches.find((match) => match.id === matchId);
    const matchLabel =
      matchToDelete?.matchTitle?.trim() || "this saved match";

    const confirmed = window.confirm(
      `Delete ${matchLabel}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const currentId =
        typeof window !== "undefined"
          ? localStorage.getItem("rugby-tagging-current-match-id") || ""
          : "";
      if (currentId === matchId) clearCurrentMatchId();

      const match = savedMatches.find((m) => m.id === matchId);
      deleteSavedMatch(matchId, match?.videoStoragePath);
    } catch (error) {
      console.error("Failed to delete saved match", error);
    }
  };

  const selectedCount = selectedMatchIds.length;

  return (
    <main className="min-h-screen bg-background px-4 py-5 pb-24 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <PageHeader
          title="Saved Matches"
          subtitle="Reopen a previously saved match in Capture, Review, or Insights."
          helpButton={<PageHelp {...COACH_PAGE_HELP["/coach/saved-matches"]} />}
        />

        <p className="text-xs text-muted">
          Saved matches sync to your account when cloud storage is reachable.
          Best used on desktop or laptop.
        </p>

        {quota?.isTrial && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${quota.allowed ? "border-accent/30 bg-accent/5" : "border-warning/40 bg-warning/5"}`}>
            {quota.trialExpired ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground">Your free trial has ended.</span>
                <a href="/pricing" className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  Upgrade to continue
                </a>
              </div>
            ) : quota.allowed ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground">
                  Free trial — <span className="font-semibold">{quota.used} of {quota.limit}</span> games recorded.
                </span>
                <a href="/pricing" className="shrink-0 text-xs text-accent underline underline-offset-2 hover:opacity-80">
                  Upgrade for unlimited
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground">
                  You&apos;ve used both trial games. Upgrade to record more.
                </span>
                <a href="/pricing" className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  Upgrade now
                </a>
              </div>
            )}
          </div>
        )}

        {sortedMatches.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No matches captured yet"
            description="Save a match from Capture and it will appear here, synced to your account."
            action={{ label: "Capture a match", href: "/coach/capture" }}
            size="lg"
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)]">
            {sortedMatches.map((match: SavedMatchRecord, index: number) => {
              const confidence = buildMatchConfidenceSummary(match);
              const isSelected = selectedMatchIds.includes(match.id);
              const isExpanded = expandedMatchId === match.id;
              const isMenuOpen = menuOpenId === match.id;
              const isLast = index === sortedMatches.length - 1;

              return (
                <div
                  key={match.id}
                  className={`${!isLast ? "border-b border-border" : ""} ${
                    isSelected ? "bg-accent/5" : ""
                  }`}
                >
                  {/* Compact row */}
                  <div
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-panel-2"
                    onClick={() => toggleExpand(match.id)}
                  >
                    {/* Checkbox */}
                    <div
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(match.id)}
                        className="h-4 w-4 cursor-pointer rounded accent-current"
                        aria-label={`Select ${confidence.title} for comparison`}
                      />
                    </div>

                    {/* Primary info */}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground-strong">
                        {confidence.title}
                      </span>
                      <span className="hidden shrink-0 text-xs text-muted sm:inline">
                        {confidence.subtitle}
                      </span>
                      <span className="hidden shrink-0 text-xs text-muted md:inline">
                        · {confidence.namedPlayers}/{confidence.totalPlayers}{" "}
                        players · {confidence.resolvedEvents} events
                      </span>
                    </div>

                    {/* Score badge */}
                    {typeof match.ourScore === "number" &&
                      typeof match.opponentScore === "number" && (
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${
                            match.ourScore > match.opponentScore
                              ? "border-success/40 bg-success/10 text-success"
                              : match.ourScore < match.opponentScore
                                ? "border-danger/40 bg-danger/10 text-danger"
                                : "border-border bg-panel-2 text-foreground"
                          }`}
                        >
                          {match.ourScore} – {match.opponentScore}
                        </span>
                      )}

                    {/* Status pill */}
                    <div className="hidden shrink-0 sm:block">
                      <StatusPill
                        variant={
                          confidence.readyTone === "ready"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                        uppercase
                      >
                        {confidence.readyLabel}
                      </StatusPill>
                    </div>

                    {/* ••• menu */}
                    <div
                      className="relative shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleMenu(match.id)}
                        className="rounded-lg border border-border bg-panel-2 p-1.5 text-muted transition hover:bg-panel hover:text-foreground"
                        aria-label="Match actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={closeMenu}
                          />
                          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-panel shadow-lg">
                            <button
                              type="button"
                              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground transition hover:bg-panel-2"
                              onClick={() => {
                                openMatch(match.id, "/coach/capture");
                                closeMenu();
                              }}
                            >
                              Open in Capture
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground transition hover:bg-panel-2"
                              onClick={() => {
                                openMatch(match.id, "/coach/review");
                                closeMenu();
                              }}
                            >
                              Open in Review
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground transition hover:bg-panel-2"
                              onClick={() => {
                                openMatch(match.id, "/coach/insights");
                                closeMenu();
                              }}
                            >
                              Open in Insights
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button
                              type="button"
                              className="flex w-full items-center px-4 py-2.5 text-sm text-danger transition hover:bg-panel-2"
                              onClick={() => {
                                deleteMatch(match.id);
                                closeMenu();
                              }}
                            >
                              Delete match
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Expand chevron */}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="border-t border-border bg-panel-2 px-4 pb-4 pt-3">
                      {/* Full title + subtitle */}
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-foreground-strong">
                          {confidence.title}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {confidence.subtitle}
                        </p>
                        {typeof match.ourScore === "number" &&
                          typeof match.opponentScore === "number" && (
                            <span
                              className={`mt-1.5 inline-block rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums ${
                                match.ourScore > match.opponentScore
                                  ? "border-success/40 bg-success/10 text-success"
                                  : match.ourScore < match.opponentScore
                                    ? "border-danger/40 bg-danger/10 text-danger"
                                    : "border-border bg-panel text-foreground"
                              }`}
                            >
                              {match.ourScore} – {match.opponentScore}
                            </span>
                          )}
                      </div>

                      {/* Status pill (visible on mobile in expanded view) */}
                      <div className="mb-3 sm:hidden">
                        <StatusPill
                          variant={
                            confidence.readyTone === "ready"
                              ? "success"
                              : "warning"
                          }
                          size="sm"
                          uppercase
                        >
                          {confidence.readyLabel}
                        </StatusPill>
                      </div>

                      {/* Metadata tiles */}
                      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <DetailTile
                          label="Updated"
                          value={confidence.updatedLabel}
                        />
                        <DetailTile
                          label="Players"
                          value={`${confidence.namedPlayers}/${confidence.totalPlayers}`}
                        />
                        <DetailTile
                          label="Events"
                          value={String(confidence.resolvedEvents)}
                        />
                        <DetailTile
                          label="Review"
                          value={String(confidence.unresolvedReview)}
                        />
                        <DetailTile
                          label="Notes"
                          value={String(confidence.notes)}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openMatch(match.id, "/coach/capture")
                          }
                          className="rounded-xl border border-border bg-panel px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel-2"
                        >
                          Open Capture
                        </button>
                        <button
                          type="button"
                          onClick={() => openMatch(match.id, "/coach/review")}
                          className="rounded-xl border border-border bg-panel px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel-2"
                        >
                          Open Review
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openMatch(match.id, "/coach/insights")
                          }
                          className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                          Open Insights
                        </button>

                        <div className="ml-auto">
                          <button
                            type="button"
                            onClick={() => deleteMatch(match.id)}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
                          >
                            Delete match
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky compare bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-panel shadow-lg">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <span className="text-sm font-semibold text-foreground-strong">
                {selectedCount} match{selectedCount === 1 ? "" : "es"} selected
              </span>
              {selectedCount < 2 && (
                <span className="ml-2 text-xs text-muted">
                  Select one more to enable comparison
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={downloadComparison}
                disabled={selectedCount < 2 || isGenerating}
                className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGenerating ? "Generating…" : "Compare →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
