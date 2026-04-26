"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
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

const PLAYER_IDENTITY_EVENT = "player-identity-changed";

function subscribePlayerIdentity(cb: () => void) {
  window.addEventListener(PLAYER_IDENTITY_EVENT, cb);
  return () => window.removeEventListener(PLAYER_IDENTITY_EVENT, cb);
}

function getPlayerFromStorage(): SquadPlayer | null {
  const storedId = localStorage.getItem(PLAYER_IDENTITY_KEY);
  if (!storedId) return null;
  const profile = getSquadProfile();
  return profile?.players.find((p) => p.id === storedId) ?? null;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const currentPlayer = useSyncExternalStore(
    subscribePlayerIdentity,
    getPlayerFromStorage,
    () => null
  );
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);

  function setCurrentPlayer(player: SquadPlayer) {
    localStorage.setItem(PLAYER_IDENTITY_KEY, player.id);
    window.dispatchEvent(new Event(PLAYER_IDENTITY_EVENT));
  }

  function clearCurrentPlayer() {
    localStorage.removeItem(PLAYER_IDENTITY_KEY);
    window.dispatchEvent(new Event(PLAYER_IDENTITY_EVENT));
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
