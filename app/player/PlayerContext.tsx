"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { getSquadProfile, SQUAD_PROFILE_CHANGED_EVENT } from "@/app/rugby-tagging/lib/team";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";

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
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PLAYER_IDENTITY_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getPlayerIdSnapshot(): string {
  return localStorage.getItem(PLAYER_IDENTITY_KEY) || "";
}

function getPlayerFromStorage(storedId: string): SquadPlayer | null {
  if (!storedId) return null;
  const profile = getSquadProfile();
  return profile?.players.find((p) => p.id === storedId) ?? null;
}

function subscribeProfileChanges(cb: () => void) {
  window.addEventListener(SQUAD_PROFILE_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SQUAD_PROFILE_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getProfileVersionSnapshot(): string {
  return getSquadProfile()?.updatedAt ?? "";
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const currentPlayerId = useSyncExternalStore(
    subscribePlayerIdentity,
    getPlayerIdSnapshot,
    () => ""
  );
  const profileVersion = useSyncExternalStore(
    subscribeProfileChanges,
    getProfileVersionSnapshot,
    () => ""
  );
  const currentPlayer = useMemo(
    () => getPlayerFromStorage(currentPlayerId),
    // profileVersion causes re-derive when SyncPlayerData saves a freshly fetched profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPlayerId, profileVersion]
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
