"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import {
  clearCurrentMatchId,
  deleteSavedMatch,
  getSavedMatches,
  SAVED_MATCHES_CHANGED_EVENT,
  setCurrentMatchId,
  type SavedMatchRecord,
} from "@/app/rugby-tagging/lib/savedMatches";
import { buildMatchConfidenceSummary } from "@/app/rugby-tagging/lib/matchConfidence";
import { generateMultiMatchWorkbook } from "@/app/rugby-tagging/lib/exports/multiMatchExport";
import { downloadWorkbook } from "@/app/rugby-tagging/lib/exports/downloadWorkbook";

export default function CoachSavedMatchesPage() {
  const router = useRouter();
  const [savedMatches, setSavedMatches] = useState<SavedMatchRecord[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const refreshSavedMatches = () => setSavedMatches(getSavedMatches());

    refreshSavedMatches();
    window.addEventListener(SAVED_MATCHES_CHANGED_EVENT, refreshSavedMatches);
    window.addEventListener("storage", refreshSavedMatches);

    return () => {
      window.removeEventListener(SAVED_MATCHES_CHANGED_EVENT, refreshSavedMatches);
      window.removeEventListener("storage", refreshSavedMatches);
    };
  }, []);

  const toggleSelected = (matchId: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
  };

  const clearSelection = () => setSelectedMatchIds([]);

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
    return [...savedMatches].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });
  }, [savedMatches]);
  const latestMatch = sortedMatches[0] || null;
  const latestSummary = latestMatch
    ? buildMatchConfidenceSummary(latestMatch)
    : null;

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
      const currentMatchId =
        typeof window !== "undefined"
          ? localStorage.getItem("rugby-tagging-current-match-id") || ""
          : "";

      if (currentMatchId === matchId) {
        clearCurrentMatchId();
      }

      deleteSavedMatch(matchId);
      setSavedMatches(getSavedMatches());
    } catch (error) {
      console.error("Failed to delete saved match", error);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                Saved Matches
              </h1>
              <PageHelp {...COACH_PAGE_HELP["/coach/saved-matches"]} />
            </div>
            <p className="mt-2 text-sm text-muted">
              Reopen a previously saved match in Capture, Review, or Insights.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">
                Current beta storage
              </h2>
              <p className="mt-1 text-sm text-muted">
                Saved matches stay available locally first, then sync to your coach account when cloud storage is reachable. Video files still need to be loaded on this device.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              Best used on desktop or laptop
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                Saved match context
              </div>
              <h2 className="mt-2 text-xl font-semibold text-foreground-strong">
                {latestSummary ? latestSummary.title : "No saved matches"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {latestSummary
                  ? `${latestSummary.subtitle} - last saved ${latestSummary.updatedLabel}`
                  : "Save a match from Capture to unlock Insights, Review, and Compare."}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 xl:w-[620px] xl:grid-cols-4">
              <ContextTile label="Saved" value={String(savedMatches.length)} />
              <ContextTile
                label="Latest events"
                value={latestSummary ? String(latestSummary.resolvedEvents) : "0"}
              />
              <ContextTile
                label="Open review"
                value={latestSummary ? String(latestSummary.unresolvedReview) : "0"}
              />
              <ContextTile
                label="Latest report"
                value={latestSummary?.readyLabel || "Not ready"}
                tone={latestSummary?.readyTone}
              />
            </div>
          </div>
        </div>

        {sortedMatches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground-strong">
              No saved matches yet
            </h2>
            <p className="mt-2 text-sm text-muted">
              Save a match from Capture first, then it will appear here and sync to your coach account in the background.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-panel-2 p-4">
                <div className="text-sm font-medium text-foreground">1. Open Capture</div>
                <div className="mt-1 text-sm text-muted">
                  Add the team sheet, match details, and video.
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 p-4">
                <div className="text-sm font-medium text-foreground">2. Tag and review</div>
                <div className="mt-1 text-sm text-muted">
                  Log events, import transcript text, and resolve Needs Review items.
                </div>
              </div>

              <div className="rounded-xl border border-border bg-panel-2 p-4">
                <div className="text-sm font-medium text-foreground">3. Save and reopen</div>
                <div className="mt-1 text-sm text-muted">
                  Save the match, then return here later to continue in the right screen.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedMatchIds.length > 0 && (
              <div className="sticky top-4 z-10 rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground-strong">
                      {selectedMatchIds.length} match
                      {selectedMatchIds.length === 1 ? "" : "es"} selected
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {selectedMatchIds.length < 2
                        ? "Select at least one more match to enable comparison."
                        : "Download a comparison report across selected rounds."}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel"
                    >
                      Clear selection
                    </button>
                    <button
                      type="button"
                      onClick={downloadComparison}
                      disabled={selectedMatchIds.length < 2 || isGenerating}
                      className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isGenerating
                        ? "Generating…"
                        : `↓ Compare Selected (.xlsx)`}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {sortedMatches.map((match: SavedMatchRecord) => {
              const confidence = buildMatchConfidenceSummary(match);
              const isSelected = selectedMatchIds.includes(match.id);

              return (
                <div
                  key={match.id}
                  className={`rounded-2xl border bg-panel p-5 shadow-[var(--shadow-soft)] transition ${
                    isSelected ? "border-accent" : "border-border"
                  }`}
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-panel-2 px-2.5 py-1 text-xs text-muted transition hover:bg-panel">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(match.id)}
                            className="h-3.5 w-3.5 cursor-pointer accent-current"
                          />
                          <span>Compare</span>
                        </label>
                        <h2 className="text-lg font-semibold text-foreground-strong">
                          {confidence.title}
                        </h2>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                            confidence.readyTone === "ready"
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-warning/40 bg-warning/10 text-warning"
                          }`}
                        >
                          {confidence.readyLabel}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted">
                        {confidence.subtitle}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Updated
                          </div>
                          <div className="mt-1 text-sm text-foreground">{confidence.updatedLabel}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Players
                          </div>
                          <div className="mt-1 text-sm text-foreground">
                            {confidence.namedPlayers}/{confidence.totalPlayers}
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Events
                          </div>
                          <div className="mt-1 text-sm text-foreground">{confidence.resolvedEvents}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Review
                          </div>
                          <div className="mt-1 text-sm text-foreground">{confidence.unresolvedReview}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Notes
                          </div>
                          <div className="mt-1 text-sm text-foreground">{confidence.notes}</div>
                        </div>
                      </div>
                    </div>

                    <div className="xl:w-[320px]">
                      <div className="rounded-2xl border border-border bg-panel-2 p-3">
                        <div className="mb-3 text-xs uppercase tracking-[0.12em] text-muted-2">
                          Open in
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={() => openMatch(match.id, "/coach/capture")}
                            className="rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Open Capture
                          </button>

                          <button
                            type="button"
                            onClick={() => openMatch(match.id, "/coach/review")}
                            className="rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Open Review
                          </button>

                          <button
                            type="button"
                            onClick={() => openMatch(match.id, "/coach/insights")}
                            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Open Insights
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteMatch(match.id)}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Delete match
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function ContextTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
    </div>
  );
}
