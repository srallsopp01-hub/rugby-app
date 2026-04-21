"use client";

import { useEffect, useMemo, useState } from "react";
import AppTopNav from "../rugby-tagging/components/AppTopNav";
import { useRouter } from "next/navigation";
import {
  clearCurrentMatchId,
  getSavedMatches,
  SAVED_MATCHES_KEY,
  setCurrentMatchId,
  type SavedMatchRecord,
} from "../rugby-tagging/lib/savedMatches";
import { generateMultiMatchWorkbook } from "../rugby-tagging/lib/exports/multiMatchExport";
import { downloadWorkbook } from "../rugby-tagging/lib/exports/downloadWorkbook";

export default function SavedMatchesPage() {
  const router = useRouter();
  const [savedMatches, setSavedMatches] = useState<SavedMatchRecord[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setSavedMatches(getSavedMatches());
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

  const openMatch = (
    matchId: string,
    route: "/" | "/game-review" | "/team-dashboard"
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
      const nextMatches = savedMatches.filter((match) => match.id !== matchId);
      const currentMatchId =
        typeof window !== "undefined"
          ? localStorage.getItem("rugby-tagging-current-match-id") || ""
          : "";

      if (currentMatchId === matchId) {
        clearCurrentMatchId();
      }

      localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(nextMatches));
      setSavedMatches(nextMatches);
    } catch (error) {
      console.error("Failed to delete saved match", error);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                Saved Matches
              </h1>
              <p className="mt-2 text-sm text-muted">
                Reopen a previously saved match in Workspace, Team Review, or Team Analytics.
              </p>
            </div>

            <AppTopNav current="saved-matches" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">
                Current beta storage
              </h2>
              <p className="mt-1 text-sm text-muted">
                Saved matches currently stay on this browser and this device only. They are not yet stored in a cloud account or shareable across devices.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              Best used on desktop or laptop
            </div>
          </div>
        </div>

        {sortedMatches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground-strong">
              No saved matches yet
            </h2>
            <p className="mt-2 text-sm text-muted">
              Save a match from the Workspace first, then it will appear here on this browser and device.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-panel-2 p-4">
                <div className="text-sm font-medium text-foreground">1. Open Workspace</div>
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
                      onClick={clearSelection}
                      className="rounded-xl border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-panel"
                    >
                      Clear selection
                    </button>
                    <button
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
              const title =
                typeof match.matchTitle === "string" && match.matchTitle.trim()
                  ? match.matchTitle.trim()
                  : "Untitled match";

              const subtitle = [
                match.opponent ? `vs ${match.opponent}` : "",
                match.matchDate || "",
              ]
                .filter(Boolean)
                .join(" • ");

              const updatedLabel = new Date(match.updatedAt).toLocaleString();

              const playerCount = Array.isArray(match.rosterRows)
                ? match.rosterRows.filter(
                    (row: { name?: string }) => row.name && row.name.trim()
                  ).length
                : 0;

              const eventCount = Array.isArray(match.events) ? match.events.length : 0;
              const reviewCount = Array.isArray(match.reviewQueue)
                ? match.reviewQueue.length
                : 0;
              const noteCount = Array.isArray(match.coachNotes)
                ? match.coachNotes.length
                : 0;

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
                          {title}
                        </h2>
                        <span className="rounded-full border border-border bg-panel-2 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                          Saved match
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted">
                        {subtitle || "No opponent or date added"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Updated
                          </div>
                          <div className="mt-1 text-sm text-foreground">{updatedLabel}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Players
                          </div>
                          <div className="mt-1 text-sm text-foreground">{playerCount}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Events
                          </div>
                          <div className="mt-1 text-sm text-foreground">{eventCount}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Review
                          </div>
                          <div className="mt-1 text-sm text-foreground">{reviewCount}</div>
                        </div>

                        <div className="rounded-xl border border-border bg-panel-2 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-2">
                            Notes
                          </div>
                          <div className="mt-1 text-sm text-foreground">{noteCount}</div>
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
                            onClick={() => openMatch(match.id, "/")}
                            className="rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Open Workspace
                          </button>

                          <button
                            onClick={() => openMatch(match.id, "/game-review")}
                            className="rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Open Team Review
                          </button>

                          <button
                            onClick={() => openMatch(match.id, "/team-dashboard")}
                            className="rounded-xl border border-border-light bg-panel-3 px-4 py-2.5 text-sm font-medium text-foreground"
                          >
                            Open Team Analytics
                          </button>

                          <button
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