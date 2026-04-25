"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSquadProfile } from "@/app/rugby-tagging/lib/squadProfile";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/squadProfile";

type PlayerContextValue = {
  currentPlayer: SquadPlayer | null;
  setCurrentPlayer: (player: SquadPlayer) => void;
  clearCurrentPlayer: () => void;
  ready: boolean;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentPlayer, setCurrentPlayerState] = useState<SquadPlayer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem(PLAYER_IDENTITY_KEY);
    if (storedId) {
      const profile = getSquadProfile();
      const player = profile?.players.find((p) => p.id === storedId) ?? null;
      setCurrentPlayerState(player);
    }
    setReady(true);
  }, []);

  function setCurrentPlayer(player: SquadPlayer) {
    localStorage.setItem(PLAYER_IDENTITY_KEY, player.id);
    setCurrentPlayerState(player);
  }

  function clearCurrentPlayer() {
    localStorage.removeItem(PLAYER_IDENTITY_KEY);
    setCurrentPlayerState(null);
  }

  return (
    <PlayerContext.Provider value={{ currentPlayer, setCurrentPlayer, clearCurrentPlayer, ready }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
