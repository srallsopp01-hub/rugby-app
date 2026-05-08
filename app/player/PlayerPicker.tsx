"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getSquadProfile } from "@/app/rugby-tagging/lib/team";
import { SQUAD_PROFILE_KEY } from "@/app/rugby-tagging/constants";
import {
  getScopedSavedMatchesKey,
  subscribeSavedMatchesChanged,
} from "@/app/rugby-tagging/lib/savedMatches";
import { usePlayer } from "./PlayerContext";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";

function subscribeSquadProfileChanged(cb: () => void) {
  window.addEventListener("player-identity-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("player-identity-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function PlayerPicker() {
  const { setCurrentPlayer } = usePlayer();

  const squadRaw = useSyncExternalStore(
    subscribeSquadProfileChanged,
    () => localStorage.getItem(SQUAD_PROFILE_KEY) ?? "",
    () => ""
  );
  const matchesRaw = useSyncExternalStore(
    subscribeSavedMatchesChanged,
    () => localStorage.getItem(getScopedSavedMatchesKey()) ?? "[]",
    () => "[]"
  );

  const players = useMemo<SquadPlayer[]>(() => {
    void squadRaw; // depend on snapshot so memo re-runs if store changes
    const profile = getSquadProfile();
    return profile?.players.filter((p) => p.status === "active") ?? [];
  }, [squadRaw]);

  const lastGameDates = useMemo<Map<string, string>>(() => {
    const dateMap = new Map<string, string>();
    let matches;
    try { matches = JSON.parse(matchesRaw); } catch { return dateMap; }
    if (!Array.isArray(matches)) return dateMap;
    for (const player of players) {
      for (const m of matches) {
        const inRoster = m.rosterRows?.some(
          (r: { name: string }) => r.name === player.fullName || r.name === player.preferredName
        );
        if (inRoster && m.matchDate) {
          const current = dateMap.get(player.id);
          if (!current || m.matchDate > current) dateMap.set(player.id, m.matchDate);
        }
      }
    }
    return dateMap;
  }, [players, matchesRaw]);

  return (
    <div className="min-h-full bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel-3 text-foreground-strong">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
          </div>
            <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
              Choose your player profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Select your name to connect this device to your personal dashboard.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
            {players.length} active {players.length === 1 ? "player" : "players"}
          </div>
        </div>

        {players.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-panel p-8 text-center">
            <p className="text-sm text-muted">No squad set up yet.</p>
            <p className="mt-1 text-xs text-muted-2">Ask your coach to add the squad in Team Setup.</p>
          </div>
        ) : (
          <div className="mt-6 grid max-h-[calc(100vh-13rem)] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setCurrentPlayer(player)}
                className="flex min-h-24 w-full items-center justify-between gap-4 rounded-xl border border-border bg-panel px-4 py-4 text-left transition-all duration-150 hover:border-border-light hover:bg-panel-2 active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground-strong">
                    {player.preferredName || player.fullName}
                  </span>
                  {player.fullName !== (player.preferredName || player.fullName) && (
                    <span className="mt-0.5 block truncate text-xs text-muted">{player.fullName}</span>
                  )}
                  <span className="mt-2 block text-xs text-muted-2">
                    {lastGameDates.get(player.id)
                      ? `Last game: ${lastGameDates.get(player.id)}`
                      : "No games yet"}
                  </span>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-panel-3 px-2.5 py-1 text-xs text-muted-2">
                  {player.primaryPosition || "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
