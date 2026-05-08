"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchCloudTeam } from "@/lib/teamCloud";
import { getMyTeamContext, ACTIVE_TEAM_CHANGED_EVENT } from "@/lib/teamContext";
import { TEAM_CHANGED_EVENT, setTeamCache, getTeam, type Team } from "@/app/rugby-tagging/lib/team";

type TeamContextValue = {
  team: Team | null;
  teamId: string | null;
  isLoading: boolean;
  refresh: () => void;
};

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    const ctx = await getMyTeamContext();
    if (!ctx) {
      setTeamCache(null);
      setTeam(null);
      setTeamId(null);
      setIsLoading(false);
      return;
    }
    setTeamId(ctx.teamId);
    const { team: fetched } = await fetchCloudTeam(ctx.teamId);
    const resolved = fetched ?? null;
    setTeamCache(resolved);
    setTeam(resolved);
    setIsLoading(false);
    // Notify useSyncExternalStore subscribers that fresh data is in the cache.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(TEAM_CHANGED_EVENT));
    }
  }, []);

  useEffect(() => {
    void fetchTeam();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchTeam();
    };

    // When saveTeam() updates the cache and fires TEAM_CHANGED_EVENT, sync React
    // state from the cache — do NOT re-fetch (that would cause an infinite loop).
    const handleSave = () => { setTeam(getTeam()); };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(TEAM_CHANGED_EVENT, handleSave);
    window.addEventListener(ACTIVE_TEAM_CHANGED_EVENT, fetchTeam as EventListener);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(TEAM_CHANGED_EVENT, handleSave);
      window.removeEventListener(ACTIVE_TEAM_CHANGED_EVENT, fetchTeam as EventListener);
    };
  }, [fetchTeam]);

  return (
    <TeamContext.Provider value={{ team, teamId, isLoading, refresh: fetchTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
