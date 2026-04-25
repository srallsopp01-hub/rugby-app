"use client";

import { useEffect, useState } from "react";
import { getSquadProfile } from "@/app/rugby-tagging/lib/squadProfile";
import { usePlayer } from "./PlayerContext";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

export function PlayerPicker() {
  const { setCurrentPlayer } = usePlayer();
  const [players, setPlayers] = useState<SquadPlayer[]>([]);

  useEffect(() => {
    const profile = getSquadProfile();
    setPlayers(profile?.players.filter((p) => p.status === "active") ?? []);
  }, []);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-panel-3 border border-border">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground-strong">Who are you?</h1>
          <p className="mt-1.5 text-sm text-muted">Select your name to view your personal dashboard.</p>
        </div>

        {players.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">No squad set up yet.</p>
            <p className="mt-1 text-xs text-muted-2">Ask your coach to add the squad in Team Setup.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setCurrentPlayer(player)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-panel px-4 py-3.5 text-left transition-all duration-150 hover:border-border-light hover:bg-panel-2 active:scale-[0.99]"
              >
                <div>
                  <span className="block text-sm font-medium text-foreground-strong">
                    {player.preferredName || player.fullName}
                  </span>
                  {player.fullName !== (player.preferredName || player.fullName) && (
                    <span className="block text-xs text-muted">{player.fullName}</span>
                  )}
                </div>
                <span className="text-xs text-muted-2 bg-panel-3 border border-border rounded-full px-2 py-0.5">
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
