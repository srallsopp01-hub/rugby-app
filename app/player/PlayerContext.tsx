"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { getTeam, TEAM_CHANGED_EVENT } from "@/app/rugby-tagging/lib/team";
import { PLAYER_IDENTITY_KEY } from "@/app/rugby-tagging/constants";
import { ACTIVE_TEAM_ID_KEY } from "@/lib/teamContext";
import { namespacedPlayerKey } from "@/app/player/SyncPlayerData";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";

type PlayerContextValue = {
  currentPlayer: SquadPlayer | null;
  setCurrentPlayer: (player: SquadPlayer) => void;
  clearCurrentPlayer: () => void;
  ready: boolean;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

const PLAYER_IDENTITY_EVENT = "player-identity-changed";

// ─── Active team ID (written by getMyTeamContext + SyncPlayerData) ───────────

function subscribeActiveTeamId(cb: () => void) {
  window.addEventListener(PLAYER_IDENTITY_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PLAYER_IDENTITY_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getActiveTeamIdSnapshot(): string {
  return localStorage.getItem(ACTIVE_TEAM_ID_KEY) || "";
}

// ─── Player identity (scoped by active team) ─────────────────────────────────

function subscribePlayerIdentity(cb: () => void) {
  window.addEventListener(PLAYER_IDENTITY_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PLAYER_IDENTITY_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getPlayerIdSnapshot(activeTeamId: string): string {
  if (!activeTeamId) {
    // Team not yet resolved — fall back to legacy key for existing sessions.
    return localStorage.getItem(PLAYER_IDENTITY_KEY) || "";
  }
  return localStorage.getItem(namespacedPlayerKey(activeTeamId)) || "";
}

// ─── Profile changes (squad data) ────────────────────────────────────────────

function subscribeProfileChanges(cb: () => void) {
  window.addEventListener(TEAM_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TEAM_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getProfileVersionSnapshot(): string {
  return getTeam()?.updatedAt ?? "";
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const activeTeamId = useSyncExternalStore(
    subscribeActiveTeamId,
    getActiveTeamIdSnapshot,
    () => ""
  );

  const currentPlayerId = useSyncExternalStore(
    subscribePlayerIdentity,
    () => getPlayerIdSnapshot(activeTeamId),
    () => ""
  );

  const profileVersion = useSyncExternalStore(
    subscribeProfileChanges,
    getProfileVersionSnapshot,
    () => ""
  );

  const currentPlayer = useMemo(() => {
    if (!currentPlayerId) return null;
    const team = getTeam();
    return team?.players.find((p) => p.id === currentPlayerId) ?? null;
    // profileVersion re-triggers when SyncPlayerData saves a freshly fetched profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerId, profileVersion]);

  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);

  function setCurrentPlayer(player: SquadPlayer) {
    const key = activeTeamId
      ? namespacedPlayerKey(activeTeamId)
      : PLAYER_IDENTITY_KEY;
    localStorage.setItem(key, player.id);
    window.dispatchEvent(new Event(PLAYER_IDENTITY_EVENT));
  }

  function clearCurrentPlayer() {
    const key = activeTeamId
      ? namespacedPlayerKey(activeTeamId)
      : PLAYER_IDENTITY_KEY;
    localStorage.removeItem(key);
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
